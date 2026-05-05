import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma.service";
import { QueueService } from "../queue/queue.service";
import * as cronParser from "cron-parser";
import { BillingService } from "./billing.service";

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly billingService: BillingService
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    this.logger.debug("Checking for recurring jobs...");
    
    const now = new Date();
    
    // Find ACTIVE RECURRING jobs that need to run
    // We assume QUEUED status for recurring jobs means "Waiting for next schedule"
    const jobs = await this.prisma.job.findMany({
      where: {
        mode: "RECURRING",
        status: "QUEUED",
        scheduleCron: { not: null },
        OR: [
          { nextRunAt: null },
          { nextRunAt: { lte: now } }
        ]
      }
    });

    if (jobs.length > 0) {
      this.logger.log(`Found ${jobs.length} jobs to trigger.`);
    }

    for (const job of jobs) {
      try {
        await this.triggerJob(job);
      } catch (error) {
        this.logger.error(`Failed to trigger job ${job.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  private async triggerJob(job: any) {
    this.logger.log(`Triggering recurring job ${job.id} (${job.jobType})`);

    // Quota check
    try {
      await this.billingService.checkQuota(job.workspaceId, "jobCount");
      if (job.jobType.startsWith("FETCH_")) {
        await this.billingService.checkQuota(job.workspaceId, "fetchCount");
      }
    } catch (quotaError: unknown) {
      this.logger.warn(`Quota exceeded for job ${job.id}: ${quotaError instanceof Error ? quotaError.message : String(quotaError)}`);
      // If quota exceeded, we might want to pause the job or just wait for next interval
      // For now, let's just skip this run but update nextRunAt to try again later
      const nextRunAt = this.calculateNextRun(job.scheduleCron);
      await this.prisma.job.update({
        where: { id: job.id },
        data: { nextRunAt }
      });
      return;
    }

    // 1. Calculate next run BEFORE creating the run to avoid race conditions or missed intervals
    const nextRunAt = this.calculateNextRun(job.scheduleCron);

    // 2. Create a new JobRun record
    const run = await this.prisma.jobRun.create({
      data: {
        jobId: job.id,
        workspaceId: job.workspaceId,
        status: "QUEUED"
      }
    });

    // 3. Update the parent job
    await this.prisma.job.update({
      where: { id: job.id },
      data: {
        lastRunAt: new Date(),
        nextRunAt
      }
    });

    // 3.1 Record usage
    await this.billingService.recordUsage(job.workspaceId, "jobCount");
    if (job.jobType.startsWith("FETCH_")) {
      await this.billingService.recordUsage(job.workspaceId, "fetchCount");
    }

    // 4. Enqueue the run for the worker
    await this.queueService.enqueueJobRun({
      jobRunId: run.id,
      jobId: job.id,
      workspaceId: job.workspaceId
    });
  }

  private calculateNextRun(cronExpression: string): Date | null {
    try {
      const interval = (cronParser as any).parseExpression(cronExpression);
      return interval.next().toDate();
    } catch (error) {
      this.logger.error(`Invalid cron expression "${cronExpression}": ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
}
