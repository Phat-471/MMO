import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [
      totalJobs,
      successJobs,
      failedJobs,
      totalAccounts,
      totalData,
      totalWorkspaces
    ] = await Promise.all([
      this.prisma.job.count(),
      this.prisma.job.count({ where: { status: "DONE" } }),
      this.prisma.job.count({ where: { status: "FAILED" } }),
      this.prisma.account.count(),
      this.prisma.dataSnapshot.count(),
      this.prisma.workspace.count()
    ]);

    const successRate = totalJobs > 0 ? (successJobs / totalJobs) * 100 : 0;

    // Lay du lieu bieu do trong 7 ngay qua
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyJobs = await this.prisma.job.groupBy({
      by: ["createdAt"],
      _count: { id: true },
      where: {
        createdAt: { gte: sevenDaysAgo }
      }
    });

    return {
      message: "Bao cao tong quan.",
      data: {
        metrics: {
          totalJobs,
          successJobs,
          failedJobs,
          successRate: successRate.toFixed(1) + "%",
          totalAccounts,
          totalData,
          totalWorkspaces
        },
        charts: {
          dailyJobs
        }
      }
    };
  }
}
