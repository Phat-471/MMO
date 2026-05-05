import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Platform } from "@prisma/client";
import { CreateJobDto, UpdateJobDto } from "../dto/job.dto";
import { PrismaService } from "../prisma.service";
import { QueueService } from "../queue/queue.service";
import { WorkspaceService } from "./workspace.service";
import { recordAudit } from "../lib/audit";
import * as cronParser from "cron-parser";
import { BillingService } from "./billing.service";

type JobKind =
  | "FETCH_POSTS"
  | "FETCH_COMMENTS"
  | "FETCH_PROFILE"
  | "CHECK_PROXY"
  | "ACCOUNT_HEALTH"
  | "GROUP_MODERATION"
  | "KEYWORD_MONITOR"
  | "WORKFLOW_BUILD"
  | "FETCH_VIDEOS"
  | "POST_GROUP"
  | "NURTURE_ACCOUNT"
  | "AUTO_LIKE"
  | "AUTO_COMMENT"
  | "REUP_VIDEO"
  | "SHOPEE_VIDEO_AFF"
  | "SHOPEE_LINK_CONVERT"
  | "AI_CONTENT"
  | "MARKETPLACE_SCAN"
  | "BULK_MSG"
  | "AUTO_JOIN_GROUP"
  | "AUTO_DM"
  | "CHANGE_PASSWORD"
  | "REG_ACCOUNT"
  | "SHOPEE_TRENDING"
  | "EXPORT_DATA"
  | "STRESS_TEST"
  | "CLEANUP";
type JobModeValue = "ONCE" | "SCHEDULED" | "RECURRING";
type JobStatusValue = "DRAFT" | "QUEUED" | "RUNNING" | "PAUSED" | "DONE" | "FAILED";

