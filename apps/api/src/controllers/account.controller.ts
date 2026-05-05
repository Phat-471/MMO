import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { CurrentAuth } from "../auth/current-auth.decorator";
import { CreateAccountDto, UpdateAccountDto } from "../dto/account.dto";
import { AccountService } from "../services/account.service";

@Controller()
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get("workspaces/:workspaceId/accounts")
  list(@CurrentAuth() auth: { userId: string }, @Param("workspaceId") workspaceId: string) {
    return this.accountService.list(workspaceId, auth.userId);
  }

  @Post("workspaces/:workspaceId/accounts")
  create(
    @CurrentAuth() auth: { userId: string },
    @Param("workspaceId") workspaceId: string,
    @Body() body: CreateAccountDto
  ) {
    return this.accountService.create(workspaceId, auth.userId, body);
  }

  @Patch("accounts/:accountId")
  update(
    @CurrentAuth() auth: { userId: string },
    @Param("accountId") accountId: string,
    @Body() body: UpdateAccountDto
  ) {
    return this.accountService.update(accountId, auth.userId, body);
  }

  @Delete("accounts/:accountId")
  remove(@CurrentAuth() auth: { userId: string }, @Param("accountId") accountId: string) {
    return this.accountService.remove(accountId, auth.userId);
  }
}
