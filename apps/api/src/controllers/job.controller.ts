import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentAuth } from "../auth/current-auth.decorator";
import { CreateJobDto, UpdateJobDto } from "../dto/job.dto";
import { JobService } from "../services/job.service";

@Controller()
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Get("workspaces/:workspaceId/jobs")
  list(@CurrentAuth() auth: { userId: string }, @Param("workspaceId") workspaceId: string) {
    return this.jobService.list(workspaceId, auth.userId);
  }

  @Post("workspaces/:workspaceId/jobs")
  create(
    @CurrentAuth() auth: { userId: string },
    @Param("workspaceId") workspaceId: string,
    @Body() body: CreateJobDto
  ) {
    return this.jobService.create(workspaceId, auth.userId, body);
  }

  @Get("jobs/:jobId")
  detail(@CurrentAuth() auth: { userId: string }, @Param("jobId") jobId: string) {
    return this.jobService.detail(jobId, auth.userId);
  }

  @Get("jobs/:jobId/runs")
  runs(@CurrentAuth() auth: { userId: string }, @Param("jobId") jobId: string) {
    return this.jobService.runs(jobId, auth.userId);
  }

  @Patch("jobs/:jobId")
  update(
    @CurrentAuth() auth: { userId: string },
    @Param("jobId") jobId: string,
    @Body() body: UpdateJobDto
  ) {
    return this.jobService.update(jobId, auth.userId, body);
  }

  @Delete("jobs/:jobId")
  remove(@CurrentAuth() auth: { userId: string }, @Param("jobId") jobId: string) {
    return this.jobService.remove(jobId, auth.userId);
  }

  @Post("jobs/:jobId/run")
  run(@CurrentAuth() auth: { userId: string }, @Param("jobId") jobId: string) {
    return this.jobService.run(jobId, auth.userId);
  }

  @Post("jobs/:jobId/cancel")
  cancel(@CurrentAuth() auth: { userId: string }, @Param("jobId") jobId: string) {
    return this.jobService.cancel(jobId, auth.userId);
  }

  @Post("jobs/:jobId/pause")
  pause(@CurrentAuth() auth: { userId: string }, @Param("jobId") jobId: string) {
    return this.jobService.pause(jobId, auth.userId);
  }

  @Post("jobs/:jobId/resume")
  resume(@CurrentAuth() auth: { userId: string }, @Param("jobId") jobId: string) {
    return this.jobService.resume(jobId, auth.userId);
  }

  @Get("job-runs/:runId")
  runDetail(@CurrentAuth() auth: { userId: string }, @Param("runId") runId: string) {
    return this.jobService.runDetail(runId, auth.userId);
  }

  @Get("job-runs/:runId/logs")
  runLogs(@CurrentAuth() auth: { userId: string }, @Param("runId") runId: string) {
    return this.jobService.runLogs(runId, auth.userId);
  }

  @Post("job-runs/:runId/retry")
  retryRun(@CurrentAuth() auth: { userId: string }, @Param("runId") runId: string) {
    return this.jobService.retryRun(runId, auth.userId);
  }
}
