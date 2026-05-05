import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentAuth } from "../auth/current-auth.decorator";
import { CreateJobFromToolDto, UpdateWorkspaceToolDto } from "../dto/tool.dto";
import { ToolService } from "../services/tool.service";

@Controller("workspaces/:workspaceId/tools")
export class ToolController {
  constructor(private readonly toolService: ToolService) {}

  @Get()
  list(@Param("workspaceId") workspaceId: string, @CurrentAuth() auth: { userId: string }) {
    return this.toolService.listForWorkspace(workspaceId, auth.userId);
  }

  @Patch(":toolId")
  update(
    @Param("workspaceId") workspaceId: string,
    @Param("toolId") toolId: string,
    @CurrentAuth() auth: { userId: string },
    @Body() body: UpdateWorkspaceToolDto
  ) {
    return this.toolService.updateForWorkspace(workspaceId, toolId, auth.userId, body);
  }

  @Post(":toolId/jobs")
  createJob(
    @Param("workspaceId") workspaceId: string,
    @Param("toolId") toolId: string,
    @CurrentAuth() auth: { userId: string },
    @Body() body: CreateJobFromToolDto
  ) {
    return this.toolService.createJobFromTool(workspaceId, toolId, auth.userId, body);
  }
}
