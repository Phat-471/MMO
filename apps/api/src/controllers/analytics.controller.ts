import { Controller, Get, UseGuards } from "@nestjs/common";
import { AnalyticsService } from "../services/analytics.service";
import { AccessTokenGuard } from "../auth/access-token.guard";

@Controller("analytics")
@UseGuards(AccessTokenGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("overview")
  getOverview() {
    return this.analyticsService.getOverview();
  }
}
