import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { WorkspaceService } from "./workspace.service";

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceService: WorkspaceService
  ) {}

  async summary(workspaceId: string, userId: string) {
    await this.workspaceService.assertWorkspaceAccess(workspaceId, userId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalAccounts, totalJobs, activeSubscription, billingUsage, unreadNotifications, freePlan] =
      await Promise.all([
        this.prisma.account.count({ where: { workspaceId } }),
        this.prisma.job.count({ where: { workspaceId } }),
        this.prisma.subscription.findFirst({
          where: { workspaceId, status: "ACTIVE" },
          include: { plan: true },
          orderBy: { createdAt: "desc" }
        }),
        this.prisma.billingUsage.findUnique({
          where: {
            workspaceId_day: {
              workspaceId,
              day: today
            }
          }
        }),
        this.prisma.notification.count({
          where: {
            workspaceId,
            isRead: false
          }
        }),
        this.prisma.plan.findUnique({
          where: { code: "FREE" }
        })
      ]);

    const plan = activeSubscription?.plan ?? freePlan;
    const fetchToday = billingUsage?.fetchCount ?? 0;
    const usageLimit = plan?.maxDailyFetches ?? 0;

    return {
      message: "Tổng quan bảng điều khiển.",
      data: {
        totalAccounts,
        totalJobs,
        fetchToday,
        activePlan: activeSubscription?.plan?.name ? "Đang hoạt động" : "Miễn phí",
        usageLimit,
        usageUsed: fetchToday,
        unreadNotifications
      }
    };
  }

  async recentJobs(workspaceId: string, userId: string) {
    await this.workspaceService.assertWorkspaceAccess(workspaceId, userId);

    const items = await this.prisma.job.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 10
    });

    return {
      message: "Danh sách tác vụ gần đây.",
      data: items
    };
  }

  async riskItems(workspaceId: string, userId: string) {
    await this.workspaceService.assertWorkspaceAccess(workspaceId, userId);

    const items = await this.prisma.account.findMany({
      where: {
        workspaceId,
        status: {
          in: ["DEAD", "LIMITED"]
        }
      },
      orderBy: { updatedAt: "desc" },
      take: 10
    });

    return {
      message: "Danh sách cảnh báo.",
      data: items
    };
  }
}
