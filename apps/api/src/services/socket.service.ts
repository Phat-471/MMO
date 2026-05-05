import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { EventsGateway } from '../gateways/events.gateway';
import { PrismaService } from '../prisma.service';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { buildRedisConnection, canConnectToRedis, getRuntimeMode } = require("../../../../env/runtime-env.cjs");

@Injectable()
export class SocketService implements OnModuleInit, OnModuleDestroy {
  private redis?: Redis;
  private readonly connection = buildRedisConnection(process.cwd(), getRuntimeMode());
  private readonly logger = new Logger(SocketService.name);

  constructor(
    private readonly eventsGateway: EventsGateway,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    const reachable = await canConnectToRedis(this.connection);
    if (!reachable) {
      this.logger.warn("Redis unavailable; realtime updates disabled in this environment.");
      return;
    }

    this.redis = new Redis(this.connection);
    this.redis.on('error', (error) => {
      this.logger.warn(`Redis socket unavailable: ${error instanceof Error ? error.message : String(error)}`);
    });

    try {
      await this.redis.subscribe('mmo:updates');
    } catch (error) {
      this.logger.warn(`Realtime updates disabled: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }

    this.redis.on('message', async (channel, message) => {
      if (channel === 'mmo:updates') {
        try {
          const data = JSON.parse(message);
          await this.handleUpdate(data);
        } catch (error) {
          this.logger.error('Failed to parse Redis message', error);
        }
      }
    });
    this.logger.log('SocketService initialized, subscribed to mmo:updates');
  }

  private async handleUpdate(data: any) {
    const { type, workspaceId, jobRunId, jobId } = data;

    // Enrichment for job_log
    if (type === 'job_log' && jobRunId) {
      try {
        const run = await this.prisma.jobRun.findUnique({
          where: { id: jobRunId },
          include: {
            workspace: { select: { name: true } },
            job: { select: { jobType: true, platform: true } },
          },
        });
        if (run) {
          data.log.workspace = { name: run.workspace.name };
          data.log.jobRun = { job: { jobType: run.job.jobType, platform: run.job.platform } };
        }
      } catch (e) {
        this.logger.error('Failed to enrich job_log', e);
      }
    }
    
    // Broadcast to workspace room
    this.eventsGateway.emitToWorkspace(workspaceId, type, data);
    
    // Also broadcast to admins for global monitoring
    this.eventsGateway.emitToAdmins(type, data);
  }

  async onModuleDestroy() {
    await this.redis?.quit().catch(() => null);
  }
}
