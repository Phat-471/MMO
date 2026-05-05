import { Worker } from "bullmq";
import { prisma } from "./prisma";
import Redis from "ioredis";
import { executeAutomation } from "./automation";
import { decryptSecret } from "./lib/encryption";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { buildRedisConnection, canConnectToRedis, getRuntimeMode, loadRuntimeEnv } = require("../../../env/runtime-env.cjs");

loadRuntimeEnv(process.cwd(), getRuntimeMode());

interface JobRunQueuePayload {
  jobRunId: string;
  jobId: string;
  workspaceId: string;
}

function buildConnection() {
  return buildRedisConnection(process.cwd(), getRuntimeMode());
}

const redisConnection = buildConnection();

async function main() {
  const reachable = await canConnectToRedis(redisConnection);
  if (!reachable) {
    console.warn("Redis unavailable; worker disabled in this environment.");
    return;
  }

  const publisher = new Redis(redisConnection);
  publisher.on("error", (error) => {
    console.warn(`Worker Redis publisher unavailable: ${error instanceof Error ? error.message : String(error)}`);
  });

  const worker = new Worker<JobRunQueuePayload>(
    "mmo-jobs",
    async (job) => {
      const jobRecord = await prisma.job.findUnique({
        where: { id: job.data.jobId }
      });

      if (!jobRecord) {
        throw new Error("Không tìm thấy tác vụ trong cơ sở dữ liệu.");
      }

      await prisma.jobRun.update({
        where: { id: job.data.jobRunId },
        data: {
          status: "RUNNING",
          startedAt: new Date()
        }
      });
      await publisher.publish("mmo:updates", JSON.stringify({
        type: "job_status",
        workspaceId: job.data.workspaceId,
        jobId: job.data.jobId,
        jobRunId: job.data.jobRunId,
        status: "RUNNING"
      }));

      const account = jobRecord.accountId ? await prisma.account.findUnique({ where: { id: jobRecord.accountId } }) : null;
      const decryptedProxy = account?.proxyCiphertext ? decryptSecret(account.proxyCiphertext) : undefined;

      const log = async (level: string, message: string) => {
        await prisma.jobLog.create({
          data: {
            jobRunId: job.data.jobRunId,
            workspaceId: job.data.workspaceId,
            level: level.toLowerCase(),
            message,
            payloadJson: JSON.stringify({})
          }
        });
        await publisher.publish("mmo:updates", JSON.stringify({
          type: "job_log",
          workspaceId: job.data.workspaceId,
          jobId: job.data.jobId,
          jobRunId: job.data.jobRunId,
          log: { level, message, createdAt: new Date() }
        }));
      };

      await log("INFO", `Bat dau xu ly tac vu ${jobRecord.jobType} tren ${jobRecord.platform}`);
      if (decryptedProxy) {
        await log("INFO", `Su dung Proxy: ${decryptedProxy.split("@")[1] || decryptedProxy.split(":")[0]}`);
      }

      const result = await executeAutomation({
        platform: jobRecord.platform,
        jobType: jobRecord.jobType,
        optionsJson: jobRecord.optionsJson,
        options: JSON.parse(jobRecord.optionsJson || "{}"),
        proxy: decryptedProxy,
        log: (level, msg) => { void log(level, msg); }
      });

      await prisma.jobLog.create({
        data: {
          jobRunId: job.data.jobRunId,
          workspaceId: job.data.workspaceId,
          level: "info",
          message: result.note ?? "Hoan thanh tac vu.",
          payloadJson: JSON.stringify(result)
        }
      });

      if (result.snapshotData && result.snapshotData.length > 0) {
        await prisma.dataSnapshot.create({
          data: {
            workspaceId: job.data.workspaceId,
            accountId: jobRecord.accountId,
            sourcePlatform: jobRecord.platform,
            dataType: jobRecord.jobType,
            payloadJson: JSON.stringify(result.snapshotData),
            fetchedAt: new Date()
          }
        });
      }

      await prisma.jobRun.update({
        where: { id: job.data.jobRunId },
        data: {
          status: "DONE",
          finishedAt: new Date(),
          metricsJson: JSON.stringify(result)
        }
      });

      await prisma.job.update({
        where: { id: job.data.jobId },
        data: { status: "DONE" }
      });

      await publisher.publish("mmo:updates", JSON.stringify({
        type: "job_status",
        workspaceId: job.data.workspaceId,
        jobId: job.data.jobId,
        jobRunId: job.data.jobRunId,
        status: "DONE"
      }));

      await prisma.notification.create({
        data: {
          workspaceId: job.data.workspaceId,
          title: "Tac vu hoan tat",
          content: `Tac vu ${jobRecord.jobType} da hoan tat thanh cong.`,
          type: "SUCCESS"
        }
      });

      return result;
    },
    {
      connection: buildConnection()
    }
  );
  worker.on("error", (error) => {
    console.warn(`Worker connection unavailable: ${error instanceof Error ? error.message : String(error)}`);
  });

  worker.on("completed", (job) => {
    console.log(`Hoàn tất tác vụ: ${job?.id}`);
  });

  worker.on("failed", (job, error) => {
    console.error(`Tác vụ thất bại: ${job?.id}`, error);
    if (job?.data?.jobRunId) {
      void prisma.jobRun.update({
        where: { id: job.data.jobRunId },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : "Tac vu gap loi."
        }
      });

      void prisma.notification.create({
        data: {
          workspaceId: job.data.workspaceId,
          title: "Tac vu that bai",
          content: `Tac vu gap loi: ${error instanceof Error ? error.message : "Loi khong xac dinh."}`,
          type: "ERROR"
        }
      });
    }
  });

  console.log("Worker MMO đã sẵn sàng.");

  const shutdown = async () => {
    await worker.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void main().catch((error) => {
  console.error("Worker MMO gặp lỗi khởi động:", error);
  process.exitCode = 1;
});
