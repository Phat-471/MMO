import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Platform } from "@prisma/client";
import { parseToolConfig, resolveToolContract as findToolContract, type ToolContract } from "../../../../packages/shared/src/tool-contracts";
import { PrismaService } from "../prisma.service";
import { QueueService } from "../queue/queue.service";
import { recordAudit } from "../lib/audit";
import { encryptSecret } from "../lib/encryption";
import { hashPassword } from "../lib/password";

type UserRoleValue = "USER" | "ADMIN";
type UserStatusValue = "ACTIVE" | "DISABLED";
type WorkspaceStatusValue = "ACTIVE" | "SUSPENDED";
type AccountStatusValue = "ALIVE" | "DEAD" | "LIMITED" | "PENDING";
type AccountPlatformValue = "FACEBOOK" | "TIKTOK" | "SHOPEE" | "YOUTUBE";
type JobPlatformValue = "FACEBOOK" | "TIKTOK" | "SHOPEE" | "YOUTUBE" | "SYSTEM" | "DATA";
type JobTypeValue = "FETCH_POSTS" | "FETCH_COMMENTS" | "FETCH_PROFILE" | "CHECK_PROXY" | "ACCOUNT_HEALTH" | "GROUP_MODERATION" | "KEYWORD_MONITOR" | "WORKFLOW_BUILD" | "FETCH_VIDEOS" | "POST_GROUP" | "NURTURE_ACCOUNT" | "AUTO_LIKE" | "AUTO_COMMENT" | "REUP_VIDEO" | "SHOPEE_VIDEO_AFF" | "SHOPEE_LINK_CONVERT" | "AI_CONTENT" | "MARKETPLACE_SCAN" | "BULK_MSG" | "AUTO_JOIN_GROUP" | "AUTO_DM" | "CHANGE_PASSWORD" | "REG_ACCOUNT" | "SHOPEE_TRENDING" | "EXPORT_DATA" | "STRESS_TEST" | "CLEANUP";
type JobModeValue = "ONCE" | "SCHEDULED" | "RECURRING";
type PlanCodeValue = "FREE" | "STARTER" | "PRO" | "ENTERPRISE";
type JobStatusValue = "DRAFT" | "QUEUED" | "RUNNING" | "PAUSED" | "DONE" | "FAILED";
type PaymentTransactionStatusValue = "PENDING" | "PAID" | "CANCELED" | "EXPIRED";
type AdminInsightSeverity = "LOW" | "MEDIUM" | "HIGH";
type AdminInsightLevel = "GOOD" | "WATCH" | "WARN" | "CRITICAL";

type AdminInsightWorkspace = {
  id: string;
  name: string;
  slug: string;
  status: WorkspaceStatusValue;
  owner: {
    email: string;
  };
  plan: {
    code: PlanCodeValue;
    name: string;
    maxAccounts: number;
    maxRunningJobs: number;
    maxDailyFetches: number;
  } | null;
  accounts: number;
  jobs: number;
  fetchToday: number;
  unreadNotifications: number;
  usageLimit: number;
  usageRatio: number;
  healthScore: number;
  level: AdminInsightLevel;
};

type AdminInsightAlert = {
  kind: "USAGE" | "JOBS" | "NOTIFICATIONS" | "STATUS";
  severity: AdminInsightSeverity;
  message: string;
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
  metric: number;
};

type AdminInsightPlan = {
  code: PlanCodeValue;
  name: string;
  count: number;
};

