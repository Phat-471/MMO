import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma.service";
import { WorkspaceService } from "./workspace.service";
import { NotificationService } from "./notification.service";

type PlanCodeValue = "FREE" | "STARTER" | "PRO" | "ENTERPRISE";
type PaymentTransactionStatusValue = "PENDING" | "PAID" | "CANCELED" | "EXPIRED";

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceService: WorkspaceService,
    private readonly notificationService: NotificationService
  ) {}

  async billing(workspaceId: string, userId: string) {
    await this.workspaceService.assertWorkspaceAccess(workspaceId, userId);

    const subscription = await this.prisma.subscription.findFirst({
      where: { workspaceId },
      include: { plan: true },
      orderBy: { createdAt: "desc" }
    });

    return {
      message: "Thông tin gói dịch vụ.",
      data: {
        workspaceId,
        planCode: subscription?.plan?.code ?? "FREE",
        plan: subscription?.plan?.name ?? "Gói miễn phí",
        status: subscription?.status === "ACTIVE" ? "Đang hoạt động" : "Không hoạt động",
        limits: subscription?.plan ?? null,
        features: this.parseFeatures(subscription?.plan?.featuresJson)
      }
    };
  }

  async plans(userId: string) {
    const plans = await this.prisma.plan.findMany({
      orderBy: { priceMonthly: "asc" }
    });

    return {
      message: "Danh sách gói dịch vụ.",
      data: plans.map((plan) => ({
        id: plan.id,
        code: plan.code,
        name: plan.name,
        priceMonthly: plan.priceMonthly.toString(),
        maxAccounts: plan.maxAccounts,
        maxRunningJobs: plan.maxRunningJobs,
        maxWorkspaces: plan.maxWorkspaces,
        maxDailyFetches: plan.maxDailyFetches,
        features: this.parseFeatures(plan.featuresJson),
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt
      }))
    };
  }

  async checkQuota(workspaceId: string, metric: "fetchCount" | "jobCount" | "accountCount") {
    const subscription = await this.prisma.subscription.findFirst({
      where: { workspaceId, status: "ACTIVE" },
      include: { plan: true },
      orderBy: { createdAt: "desc" }
    });

    if (!subscription || !subscription.plan) {
      // Fallback to FREE plan if no subscription
      const freePlan = await this.prisma.plan.findUnique({ where: { code: "FREE" } });
      if (!freePlan) return; // Plan not found, skip check
      
      return this.verifyUsage(workspaceId, metric, freePlan);
    }

    return this.verifyUsage(workspaceId, metric, subscription.plan);
  }

  private async verifyUsage(workspaceId: string, metric: string, plan: any) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usage = await this.prisma.billingUsage.findUnique({
      where: {
        workspaceId_day: {
          workspaceId,
          day: today
        }
      }
    });

    if (metric === "fetchCount") {
      if ((usage?.fetchCount ?? 0) >= plan.maxDailyFetches) {
        const msg = "Ban da het luot lay du lieu hom nay theo goi dich vu.";
        await this.notificationService.notify(workspaceId, "Het han muc Fetch", msg, "WARNING");
        throw new BadRequestException(msg);
      }
    }

    if (metric === "jobCount") {
      const activeJobs = await this.prisma.jobRun.count({
        where: { workspaceId, status: { in: ["QUEUED", "RUNNING"] } }
      });
      if (activeJobs >= plan.maxRunningJobs) {
        const msg = "So luong tac vu dang chay vuot qua gioi han cua goi.";
        await this.notificationService.notify(workspaceId, "Het han muc Tac vu", msg, "WARNING");
        throw new BadRequestException(msg);
      }
    }

    if (metric === "accountCount") {
      const accountCount = await this.prisma.account.count({ where: { workspaceId } });
      if (accountCount >= plan.maxAccounts) {
        const msg = "So luong tai khoan vuot qua gioi han cua goi.";
        await this.notificationService.notify(workspaceId, "Het han muc Tai khoan", msg, "WARNING");
        throw new BadRequestException(msg);
      }
    }
  }

  async recordUsage(workspaceId: string, metric: "fetchCount" | "jobCount") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.prisma.billingUsage.upsert({
      where: {
        workspaceId_day: {
          workspaceId,
          day: today
        }
      },
      create: {
        workspaceId,
        day: today,
        fetchCount: metric === "fetchCount" ? 1 : 0,
        runningJobCountPeak: metric === "jobCount" ? 1 : 0,
        accountCount: 0
      },
      update: {
        fetchCount: metric === "fetchCount" ? { increment: 1 } : undefined,
        runningJobCountPeak: metric === "jobCount" ? { increment: 1 } : undefined
      }
    });
  }

  async usage(workspaceId: string, userId: string) {
    await this.workspaceService.assertWorkspaceAccess(workspaceId, userId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usage = await this.prisma.billingUsage.findUnique({
      where: {
        workspaceId_day: {
          workspaceId,
          day: today
        }
      }
    });

    return {
      message: "Thông tin sử dụng.",
      data: usage ?? {
        workspaceId,
        fetchCount: 0,
        runningJobCountPeak: 0,
        accountCount: 0
      }
    };
  }

  async checkout(workspaceId: string, userId: string, planCode?: PlanCodeValue) {
    await this.workspaceService.assertWorkspaceAccess(workspaceId, userId);

    const selectedPlan = planCode
      ? await this.prisma.plan.findUnique({
          where: { code: planCode }
        })
      : null;

    if (planCode && !selectedPlan) {
      throw new BadRequestException("Khong tim thay goi dich vu.");
    }

    const amount = Number(selectedPlan?.priceMonthly ?? 0);
    const paymentSetting = await this.prisma.paymentSetting.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" }
    });

    if (!paymentSetting) {
      return {
        message: "Chua cau hinh tai khoan thanh toan. Vui long vao Admin > System de cap nhat.",
        data: {
          workspaceId,
          planCode: (selectedPlan?.code ?? null) as PlanCodeValue | null,
          planName: selectedPlan?.name ?? null,
          checkoutId: null,
          checkoutUrl: null,
          amount,
          payment: null
        }
      };
    }

    const checkoutCode = this.makeCheckoutCode();
    const transferContent = `${paymentSetting.transferPrefix.trim()} ${checkoutCode}`.trim();
    const qrUrl = this.buildQrUrl(paymentSetting.bankCode, paymentSetting.accountNumber, paymentSetting.accountName, amount, transferContent);

    const transaction = await this.prisma.paymentTransaction.create({
      data: {
        workspaceId,
        planCode: selectedPlan?.code ?? "FREE",
        planName: selectedPlan?.name ?? "Gói miễn phí",
        amount: selectedPlan?.priceMonthly ?? 0,
        status: "PENDING",
        checkoutCode,
        transferContent,
        bankName: paymentSetting.bankName,
        bankCode: paymentSetting.bankCode,
        accountName: paymentSetting.accountName,
        accountNumber: paymentSetting.accountNumber,
        qrUrl,
        metadataJson: JSON.stringify({
          userId,
          planCode: selectedPlan?.code ?? null,
          planName: selectedPlan?.name ?? null,
          amount
        })
      }
    });

    return {
      message: "Tạo phiên thanh toán thành công.",
      data: {
        workspaceId,
        planCode: (selectedPlan?.code ?? null) as PlanCodeValue | null,
        planName: selectedPlan?.name ?? null,
        checkoutId: transaction.id,
        checkoutUrl: `/thanh-toan/checkout?checkoutId=${transaction.id}&workspaceId=${encodeURIComponent(workspaceId)}`,
        amount,
        payment: {
          bankName: paymentSetting.bankName,
          bankCode: paymentSetting.bankCode,
          accountName: paymentSetting.accountName,
          accountNumber: paymentSetting.accountNumber,
          transferContent,
          qrUrl
        }
      }
    };
  }

  async checkoutDetail(workspaceId: string, userId: string, checkoutId: string) {
    if (!workspaceId) {
      throw new BadRequestException("Thieu workspaceId.");
    }

    await this.workspaceService.assertWorkspaceAccess(workspaceId, userId);

    const transaction = await this.prisma.paymentTransaction.findFirst({
      where: {
        id: checkoutId,
        workspaceId
      }
    });

    if (!transaction) {
      throw new NotFoundException("Khong tim thay phien thanh toan.");
    }

    return {
      message: "Thong tin checkout.",
      data: {
        id: transaction.id,
        checkoutCode: transaction.checkoutCode,
        workspaceId: transaction.workspaceId,
        planCode: transaction.planCode,
        planName: transaction.planName,
        amount: Number(transaction.amount),
        status: transaction.status as PaymentTransactionStatusValue,
        transferContent: transaction.transferContent,
        bankName: transaction.bankName,
        bankCode: transaction.bankCode,
        accountName: transaction.accountName,
        accountNumber: transaction.accountNumber,
        qrUrl: transaction.qrUrl,
        createdAt: transaction.createdAt,
        paidAt: transaction.paidAt
      }
    };
  }

  async webhook() {
    return {
      message: "Đã nhận webhook thanh toán.",
      data: {
        received: true
      }
    };
  }

  private parseFeatures(value: string | null | undefined): string[] {
    if (!value) {
      return [];
    }

    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
    } catch {
      return [];
    }
  }

  private makeCheckoutCode(): string {
    return `CK-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  private buildQrUrl(bankCode: string, accountNumber: string, accountName: string, amount: number, transferContent: string): string {
    const params = new URLSearchParams({
      amount: String(Math.max(0, Math.round(amount))),
      addInfo: transferContent,
      accountName
    });

    return `https://img.vietqr.io/image/${encodeURIComponent(bankCode)}-${encodeURIComponent(accountNumber)}-compact2.png?${params.toString()}`;
  }
}
