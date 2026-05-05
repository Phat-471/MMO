import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { WorkspaceService } from "./workspace.service";

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceService: WorkspaceService
  ) {}

  async list(workspaceId: string, userId: string) {
    await this.workspaceService.assertWorkspaceAccess(workspaceId, userId);
    
    return await this.prisma.notification.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 50
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId }
    });
    if (!notification) return;

    await this.workspaceService.assertWorkspaceAccess(notification.workspaceId, userId);

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });
  }

  async notify(workspaceId: string, title: string, content: string, type: "INFO" | "WARNING" | "ERROR" | "SUCCESS" = "INFO") {
    return await this.prisma.notification.create({
      data: {
        workspaceId,
        title,
        content,
        type
      }
    });
  }
}
