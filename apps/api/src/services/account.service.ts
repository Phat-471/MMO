import { Injectable, NotFoundException } from "@nestjs/common";
import { Platform } from "@prisma/client";
import { CreateAccountDto, UpdateAccountDto } from "../dto/account.dto";
import { PrismaService } from "../prisma.service";
import { encryptSecret } from "../lib/encryption";
import { WorkspaceService } from "./workspace.service";
import { recordAudit } from "../lib/audit";
import { BillingService } from "./billing.service";

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceService: WorkspaceService,
    private readonly billingService: BillingService
  ) {}

  async list(workspaceId: string, userId: string) {
    await this.workspaceService.assertWorkspaceAccess(workspaceId, userId);

    const items = await this.prisma.account.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" }
    });

    return {
      message: "Danh sach tai khoan.",
      data: items
    };
  }

  async create(workspaceId: string, userId: string, dto: CreateAccountDto) {
    await this.workspaceService.assertWorkspaceAccess(workspaceId, userId);

    // Quota check
    await this.billingService.checkQuota(workspaceId, "accountCount");

    const account = await this.prisma.account.create({
      data: {
        workspaceId,
        label: dto.label,
        platform: this.normalizePlatform(dto.platform),
        emailCiphertext: dto.email ? encryptSecret(dto.email) : null,
        passwordCiphertext: dto.password ? encryptSecret(dto.password) : null,
        cookieCiphertext: dto.cookie ? encryptSecret(dto.cookie) : null,
        proxyCiphertext: dto.proxy ? encryptSecret(dto.proxy) : null,
        twoFaCiphertext: dto.twoFa ? encryptSecret(dto.twoFa) : null,
        tag: dto.tag ?? null,
        note: dto.note ?? null,
        groupName: dto.groupName ?? null,
        status: this.normalizeStatus(dto.status)
      }
    });

    await recordAudit(this.prisma, {
      workspaceId,
      userId,
      action: "account.create",
      entityType: "Account",
      entityId: account.id,
      metadata: {
        label: account.label,
        platform: account.platform,
        status: account.status
      }
    });

    return {
      message: "Tao tai khoan thanh cong.",
      data: account
    };
  }

  async update(accountId: string, userId: string, dto: UpdateAccountDto) {
    const existing = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!existing) {
      throw new NotFoundException("Khong tim thay tai khoan.");
    }

    await this.workspaceService.assertWorkspaceAccess(existing.workspaceId, userId);

    const account = await this.prisma.account.update({
      where: { id: accountId },
      data: {
        label: dto.label ?? undefined,
        platform: dto.platform ? this.normalizePlatform(dto.platform) : undefined,
        emailCiphertext: dto.email !== undefined ? (dto.email ? encryptSecret(dto.email) : null) : undefined,
        passwordCiphertext: dto.password !== undefined ? (dto.password ? encryptSecret(dto.password) : null) : undefined,
        cookieCiphertext: dto.cookie !== undefined ? (dto.cookie ? encryptSecret(dto.cookie) : null) : undefined,
        proxyCiphertext: dto.proxy !== undefined ? (dto.proxy ? encryptSecret(dto.proxy) : null) : undefined,
        twoFaCiphertext: dto.twoFa !== undefined ? (dto.twoFa ? encryptSecret(dto.twoFa) : null) : undefined,
        tag: dto.tag ?? undefined,
        note: dto.note ?? undefined,
        status: this.normalizeStatus(dto.status),
        groupName: dto.groupName ?? undefined
      }
    });

    await recordAudit(this.prisma, {
      workspaceId: existing.workspaceId,
      userId,
      action: "account.update",
      entityType: "Account",
      entityId: account.id,
      metadata: {
        label: account.label,
        status: account.status
      }
    });

    return {
      message: "Cap nhat tai khoan thanh cong.",
      data: account
    };
  }

  async remove(accountId: string, userId: string) {
    const existing = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!existing) {
      throw new NotFoundException("Khong tim thay tai khoan.");
    }

    await this.workspaceService.assertWorkspaceAccess(existing.workspaceId, userId);

    await this.prisma.account.delete({ where: { id: accountId } });

    await recordAudit(this.prisma, {
      workspaceId: existing.workspaceId,
      userId,
      action: "account.delete",
      entityType: "Account",
      entityId: accountId,
      metadata: {
        label: existing.label,
        platform: existing.platform
      }
    });

    return {
      message: "Xoa tai khoan thanh cong.",
      data: {
        id: accountId
      }
    };
  }

  private normalizePlatform(platform: string): Platform {
    const value = platform.toLowerCase();
    if (value === "facebook") {
      return "FACEBOOK";
    }
    if (value === "tiktok") {
      return "TIKTOK";
    }
    throw new Error("Nen tang khong hop le");
  }

  private normalizeStatus(status?: string) {
    if (!status) {
      return undefined;
    }

    const value = status.toLowerCase();
    if (value === "alive" || value === "song") {
      return "ALIVE";
    }
    if (value === "dead" || value === "chet") {
      return "DEAD";
    }
    if (value === "limited" || value === "gioi han") {
      return "LIMITED";
    }
    if (value === "pending" || value === "chua kiem tra") {
      return "PENDING";
    }

    throw new Error("Trang thai tai khoan khong hop le");
  }
}
