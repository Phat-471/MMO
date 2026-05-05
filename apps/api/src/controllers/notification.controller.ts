import { Controller, Get, Param, Post, Request } from "@nestjs/common";
import { NotificationService } from "../services/notification.service";

@Controller("notifications")
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get(":workspaceId")
  async list(@Param("workspaceId") workspaceId: string, @Request() req: any) {
    return {
      message: "Danh sach thong bao.",
      data: await this.notificationService.list(workspaceId, req.user.sub)
    };
  }

  @Post(":id/read")
  async markAsRead(@Param("id") id: string, @Request() req: any) {
    await this.notificationService.markAsRead(id, req.user.sub);
    return {
      message: "Da danh dau da doc.",
      data: { id }
    };
  }
}
