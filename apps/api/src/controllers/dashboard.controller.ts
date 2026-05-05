import { Controller, Get } from "@nestjs/common";
import { CurrentAuth } from "../auth/current-auth.decorator";
import { DashboardService } from "../services/dashboard.service";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("summary")
  summary(@CurrentAuth() auth: { userId: string; workspaceId: string | null }) {
    return this.dashboardService.summary(auth.workspaceId ?? "", auth.userId);
  }

  @Get("recent-jobs")
  recentJobs(@CurrentAuth() auth: { userId: string; workspaceId: string | null }) {
    return this.dashboardService.recentJobs(auth.workspaceId ?? "", auth.userId);
  }

  @Get("risk-items")
  riskItems(@CurrentAuth() auth: { userId: string; workspaceId: string | null }) {
    return this.dashboardService.riskItems(auth.workspaceId ?? "", auth.userId);
  }
}
