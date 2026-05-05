import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentAuth } from "../auth/current-auth.decorator";
import { CreateWorkspaceDto, UpdateWorkspaceDto } from "../dto/workspace.dto";
import { CreateWorkspaceMemberDto, UpdateWorkspaceMemberDto } from "../dto/member.dto";
import { WorkspaceService } from "../services/workspace.service";

@Controller("workspaces")
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Get()
  list(@CurrentAuth() auth: { userId: string }) {
    return this.workspaceService.list(auth.userId);
  }

  @Post()
  create(@CurrentAuth() auth: { userId: string }, @Body() body: CreateWorkspaceDto) {
    return this.workspaceService.create(body, auth.userId);
  }

  @Get(":workspaceId")
  detail(@CurrentAuth() auth: { userId: string }, @Param("workspaceId") workspaceId: string) {
    return this.workspaceService.detail(workspaceId, auth.userId);
  }

  @Patch(":workspaceId")
  update(
    @CurrentAuth() auth: { userId: string },
    @Param("workspaceId") workspaceId: string,
    @Body() body: UpdateWorkspaceDto
  ) {
    return this.workspaceService.update(workspaceId, auth.userId, body);
  }

  @Get(":workspaceId/members")
  members(@CurrentAuth() auth: { userId: string }, @Param("workspaceId") workspaceId: string) {
    return this.workspaceService.members(workspaceId, auth.userId);
  }

  @Post(":workspaceId/members")
  addMember(
    @CurrentAuth() auth: { userId: string },
    @Param("workspaceId") workspaceId: string,
    @Body() body: CreateWorkspaceMemberDto
  ) {
    return this.workspaceService.addMember(workspaceId, auth.userId, body);
  }

  @Patch(":workspaceId/members/:memberId")
  updateMember(
    @CurrentAuth() auth: { userId: string },
    @Param("workspaceId") workspaceId: string,
    @Param("memberId") memberId: string,
    @Body() body: UpdateWorkspaceMemberDto
  ) {
    return this.workspaceService.updateMember(workspaceId, memberId, auth.userId, body);
  }

  @Delete(":workspaceId/members/:memberId")
  removeMember(
    @CurrentAuth() auth: { userId: string },
    @Param("workspaceId") workspaceId: string,
    @Param("memberId") memberId: string
  ) {
    return this.workspaceService.removeMember(workspaceId, memberId, auth.userId);
  }
}
