import crypto from "node:crypto";
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { CreateWorkspaceDto, UpdateWorkspaceDto } from "../dto/workspace.dto";
import { CreateWorkspaceMemberDto, UpdateWorkspaceMemberDto } from "../dto/member.dto";
import { recordAudit } from "../lib/audit";

@Injectable()
export class WorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const workspaces = await this.prisma.workspace.findMany({
      where: {
        OR: [
          {
            ownerUserId: userId
          },
          {
            members: {
              some: {
                userId
              }
            }
          }
        ]
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return {
      message: "Danh sach khong gian lam viec.",
      data: workspaces
    };
  }

  async create(dto: CreateWorkspaceDto, ownerUserId: string) {
    if (!ownerUserId) {
      throw new ForbiddenException("Thieu thong tin nguoi so huu.");
    }

    const workspace = await this.prisma.workspace.create({
      data: {
        ownerUserId,
        name: dto.name,
        slug: dto.slug ?? this.makeSlug(dto.name, this.randomSuffix()),
        members: {
          create: {
            userId: ownerUserId,
            role: "ADMIN"
          }
        }
      }
    });

    await recordAudit(this.prisma, {
      workspaceId: workspace.id,
      userId: ownerUserId,
      action: "workspace.create",
      entityType: "Workspace",
      entityId: workspace.id,
      metadata: {
        name: workspace.name,
        slug: workspace.slug
      }
    });

    return {
      message: "Tao khong gian lam viec thanh cong.",
      data: workspace
    };
  }

  async detail(workspaceId: string, userId: string) {
    const workspace = await this.assertWorkspaceAccess(workspaceId, userId);
    const currentMember = workspace.members.find((member) => member.userId === userId) ?? null;

    return {
      message: "Lay chi tiet khong gian lam viec thanh cong.",
      data: {
        ...workspace,
        currentMemberRole:
          workspace.ownerUserId === userId || currentMember?.role === "ADMIN" ? "ADMIN" : currentMember?.role ?? null
      }
    };
  }

  async update(workspaceId: string, userId: string, dto: UpdateWorkspaceDto) {
    await this.assertWorkspaceManageAccess(workspaceId, userId);

    const name = dto.name?.trim();
    const slug = dto.slug?.trim();
    if (!name && !slug) {
      throw new ConflictException("Khong co thong tin workspace de cap nhat.");
    }

    const workspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        name,
        slug: slug ? this.makeSlug(slug) : undefined
      },
      include: {
        members: true,
        subscriptions: true
      }
    });

    await recordAudit(this.prisma, {
      workspaceId,
      userId,
      action: "workspace.update",
      entityType: "Workspace",
      entityId: workspaceId,
      metadata: {
        name: name ?? null,
        slug: slug ?? null
      }
    });

    return {
      message: "Cap nhat workspace thanh cong.",
      data: {
        ...workspace,
        currentMemberRole: "ADMIN"
      }
    };
  }

  async members(workspaceId: string, userId: string) {
    await this.assertWorkspaceManageAccess(workspaceId, userId);

    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
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
    });

    return {
      message: "Danh sach thanh vien workspace.",
      data: members
    };
  }

  async addMember(workspaceId: string, userId: string, dto: CreateWorkspaceMemberDto) {
    const workspace = await this.assertWorkspaceManageAccess(workspaceId, userId);
    const targetUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: { id: true, email: true }
    });

    if (!targetUser) {
      throw new NotFoundException("Khong tim thay nguoi dung.");
    }

    const member = await this.prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: targetUser.id
        }
      },
      create: {
        workspaceId,
        userId: targetUser.id,
        role: targetUser.id === workspace.ownerUserId ? "ADMIN" : dto.role ?? "USER"
      },
      update: {
        role: targetUser.id === workspace.ownerUserId ? "ADMIN" : dto.role ?? "USER"
      },
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
    });

    await recordAudit(this.prisma, {
      workspaceId,
      userId,
      action: "workspace.member.add",
      entityType: "WorkspaceMember",
      entityId: member.id,
      metadata: {
        workspaceId: workspace.id,
        memberEmail: targetUser.email,
        role: member.role
      }
    });

    return {
      message: "Them thanh vien thanh cong.",
      data: member
    };
  }

  async updateMember(workspaceId: string, memberId: string, userId: string, dto: UpdateWorkspaceMemberDto) {
    const workspace = await this.assertWorkspaceManageAccess(workspaceId, userId);

    const existing = await this.prisma.workspaceMember.findUnique({
      where: { id: memberId }
    });

    if (!existing || existing.workspaceId !== workspaceId) {
      throw new NotFoundException("Khong tim thay thanh vien.");
    }

    const member = await this.prisma.workspaceMember.update({
      where: { id: memberId },
      data: {
        role: existing.userId === workspace.ownerUserId ? "ADMIN" : dto.role
      },
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
    });

    await recordAudit(this.prisma, {
      workspaceId,
      userId,
      action: "workspace.member.update",
      entityType: "WorkspaceMember",
      entityId: member.id,
      metadata: {
        role: member.role,
        userEmail: member.user.email
      }
    });

    return {
      message: "Cap nhat thanh vien thanh cong.",
      data: member
    };
  }

  async removeMember(workspaceId: string, memberId: string, userId: string) {
    await this.assertWorkspaceManageAccess(workspaceId, userId);

    const existing = await this.prisma.workspaceMember.findUnique({
      where: { id: memberId },
      include: {
        user: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });

    if (!existing || existing.workspaceId !== workspaceId) {
      throw new NotFoundException("Khong tim thay thanh vien.");
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerUserId: true }
    });

    if (workspace?.ownerUserId === existing.userId) {
      throw new ForbiddenException("Khong the xoa chu so huu workspace.");
    }

    await this.prisma.workspaceMember.delete({
      where: { id: memberId }
    });

    await recordAudit(this.prisma, {
      workspaceId,
      userId,
      action: "workspace.member.remove",
      entityType: "WorkspaceMember",
      entityId: memberId,
      metadata: {
        userEmail: existing.user.email
      }
    });

    return {
      message: "Xoa thanh vien thanh cong.",
      data: {
        id: memberId
      }
    };
  }

  async assertWorkspaceAccess(workspaceId: string, userId: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        OR: [
          {
            ownerUserId: userId
          },
          {
            members: {
              some: {
                userId
              }
            }
          }
        ]
      },
      include: {
        members: true,
        subscriptions: true
      }
    });

    if (!workspace) {
      throw new NotFoundException("Khong tim thay khong gian lam viec hoac ban khong co quyen truy cap.");
    }

    return workspace;
  }

  async assertWorkspaceManageAccess(workspaceId: string, userId: string) {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, status: true }
    });

    if (!currentUser || currentUser.status !== "ACTIVE") {
      throw new ForbiddenException("Ban khong co quyen truy cap.");
    }

    if (currentUser.role === "ADMIN") {
      const workspace = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: {
          members: true,
          subscriptions: true
        }
      });

      if (!workspace) {
        throw new NotFoundException("Khong tim thay khong gian lam viec.");
      }

      return workspace;
    }

    const workspace = await this.prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        OR: [
          {
            ownerUserId: userId
          },
          {
            members: {
              some: {
                userId,
                role: "ADMIN"
              }
            }
          }
        ]
      },
      include: {
        members: true,
        subscriptions: true
      }
    });

    if (!workspace) {
      throw new ForbiddenException("Ban khong co quyen quan ly workspace nay.");
    }

    return workspace;
  }

  private makeSlug(name: string, suffix?: string): string {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .concat(suffix ? `-${suffix.slice(0, 6)}` : "");
  }

  private randomSuffix() {
    return crypto.randomBytes(3).toString("hex");
  }
}
