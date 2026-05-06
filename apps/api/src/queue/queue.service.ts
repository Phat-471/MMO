import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { JobRunQueuePayload } from "./queue.types";
import { buildRedisConnection, canConnectToRedis, getRuntimeMode } from "../runtime-env";

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private queue?: Queue<JobRunQueuePayload>;
  private redis?: Redis;
  private readonly connection = buildRedisConnection(process.cwd(), getRuntimeMode());
  private readonly logger = new Logger(QueueService.name);

  async onModuleInit() {
    const reachable = await canConnectToRedis(this.connection);
    if (!reachable) {
      this.logger.warn("Redis unavailable; queue features disabled in this environment.");
      return;
    }

    this.queue = new Queue<JobRunQueuePayload>("mmo-jobs", {
      connection: this.connection
    });
    this.redis = new Redis(this.connection);
    this.redis.on("error", (error) => {
      this.logger.warn(`Redis queue unavailable: ${error instanceof Error ? error.message : String(error)}`);
    });
  }

  async enqueueJobRun(payload: JobRunQueuePayload) {
    if (!this.queue) {
      throw new Error("Redis queue is unavailable.");
    }
    await this.queue.add("job-run", payload, {
      jobId: payload.jobRunId,
      attempts: 3,
      removeOnComplete: true,
      removeOnFail: 100
    });
  }

  async cancelJobRun(jobRunId: string) {
    if (!this.queue) {
      return;
    }
    const job = await this.queue.getJob(jobRunId);
    if (job) {
      await job.remove();
    }
  }

  async getStatus() {
    if (!this.redis || !this.queue) {
      return {
        status: "OFFLINE",
        ping: null,
        queueName: "mmo-jobs",
        counts: {
          waiting: 0,
          active: 0,
          delayed: 0,
          completed: 0,
          failed: 0,
          paused: 0
        },
        error: "Redis unavailable"
      };
    }

    try {
      const [ping, counts] = await Promise.all([this.redis.ping(), this.queue.getJobCounts("waiting", "active", "delayed", "completed", "failed", "paused")]);

      return {
        status: ping === "PONG" ? "ONLINE" : "DEGRADED",
        ping,
        queueName: "mmo-jobs",
        counts
      };
    } catch (error) {
      return {
        status: "OFFLINE",
        ping: null,
        queueName: "mmo-jobs",
        counts: {
          waiting: 0,
          active: 0,
          delayed: 0,
          completed: 0,
          failed: 0,
          paused: 0
        },
        error: error instanceof Error ? error.message : "Redis unavailable"
      };
    }
  }

  async onModuleDestroy() {
    await this.queue?.close();
    await this.redis?.quit().catch(() => null);
  }
}
