import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { CurrentAuth } from "../auth/current-auth.decorator";
import { Public } from "../auth/public.decorator";
import { BillingService } from "../services/billing.service";

@Controller()
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get("workspaces/:workspaceId/billing")
  billing(@CurrentAuth() auth: { userId: string }, @Param("workspaceId") workspaceId: string) {
    return this.billingService.billing(workspaceId, auth.userId);
  }

  @Get("workspaces/:workspaceId/usage")
  usage(@CurrentAuth() auth: { userId: string }, @Param("workspaceId") workspaceId: string) {
    return this.billingService.usage(workspaceId, auth.userId);
  }

  @Get("billing/plans")
  plans(@CurrentAuth() auth: { userId: string }) {
    return this.billingService.plans(auth.userId);
  }

  @Post("billing/checkout")
  checkout(@CurrentAuth() auth: { userId: string }, @Body() body: { workspaceId: string; planCode?: "FREE" | "STARTER" | "PRO" | "ENTERPRISE" }) {
    return this.billingService.checkout(body.workspaceId, auth.userId, body.planCode);
  }

  @Get("billing/checkout/:checkoutId")
  checkoutDetail(@CurrentAuth() auth: { userId: string }, @Param("checkoutId") checkoutId: string, @Query("workspaceId") workspaceId: string) {
    return this.billingService.checkoutDetail(workspaceId, auth.userId, checkoutId);
  }

  @Public()
  @Post("billing/webhook")
  webhook() {
    return this.billingService.webhook();
  }
}