@Injectable()
export class JobService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly workspaceService: WorkspaceService,
    private readonly billingService: BillingService
  ) {}

  async list(workspaceId: string, userId: string) {
    await this.workspaceService.assertWorkspaceAccess(workspaceId, userId);

    const items = await this.prisma.job.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" }
    });

    return {
      message: "Danh sach tac vu.",
      data: items
    };
  }

  async create(workspaceId: string, userId: string, dto: CreateJobDto) {
    await this.workspaceService.assertWorkspaceAccess(workspaceId, userId);

    // Check account quota if adding a job (limit based on total accounts in workspace usually, 
    // but here we check before job creation if account needed)
    if (dto.accountId) {
      await this.billingService.checkQuota(workspaceId, "accountCount");
    }

    const job = await this.prisma.job.create({
      data: {
        workspaceId,
        accountId: dto.accountId ?? null,
        platform: this.normalizePlatform(dto.platform),
        jobType: this.normalizeJobType(dto.jobType),
        mode: this.normalizeMode(dto.mode),
        scheduleCron: dto.scheduleCron ?? null,
        optionsJson: dto.optionsJson ?? "{}"
      }
    });

    await recordAudit(this.prisma, {
      workspaceId,
      userId,
      action: "job.create",
      entityType: "Job",
      entityId: job.id,
      metadata: {
        platform: job.platform,
        jobType: job.jobType,
        mode: job.mode,
        status: job.status
      }
    });

    return {
      message: "Tao tac vu thanh cong.",
      data: job
    };
  }

  async detail(jobId: string, userId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { runs: true }
    });

    if (!job) {
      throw new NotFoundException("Khong tim thay tac vu.");
    }

    await this.workspaceService.assertWorkspaceAccess(job.workspaceId, userId);

    return {
      message: "Lay chi tiet tac vu thanh cong.",
      data: job
    };
  }

  async runs(jobId: string, userId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      select: { workspaceId: true }
    });

    if (!job) {
      throw new NotFoundException("Khong tim thay tac vu.");
    }

    await this.workspaceService.assertWorkspaceAccess(job.workspaceId, userId);

    const items = await this.prisma.jobRun.findMany({
      where: { jobId },
      orderBy: { createdAt: "desc" },
      include: {
        logs: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    return {
      message: "Danh sach lan chay tac vu.",
      data: items
    };
  }

  async runDetail(runId: string, userId: string) {
    const run = await this.prisma.jobRun.findUnique({
      where: { id: runId },
      include: {
        job: true,
        logs: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!run) {
      throw new NotFoundException("Khong tim thay lan chay.");
    }

    await this.workspaceService.assertWorkspaceAccess(run.job.workspaceId, userId);

    return {
      message: "Lay chi tiet lan chay thanh cong.",
      data: run
    };
  }

  async runLogs(runId: string, userId: string) {
    const run = await this.prisma.jobRun.findUnique({
      where: { id: runId },
      include: {
        job: true
      }
    });

    if (!run) {
      throw new NotFoundException("Khong tim thay lan chay.");
    }

    await this.workspaceService.assertWorkspaceAccess(run.job.workspaceId, userId);

    const items = await this.prisma.jobLog.findMany({
      where: { jobRunId: runId },
      orderBy: { createdAt: "asc" }
    });

    return {
      message: "Danh sach nhat ky lan chay.",
      data: items
    };
  }

  async update(jobId: string, userId: string, dto: UpdateJobDto) {
    const existing = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!existing) {
      throw new NotFoundException("Khong tim thay tac vu.");
    }

    await this.workspaceService.assertWorkspaceAccess(existing.workspaceId, userId);

    const job = await this.prisma.job.update({
      where: { id: jobId },
      data: {
        platform: dto.platform ? this.normalizePlatform(dto.platform) : undefined,
        jobType: dto.jobType ? this.normalizeJobType(dto.jobType) : undefined,
        accountId: dto.accountId ?? undefined,
        mode: dto.mode ? this.normalizeMode(dto.mode) : undefined,
        scheduleCron: dto.scheduleCron ?? undefined,
        status: this.normalizeJobStatus(dto.status),
        optionsJson: dto.optionsJson ?? undefined
      }
    });

    await recordAudit(this.prisma, {
      workspaceId: existing.workspaceId,
      userId,
      action: "job.update",
      entityType: "Job",
      entityId: job.id,
      metadata: {
        status: job.status,
        mode: job.mode
      }
    });

    return {
      message: "Cap nhat tac vu thanh cong.",
      data: job
    };
  }

  async remove(jobId: string, userId: string) {
    const existing = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!existing) {
      throw new NotFoundException("Khong tim thay tac vu.");
    }

    await this.workspaceService.assertWorkspaceAccess(existing.workspaceId, userId);

    await this.prisma.job.delete({ where: { id: jobId } });

    await recordAudit(this.prisma, {
      workspaceId: existing.workspaceId,
      userId,
      action: "job.delete",
      entityType: "Job",
      entityId: jobId,
      metadata: {
        platform: existing.platform,
        jobType: existing.jobType
      }
    });

    return {
      message: "Xoa tac vu thanh cong.",
      data: {
        id: jobId
      }
    };
  }

  async run(jobId: string, userId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException("Khong tim thay tac vu.");
    }

    await this.workspaceService.assertWorkspaceAccess(job.workspaceId, userId);

    // Quota check
    await this.billingService.checkQuota(job.workspaceId, "jobCount");
    
    if (job.jobType.startsWith("FETCH_")) {
      await this.billingService.checkQuota(job.workspaceId, "fetchCount");
    }

    const now = new Date();
    let nextRunAt: Date | null = null;

    if (job.mode === "RECURRING" && job.scheduleCron) {
      try {
        const interval = (cronParser as any).parseExpression(job.scheduleCron);
        nextRunAt = interval.next().toDate();
      } catch (error) {
        // Fallback or ignore invalid cron for now
      }
    }

    const run = await this.prisma.jobRun.create({
      data: {
        jobId,
        workspaceId: job.workspaceId,
        status: "QUEUED"
      }
    });

    await this.prisma.job.update({
      where: { id: jobId },
      data: { 
        status: "QUEUED",
        lastRunAt: now,
        nextRunAt
      }
    });

    try {
      await this.queueService.enqueueJobRun({
        jobRunId: run.id,
        jobId,
        workspaceId: job.workspaceId
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Khong the dua tac vu vao hang doi.";
      await this.prisma.jobRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          errorMessage: message
        }
      });
      await this.prisma.job.update({
        where: { id: jobId },
        data: { status: "FAILED" }
      });
      await recordAudit(this.prisma, {
        workspaceId: job.workspaceId,
        userId,
        action: "job.run.failed",
        entityType: "JobRun",
        entityId: run.id,
        metadata: {
          jobId: job.id,
          error: message
        }
      });
      throw new BadRequestException(message);
    }

    // Record usage only after the job has been accepted by the queue.
    await this.billingService.recordUsage(job.workspaceId, "jobCount");
    if (job.jobType.startsWith("FETCH_")) {
      await this.billingService.recordUsage(job.workspaceId, "fetchCount");
    }

    await recordAudit(this.prisma, {
      workspaceId: job.workspaceId,
      userId,
      action: "job.run",
      entityType: "JobRun",
      entityId: run.id,
      metadata: {
        jobId: job.id,
        status: run.status
      }
    });

    return {
      message: "Da dua tac vu vao hang doi chay.",
      data: run
    };
  }

  async cancel(jobId: string, userId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { runs: { where: { status: { in: ["QUEUED", "RUNNING"] } } } }
    });

    if (!job) {
      throw new NotFoundException("Khong tim thay tac vu.");
    }

    await this.workspaceService.assertWorkspaceAccess(job.workspaceId, userId);

    for (const run of job.runs) {
      await this.queueService.cancelJobRun(run.id);
      await this.prisma.jobRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          errorMessage: "Tac vu bi huy boi nguoi dung."
        }
      });
    }

    await this.prisma.job.update({
      where: { id: jobId },
      data: { status: "FAILED" }
    });

    await recordAudit(this.prisma, {
      workspaceId: job.workspaceId,
      userId,
      action: "job.cancel",
      entityType: "Job",
      entityId: job.id,
      metadata: {
        activeRunsCancelled: job.runs.length
      }
    });

    return {
      message: "Da huy tac vu thanh cong.",
      data: { id: jobId }
    };
  }

  async pause(jobId: string, userId: string, adminOverride = false) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        runs: {
          where: { status: "QUEUED" },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!job) {
      throw new NotFoundException("Khong tim thay tac vu.");
    }

    if (!adminOverride) {
      await this.workspaceService.assertWorkspaceAccess(job.workspaceId, userId);
    }

    for (const run of job.runs) {
      await this.queueService.cancelJobRun(run.id);
      await this.prisma.jobRun.update({
        where: { id: run.id },
        data: {
          status: "PAUSED",
          finishedAt: new Date(),
          errorMessage: "Tac vu tam dung boi nguoi dung."
        }
      });
    }

    await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: "PAUSED",
        nextRunAt: null
      }
    });

    await recordAudit(this.prisma, {
      workspaceId: job.workspaceId,
      userId,
      action: "job.pause",
      entityType: "Job",
      entityId: job.id,
      metadata: {
        cancelledQueuedRuns: job.runs.length
      }
    });

    return {
      message: "Da tam dung tac vu.",
      data: {
        id: jobId,
        status: "PAUSED"
      }
    };
  }

  async resume(jobId: string, userId: string, adminOverride = false) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      throw new NotFoundException("Khong tim thay tac vu.");
    }

    if (!adminOverride) {
      await this.workspaceService.assertWorkspaceAccess(job.workspaceId, userId);
    }

    const nextRunAt = job.mode === "RECURRING" && job.scheduleCron ? this.calculateNextRun(job.scheduleCron) : null;

    await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: "QUEUED",
        nextRunAt
      }
    });

    await recordAudit(this.prisma, {
      workspaceId: job.workspaceId,
      userId,
      action: "job.resume",
      entityType: "Job",
      entityId: job.id,
      metadata: {
        nextRunAt: nextRunAt?.toISOString() ?? null
      }
    });

    return {
      message: "Da tiep tuc tac vu.",
      data: {
        id: jobId,
        status: "QUEUED",
        nextRunAt: nextRunAt?.toISOString() ?? null
      }
    };
  }

  async retryRun(runId: string, userId: string, adminOverride = false) {
    const run = await this.prisma.jobRun.findUnique({
      where: { id: runId },
      include: {
        job: true
      }
    });

    if (!run) {
      throw new NotFoundException("Khong tim thay lan chay.");
    }

    if (!adminOverride) {
      await this.workspaceService.assertWorkspaceAccess(run.job.workspaceId, userId);
    }

    if (run.status !== "FAILED") {
      throw new ConflictException("Chi co the retry lan chay that bai.");
    }

    if (run.job.status === "PAUSED") {
      await this.prisma.job.update({
        where: { id: run.jobId },
        data: { status: "QUEUED" }
      });
    } else if (run.job.mode === "RECURRING" || run.job.status !== "QUEUED") {
      const nextRunAt = run.job.mode === "RECURRING" && run.job.scheduleCron ? this.calculateNextRun(run.job.scheduleCron) : null;
      await this.prisma.job.update({
        where: { id: run.jobId },
        data: {
          status: "QUEUED",
          nextRunAt
        }
      });
    }

    const newRun = await this.prisma.jobRun.create({
      data: {
        jobId: run.jobId,
        workspaceId: run.workspaceId,
        status: "QUEUED"
      }
    });

    await this.queueService.enqueueJobRun({
      jobRunId: newRun.id,
      jobId: run.jobId,
      workspaceId: run.workspaceId
    });

    await recordAudit(this.prisma, {
      workspaceId: run.workspaceId,
      userId,
      action: "job.retry",
      entityType: "JobRun",
      entityId: newRun.id,
      metadata: {
        sourceRunId: run.id,
        jobId: run.jobId
      }
    });

    return {
      message: "Da retry lan chay thanh cong.",
      data: newRun
    };
  }

  private normalizePlatform(platform: string): Platform {
    const value = platform.toLowerCase();
    if (value === "facebook") {
      return "FACEBOOK";
    }
    if (value === "tiktok") {
      return "TIKTOK";
    }
    if (value === "shopee") {
      return "SHOPEE";
    }
    if (value === "youtube") {
      return "YOUTUBE";
    }
    if (value === "system") {
      return "SYSTEM";
    }
    if (value === "data") {
      return "DATA";
    }
    throw new BadRequestException("Nen tang khong hop le");
  }

  private normalizeJobType(jobType: string): JobKind {
    const value = jobType.toUpperCase();
    const valid: JobKind[] = [
      "FETCH_POSTS",
      "FETCH_COMMENTS",
      "FETCH_PROFILE",
      "CHECK_PROXY",
      "ACCOUNT_HEALTH",
      "GROUP_MODERATION",
      "KEYWORD_MONITOR",
      "WORKFLOW_BUILD",
      "FETCH_VIDEOS",
      "POST_GROUP",
      "NURTURE_ACCOUNT",
      "AUTO_LIKE",
      "AUTO_COMMENT",
      "REUP_VIDEO",
      "SHOPEE_VIDEO_AFF",
      "SHOPEE_LINK_CONVERT",
      "AI_CONTENT",
      "MARKETPLACE_SCAN",
      "BULK_MSG",
      "AUTO_JOIN_GROUP",
      "AUTO_DM",
      "CHANGE_PASSWORD",
      "REG_ACCOUNT",
      "SHOPEE_TRENDING",
      "EXPORT_DATA",
      "STRESS_TEST",
      "CLEANUP"
    ];

    if (valid.includes(value as JobKind)) {
      return value as JobKind;
    }

    throw new BadRequestException(`Loai tac vu khong hop le: ${jobType}`);
  }

  private normalizeMode(mode?: string): JobModeValue {
    const value = (mode ?? "once").toLowerCase();
    if (value === "once") {
      return "ONCE";
    }
    if (value === "scheduled") {
      return "SCHEDULED";
    }
    if (value === "recurring") {
      return "RECURRING";
    }
    throw new BadRequestException("Che do tac vu khong hop le");
  }

  private normalizeJobStatus(status?: string): JobStatusValue | undefined {
    if (!status) {
      return undefined;
    }

    const value = status.toLowerCase();
    if (value === "draft") {
      return "DRAFT";
    }
    if (value === "queued") {
      return "QUEUED";
    }
    if (value === "running") {
      return "RUNNING";
    }
    if (value === "paused") {
      return "PAUSED";
    }
    if (value === "done") {
      return "DONE";
    }
    if (value === "failed") {
      return "FAILED";
    }

    throw new Error("Trang thai tac vu khong hop le");
  }

  private calculateNextRun(cronExpression: string): Date | null {
    try {
      const interval = (cronParser as any).parseExpression(cronExpression);
      return interval.next().toDate();
    } catch {
      return null;
    }
  }
}
