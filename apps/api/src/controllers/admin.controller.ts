import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentAuth } from "../auth/current-auth.decorator";
import { JobService } from "../services/job.service";
import { AdminService, type AdminListQuery } from "../services/admin.service";

@Controller("admin")
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly jobService: JobService
  ) {}

  @Get("overview")
  overview(@CurrentAuth() auth: { userId: string }) {
    return this.adminService.overview(auth.userId);
  }

  @Get("system")
  system(@CurrentAuth() auth: { userId: string }) {
    return this.adminService.system(auth.userId);
  }

  @Patch("system/payment")
  updatePaymentSettings(
    @CurrentAuth() auth: { userId: string },
    @Body()
    body: {
      bankName: string;
      bankCode: string;
      accountName: string;
      accountNumber: string;
      transferPrefix: string;
      note?: string | null;
      isActive?: boolean;
    }
  ) {
    return this.adminService.updatePaymentSettings(auth.userId, body);
  }

  @Patch("system/integration")
  updateIntegrationSettings(
    @CurrentAuth() auth: { userId: string },
    @Body()
    body: {
      apiBaseUrl: string;
      apiKey: string;
      apiSecret: string;
      webhookUrl: string;
      webhookSecret: string;
      redisHost: string;
      redisPort: number;
      workerConcurrency: number;
      note?: string | null;
      isActive?: boolean;
    }
  ) {
    return this.adminService.updateIntegrationSettings(auth.userId, body);
  }

  @Patch("system/storage")
  updateStorageSettings(
    @CurrentAuth() auth: { userId: string },
    @Body()
    body: {
      assetBaseUrl: string;
      cdnBaseUrl: string;
      uploadPath: string;
      assetMode: "LOCAL" | "CDN" | "HYBRID";
      autoApproveAssets?: boolean;
      allowRemoteFetch?: boolean;
      defaultVideoWatermark?: boolean;
      note?: string | null;
      isActive?: boolean;
    }
  ) {
    return this.adminService.updateStorageSettings(auth.userId, body);
  }

  @Patch("system/security")
  updateSecuritySettings(
    @CurrentAuth() auth: { userId: string },
    @Body()
    body: {
      maintenanceMode?: boolean;
      requireTwoFactor?: boolean;
      apiRateLimitPerMinute: number;
      sessionTtlHours: number;
      adminIpWhitelist: string;
      note?: string | null;
      isActive?: boolean;
    }
  ) {
    return this.adminService.updateSecuritySettings(auth.userId, body);
  }

  @Get("insights")
  insights(@CurrentAuth() auth: { userId: string }) {
    return this.adminService.insights(auth.userId);
  }

  @Get("users")
  users(@CurrentAuth() auth: { userId: string }, @Query() query: AdminListQuery) {
    return this.adminService.users(auth.userId, query);
  }

  @Get("snapshots")
  snapshots(@CurrentAuth() auth: { userId: string }, @Query() query: AdminListQuery) {
    return this.adminService.snapshots(auth.userId, query);
  }

  @Post("users")
  createUser(
    @CurrentAuth() auth: { userId: string },
    @Body() body: { email: string; password: string; role?: "USER" | "ADMIN"; status?: "ACTIVE" | "DISABLED" }
  ) {
    return this.adminService.createUser(auth.userId, body);
  }

  @Patch("users/bulk")
  bulkUpdateUsers(
    @CurrentAuth() auth: { userId: string },
    @Body() body: { userIds: string[]; role?: "USER" | "ADMIN"; status?: "ACTIVE" | "DISABLED" }
  ) {
    return this.adminService.bulkUpdateUsers(auth.userId, body);
  }

  @Delete("users/bulk")
  bulkDeleteUsers(@CurrentAuth() auth: { userId: string }, @Body() body: { userIds: string[] }) {
    return this.adminService.bulkDeleteUsers(auth.userId, body);
  }

  @Get("users/:userId/detail")
  userDetail(@CurrentAuth() auth: { userId: string }, @Param("userId") userId: string) {
    return this.adminService.userDetail(auth.userId, userId);
  }

  @Patch("users/:userId")
  updateUser(
    @CurrentAuth() auth: { userId: string },
    @Param("userId") userId: string,
    @Body() body: { role?: "USER" | "ADMIN"; status?: "ACTIVE" | "DISABLED" }
  ) {
    return this.adminService.updateUser(auth.userId, userId, body);
  }

  @Delete("users/:userId")
  deleteUser(@CurrentAuth() auth: { userId: string }, @Param("userId") userId: string) {
    return this.adminService.deleteUser(auth.userId, userId);
  }

  @Get("workspaces")
  workspaces(@CurrentAuth() auth: { userId: string }, @Query() query: AdminListQuery) {
    return this.adminService.workspaces(auth.userId, query);
  }

  @Post("workspaces")
  createWorkspace(
    @CurrentAuth() auth: { userId: string },
    @Body() body: { name: string; ownerEmail?: string; slug?: string }
  ) {
    return this.adminService.createWorkspace(auth.userId, body);
  }

  @Patch("workspaces/bulk")
  bulkUpdateWorkspaces(
    @CurrentAuth() auth: { userId: string },
    @Body() body: { workspaceIds: string[]; status?: "ACTIVE" | "SUSPENDED" }
  ) {
    return this.adminService.bulkUpdateWorkspaces(auth.userId, body);
  }

  @Delete("workspaces/bulk")
  bulkDeleteWorkspaces(@CurrentAuth() auth: { userId: string }, @Body() body: { workspaceIds: string[] }) {
    return this.adminService.bulkDeleteWorkspaces(auth.userId, body);
  }

  @Get("workspaces/:workspaceId/detail")
  workspaceDetail(@CurrentAuth() auth: { userId: string }, @Param("workspaceId") workspaceId: string) {
    return this.adminService.workspaceDetail(auth.userId, workspaceId);
  }

  @Patch("workspaces/:workspaceId")
  updateWorkspace(
    @CurrentAuth() auth: { userId: string },
    @Param("workspaceId") workspaceId: string,
    @Body() body: { status?: "ACTIVE" | "SUSPENDED" }
  ) {
    return this.adminService.updateWorkspace(auth.userId, workspaceId, body);
  }

  @Delete("workspaces/:workspaceId")
  deleteWorkspace(@CurrentAuth() auth: { userId: string }, @Param("workspaceId") workspaceId: string) {
    return this.adminService.deleteWorkspace(auth.userId, workspaceId);
  }

  @Patch("workspaces/:workspaceId/plan")
  assignPlan(
    @CurrentAuth() auth: { userId: string },
    @Param("workspaceId") workspaceId: string,
    @Body() body: { planCode: "FREE" | "STARTER" | "PRO" | "ENTERPRISE" }
  ) {
    return this.adminService.assignPlan(auth.userId, workspaceId, body);
  }

  @Get("accounts")
  accounts(@CurrentAuth() auth: { userId: string }, @Query() query: AdminListQuery) {
    return this.adminService.accounts(auth.userId, query);
  }

  @Post("accounts")
  createAccount(
    @CurrentAuth() auth: { userId: string },
    @Body()
    body: {
      workspaceId: string;
      label: string;
      platform: "FACEBOOK" | "TIKTOK" | "SHOPEE" | "YOUTUBE";
      status?: "ALIVE" | "DEAD" | "LIMITED" | "PENDING";
      email?: string;
      password?: string;
      cookie?: string;
      proxy?: string;
      twoFa?: string;
      tag?: string | null;
      groupName?: string | null;
      note?: string | null;
    }
  ) {
    return this.adminService.createAccount(auth.userId, body);
  }

  @Patch("accounts/bulk")
  bulkUpdateAccounts(
    @CurrentAuth() auth: { userId: string },
    @Body() body: { accountIds: string[]; status?: "ALIVE" | "DEAD" | "LIMITED" | "PENDING" }
  ) {
    return this.adminService.bulkUpdateAccounts(auth.userId, body);
  }

  @Delete("accounts/bulk")
  bulkDeleteAccounts(@CurrentAuth() auth: { userId: string }, @Body() body: { accountIds: string[] }) {
    return this.adminService.bulkDeleteAccounts(auth.userId, body);
  }

  @Get("accounts/:accountId/detail")
  accountDetail(@CurrentAuth() auth: { userId: string }, @Param("accountId") accountId: string) {
    return this.adminService.accountDetail(auth.userId, accountId);
  }

  @Patch("accounts/:accountId")
  updateAccount(
    @CurrentAuth() auth: { userId: string },
    @Param("accountId") accountId: string,
    @Body()
    body: {
      label?: string;
      platform?: "FACEBOOK" | "TIKTOK" | "SHOPEE" | "YOUTUBE";
      status?: "ALIVE" | "DEAD" | "LIMITED" | "PENDING";
      tag?: string | null;
      groupName?: string | null;
      note?: string | null;
    }
  ) {
    return this.adminService.updateAccount(auth.userId, accountId, body);
  }

  @Delete("accounts/:accountId")
  deleteAccount(@CurrentAuth() auth: { userId: string }, @Param("accountId") accountId: string) {
    return this.adminService.deleteAccount(auth.userId, accountId);
  }

  @Get("jobs")
  jobs(@CurrentAuth() auth: { userId: string }, @Query() query: AdminListQuery) {
    return this.adminService.jobs(auth.userId, query);
  }

  @Post("jobs")
  createJob(
    @CurrentAuth() auth: { userId: string },
    @Body()
    body: {
      workspaceId: string;
      accountId?: string | null;
      platform: "FACEBOOK" | "TIKTOK" | "SHOPEE" | "YOUTUBE";
      jobType: "FETCH_POSTS" | "FETCH_COMMENTS" | "FETCH_PROFILE" | "CHECK_PROXY" | "ACCOUNT_HEALTH" | "GROUP_MODERATION" | "KEYWORD_MONITOR" | "WORKFLOW_BUILD" | "REUP_VIDEO" | "SHOPEE_VIDEO_AFF" | "SHOPEE_LINK_CONVERT" | "AI_CONTENT";
      mode?: "ONCE" | "SCHEDULED" | "RECURRING";
      scheduleCron?: string | null;
      optionsJson?: string;
    }
  ) {
    return this.adminService.createJob(auth.userId, body);
  }

  @Patch("jobs/bulk")
  bulkUpdateJobs(
    @CurrentAuth() auth: { userId: string },
    @Body() body: { jobIds: string[]; status?: "DRAFT" | "QUEUED" | "RUNNING" | "PAUSED" | "DONE" | "FAILED" }
  ) {
    return this.adminService.bulkUpdateJobs(auth.userId, body);
  }

  @Delete("jobs/bulk")
  bulkDeleteJobs(@CurrentAuth() auth: { userId: string }, @Body() body: { jobIds: string[] }) {
    return this.adminService.bulkDeleteJobs(auth.userId, body);
  }

  @Get("jobs/:jobId/detail")
  jobDetail(@CurrentAuth() auth: { userId: string }, @Param("jobId") jobId: string) {
    return this.adminService.jobDetail(auth.userId, jobId);
  }

  @Get("job-runs/:runId/detail")
  jobRunDetail(@CurrentAuth() auth: { userId: string }, @Param("runId") runId: string) {
    return this.adminService.jobRunDetail(auth.userId, runId);
  }

  @Get("audit-logs")
  auditLogs(@CurrentAuth() auth: { userId: string }, @Query() query: AdminListQuery) {
    return this.adminService.auditLogs(auth.userId, query);
  }

  @Get("job-logs")
  jobLogs(@CurrentAuth() auth: { userId: string }, @Query() query: AdminListQuery) {
    return this.adminService.jobLogs(auth.userId, query);
  }

  @Patch("jobs/:jobId")
  updateJob(
    @CurrentAuth() auth: { userId: string },
    @Param("jobId") jobId: string,
    @Body() body: { status?: "DRAFT" | "QUEUED" | "RUNNING" | "PAUSED" | "DONE" | "FAILED" }
  ) {
    return this.adminService.updateJob(auth.userId, jobId, body);
  }

  @Delete("jobs/:jobId")
  deleteJob(@CurrentAuth() auth: { userId: string }, @Param("jobId") jobId: string) {
    return this.adminService.deleteJob(auth.userId, jobId);
  }

  @Post("jobs/:jobId/pause")
  pauseJob(@CurrentAuth() auth: { userId: string }, @Param("jobId") jobId: string) {
    return this.jobService.pause(jobId, auth.userId, true);
  }

  @Post("jobs/:jobId/resume")
  resumeJob(@CurrentAuth() auth: { userId: string }, @Param("jobId") jobId: string) {
    return this.jobService.resume(jobId, auth.userId, true);
  }

  @Get("plans")
  plans(@CurrentAuth() auth: { userId: string }) {
    return this.adminService.plans(auth.userId);
  }

  @Post("plans")
  createPlan(
    @CurrentAuth() auth: { userId: string },
    @Body()
    body: {
      code: "FREE" | "STARTER" | "PRO" | "ENTERPRISE";
      name: string;
      priceMonthly: number;
      maxAccounts: number;
      maxRunningJobs: number;
      maxWorkspaces: number;
      maxDailyFetches: number;
      featuresJson: string;
    }
  ) {
    return this.adminService.createPlan(auth.userId, body);
  }

  @Patch("plans/:planId")
  updatePlan(
    @CurrentAuth() auth: { userId: string },
    @Param("planId") planId: string,
    @Body()
    body: {
      name?: string;
      priceMonthly?: number;
      maxAccounts?: number;
      maxRunningJobs?: number;
      maxWorkspaces?: number;
      maxDailyFetches?: number;
      featuresJson?: string;
    }
  ) {
    return this.adminService.updatePlan(auth.userId, planId, body);
  }

  @Delete("plans/:planId")
  deletePlan(@CurrentAuth() auth: { userId: string }, @Param("planId") planId: string) {
    return this.adminService.deletePlan(auth.userId, planId);
  }

  @Get("tools")
  tools(@CurrentAuth() auth: { userId: string }, @Query() query: AdminListQuery) {
    return this.adminService.tools(auth.userId, query);
  }

  @Post("tools")
  createTool(
    @CurrentAuth() auth: { userId: string },
    @Body()
    body: {
      code: string;
      name: string;
      description: string;
      category: "FACEBOOK" | "TIKTOK" | "DATA" | "AUTOMATION" | "SYSTEM";
      status?: "ACTIVE" | "DISABLED";
      configJson: string;
    }
  ) {
    return this.adminService.createTool(auth.userId, body);
  }

  @Patch("tools/bulk")
  bulkUpdateTools(
    @CurrentAuth() auth: { userId: string },
    @Body() body: { toolIds: string[]; status?: "ACTIVE" | "DISABLED" }
  ) {
    return this.adminService.bulkUpdateTools(auth.userId, body);
  }

  @Delete("tools/bulk")
  bulkDeleteTools(@CurrentAuth() auth: { userId: string }, @Body() body: { toolIds: string[] }) {
    return this.adminService.bulkDeleteTools(auth.userId, body);
  }

  @Get("tools/:toolId/detail")
  toolDetail(@CurrentAuth() auth: { userId: string }, @Param("toolId") toolId: string) {
    return this.adminService.toolDetail(auth.userId, toolId);
  }

  @Patch("tools/:toolId")
  updateTool(
    @CurrentAuth() auth: { userId: string },
    @Param("toolId") toolId: string,
    @Body() body: { name?: string; description?: string; status?: "ACTIVE" | "DISABLED"; configJson?: string }
  ) {
    return this.adminService.updateTool(auth.userId, toolId, body);
  }

  @Post("tools/:toolId/rollback")
  rollbackTool(
    @CurrentAuth() auth: { userId: string },
    @Param("toolId") toolId: string,
    @Body() body: { versionId: string }
  ) {
    return this.adminService.rollbackTool(auth.userId, toolId, body.versionId);
  }

  @Post("tools/:toolId/clone")
  cloneTool(@CurrentAuth() auth: { userId: string }, @Param("toolId") toolId: string) {
    return this.adminService.cloneTool(auth.userId, toolId);
  }

  @Delete("tools/:toolId")
  deleteTool(@CurrentAuth() auth: { userId: string }, @Param("toolId") toolId: string) {
    return this.adminService.deleteTool(auth.userId, toolId);
  }

  @Post("job-runs/:runId/retry")
  retryRun(@CurrentAuth() auth: { userId: string }, @Param("runId") runId: string) {
    return this.jobService.retryRun(runId, auth.userId, true);
  }
}