type AdminIntegrationSettings = {
  id: string | null;
  apiBaseUrl: string;
  apiKey: string;
  apiSecret: string;
  webhookUrl: string;
  webhookSecret: string;
  redisHost: string;
  redisPort: number;
  workerConcurrency: number;
  note: string;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

type AdminStorageSettings = {
  id: string | null;
  assetBaseUrl: string;
  cdnBaseUrl: string;
  uploadPath: string;
  assetMode: "LOCAL" | "CDN" | "HYBRID";
  autoApproveAssets: boolean;
  allowRemoteFetch: boolean;
  defaultVideoWatermark: boolean;
  note: string;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

type AdminStorageSettingsInput = {
  assetBaseUrl: string;
  cdnBaseUrl: string;
  uploadPath: string;
  assetMode: "LOCAL" | "CDN" | "HYBRID";
  autoApproveAssets?: boolean;
  allowRemoteFetch?: boolean;
  defaultVideoWatermark?: boolean;
  note?: string | null;
  isActive?: boolean;
};

type AdminSecuritySettings = {
  id: string | null;
  maintenanceMode: boolean;
  requireTwoFactor: boolean;
  apiRateLimitPerMinute: number;
  sessionTtlHours: number;
  adminIpWhitelist: string;
  note: string;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

type AdminSecuritySettingsInput = {
  maintenanceMode?: boolean;
  requireTwoFactor?: boolean;
  apiRateLimitPerMinute: number;
  sessionTtlHours: number;
  adminIpWhitelist: string;
  note?: string | null;
  isActive?: boolean;
};

type AdminIntegrationSettingsInput = {
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
};

type AdminToolVersion = {
  id: string;
  action: "admin.tool.create" | "admin.tool.update" | "admin.tool.clone";
  createdAt: string;
  user: {
    id: string;
    email: string;
  } | null;
  snapshot: {
    name: string;
    description: string;
    status: "ACTIVE" | "DISABLED";
    configJson: string;
  };
};

type AdminInsights = {
  generatedAt: string;
  totalWorkspaces: number;
  activeWorkspaces: number;
  suspendedWorkspaces: number;
  fetchToday: number;
  unreadNotifications: number;
  planDistribution: AdminInsightPlan[];
  workspaces: AdminInsightWorkspace[];
  alerts: AdminInsightAlert[];
};

export type AdminListQuery = {
  page?: string;
  pageSize?: string;
  query?: string;
  status?: string;
  platform?: string;
  category?: string;
  level?: string;
};

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService
  ) {}

  private async assertAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, status: true }
    });

    if (!user || user.status !== "ACTIVE" || user.role !== "ADMIN") {
      throw new ForbiddenException("Ban khong co quyen quan tri he thong.");
    }

    return user;
  }

  private getDefaultIntegrationSettings(): AdminIntegrationSettings {
    return {
      id: null,
      apiBaseUrl: "",
      apiKey: "",
      apiSecret: "",
      webhookUrl: "",
      webhookSecret: "",
      redisHost: "127.0.0.1",
      redisPort: 6379,
      workerConcurrency: 2,
      note: "",
      isActive: true,
      createdAt: null,
      updatedAt: null
    };
  }

  private getDefaultStorageSettings(): AdminStorageSettings {
    return {
      id: null,
      assetBaseUrl: "",
      cdnBaseUrl: "",
      uploadPath: "/uploads",
      assetMode: "HYBRID",
      autoApproveAssets: false,
      allowRemoteFetch: true,
      defaultVideoWatermark: false,
      note: "",
      isActive: true,
      createdAt: null,
      updatedAt: null
    };
  }

  private getDefaultSecuritySettings(): AdminSecuritySettings {
    return {
      id: null,
      maintenanceMode: false,
      requireTwoFactor: false,
      apiRateLimitPerMinute: 120,
      sessionTtlHours: 72,
      adminIpWhitelist: "",
      note: "",
      isActive: true,
      createdAt: null,
      updatedAt: null
    };
  }

  private parseIntegrationSettings(record: { id: string; valueJson: string; createdAt: Date; updatedAt: Date } | null): AdminIntegrationSettings {
    const fallback = this.getDefaultIntegrationSettings();
    if (!record) {
      return fallback;
    }

    let parsed: Partial<AdminIntegrationSettings> = {};
    try {
      parsed = JSON.parse(record.valueJson) as Partial<AdminIntegrationSettings>;
    } catch {
      parsed = {};
    }

    return {
      ...fallback,
      ...parsed,
      id: record.id,
      apiBaseUrl: String(parsed.apiBaseUrl ?? fallback.apiBaseUrl),
      apiKey: String(parsed.apiKey ?? fallback.apiKey),
      apiSecret: String(parsed.apiSecret ?? fallback.apiSecret),
      webhookUrl: String(parsed.webhookUrl ?? fallback.webhookUrl),
      webhookSecret: String(parsed.webhookSecret ?? fallback.webhookSecret),
      redisHost: String(parsed.redisHost ?? fallback.redisHost),
      redisPort: Number.isFinite(Number(parsed.redisPort)) ? Number(parsed.redisPort) : fallback.redisPort,
      workerConcurrency: Number.isFinite(Number(parsed.workerConcurrency)) ? Number(parsed.workerConcurrency) : fallback.workerConcurrency,
      note: String(parsed.note ?? fallback.note),
      isActive: typeof parsed.isActive === "boolean" ? parsed.isActive : fallback.isActive,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString()
    };
  }

  private parseStorageSettings(record: { id: string; valueJson: string; createdAt: Date; updatedAt: Date } | null): AdminStorageSettings {
    const fallback = this.getDefaultStorageSettings();
    if (!record) {
      return fallback;
    }

    let parsed: Partial<AdminStorageSettings> = {};
    try {
      parsed = JSON.parse(record.valueJson) as Partial<AdminStorageSettings>;
    } catch {
      parsed = {};
    }

    const assetMode = parsed.assetMode === "LOCAL" || parsed.assetMode === "CDN" || parsed.assetMode === "HYBRID" ? parsed.assetMode : fallback.assetMode;

    return {
      ...fallback,
      ...parsed,
      id: record.id,
      assetBaseUrl: String(parsed.assetBaseUrl ?? fallback.assetBaseUrl),
      cdnBaseUrl: String(parsed.cdnBaseUrl ?? fallback.cdnBaseUrl),
      uploadPath: String(parsed.uploadPath ?? fallback.uploadPath),
      assetMode,
      autoApproveAssets: typeof parsed.autoApproveAssets === "boolean" ? parsed.autoApproveAssets : fallback.autoApproveAssets,
      allowRemoteFetch: typeof parsed.allowRemoteFetch === "boolean" ? parsed.allowRemoteFetch : fallback.allowRemoteFetch,
      defaultVideoWatermark: typeof parsed.defaultVideoWatermark === "boolean" ? parsed.defaultVideoWatermark : fallback.defaultVideoWatermark,
      note: String(parsed.note ?? fallback.note),
      isActive: typeof parsed.isActive === "boolean" ? parsed.isActive : fallback.isActive,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString()
    };
  }

  private parseSecuritySettings(record: { id: string; valueJson: string; createdAt: Date; updatedAt: Date } | null): AdminSecuritySettings {
    const fallback = this.getDefaultSecuritySettings();
    if (!record) {
      return fallback;
    }

    let parsed: Partial<AdminSecuritySettings> = {};
    try {
      parsed = JSON.parse(record.valueJson) as Partial<AdminSecuritySettings>;
    } catch {
      parsed = {};
    }

    return {
      ...fallback,
      ...parsed,
      id: record.id,
      maintenanceMode: typeof parsed.maintenanceMode === "boolean" ? parsed.maintenanceMode : fallback.maintenanceMode,
      requireTwoFactor: typeof parsed.requireTwoFactor === "boolean" ? parsed.requireTwoFactor : fallback.requireTwoFactor,
      apiRateLimitPerMinute: Number.isFinite(Number(parsed.apiRateLimitPerMinute)) ? Number(parsed.apiRateLimitPerMinute) : fallback.apiRateLimitPerMinute,
      sessionTtlHours: Number.isFinite(Number(parsed.sessionTtlHours)) ? Number(parsed.sessionTtlHours) : fallback.sessionTtlHours,
      adminIpWhitelist: String(parsed.adminIpWhitelist ?? fallback.adminIpWhitelist),
      note: String(parsed.note ?? fallback.note),
      isActive: typeof parsed.isActive === "boolean" ? parsed.isActive : fallback.isActive,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString()
    };
  }

  async overview(userId: string) {
    await this.assertAdmin(userId);

    const [
      totalUsers,
      totalWorkspaces,
      totalAccounts,
      totalJobs,
      runningJobs,
      failedJobs,
      queuedJobs,
      pausedJobs,
      activeTools
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.workspace.count(),
      this.prisma.account.count(),
      this.prisma.job.count(),
      this.prisma.job.count({ where: { status: "RUNNING" } }),
      this.prisma.job.count({ where: { status: "FAILED" } }),
      this.prisma.job.count({ where: { status: "QUEUED" } }),
      this.prisma.job.count({ where: { status: "PAUSED" } }),
      this.prisma.tool.count({ where: { status: "ACTIVE" } })
    ]);

    return {
      message: "Tong quan he thong.",
      data: {
        totalUsers,
        totalWorkspaces,
        totalAccounts,
        totalJobs,
        runningJobs,
        failedJobs,
        queuedJobs,
        pausedJobs,
        activeTools
      }
    };
  }

  async system(userId: string) {
    await this.assertAdmin(userId);

    const startedAt = Date.now();
    const [database, queue, jobGroups, toolGroups, recentJobs, paymentSetting, paymentTransactions, integrationSetting, storageSetting, securitySetting] = await Promise.all([
      this.checkDatabase(),
      this.queueService.getStatus(),
      this.prisma.job.groupBy({
        by: ["status"],
        _count: {
          status: true
        }
      }),
      this.prisma.tool.groupBy({
        by: ["status"],
        _count: {
          status: true
        }
      }),
      this.prisma.job.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          workspace: {
            select: {
              id: true,
              name: true
            }
          },
          account: {
            select: {
              id: true,
              label: true
            }
          }
        }
      }),
      this.prisma.paymentSetting.findFirst({
        orderBy: { updatedAt: "desc" }
      }),
      this.prisma.paymentTransaction.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          workspace: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: "integration.settings" }
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: "storage.settings" }
      }),
      this.prisma.systemSetting.findUnique({
        where: { key: "security.settings" }
      })
    ]);

    const jobStatusMap = jobGroups.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {});
    const toolStatusMap = toolGroups.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {});

    return {
      message: "Trang thai he thong.",
      data: {
        database: {
          status: database.ok ? "ONLINE" : "OFFLINE",
          latencyMs: database.latencyMs,
          error: database.error ?? null
        },
        queue,
        jobs: {
          running: jobStatusMap.RUNNING ?? 0,
          queued: jobStatusMap.QUEUED ?? 0,
          paused: jobStatusMap.PAUSED ?? 0,
          failed: jobStatusMap.FAILED ?? 0,
          done: jobStatusMap.DONE ?? 0,
          draft: jobStatusMap.DRAFT ?? 0,
          total: Object.values(jobStatusMap).reduce((sum, value) => sum + value, 0),
          recent: recentJobs
        },
        tools: {
          active: toolStatusMap.ACTIVE ?? 0,
          disabled: toolStatusMap.DISABLED ?? 0
        },
        payment: {
          settings: paymentSetting
            ? {
                id: paymentSetting.id,
                bankName: paymentSetting.bankName,
                bankCode: paymentSetting.bankCode,
                accountName: paymentSetting.accountName,
                accountNumber: paymentSetting.accountNumber,
                transferPrefix: paymentSetting.transferPrefix,
                note: paymentSetting.note,
                isActive: paymentSetting.isActive,
                createdAt: paymentSetting.createdAt,
                updatedAt: paymentSetting.updatedAt
              }
            : null,
          transactions: paymentTransactions.map((transaction) => ({
            id: transaction.id,
            checkoutCode: transaction.checkoutCode,
            workspace: {
              id: transaction.workspace.id,
              name: transaction.workspace.name
            },
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
            paidAt: transaction.paidAt,
            createdAt: transaction.createdAt,
            updatedAt: transaction.updatedAt
          })),
          integrations: this.parseIntegrationSettings(integrationSetting)
        },
        storage: this.parseStorageSettings(storageSetting),
        security: this.parseSecuritySettings(securitySetting),
        latencyMs: Date.now() - startedAt
      }
    };
  }

  async updateIntegrationSettings(userId: string, data: AdminIntegrationSettingsInput) {
    await this.assertAdmin(userId);

    const apiBaseUrl = data.apiBaseUrl.trim();
    const apiKey = data.apiKey.trim();
    const apiSecret = data.apiSecret.trim();
    const webhookUrl = data.webhookUrl.trim();
    const webhookSecret = data.webhookSecret.trim();
    const redisHost = data.redisHost.trim();
    const redisPort = Number(data.redisPort);
    const workerConcurrency = Number(data.workerConcurrency);

    if (!redisHost || !Number.isFinite(redisPort) || redisPort <= 0 || !Number.isFinite(workerConcurrency) || workerConcurrency <= 0) {
      throw new BadRequestException("Thong tin tich hop khong hop le.");
    }

    const payload: AdminIntegrationSettings = {
      id: null,
      apiBaseUrl,
      apiKey,
      apiSecret,
      webhookUrl,
      webhookSecret,
      redisHost,
      redisPort,
      workerConcurrency,
      note: data.note?.trim() || "",
      isActive: data.isActive ?? true,
      createdAt: null,
      updatedAt: null
    };

    const saved = await this.prisma.systemSetting.upsert({
      where: { key: "integration.settings" },
      create: {
        key: "integration.settings",
        valueJson: JSON.stringify(payload)
      },
      update: {
        valueJson: JSON.stringify(payload)
      }
    });

    return {
      message: "Da cap nhat cau hinh API va tich hop.",
      data: this.parseIntegrationSettings(saved)
    };
  }

  async updateStorageSettings(userId: string, data: AdminStorageSettingsInput) {
    await this.assertAdmin(userId);

    const assetBaseUrl = data.assetBaseUrl.trim();
    const cdnBaseUrl = data.cdnBaseUrl.trim();
    const uploadPath = data.uploadPath.trim() || "/uploads";
    const assetMode = data.assetMode;

    if (!assetBaseUrl || !cdnBaseUrl || !uploadPath || !["LOCAL", "CDN", "HYBRID"].includes(assetMode)) {
      throw new BadRequestException("Thong tin storage khong hop le.");
    }

    const payload: AdminStorageSettings = {
      id: null,
      assetBaseUrl,
      cdnBaseUrl,
      uploadPath,
      assetMode,
      autoApproveAssets: data.autoApproveAssets ?? false,
      allowRemoteFetch: data.allowRemoteFetch ?? true,
      defaultVideoWatermark: data.defaultVideoWatermark ?? false,
      note: data.note?.trim() || "",
      isActive: data.isActive ?? true,
      createdAt: null,
      updatedAt: null
    };

    const saved = await this.prisma.systemSetting.upsert({
      where: { key: "storage.settings" },
      create: {
        key: "storage.settings",
        valueJson: JSON.stringify(payload)
      },
      update: {
        valueJson: JSON.stringify(payload)
      }
    });

    return {
      message: "Da cap nhat cau hinh asset / storage.",
      data: this.parseStorageSettings(saved)
    };
  }

  async updateSecuritySettings(userId: string, data: AdminSecuritySettingsInput) {
    await this.assertAdmin(userId);

    const apiRateLimitPerMinute = Number(data.apiRateLimitPerMinute);
    const sessionTtlHours = Number(data.sessionTtlHours);
    const adminIpWhitelist = data.adminIpWhitelist.trim();

    if (!Number.isFinite(apiRateLimitPerMinute) || apiRateLimitPerMinute <= 0 || !Number.isFinite(sessionTtlHours) || sessionTtlHours <= 0) {
      throw new BadRequestException("Thong tin bao mat khong hop le.");
    }

    const payload: AdminSecuritySettings = {
      id: null,
      maintenanceMode: data.maintenanceMode ?? false,
      requireTwoFactor: data.requireTwoFactor ?? false,
      apiRateLimitPerMinute,
      sessionTtlHours,
      adminIpWhitelist,
      note: data.note?.trim() || "",
      isActive: data.isActive ?? true,
      createdAt: null,
      updatedAt: null
    };

    const saved = await this.prisma.systemSetting.upsert({
      where: { key: "security.settings" },
      create: {
        key: "security.settings",
        valueJson: JSON.stringify(payload)
      },
      update: {
        valueJson: JSON.stringify(payload)
      }
    });

    return {
      message: "Da cap nhat cau hinh bao mat.",
      data: this.parseSecuritySettings(saved)
    };
  }

  async updatePaymentSettings(
    userId: string,
    data: {
      bankName: string;
      bankCode: string;
      accountName: string;
      accountNumber: string;
      transferPrefix: string;
      note?: string | null;
      isActive?: boolean;
    }
  ) {
    await this.assertAdmin(userId);

    const bankName = data.bankName.trim();
    const bankCode = data.bankCode.trim();
    const accountName = data.accountName.trim();
    const accountNumber = data.accountNumber.trim();
    const transferPrefix = data.transferPrefix.trim();

    if (!bankName || !bankCode || !accountName || !accountNumber || !transferPrefix) {
      throw new BadRequestException("Thong tin tai khoan thanh toan khong duoc de trong.");
    }

    const current = await this.prisma.paymentSetting.findFirst({
      orderBy: { updatedAt: "desc" }
    });

    const saved = current
      ? await this.prisma.paymentSetting.update({
          where: { id: current.id },
          data: {
            bankName,
            bankCode,
            accountName,
            accountNumber,
            transferPrefix,
            note: data.note?.trim() || null,
            isActive: data.isActive ?? true
          }
        })
      : await this.prisma.paymentSetting.create({
          data: {
            bankName,
            bankCode,
            accountName,
            accountNumber,
            transferPrefix,
            note: data.note?.trim() || null,
            isActive: data.isActive ?? true
          }
        });

    return {
      message: "Cap nhat thong tin thanh toan thanh cong.",
      data: {
        id: saved.id,
        bankName: saved.bankName,
        bankCode: saved.bankCode,
        accountName: saved.accountName,
        accountNumber: saved.accountNumber,
        transferPrefix: saved.transferPrefix,
        note: saved.note,
        isActive: saved.isActive,
        createdAt: saved.createdAt,
        updatedAt: saved.updatedAt
      }
    };
  }

  async insights(userId: string) {
    await this.assertAdmin(userId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalWorkspaces, activeWorkspaces, suspendedWorkspaces, unreadNotifications, usageRows, notificationRows, subscriptions, workspaces, freePlan] =
      await Promise.all([
        this.prisma.workspace.count(),
        this.prisma.workspace.count({ where: { status: "ACTIVE" } }),
        this.prisma.workspace.count({ where: { status: "SUSPENDED" } }),
        this.prisma.notification.count({ where: { isRead: false } }),
        this.prisma.billingUsage.groupBy({
          by: ["workspaceId"],
          where: { day: today },
          _sum: {
            fetchCount: true,
            runningJobCountPeak: true,
            accountCount: true
          }
        }),
        this.prisma.notification.groupBy({
          by: ["workspaceId"],
          where: { isRead: false },
          _count: {
            _all: true
          }
        }),
        this.prisma.subscription.findMany({
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          select: {
            workspaceId: true,
            plan: {
              select: {
                code: true,
                name: true,
                maxAccounts: true,
                maxRunningJobs: true,
                maxDailyFetches: true
              }
            }
          }
        }),
        this.prisma.workspace.findMany({
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            owner: {
              select: {
                email: true
              }
            },
            _count: {
              select: {
                accounts: true,
                jobs: true
              }
            }
          }
        }),
        this.prisma.plan.findUnique({
          where: { code: "FREE" }
        })
      ]);

    const usageMap = new Map(
      usageRows.map((row) => [
        row.workspaceId,
        {
          fetchCount: row._sum.fetchCount ?? 0,
          runningJobCountPeak: row._sum.runningJobCountPeak ?? 0,
          accountCount: row._sum.accountCount ?? 0
        }
      ])
    );
    const unreadMap = new Map(notificationRows.map((row) => [row.workspaceId, row._count._all]));
    const planMap = new Map<string, (typeof subscriptions)[number]["plan"]>();
    for (const item of subscriptions) {
      if (!planMap.has(item.workspaceId)) {
        planMap.set(item.workspaceId, item.plan);
      }
    }
    const planDistributionMap = new Map<PlanCodeValue, number>();
    for (const plan of planMap.values()) {
      planDistributionMap.set(plan.code, (planDistributionMap.get(plan.code) ?? 0) + 1);
    }
    const planDistribution: AdminInsightPlan[] = Array.from(planDistributionMap.entries()).map(([code, count]) => ({
      code,
      name:
        code === "FREE"
          ? "Mien phi"
          : code === "STARTER"
            ? "Starter"
            : code === "PRO"
              ? "Pro"
              : "Enterprise",
      count
    }));

    const workspaceInsights = workspaces.map((workspace) => {
      const plan = planMap.get(workspace.id) ?? (freePlan
        ? {
            code: freePlan.code,
            name: freePlan.name,
            maxAccounts: freePlan.maxAccounts,
            maxRunningJobs: freePlan.maxRunningJobs,
            maxDailyFetches: freePlan.maxDailyFetches
          }
        : null);
      const usage = usageMap.get(workspace.id) ?? {
        fetchCount: 0,
        runningJobCountPeak: 0,
        accountCount: 0
      };

      const usageLimit = plan?.maxDailyFetches ?? 0;
      const usageRatio = usageLimit > 0 ? usage.fetchCount / usageLimit : 0;
      const accountRatio = plan?.maxAccounts ? workspace._count.accounts / plan.maxAccounts : 0;
      const jobRatio = plan?.maxRunningJobs ? workspace._count.jobs / plan.maxRunningJobs : 0;
      const pressure = Math.max(usageRatio, accountRatio, jobRatio);
      const unreadCount = unreadMap.get(workspace.id) ?? 0;
      const healthScore = this.computeHealthScore(workspace.status, pressure, unreadCount);

      return {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        status: workspace.status,
        owner: workspace.owner,
        plan,
        accounts: workspace._count.accounts,
        jobs: workspace._count.jobs,
        fetchToday: usage.fetchCount,
        unreadNotifications: unreadCount,
        usageLimit,
        usageRatio,
        healthScore,
        level: this.healthLevel(workspace.status, pressure, unreadCount)
      };
    });

    workspaceInsights.sort((a, b) => {
      if (a.level !== b.level) {
        const order: Record<AdminInsightLevel, number> = {
          CRITICAL: 0,
          WARN: 1,
          WATCH: 2,
          GOOD: 3
        };
        return order[a.level] - order[b.level];
      }

      return a.healthScore - b.healthScore;
    });

    const alerts: AdminInsightAlert[] = workspaceInsights
      .filter((item) => item.level !== "GOOD" || item.unreadNotifications > 0)
      .slice(0, 10)
      .map((item) => ({
        kind: item.status === "SUSPENDED" ? "STATUS" : item.usageRatio >= 0.8 ? "USAGE" : item.unreadNotifications >= 4 ? "NOTIFICATIONS" : "JOBS",
        severity: item.level === "CRITICAL" ? "HIGH" : item.level === "WARN" ? "HIGH" : item.level === "WATCH" ? "MEDIUM" : "LOW",
        message:
          item.status === "SUSPENDED"
            ? "Workspace dang bi tam dung."
            : item.usageRatio >= 0.8
              ? `Da dung ${(item.usageRatio * 100).toFixed(0)}% han muc fetch hom nay.`
              : item.unreadNotifications >= 4
                ? `${item.unreadNotifications} thong bao chua doc dang cho xu ly.`
                : `${item.jobs} job can theo doi.`,
        workspace: {
          id: item.id,
          name: item.name,
          slug: item.slug
        },
        metric: Math.round(item.healthScore)
      }));

    return {
      message: "Chi tiet van hanh admin.",
      data: {
        generatedAt: new Date().toISOString(),
        totalWorkspaces,
        activeWorkspaces,
        suspendedWorkspaces,
        fetchToday: workspaceInsights.reduce((sum, item) => sum + item.fetchToday, 0),
        unreadNotifications,
        planDistribution,
        workspaces: workspaceInsights.slice(0, 8),
        alerts
      } satisfies AdminInsights
    };
  }

  async auditLogs(userId: string, query?: AdminListQuery) {
    await this.assertAdmin(userId);
    const paging = this.getPaging(query);
    const search = paging.query;
    const where: any = search
      ? {
          OR: [
            { action: { contains: search } },
            { entityType: { contains: search } },
            { entityId: { contains: search } },
            { metadataJson: { contains: search } },
            { user: { email: { contains: search } } },
            { workspace: { name: { contains: search } } }
          ]
        }
      : {};

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: paging.skip,
        take: paging.pageSize,
        include: {
          user: {
            select: {
              id: true,
              email: true
            }
          },
          workspace: {
            select: {
              id: true,
              name: true,
              owner: {
                select: {
                  email: true
                }
              }
            }
          }
        }
      }),
      this.prisma.auditLog.count({ where })
    ]);

    return {
      message: "Danh sach audit log.",
      data: this.toPage(logs, total, paging)
    };
  }

  async jobLogs(userId: string, query?: AdminListQuery) {
    await this.assertAdmin(userId);
    const paging = this.getPaging(query);
    const search = paging.query;
    const where: any = {
      ...(query?.level ? { level: query.level } : {}),
      ...(search
        ? {
            OR: [
            { level: { contains: search } },
            { message: { contains: search } },
            { workspace: { name: { contains: search } } },
              ...(this.isJobType(search) ? [{ jobRun: { job: { jobType: search.toUpperCase() } } }] : []),
              ...(this.isPlatform(search) ? [{ jobRun: { job: { platform: search.toUpperCase() } } }] : [])
            ]
          }
        : {})
    };

    const [logs, total] = await Promise.all([
      this.prisma.jobLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: paging.skip,
        take: paging.pageSize,
        include: {
          jobRun: {
            select: {
              id: true,
              job: {
                select: {
                  id: true,
                  jobType: true,
                  platform: true
                }
              }
            }
          },
          workspace: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      this.prisma.jobLog.count({ where })
    ]);

    return {
      message: "Danh sach job log he thong.",
      data: this.toPage(logs, total, paging)
    };
  }

  async users(userId: string, query?: AdminListQuery) {
    await this.assertAdmin(userId);
    const paging = this.getPaging(query);
    const status = this.normalizeUserStatus(query?.status);
    const search = paging.query;
    const where: any = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { email: { contains: search } },
              ...(this.isUserRole(search) ? [{ role: search.toUpperCase() }] : []),
              ...(this.isUserStatus(search) ? [{ status: search.toUpperCase() }] : [])
            ]
          }
        : {})
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: paging.skip,
        take: paging.pageSize,
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          _count: {
            select: {
              workspaces: true,
              memberOf: true,
              refreshSessions: true
            }
          }
        }
      }),
      this.prisma.user.count({ where })
    ]);

    return {
      message: "Danh sach nguoi dung.",
      data: this.toPage(users, total, paging)
    };
  }

  async snapshots(userId: string, query?: AdminListQuery) {
    await this.assertAdmin(userId);
    const paging = this.getPaging(query);
    const search = paging.query;
    const platform = this.normalizeAccountPlatformOrNull(query?.platform);
    const where: any = {
      ...(platform ? { sourcePlatform: platform } : {}),
      ...(search
        ? {
            OR: [
              { dataType: { contains: search } },
              { payloadJson: { contains: search } },
              { workspace: { name: { contains: search } } },
              { account: { label: { contains: search } } }
            ]
          }
        : {})
    };

    const [snapshots, total] = await Promise.all([
      this.prisma.dataSnapshot.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: paging.skip,
        take: paging.pageSize,
        include: {
          workspace: { select: { id: true, name: true } },
          account: { select: { id: true, label: true } }
        }
      }),
      this.prisma.dataSnapshot.count({ where })
    ]);

    return {
      message: "Danh sach du lieu da thu thap.",
      data: this.toPage(snapshots, total, paging)
    };
  }

  async createUser(
    adminUserId: string,
    data: {
      email: string;
      password: string;
      role?: UserRoleValue;
      status?: UserStatusValue;
    }
  ) {
    await this.assertAdmin(adminUserId);

    const email = data.email.trim().toLowerCase();
    if (!email || !data.password.trim()) {
      throw new ConflictException("Email va mat khau la bat buoc.");
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException("Email nay da duoc su dung.");
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: hashPassword(data.password),
        role: data.role ?? "USER",
        status: data.status ?? "ACTIVE"
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true
      }
    });

    const workspaceId = await this.resolveAuditWorkspaceId();
    if (workspaceId) {
      await recordAudit(this.prisma, {
        workspaceId,
        userId: adminUserId,
        action: "admin.user.create",
        entityType: "User",
        entityId: user.id,
        metadata: {
          email: user.email,
          role: user.role,
          status: user.status
        }
      });
    }

    return {
      message: "Tao nguoi dung thanh cong.",
      data: user
    };
  }

  async userDetail(adminUserId: string, targetUserId: string) {
    await this.assertAdmin(adminUserId);

    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            workspaces: true,
            memberOf: true,
            refreshSessions: true,
            createdByJobs: true,
            auditLogs: true
          }
        },
        workspaces: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            createdAt: true
          }
        },
        memberOf: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            role: true,
            createdAt: true,
            workspace: {
              select: {
                id: true,
                name: true,
                status: true
              }
            }
          }
        },
        auditLogs: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            action: true,
            entityType: true,
            entityId: true,
            createdAt: true
          }
        }
      }
    });

    if (!user) {
      throw new ForbiddenException("Khong tim thay nguoi dung.");
    }

    return {
      message: "Chi tiet nguoi dung.",
      data: user
    };
  }

  async updateUser(adminUserId: string, targetUserId: string, data: { role?: UserRoleValue; status?: UserStatusValue }) {
    await this.assertAdmin(adminUserId);

    const user = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        role: data.role,
        status: data.status
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        updatedAt: true
      }
    });

    const workspaceId = await this.resolveAuditWorkspaceId();
    if (workspaceId) {
      await recordAudit(this.prisma, {
        workspaceId,
        userId: adminUserId,
        action: "admin.user.update",
        entityType: "User",
        entityId: targetUserId,
        metadata: data
      });
    }

    return {
      message: "Cap nhat nguoi dung thanh cong.",
      data: user
    };
  }

  async deleteUser(adminUserId: string, targetUserId: string) {
    await this.assertAdmin(adminUserId);

    if (adminUserId === targetUserId) {
      throw new ForbiddenException("Khong the xoa chinh tai khoan cua ban.");
    }

    const current = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        refreshSessions: {
          select: { id: true }
        }
      }
    });

    if (!current) {
      throw new NotFoundException("Khong tim thay nguoi dung.");
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.refreshSession.deleteMany({
        where: { userId: targetUserId }
      });

      return tx.user.update({
        where: { id: targetUserId },
        data: {
          status: "DISABLED"
        },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          updatedAt: true
        }
      });
    });

    const workspaceId = await this.resolveAuditWorkspaceId();
    if (workspaceId) {
      await recordAudit(this.prisma, {
        workspaceId,
        userId: adminUserId,
        action: "admin.user.delete",
        entityType: "User",
        entityId: targetUserId,
        metadata: {
          email: current.email,
          role: current.role,
          status: current.status,
          revokedSessions: current.refreshSessions.length
        }
      });
    }

    return {
      message: "Da vo hieu hoa nguoi dung.",
      data: result
    };
  }

  async bulkUpdateUsers(
    adminUserId: string,
    data: {
      userIds: string[];
      role?: UserRoleValue;
      status?: UserStatusValue;
    }
  ) {
    await this.assertAdmin(adminUserId);

    const userIds = [...new Set((data.userIds ?? []).map((value) => value.trim()).filter(Boolean))].filter((id) => id !== adminUserId);
    if (!userIds.length) {
      throw new ConflictException("Khong co nguoi dung nao hop le.");
    }

    const result = await this.prisma.user.updateMany({
      where: {
        id: {
          in: userIds
        }
      },
      data: {
        role: data.role,
        status: data.status
      }
    });

    const workspaceId = await this.resolveAuditWorkspaceId();
    if (workspaceId) {
      await recordAudit(this.prisma, {
        workspaceId,
        userId: adminUserId,
        action: "admin.user.bulk_update",
        entityType: "User",
        metadata: {
          userIds,
          role: data.role ?? null,
          status: data.status ?? null,
          updatedCount: result.count
        }
      });
    }

    return {
      message: "Cap nhat nguoi dung hang loat thanh cong.",
      data: result
    };
  }

  async bulkDeleteUsers(adminUserId: string, data: { userIds: string[] }) {
    await this.assertAdmin(adminUserId);

    const userIds = [...new Set((data.userIds ?? []).map((value) => value.trim()).filter(Boolean))].filter((id) => id !== adminUserId);
    if (!userIds.length) {
      throw new ConflictException("Khong co nguoi dung nao hop le.");
    }

    const currentUsers = await this.prisma.user.findMany({
      where: {
        id: {
          in: userIds
        }
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        refreshSessions: {
          select: {
            id: true
          }
        }
      }
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.refreshSession.deleteMany({
        where: {
          userId: {
            in: userIds
          }
        }
      });

      await tx.user.updateMany({
        where: {
          id: {
            in: userIds
          }
        },
        data: {
          status: "DISABLED"
        }
      });
    });

    const workspaceId = await this.resolveAuditWorkspaceId();
    if (workspaceId) {
      await recordAudit(this.prisma, {
        workspaceId,
        userId: adminUserId,
        action: "admin.user.bulk_delete",
        entityType: "User",
        metadata: {
          userIds,
          deletedCount: currentUsers.length
        }
      });
    }

    return {
      message: "Da xoa/vo hieu hoa nguoi dung hang loat.",
      data: {
        count: currentUsers.length
      }
    };
  }

  async workspaces(userId: string, query?: AdminListQuery) {
    await this.assertAdmin(userId);
    const paging = this.getPaging(query);
    const status = this.normalizeWorkspaceStatus(query?.status);
    const search = paging.query;
    const where: any = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { slug: { contains: search } },
              { owner: { email: { contains: search } } },
              { subscriptions: { some: { plan: { name: { contains: search } } } } },
              ...(this.isWorkspaceStatus(search) ? [{ status: search.toUpperCase() }] : [])
            ]
          }
        : {})
    };

    const [workspaces, total] = await Promise.all([
      this.prisma.workspace.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: paging.skip,
        take: paging.pageSize,
        include: {
          owner: {
            select: {
              id: true,
              email: true
            }
          },
          subscriptions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { plan: true }
          },
          _count: {
            select: {
              members: true,
              accounts: true,
              jobs: true,
              tools: true
            }
          }
        }
      }),
      this.prisma.workspace.count({ where })
    ]);

    return {
      message: "Danh sach workspace.",
      data: this.toPage(workspaces, total, paging)
    };
  }

  async createWorkspace(
    adminUserId: string,
    data: {
      name: string;
      ownerEmail?: string;
      slug?: string;
    }
  ) {
    await this.assertAdmin(adminUserId);

    const name = data.name.trim();
    if (!name) {
      throw new ConflictException("Ten workspace la bat buoc.");
    }

    const owner = data.ownerEmail?.trim()
      ? await this.prisma.user.findUnique({
          where: { email: data.ownerEmail.trim().toLowerCase() },
          select: { id: true, email: true }
        })
      : await this.prisma.user.findUnique({
          where: { id: adminUserId },
          select: { id: true, email: true }
        });

    if (!owner) {
      throw new NotFoundException("Khong tim thay nguoi so huu workspace.");
    }

    const workspace = await this.prisma.workspace.create({
      data: {
        ownerUserId: owner.id,
        name,
        slug:
          data.slug?.trim() ||
          `${name
            .toLowerCase()
            .normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")}-${Math.random().toString(36).slice(2, 8)}`,
        members: {
          create: {
            userId: owner.id,
            role: "ADMIN"
          }
        }
      }
    });

    await recordAudit(this.prisma, {
      workspaceId: workspace.id,
      userId: adminUserId,
      action: "admin.workspace.create",
      entityType: "Workspace",
      entityId: workspace.id,
      metadata: {
        name: workspace.name,
        slug: workspace.slug,
        ownerEmail: owner.email
      }
    });

    return {
      message: "Tao workspace thanh cong.",
      data: workspace
    };
  }

  async deleteWorkspace(adminUserId: string, workspaceId: string) {
    await this.assertAdmin(adminUserId);

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        slug: true,
        ownerUserId: true,
        _count: {
          select: {
            members: true,
            accounts: true,
            jobs: true,
            tools: true,
            subscriptions: true,
            auditLogs: true,
            usages: true,
            snapshots: true
          }
        }
      }
    });

    if (!workspace) {
      throw new NotFoundException("Khong tim thay workspace.");
    }

    await recordAudit(this.prisma, {
      workspaceId,
      userId: adminUserId,
      action: "admin.workspace.delete",
      entityType: "Workspace",
      entityId: workspaceId,
      metadata: {
        name: workspace.name,
        slug: workspace.slug,
        counts: workspace._count
      }
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.jobLog.deleteMany({ where: { workspaceId } });
      await tx.jobRun.deleteMany({ where: { workspaceId } });
      await tx.job.deleteMany({ where: { workspaceId } });
      await tx.dataSnapshot.deleteMany({ where: { workspaceId } });
      await tx.billingUsage.deleteMany({ where: { workspaceId } });
      await tx.account.deleteMany({ where: { workspaceId } });
      await tx.subscription.deleteMany({ where: { workspaceId } });
      await tx.workspaceTool.deleteMany({ where: { workspaceId } });
      await tx.workspaceMember.deleteMany({ where: { workspaceId } });
      await tx.auditLog.deleteMany({ where: { workspaceId } });
      await tx.workspace.delete({ where: { id: workspaceId } });
    });

    return {
      message: "Da xoa workspace.",
      data: {
        id: workspaceId
      }
    };
  }

  async bulkUpdateWorkspaces(adminUserId: string, data: { workspaceIds: string[]; status?: WorkspaceStatusValue }) {
    await this.assertAdmin(adminUserId);

    const workspaceIds = this.normalizeIdList(data.workspaceIds);
    if (!workspaceIds.length || !data.status) {
      throw new ConflictException("Khong co workspace hoac trang thai hop le.");
    }

    const result = await this.prisma.workspace.updateMany({
      where: { id: { in: workspaceIds } },
      data: { status: data.status }
    });

    const workspaceId = await this.resolveAuditWorkspaceId();
    if (workspaceId) {
      await recordAudit(this.prisma, {
        workspaceId,
        userId: adminUserId,
        action: "admin.workspace.bulk_update",
        entityType: "Workspace",
        metadata: { workspaceIds, status: data.status, updatedCount: result.count }
      });
    }

    return {
      message: "Cap nhat workspace hang loat thanh cong.",
      data: result
    };
  }

  async bulkDeleteWorkspaces(adminUserId: string, data: { workspaceIds: string[] }) {
    await this.assertAdmin(adminUserId);

    const workspaceIds = this.normalizeIdList(data.workspaceIds);
    if (!workspaceIds.length) {
      throw new ConflictException("Khong co workspace nao hop le.");
    }

    for (const workspaceId of workspaceIds) {
      await this.deleteWorkspace(adminUserId, workspaceId);
    }

    return {
      message: "Da xoa workspace hang loat.",
      data: { count: workspaceIds.length }
    };
  }

  async workspaceDetail(adminUserId: string, workspaceId: string) {
    await this.assertAdmin(adminUserId);

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            role: true,
            status: true
          }
        },
        members: {
          orderBy: { createdAt: "asc" },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                role: true,
                status: true
              }
            }
          }
        },
        subscriptions: {
          orderBy: { createdAt: "desc" },
          include: {
            plan: true
          }
        },
        accounts: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            label: true,
            platform: true,
            status: true,
            createdAt: true
          }
        },
        jobs: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            platform: true,
            jobType: true,
            mode: true,
            status: true,
            createdAt: true
          }
        },
        tools: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            enabled: true,
            createdAt: true,
            tool: {
              select: {
                id: true,
                code: true,
                name: true,
                category: true,
                status: true
              }
            }
          }
        },
        auditLogs: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            user: {
              select: {
                id: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!workspace) {
      throw new ForbiddenException("Khong tim thay workspace.");
    }

    return {
      message: "Chi tiet workspace.",
      data: workspace
    };
  }

  async updateWorkspace(adminUserId: string, workspaceId: string, data: { status?: WorkspaceStatusValue }) {
    await this.assertAdmin(adminUserId);

    const workspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        status: data.status
      }
    });

    await recordAudit(this.prisma, {
      workspaceId,
      userId: adminUserId,
      action: "admin.workspace.update",
      entityType: "Workspace",
      entityId: workspaceId,
      metadata: data
    });

    return {
      message: "Cap nhat workspace thanh cong.",
      data: workspace
    };
  }

  async accounts(userId: string, query?: AdminListQuery) {
    await this.assertAdmin(userId);
    const paging = this.getPaging(query);
    const status = this.normalizeAccountStatusOrNull(query?.status);
    const platform = this.normalizeAccountPlatformOrNull(query?.platform);
    const search = paging.query;
    const where: any = {
      ...(status ? { status } : {}),
      ...(platform ? { platform } : {}),
      ...(search
        ? {
            OR: [
              { label: { contains: search } },
              { tag: { contains: search } },
              { groupName: { contains: search } },
              { note: { contains: search } },
              { workspace: { name: { contains: search } } },
              { workspace: { owner: { email: { contains: search } } } },
              ...(this.isAccountStatus(search) ? [{ status: search.toUpperCase() }] : []),
              ...(this.isPlatform(search) ? [{ platform: search.toUpperCase() }] : [])
            ]
          }
        : {})
    };

    const [accounts, total] = await Promise.all([
      this.prisma.account.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: paging.skip,
        take: paging.pageSize,
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              owner: {
                select: {
                  email: true
                }
              }
            }
          }
        }
      }),
      this.prisma.account.count({ where })
    ]);

    return {
      message: "Danh sach tai khoan toan he thong.",
      data: this.toPage(accounts, total, paging)
    };
  }

  async createAccount(
    adminUserId: string,
    data: {
      workspaceId: string;
      label: string;
      platform: AccountPlatformValue;
      status?: AccountStatusValue;
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
    await this.assertAdmin(adminUserId);

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: data.workspaceId },
      select: {
        id: true,
        name: true
      }
    });

    if (!workspace) {
      throw new NotFoundException("Khong tim thay workspace.");
    }

    const label = data.label.trim();
    if (!label) {
      throw new ConflictException("Nhan tai khoan la bat buoc.");
    }

    const account = await this.prisma.account.create({
      data: {
        workspaceId: workspace.id,
        label,
        platform: this.normalizeAccountPlatform(data.platform),
        status: this.normalizeAccountStatus(data.status) ?? "PENDING",
        emailCiphertext: data.email?.trim() ? encryptSecret(data.email.trim()) : null,
        passwordCiphertext: data.password?.trim() ? encryptSecret(data.password.trim()) : null,
        cookieCiphertext: data.cookie?.trim() ? encryptSecret(data.cookie.trim()) : null,
        proxyCiphertext: data.proxy?.trim() ? encryptSecret(data.proxy.trim()) : null,
        twoFaCiphertext: data.twoFa?.trim() ? encryptSecret(data.twoFa.trim()) : null,
        tag: data.tag?.trim() || null,
        groupName: data.groupName?.trim() || null,
        note: data.note?.trim() || null
      },
      select: {
        id: true,
        label: true,
        platform: true,
        status: true,
        createdAt: true,
        workspace: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    await recordAudit(this.prisma, {
      workspaceId: workspace.id,
      userId: adminUserId,
      action: "admin.account.create",
      entityType: "Account",
      entityId: account.id,
      metadata: {
        label: account.label,
        platform: account.platform,
        status: account.status,
        workspaceId: workspace.id,
        workspaceName: workspace.name
      }
    });

    return {
      message: "Tao tai khoan thanh cong.",
      data: account
    };
  }

  async accountDetail(adminUserId: string, accountId: string) {
    await this.assertAdmin(adminUserId);

    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            status: true,
            owner: {
              select: {
                id: true,
                email: true
              }
            }
          }
        },
        jobs: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            platform: true,
            jobType: true,
            mode: true,
            status: true,
            createdAt: true
          }
        }
      }
    });

    if (!account) {
      throw new NotFoundException("Khong tim thay tai khoan.");
    }

    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        workspaceId: account.workspaceId,
        entityType: "Account",
        entityId: accountId
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        user: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });

    return {
      message: "Chi tiet tai khoan.",
      data: {
        ...account,
        auditLogs
      }
    };
  }

  async updateAccount(
    adminUserId: string,
    accountId: string,
    data: {
      label?: string;
      platform?: "FACEBOOK" | "TIKTOK" | "SHOPEE" | "YOUTUBE";
      status?: "ALIVE" | "DEAD" | "LIMITED" | "PENDING";
      tag?: string | null;
      groupName?: string | null;
      note?: string | null;
    }
  ) {
    await this.assertAdmin(adminUserId);

    const current = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, workspaceId: true }
    });

    if (!current) {
      throw new NotFoundException("Khong tim thay tai khoan.");
    }

    const account = await this.prisma.account.update({
      where: { id: accountId },
      data: {
        label: data.label,
        platform: data.platform,
        status: data.status,
        tag: data.tag !== undefined ? data.tag : undefined,
        groupName: data.groupName !== undefined ? data.groupName : undefined,
        note: data.note !== undefined ? data.note : undefined
      }
    });

    await recordAudit(this.prisma, {
      workspaceId: current.workspaceId,
      userId: adminUserId,
      action: "admin.account.update",
      entityType: "Account",
      entityId: accountId,
      metadata: data
    });

    return {
      message: "Cap nhat tai khoan thanh cong.",
      data: account
    };
  }

  async deleteAccount(adminUserId: string, accountId: string) {
    await this.assertAdmin(adminUserId);

    const current = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        workspaceId: true,
        label: true,
        platform: true,
        _count: {
          select: {
            jobs: true,
            snapshots: true
          }
        }
      }
    });

    if (!current) {
      throw new NotFoundException("Khong tim thay tai khoan.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.job.updateMany({
        where: { accountId: accountId },
        data: { accountId: null }
      });

      await tx.dataSnapshot.updateMany({
        where: { accountId: accountId },
        data: { accountId: null }
      });

      await tx.account.delete({
        where: { id: accountId }
      });
    });

    await recordAudit(this.prisma, {
      workspaceId: current.workspaceId,
      userId: adminUserId,
      action: "admin.account.delete",
      entityType: "Account",
      entityId: accountId,
      metadata: {
        label: current.label,
        platform: current.platform,
        detachedJobs: current._count.jobs,
        detachedSnapshots: current._count.snapshots
      }
    });

    return {
      message: "Da xoa tai khoan.",
      data: {
        id: accountId
      }
    };
  }

  async bulkUpdateAccounts(adminUserId: string, data: { accountIds: string[]; status?: AccountStatusValue }) {
    await this.assertAdmin(adminUserId);

    const accountIds = this.normalizeIdList(data.accountIds);
    if (!accountIds.length || !data.status) {
      throw new ConflictException("Khong co tai khoan hoac trang thai hop le.");
    }

    const result = await this.prisma.account.updateMany({
      where: { id: { in: accountIds } },
      data: { status: data.status }
    });

    const workspaceId = await this.resolveAuditWorkspaceId();
    if (workspaceId) {
      await recordAudit(this.prisma, {
        workspaceId,
        userId: adminUserId,
        action: "admin.account.bulk_update",
        entityType: "Account",
        metadata: { accountIds, status: data.status, updatedCount: result.count }
      });
    }

    return {
      message: "Cap nhat tai khoan hang loat thanh cong.",
      data: result
    };
  }

  async bulkDeleteAccounts(adminUserId: string, data: { accountIds: string[] }) {
    await this.assertAdmin(adminUserId);

    const accountIds = this.normalizeIdList(data.accountIds);
    if (!accountIds.length) {
      throw new ConflictException("Khong co tai khoan nao hop le.");
    }

    for (const accountId of accountIds) {
      await this.deleteAccount(adminUserId, accountId);
    }

    return {
      message: "Da xoa tai khoan hang loat.",
      data: { count: accountIds.length }
    };
  }

  async jobs(userId: string, query?: AdminListQuery) {
    await this.assertAdmin(userId);
    const paging = this.getPaging(query);
    const status = this.normalizeJobStatus(query?.status);
    const platform = this.normalizeAccountPlatformOrNull(query?.platform);
    const search = paging.query;
    const where: any = {
      ...(status ? { status } : {}),
      ...(platform ? { platform } : {}),
      ...(search
        ? {
            OR: [
              { id: { contains: search } },
              { workspace: { name: { contains: search } } },
              { workspace: { owner: { email: { contains: search } } } },
              { account: { label: { contains: search } } },
              { createdBy: { email: { contains: search } } },
              ...(this.isJobStatus(search) ? [{ status: search.toUpperCase() }] : []),
              ...(this.isPlatform(search) ? [{ platform: search.toUpperCase() }] : []),
              ...(this.isJobType(search) ? [{ jobType: search.toUpperCase() }] : []),
              ...(this.isJobMode(search) ? [{ mode: search.toUpperCase() }] : [])
            ]
          }
        : {})
    };

    const [jobs, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: paging.skip,
        take: paging.pageSize,
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              owner: {
                select: {
                  email: true
                }
              }
            }
          },
          account: {
            select: {
              id: true,
              label: true
            }
          },
          createdBy: {
            select: {
              email: true
            }
          },
          _count: {
            select: {
              runs: true
            }
          }
        }
      }),
      this.prisma.job.count({ where })
    ]);

    return {
      message: "Danh sach tac vu toan he thong.",
      data: this.toPage(jobs, total, paging)
    };
  }

  async createJob(
    adminUserId: string,
    data: {
      workspaceId: string;
      accountId?: string | null;
      platform: JobPlatformValue;
      jobType: JobTypeValue;
      mode?: JobModeValue;
      scheduleCron?: string | null;
      optionsJson?: string;
    }
  ) {
    await this.assertAdmin(adminUserId);

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: data.workspaceId },
      select: {
        id: true,
        name: true
      }
    });

    if (!workspace) {
      throw new NotFoundException("Khong tim thay workspace.");
    }

    if (data.accountId) {
      const account = await this.prisma.account.findFirst({
        where: {
          id: data.accountId,
          workspaceId: data.workspaceId
        },
        select: {
          id: true,
          label: true
        }
      });

      if (!account) {
        throw new NotFoundException("Khong tim thay tai khoan trong workspace.");
      }
    }

    const job = await this.prisma.job.create({
      data: {
        workspaceId: workspace.id,
        accountId: data.accountId ?? null,
        platform: this.normalizeJobPlatform(data.platform),
        jobType: this.normalizeJobType(data.jobType),
        mode: this.normalizeJobMode(data.mode),
        scheduleCron: data.scheduleCron?.trim() || null,
        status: "DRAFT",
        optionsJson: data.optionsJson?.trim() || "{}"
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true
          }
        },
        account: {
          select: {
            id: true,
            label: true
          }
        }
      }
    });

    await recordAudit(this.prisma, {
      workspaceId: workspace.id,
      userId: adminUserId,
      action: "admin.job.create",
      entityType: "Job",
      entityId: job.id,
      metadata: {
        platform: job.platform,
        jobType: job.jobType,
        mode: job.mode,
        accountId: job.accountId
      }
    });

    return {
      message: "Tao tac vu thanh cong.",
      data: job
    };
  }

  async jobDetail(adminUserId: string, jobId: string) {
    await this.assertAdmin(adminUserId);

    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            owner: {
              select: {
                email: true
              }
            }
          }
        },
        account: {
          select: {
            id: true,
            label: true
          }
        },
        createdBy: {
          select: {
            id: true,
            email: true
          }
        },
        runs: {
          orderBy: { createdAt: "desc" },
          include: {
            logs: {
              orderBy: { createdAt: "asc" }
            }
          }
        }
      }
    });

    if (!job) {
      throw new ForbiddenException("Khong tim thay tac vu.");
    }

    return {
      message: "Chi tiet tac vu.",
      data: job
    };
  }

  async jobRunDetail(adminUserId: string, runId: string) {
    await this.assertAdmin(adminUserId);

    const run = await this.prisma.jobRun.findUnique({
      where: { id: runId },
      include: {
        job: {
          include: {
            workspace: {
              select: {
                id: true,
                name: true,
                owner: {
                  select: {
                    email: true
                  }
                }
              }
            },
            account: {
              select: {
                id: true,
                label: true
              }
            },
            createdBy: {
              select: {
                id: true,
                email: true
              }
            }
          }
        },
        logs: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!run) {
      throw new NotFoundException("Khong tim thay lan chay.");
    }

    return {
      message: "Chi tiet lan chay.",
      data: run
    };
  }

  async updateJob(
    userId: string,
    jobId: string,
    data: {
      status?: JobStatusValue;
    }
  ) {
    await this.assertAdmin(userId);

    const job = await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: data.status
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true
          }
        },
        account: {
          select: {
            id: true,
            label: true
          }
        }
      }
    });

    await recordAudit(this.prisma, {
      workspaceId: job.workspace.id,
      userId,
      action: "admin.job.update",
      entityType: "Job",
      entityId: jobId,
      metadata: data
    });

    return {
      message: "Cap nhat tac vu thanh cong.",
      data: job
    };
  }

  async deleteJob(adminUserId: string, jobId: string) {
    await this.assertAdmin(adminUserId);

    const current = await this.prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        workspaceId: true,
        platform: true,
        jobType: true,
        _count: {
          select: {
            runs: true
          }
        }
      }
    });

    if (!current) {
      throw new NotFoundException("Khong tim thay tac vu.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.jobLog.deleteMany({
        where: { jobRun: { jobId } }
      });
      await tx.jobRun.deleteMany({
        where: { jobId }
      });
      await tx.job.delete({
        where: { id: jobId }
      });
    });

    await recordAudit(this.prisma, {
      workspaceId: current.workspaceId,
      userId: adminUserId,
      action: "admin.job.delete",
      entityType: "Job",
      entityId: jobId,
      metadata: {
        platform: current.platform,
        jobType: current.jobType,
        detachedRuns: current._count.runs
      }
    });

    return {
      message: "Da xoa tac vu.",
      data: {
        id: jobId
      }
    };
  }

  async bulkUpdateJobs(adminUserId: string, data: { jobIds: string[]; status?: JobStatusValue }) {
    await this.assertAdmin(adminUserId);

    const jobIds = this.normalizeIdList(data.jobIds);
    if (!jobIds.length || !data.status) {
      throw new ConflictException("Khong co tac vu hoac trang thai hop le.");
    }

    const result = await this.prisma.job.updateMany({
      where: { id: { in: jobIds } },
      data: { status: data.status }
    });

    const workspaceId = await this.resolveAuditWorkspaceId();
    if (workspaceId) {
      await recordAudit(this.prisma, {
        workspaceId,
        userId: adminUserId,
        action: "admin.job.bulk_update",
        entityType: "Job",
        metadata: { jobIds, status: data.status, updatedCount: result.count }
      });
    }

    return {
      message: "Cap nhat tac vu hang loat thanh cong.",
      data: result
    };
  }

  async bulkDeleteJobs(adminUserId: string, data: { jobIds: string[] }) {
    await this.assertAdmin(adminUserId);

    const jobIds = this.normalizeIdList(data.jobIds);
    if (!jobIds.length) {
      throw new ConflictException("Khong co tac vu nao hop le.");
    }

    for (const jobId of jobIds) {
      await this.deleteJob(adminUserId, jobId);
    }

    return {
      message: "Da xoa tac vu hang loat.",
      data: { count: jobIds.length }
    };
  }

  async plans(userId: string) {
    await this.assertAdmin(userId);

    const plans = await this.prisma.plan.findMany({
      orderBy: { priceMonthly: "asc" },
      include: {
        _count: {
          select: {
            subscriptions: true
          }
        }
      }
    });

    return {
      message: "Danh sach goi dich vu.",
      data: plans
    };
  }

  async createPlan(
    userId: string,
    data: {
      code: PlanCodeValue;
      name: string;
      priceMonthly: number;
      maxAccounts: number;
      maxRunningJobs: number;
      maxWorkspaces: number;
      maxDailyFetches: number;
      featuresJson: string;
    }
  ) {
    await this.assertAdmin(userId);

    const code = data.code;
    const name = data.name.trim();
    if (!name) {
      throw new ConflictException("Ten goi la bat buoc.");
    }

    const existing = await this.prisma.plan.findUnique({ where: { code } });
    if (existing) {
      throw new ConflictException("Ma goi nay da ton tai.");
    }

    const plan = await this.prisma.plan.create({
      data: {
        code,
        name,
        priceMonthly: data.priceMonthly,
        maxAccounts: data.maxAccounts,
        maxRunningJobs: data.maxRunningJobs,
        maxWorkspaces: data.maxWorkspaces,
        maxDailyFetches: data.maxDailyFetches,
        featuresJson: data.featuresJson?.trim() || "[]"
      },
      include: {
        _count: {
          select: {
            subscriptions: true
          }
        }
      }
    });

    const workspaceId = await this.resolveAuditWorkspaceId();
    if (workspaceId) {
      await recordAudit(this.prisma, {
        workspaceId,
        userId,
        action: "admin.plan.create",
        entityType: "Plan",
        entityId: plan.id,
        metadata: {
          code: plan.code,
          name: plan.name
        }
      });
    }

    return {
      message: "Tao goi dich vu thanh cong.",
      data: plan
    };
  }

  async updatePlan(
    userId: string,
    planId: string,
    data: {
      name?: string;
      priceMonthly?: number;
      maxAccounts?: number;
      maxRunningJobs?: number;
      maxWorkspaces?: number;
      maxDailyFetches?: number;
      featuresJson?: string;
    }
  ) {
    await this.assertAdmin(userId);

    const plan = await this.prisma.plan.update({
      where: { id: planId },
      data
    });

    const workspaceId = await this.resolveAuditWorkspaceId();
    if (workspaceId) {
      await recordAudit(this.prisma, {
        workspaceId,
        userId,
        action: "admin.plan.update",
        entityType: "Plan",
        entityId: planId,
        metadata: data
      });
    }

    return {
      message: "Cap nhat goi dich vu thanh cong.",
      data: plan
    };
  }

  async deletePlan(userId: string, planId: string) {
    await this.assertAdmin(userId);

    const current = await this.prisma.plan.findUnique({
      where: { id: planId },
      select: {
        id: true,
        code: true,
        name: true,
        _count: {
          select: {
            subscriptions: true
          }
        }
      }
    });

    if (!current) {
      throw new NotFoundException("Khong tim thay goi dich vu.");
    }

    if (current._count.subscriptions > 0) {
      throw new ConflictException("Goi dang duoc su dung nen khong the xoa.");
    }

    await this.prisma.plan.delete({
      where: { id: planId }
    });

    const workspaceId = await this.resolveAuditWorkspaceId();
    if (workspaceId) {
      await recordAudit(this.prisma, {
        workspaceId,
        userId,
        action: "admin.plan.delete",
        entityType: "Plan",
        entityId: planId,
        metadata: {
          code: current.code,
          name: current.name
        }
      });
    }

    return {
      message: "Da xoa goi dich vu.",
      data: {
        id: planId
      }
    };
  }

  async tools(userId: string, query?: AdminListQuery) {
    await this.assertAdmin(userId);
    const paging = this.getPaging(query);
    const status = this.normalizeToolStatus(query?.status);
    const category = this.normalizeToolCategory(query?.category);
    const search = paging.query;
    const where: any = {
      ...(status ? { status } : {}),
      ...(category ? { category } : {}),
      ...(search
        ? {
            OR: [
              { code: { contains: search } },
              { name: { contains: search } },
              { description: { contains: search } },
              ...(this.isToolStatus(search) ? [{ status: search.toUpperCase() }] : []),
              ...(this.isToolCategory(search) ? [{ category: search.toUpperCase() }] : [])
            ]
          }
        : {})
    };

    const [tools, total] = await Promise.all([
      this.prisma.tool.findMany({
        where,
        orderBy: [{ category: "asc" }, { name: "asc" }],
        skip: paging.skip,
        take: paging.pageSize,
        include: {
          _count: {
            select: {
              workspaceTools: true
            }
          }
        }
      }),
      this.prisma.tool.count({ where })
    ]);

    return {
      message: "Danh sach cong cu toan he thong.",
      data: this.toPage(
        tools.map((tool) => ({
          ...tool,
          contract: this.resolveToolContract(tool.configJson)
        })),
        total,
        paging
      )
    };
  }

  async createTool(
    userId: string,
    data: {
      code: string;
      name: string;
      description: string;
      category: "FACEBOOK" | "TIKTOK" | "DATA" | "AUTOMATION" | "SYSTEM";
      status?: "ACTIVE" | "DISABLED";
      configJson: string;
    }
  ) {
    await this.assertAdmin(userId);

    const code = data.code.trim().toLowerCase();
    if (!code) {
      throw new ConflictException("Ma cong cu la bat buoc.");
    }

    const existing = await this.prisma.tool.findUnique({ where: { code } });
    if (existing) {
      throw new ConflictException("Ma cong cu nay da ton tai.");
    }

    const tool = await this.prisma.tool.create({
      data: {
        code,
        name: data.name.trim(),
        description: data.description.trim(),
        category: data.category,
        status: data.status ?? "ACTIVE",
        configJson: data.configJson?.trim() || "{}"
      },
      include: {
        _count: {
          select: {
            workspaceTools: true
          }
        }
      }
    });

    const workspaceId = await this.resolveAuditWorkspaceId();
    if (workspaceId) {
        await recordAudit(this.prisma, {
        workspaceId,
        userId,
        action: "admin.tool.create",
        entityType: "Tool",
        entityId: tool.id,
        metadata: {
          code: tool.code,
          name: tool.name,
          description: tool.description,
          category: tool.category,
          status: tool.status,
          configJson: tool.configJson
        }
      });
    }

    return {
      message: "Tao cong cu thanh cong.",
      data: tool
    };
  }

  async toolDetail(adminUserId: string, toolId: string) {
    await this.assertAdmin(adminUserId);

    const tool = await this.prisma.tool.findUnique({
      where: { id: toolId },
      include: {
        workspaceTools: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            workspace: {
              select: {
                id: true,
                name: true,
                status: true,
                owner: {
                  select: {
                    email: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!tool) {
      throw new NotFoundException("Khong tim thay cong cu.");
    }

    const config = parseToolConfig(tool.configJson);
    const contract = this.resolveToolContract(tool.configJson);
    const platform = config.platform ? this.normalizeJobPlatform(config.platform) : null;
    const jobType = config.jobType ? this.normalizeJobType(config.jobType) : null;
    const toolRuns =
      platform && jobType
        ? await this.prisma.jobRun.findMany({
            where: {
              job: {
                platform,
                jobType
              }
            },
            orderBy: { createdAt: "desc" },
            take: 30,
            include: {
              job: {
                select: {
                  id: true,
                  platform: true,
                  jobType: true,
                  mode: true,
                  status: true,
                  workspace: {
                    select: {
                      id: true,
                      name: true,
                      owner: {
                        select: {
                          email: true
                        }
                      }
                    }
                  },
                  account: {
                    select: {
                      id: true,
                      label: true
                    }
                  },
                  createdBy: {
                    select: {
                      id: true,
                      email: true
                    }
                  }
                }
              },
              logs: {
                orderBy: { createdAt: "asc" },
                take: 20
              }
            }
          })
        : [];

    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        OR: [
          {
            entityType: "Tool",
            entityId: toolId
          },
          {
            entityType: "WorkspaceTool",
            metadataJson: {
              contains: toolId
            }
          }
        ]
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        user: {
          select: {
            id: true,
            email: true
          }
        },
        workspace: {
          select: {
            id: true,
            name: true,
            owner: {
              select: {
                email: true
              }
            }
          }
        }
      }
    });

    const configVersions = this.buildToolVersions(auditLogs);

    return {
      message: "Chi tiet cong cu.",
      data: {
        ...tool,
        contract,
        toolRuns,
        auditLogs,
        configVersions
      }
    };
  }

  async updateTool(
    userId: string,
    toolId: string,
    data: {
      name?: string;
      description?: string;
      status?: "ACTIVE" | "DISABLED";
      configJson?: string;
    }
  ) {
    await this.assertAdmin(userId);

    const current = await this.prisma.tool.findUnique({
      where: { id: toolId },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        status: true,
        configJson: true
      }
    });

    if (!current) {
      throw new NotFoundException("Khong tim thay cong cu.");
    }

    const tool = await this.prisma.tool.update({
      where: { id: toolId },
      data
    });

    const workspaceId = await this.resolveAuditWorkspaceId();
    if (workspaceId) {
      await recordAudit(this.prisma, {
        workspaceId,
        userId,
        action: "admin.tool.update",
        entityType: "Tool",
        entityId: toolId,
        metadata: {
          before: current,
          after: {
            name: tool.name,
            description: tool.description,
            status: tool.status,
            configJson: tool.configJson
          }
        }
      });
    }

    return {
      message: "Cap nhat cong cu thanh cong.",
      data: tool
    };
  }

  async rollbackTool(userId: string, toolId: string, versionId: string) {
    await this.assertAdmin(userId);

    const tool = await this.prisma.tool.findUnique({
      where: { id: toolId }
    });

    if (!tool) {
      throw new NotFoundException("Khong tim thay cong cu.");
    }

    const version = await this.prisma.auditLog.findFirst({
      where: {
        id: versionId,
        entityType: "Tool",
        entityId: toolId,
        action: {
          in: ["admin.tool.create", "admin.tool.update", "admin.tool.clone"]
        }
      }
    });

    if (!version?.metadataJson) {
      throw new NotFoundException("Khong tim thay phien ban de khoi phuc.");
    }

    const snapshot = this.parseToolVersionSnapshot(version.metadataJson);
    if (!snapshot) {
      throw new BadRequestException("Du lieu phien ban tool khong hop le.");
    }

    const updated = await this.prisma.tool.update({
      where: { id: toolId },
      data: {
        name: snapshot.name,
        description: snapshot.description,
        status: snapshot.status,
        configJson: snapshot.configJson
      }
    });

    const workspaceId = await this.resolveAuditWorkspaceId();
    if (workspaceId) {
      await recordAudit(this.prisma, {
        workspaceId,
        userId,
        action: "admin.tool.rollback",
        entityType: "Tool",
        entityId: toolId,
        metadata: {
          sourceVersionId: versionId,
          snapshot
        }
      });
    }

    return {
      message: "Da khoi phuc phien ban cong cu.",
      data: updated
    };
  }

  async cloneTool(userId: string, toolId: string) {
    await this.assertAdmin(userId);

    const source = await this.prisma.tool.findUnique({
      where: { id: toolId },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        category: true,
        configJson: true,
        status: true
      }
    });

    if (!source) {
      throw new NotFoundException("Khong tim thay cong cu.");
    }

    let code = this.buildCloneToolCode(source.code);
    let attempt = 0;
    while (await this.prisma.tool.findUnique({ where: { code } })) {
      attempt += 1;
      code = this.buildCloneToolCode(source.code, attempt);
      if (attempt > 5) {
        throw new ConflictException("Khong the tao ma cong cu moi.");
      }
    }

    const tool = await this.prisma.tool.create({
      data: {
        code,
        name: `${source.name} - copy`,
        description: source.description,
        category: source.category,
        status: "DISABLED",
        configJson: source.configJson
      },
      include: {
        _count: {
          select: {
            workspaceTools: true
          }
        }
      }
    });

    const workspaceId = await this.resolveAuditWorkspaceId();
    if (workspaceId) {
      await recordAudit(this.prisma, {
        workspaceId,
        userId,
        action: "admin.tool.clone",
        entityType: "Tool",
        entityId: tool.id,
        metadata: {
          sourceToolId: source.id,
          sourceCode: source.code,
          clonedCode: tool.code,
          name: tool.name,
          description: tool.description,
          status: tool.status,
          configJson: tool.configJson
        }
      });
    }

    return {
      message: "Nhan ban cong cu thanh cong.",
      data: tool
    };
  }

  async deleteTool(userId: string, toolId: string) {
    await this.assertAdmin(userId);

    const current = await this.prisma.tool.findUnique({
      where: { id: toolId },
      select: {
        id: true,
        code: true,
        name: true,
        _count: {
          select: {
            workspaceTools: true
          }
        }
      }
    });

    if (!current) {
      throw new NotFoundException("Khong tim thay cong cu.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.workspaceTool.deleteMany({
        where: { toolId }
      });
      await tx.tool.delete({
        where: { id: toolId }
      });
    });

    const workspaceId = await this.resolveAuditWorkspaceId();
    if (workspaceId) {
      await recordAudit(this.prisma, {
        workspaceId,
        userId,
        action: "admin.tool.delete",
        entityType: "Tool",
        entityId: toolId,
        metadata: {
          code: current.code,
          name: current.name,
          detachedWorkspaces: current._count.workspaceTools
        }
      });
    }

    return {
      message: "Da xoa cong cu.",
      data: {
        id: toolId
      }
    };
  }

  async bulkUpdateTools(userId: string, data: { toolIds: string[]; status?: "ACTIVE" | "DISABLED" }) {
    await this.assertAdmin(userId);

    const toolIds = this.normalizeIdList(data.toolIds);
    if (!toolIds.length || !data.status) {
      throw new ConflictException("Khong co cong cu hoac trang thai hop le.");
    }

    const result = await this.prisma.tool.updateMany({
      where: { id: { in: toolIds } },
      data: { status: data.status }
    });

    const workspaceId = await this.resolveAuditWorkspaceId();
    if (workspaceId) {
      await recordAudit(this.prisma, {
        workspaceId,
        userId,
        action: "admin.tool.bulk_update",
        entityType: "Tool",
        metadata: { toolIds, status: data.status, updatedCount: result.count }
      });
    }

    return {
      message: "Cap nhat cong cu hang loat thanh cong.",
      data: result
    };
  }

  async bulkDeleteTools(userId: string, data: { toolIds: string[] }) {
    await this.assertAdmin(userId);

    const toolIds = this.normalizeIdList(data.toolIds);
    if (!toolIds.length) {
      throw new ConflictException("Khong co cong cu nao hop le.");
    }

    for (const toolId of toolIds) {
      await this.deleteTool(userId, toolId);
    }

    return {
      message: "Da xoa cong cu hang loat.",
      data: { count: toolIds.length }
    };
  }

  async assignPlan(userId: string, workspaceId: string, data: { planCode: PlanCodeValue }) {
    await this.assertAdmin(userId);

    const plan = await this.prisma.plan.findUnique({
      where: { code: data.planCode }
    });

    if (!plan) {
      throw new ForbiddenException("Goi dich vu khong hop le.");
    }

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await this.prisma.subscription.updateMany({
      where: {
        workspaceId,
        status: "ACTIVE"
      },
      data: {
        status: "EXPIRED"
      }
    });

    const subscription = await this.prisma.subscription.create({
      data: {
        workspaceId,
        planId: plan.id,
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        renewAt: periodEnd
      },
      include: {
        plan: true,
        workspace: true
      }
    });

    await recordAudit(this.prisma, {
      workspaceId,
      userId,
      action: "admin.plan.assign",
      entityType: "Subscription",
      entityId: subscription.id,
      metadata: {
        planCode: data.planCode
      }
    });

    return {
      message: "Gan goi dich vu cho workspace thanh cong.",
      data: subscription
    };
  }

  private getPaging(query?: AdminListQuery) {
    const page = this.clampInt(query?.page, 1, 1, 100000);
    const pageSize = this.clampInt(query?.pageSize, 20, 1, 100);
    return {
      page,
      pageSize,
      skip: (page - 1) * pageSize,
      query: query?.query?.trim() ?? ""
    };
  }

  private toPage<T>(items: T[], total: number, paging: ReturnType<AdminService["getPaging"]>) {
    return {
      items,
      total,
      page: paging.page,
      pageSize: paging.pageSize,
      pageCount: Math.max(1, Math.ceil(total / paging.pageSize)),
      query: paging.query
    };
  }

  private clampInt(value: string | undefined, fallback: number, min: number, max: number) {
    const parsed = Number.parseInt(value ?? "", 10);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }
    return Math.min(max, Math.max(min, parsed));
  }

  private normalizeUserStatus(value?: string): UserStatusValue | undefined {
    const normalized = value?.toUpperCase();
    return normalized === "ACTIVE" || normalized === "DISABLED" ? normalized : undefined;
  }

  private normalizeWorkspaceStatus(value?: string): WorkspaceStatusValue | undefined {
    const normalized = value?.toUpperCase();
    return normalized === "ACTIVE" || normalized === "SUSPENDED" ? normalized : undefined;
  }

  private normalizeJobStatus(value?: string): JobStatusValue | undefined {
    const normalized = value?.toUpperCase();
    return this.isJobStatus(normalized) ? (normalized as JobStatusValue) : undefined;
  }

  private normalizeToolStatus(value?: string): "ACTIVE" | "DISABLED" | undefined {
    const normalized = value?.toUpperCase();
    return this.isToolStatus(normalized) ? (normalized as "ACTIVE" | "DISABLED") : undefined;
  }

  private normalizeToolCategory(value?: string): "FACEBOOK" | "TIKTOK" | "DATA" | "AUTOMATION" | "SYSTEM" | undefined {
    const normalized = value?.toUpperCase();
    return this.isToolCategory(normalized) ? (normalized as "FACEBOOK" | "TIKTOK" | "DATA" | "AUTOMATION" | "SYSTEM") : undefined;
  }

  private normalizeAccountPlatformOrNull(value?: string): AccountPlatformValue | undefined {
    const normalized = value?.toUpperCase();
    return this.isPlatform(normalized) ? (normalized as AccountPlatformValue) : undefined;
  }

  private normalizeAccountStatusOrNull(value?: string): AccountStatusValue | undefined {
    const normalized = value?.toUpperCase();
    return this.isAccountStatus(normalized) ? (normalized as AccountStatusValue) : undefined;
  }

  private isUserRole(value?: string): value is UserRoleValue {
    const normalized = value?.toUpperCase();
    return normalized === "USER" || normalized === "ADMIN";
  }

  private isUserStatus(value?: string): value is UserStatusValue {
    return Boolean(this.normalizeUserStatus(value));
  }

  private isWorkspaceStatus(value?: string): value is WorkspaceStatusValue {
    return Boolean(this.normalizeWorkspaceStatus(value));
  }

  private isAccountStatus(value?: string): value is AccountStatusValue {
    const normalized = value?.toUpperCase();
    return normalized === "ALIVE" || normalized === "DEAD" || normalized === "LIMITED" || normalized === "PENDING";
  }

  private isJobStatus(value?: string): value is JobStatusValue {
    const normalized = value?.toUpperCase();
    return ["DRAFT", "QUEUED", "RUNNING", "PAUSED", "DONE", "FAILED"].includes(normalized ?? "");
  }

  private isJobType(value?: string): value is JobTypeValue {
    const normalized = value?.toUpperCase();
    return [
      "FETCH_POSTS",
      "FETCH_COMMENTS",
      "FETCH_PROFILE",
      "CHECK_PROXY",
      "ACCOUNT_HEALTH",
      "GROUP_MODERATION",
      "KEYWORD_MONITOR",
      "WORKFLOW_BUILD",
      "FETCH_VIDEOS",
      "POST_GROUP",
      "NURTURE_ACCOUNT",
      "AUTO_LIKE",
      "AUTO_COMMENT",
      "REUP_VIDEO",
      "SHOPEE_VIDEO_AFF",
      "SHOPEE_LINK_CONVERT"
    ].includes(normalized ?? "");
  }

  private isJobMode(value?: string): value is JobModeValue {
    const normalized = value?.toUpperCase();
    return normalized === "ONCE" || normalized === "SCHEDULED" || normalized === "RECURRING";
  }

  private isToolStatus(value?: string): value is "ACTIVE" | "DISABLED" {
    const normalized = value?.toUpperCase();
    return normalized === "ACTIVE" || normalized === "DISABLED";
  }

  private isToolCategory(value?: string): value is "FACEBOOK" | "TIKTOK" | "DATA" | "AUTOMATION" | "SYSTEM" {
    const normalized = value?.toUpperCase();
    return normalized === "FACEBOOK" || normalized === "TIKTOK" || normalized === "DATA" || normalized === "AUTOMATION" || normalized === "SYSTEM";
  }

  private isPlatform(value?: string): value is AccountPlatformValue {
    const normalized = value?.toUpperCase();
    return normalized === "FACEBOOK" || normalized === "TIKTOK" || normalized === "SHOPEE" || normalized === "YOUTUBE";
  }

  private computeHealthScore(status: WorkspaceStatusValue, pressure: number, unreadNotifications: number) {
    const base = 100 - pressure * 60 - unreadNotifications * 3 - (status === "SUSPENDED" ? 35 : 0);
    return Math.max(0, Math.min(100, Math.round(base)));
  }

  private healthLevel(status: WorkspaceStatusValue, pressure: number, unreadNotifications: number): AdminInsightLevel {
    if (status === "SUSPENDED" || pressure >= 1 || unreadNotifications >= 10) {
      return "CRITICAL";
    }

    if (pressure >= 0.8 || unreadNotifications >= 5) {
      return "WARN";
    }

    if (pressure >= 0.6 || unreadNotifications >= 1) {
      return "WATCH";
    }

    return "GOOD";
  }

  private async checkDatabase() {
    const startedAt = Date.now();
    try {
      await this.prisma.$queryRawUnsafe("SELECT 1");
      return {
        ok: true,
        latencyMs: Date.now() - startedAt
      };
    } catch (error) {
      return {
        ok: false,
        latencyMs: null,
        error: error instanceof Error ? error.message : "Database unavailable"
      };
    }
  }

  private async resolveAuditWorkspaceId(): Promise<string | null> {
    const workspace = await this.prisma.workspace.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true }
    });

    return workspace?.id ?? null;
  }

  private normalizeIdList(values: string[] | undefined): string[] {
    return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))];
  }

  private buildCloneToolCode(sourceCode: string, attempt = 0) {
    const base = sourceCode.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    const suffix = `copy${attempt > 0 ? `-${attempt}` : ""}-${Date.now().toString(36).slice(-4)}`;
    const maxBaseLength = Math.max(8, 80 - suffix.length - 1);
    return `${base.slice(0, maxBaseLength)}-${suffix}`;
  }

  private buildToolVersions(
    auditLogs: Array<{
      id: string;
      action: string;
      createdAt: Date;
      user: { id: string; email: string } | null;
      metadataJson: string | null;
    }>
  ): AdminToolVersion[] {
    return auditLogs
      .filter((log) => log.action === "admin.tool.create" || log.action === "admin.tool.update" || log.action === "admin.tool.clone")
      .map((log) => {
        const snapshot = this.parseToolVersionSnapshot(log.metadataJson);
        if (!snapshot) {
          return null;
        }

        return {
          id: log.id,
          action: log.action as AdminToolVersion["action"],
          createdAt: log.createdAt.toISOString(),
          user: log.user,
          snapshot
        };
      })
      .filter((item): item is AdminToolVersion => item !== null);
  }

  private parseToolVersionSnapshot(
    value: string | null
  ): { name: string; description: string; status: "ACTIVE" | "DISABLED"; configJson: string } | null {
    if (!value) {
      return null;
    }

    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      const snapshot = (parsed.after ?? parsed.snapshot ?? parsed) as Record<string, unknown>;
      const name = typeof snapshot.name === "string" ? snapshot.name : "";
      const description = typeof snapshot.description === "string" ? snapshot.description : "";
      const status = snapshot.status === "ACTIVE" || snapshot.status === "DISABLED" ? snapshot.status : undefined;
      const configJson = typeof snapshot.configJson === "string" ? snapshot.configJson : "";

      if (!name || !description || !status || !configJson) {
        return null;
      }

      return {
        name,
        description,
        status,
        configJson
      };
    } catch {
      return null;
    }
  }

  private resolveToolContract(value: string): ToolContract | null {
    const config = parseToolConfig(value);
    if (!config.platform || !config.jobType) {
      return null;
    }
    return findToolContract(config.platform, config.jobType);
  }

  private normalizeAccountPlatform(platform: string): Platform {
    const value = platform.toUpperCase();
    if (value === "FACEBOOK") {
      return "FACEBOOK";
    }
    if (value === "TIKTOK") {
      return "TIKTOK";
    }
    if (value === "SHOPEE") {
      return "SHOPEE";
    }
    if (value === "YOUTUBE") {
      return "YOUTUBE";
    }
    throw new ConflictException("Nen tang tai khoan khong hop le.");
  }

  private normalizeAccountStatus(status?: string): AccountStatusValue | undefined {
    if (!status) {
      return undefined;
    }

    const value = status.toUpperCase();
    if (value === "ALIVE") {
      return "ALIVE";
    }
    if (value === "DEAD") {
      return "DEAD";
    }
    if (value === "LIMITED") {
      return "LIMITED";
    }
    if (value === "PENDING") {
      return "PENDING";
    }

    throw new ConflictException("Trang thai tai khoan khong hop le.");
  }

  private normalizeJobPlatform(platform: string): JobPlatformValue {
    const value = platform.toUpperCase();
    if (value === "FACEBOOK") {
      return "FACEBOOK";
    }
    if (value === "TIKTOK") {
      return "TIKTOK";
    }
    if (value === "SHOPEE") {
      return "SHOPEE";
    }
    if (value === "YOUTUBE") {
      return "YOUTUBE";
    }
    if (value === "SYSTEM") {
      return "SYSTEM";
    }
    if (value === "DATA") {
      return "DATA";
    }
    throw new ConflictException("Nen tang tac vu khong hop le.");
  }

  private normalizeJobType(jobType: string): JobTypeValue {
    const value = jobType.toUpperCase();
    const valid: JobTypeValue[] = [
      "FETCH_POSTS",
      "FETCH_COMMENTS",
      "FETCH_PROFILE",
      "CHECK_PROXY",
      "ACCOUNT_HEALTH",
      "GROUP_MODERATION",
      "KEYWORD_MONITOR",
      "WORKFLOW_BUILD",
      "FETCH_VIDEOS",
      "POST_GROUP",
      "NURTURE_ACCOUNT",
      "AUTO_LIKE",
      "AUTO_COMMENT",
      "REUP_VIDEO",
      "SHOPEE_VIDEO_AFF",
      "SHOPEE_LINK_CONVERT",
      "AI_CONTENT",
      "MARKETPLACE_SCAN",
      "BULK_MSG",
      "AUTO_JOIN_GROUP",
      "AUTO_DM",
      "CHANGE_PASSWORD",
      "REG_ACCOUNT",
      "SHOPEE_TRENDING",
      "EXPORT_DATA",
      "STRESS_TEST",
      "CLEANUP"
    ];

    if (valid.includes(value as JobTypeValue)) {
      return value as JobTypeValue;
    }

    throw new ConflictException(`Loai tac vu khong hop le: ${jobType}`);
  }

  private normalizeJobMode(mode?: string): JobModeValue {
    const value = (mode ?? "ONCE").toUpperCase();
    if (value === "ONCE") {
      return "ONCE";
    }
    if (value === "SCHEDULED") {
      return "SCHEDULED";
    }
    if (value === "RECURRING") {
      return "RECURRING";
    }
    throw new ConflictException("Che do tac vu khong hop le.");
  }
}
