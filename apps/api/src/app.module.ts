import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AccessTokenGuard } from "./auth/access-token.guard";
import { ConfigModule } from "@nestjs/config";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { resolveRuntimeEnvPaths } = require("../../../env/runtime-env.cjs");
import { ScheduleModule } from "@nestjs/schedule";
import { AccountController } from "./controllers/account.controller";
import { AdminController } from "./controllers/admin.controller";
import { AuthController } from "./controllers/auth.controller";
import { BillingController } from "./controllers/billing.controller";
import { DashboardController } from "./controllers/dashboard.controller";
import { HealthController } from "./controllers/health.controller";
import { JobController } from "./controllers/job.controller";
import { ToolController } from "./controllers/tool.controller";
import { WorkspaceController } from "./controllers/workspace.controller";
import { NotificationController } from "./controllers/notification.controller";
import { DataController } from "./controllers/data.controller";
import { MediaAssetController } from "./controllers/media-asset.controller";
import { AnalyticsController } from "./controllers/analytics.controller";
import { PrismaService } from "./prisma.service";
import { AuthService } from "./services/auth.service";
import { WorkspaceService } from "./services/workspace.service";
import { AccountService } from "./services/account.service";
import { AdminService } from "./services/admin.service";
import { BillingService } from "./services/billing.service";
import { DashboardService } from "./services/dashboard.service";
import { JobService } from "./services/job.service";
import { ToolService } from "./services/tool.service";
import { SchedulerService } from "./services/scheduler.service";
import { NotificationService } from "./services/notification.service";
import { DataService } from "./services/data.service";
import { MediaAssetService } from "./services/media-asset.service";
import { AnalyticsService } from "./services/analytics.service";
import { SocketService } from "./services/socket.service";
import { QueueService } from "./queue/queue.service";
import { EventsGateway } from "./gateways/events.gateway";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: resolveRuntimeEnvPaths(process.cwd())
    }),
    ScheduleModule.forRoot()
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AccessTokenGuard
    },
    PrismaService,
    AuthService,
    WorkspaceService,
    AccountService,
    AdminService,
    BillingService,
    DashboardService,
    JobService,
    ToolService,
    SchedulerService,
    NotificationService,
    DataService,
    MediaAssetService,
    AnalyticsService,
    QueueService,
    EventsGateway,
    SocketService
  ],
  controllers: [
    HealthController,
    AdminController,
    AuthController,
    WorkspaceController,
    AccountController,
    JobController,
    ToolController,
    BillingController,
    DashboardController,
    NotificationController,
    DataController,
    MediaAssetController,
    AnalyticsController
  ]
})
export class AppModule {}
