import crypto from "node:crypto";
import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { AuthLoginDto, AuthRegisterDto } from "../dto/auth.dto";
import { hashPassword, verifyPassword } from "../lib/password";
import { bearerToken, signToken, verifyToken, type TokenPayload } from "../lib/token";
import { WorkspaceService } from "./workspace.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceService: WorkspaceService
  ) {}

  private accessSecret(): string {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      throw new Error("Thiếu biến môi trường JWT_ACCESS_SECRET.");
    }
    return secret;
  }

  private refreshSecret(): string {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      throw new Error("Thiếu biến môi trường JWT_REFRESH_SECRET.");
    }
    return secret;
  }

  private makeRefreshToken(userId: string, sessionId: string, workspaceId?: string): string {
    return signToken(
      { sub: userId, type: "refresh", sessionId, workspaceId, ttlSeconds: 60 * 60 * 24 * 30 },
      this.refreshSecret()
    );
  }

  private makeAccessToken(userId: string, workspaceId?: string): string {
    return signToken(
      { sub: userId, type: "access", workspaceId, ttlSeconds: 60 * 15 },
      this.accessSecret()
    );
  }

  async register(dto: AuthRegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) {
      throw new ConflictException("Email này đã được sử dụng.");
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash: hashPassword(dto.password)
      }
    });

    const workspaceResult = await this.workspaceService.create(
      {
        name: dto.workspaceName,
        slug: this.makeSlug(dto.workspaceName, user.id)
      },
      user.id
    );
    const workspace = workspaceResult.data;

    const tokens = await this.issueTokens(user.id, workspace.id);

    return {
      message: "Đăng ký tài khoản thành công.",
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        },
        workspace,
        ...tokens
      }
    };
  }

  async login(dto: AuthLoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() }
    });

    if (!user || !verifyPassword(dto.password, user.passwordHash)) {
      throw new UnauthorizedException("Email hoặc mật khẩu không đúng.");
    }

    let workspace = await this.prisma.workspace.findFirst({
      where: {
        OR: [
          {
            ownerUserId: user.id
          },
          {
            members: {
              some: {
                userId: user.id
              }
            }
          }
        ]
      },
      orderBy: { createdAt: "asc" }
    });

    if (!workspace) {
      const workspaceResult = await this.workspaceService.create(
        {
          name: "Không gian làm việc mặc định",
          slug: this.makeSlug("Không gian làm việc mặc định", user.id)
        },
        user.id
      );
      workspace = workspaceResult.data;
    }

    const tokens = await this.issueTokens(user.id, workspace?.id);

    return {
      message: "Đăng nhập thành công.",
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        },
        workspace,
        ...tokens
      }
    };
  }

  async meFromHeader(headerValue?: string | null) {
    const token = bearerToken(headerValue);
    if (!token) {
      throw new UnauthorizedException("Thiếu mã đăng nhập.");
    }

    let payload: TokenPayload;
    try {
      payload = verifyToken(token, this.accessSecret());
    } catch {
      throw new UnauthorizedException("Phiên đăng nhập không hợp lệ hoặc đã hết hạn.");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      throw new UnauthorizedException("Người dùng không tồn tại.");
    }

    return {
      message: "Lấy thông tin người dùng thành công.",
      data: {
        user,
        workspaceId: payload.workspaceId ?? null
      }
    };
  }

  async me(userId: string, workspaceId?: string | null) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      throw new UnauthorizedException("Người dùng không tồn tại.");
    }

    return {
      message: "Lấy thông tin người dùng thành công.",
      data: {
        user,
        workspaceId: workspaceId ?? null
      }
    };
  }

  async refresh(refreshToken: string) {
    let payload: TokenPayload;
    try {
      payload = verifyToken(refreshToken, this.refreshSecret());
    } catch {
      throw new UnauthorizedException("Mã làm mới không hợp lệ.");
    }

    if (payload.type !== "refresh" || !payload.sessionId) {
      throw new UnauthorizedException("Mã làm mới không hợp lệ.");
    }

    const session = await this.prisma.refreshSession.findUnique({
      where: { id: payload.sessionId }
    });

    if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException("Phiên làm mới không hợp lệ.");
    }

    if (session.tokenHash !== this.hashToken(refreshToken)) {
      throw new UnauthorizedException("Phiên làm mới không khớp.");
    }

    const accessToken = this.makeAccessToken(payload.sub, payload.workspaceId);
    return {
      message: "Làm mới phiên đăng nhập thành công.",
      data: {
        accessToken
      }
    };
  }

  async logout(refreshToken: string) {
    let payload: TokenPayload;
    try {
      payload = verifyToken(refreshToken, this.refreshSecret());
    } catch {
      throw new UnauthorizedException("Mã làm mới không hợp lệ.");
    }

    if (payload.sessionId) {
      await this.prisma.refreshSession.updateMany({
        where: {
          id: payload.sessionId,
          revokedAt: null
        },
        data: {
          revokedAt: new Date()
        }
      });
    }

    return {
      message: "Đăng xuất thành công.",
      data: {
        loggedOut: true
      }
    };
  }

  private async issueTokens(userId: string, workspaceId?: string) {
    const session = await this.prisma.refreshSession.create({
      data: {
        userId,
        tokenHash: "",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
      }
    });

    const refreshToken = this.makeRefreshToken(userId, session.id, workspaceId);
    const tokenHash = this.hashToken(refreshToken);

    await this.prisma.refreshSession.update({
      where: { id: session.id },
      data: { tokenHash }
    });

    const accessToken = this.makeAccessToken(userId, workspaceId);
    return {
      accessToken,
      refreshToken,
      tokenType: "bearer"
    };
  }

  private hashToken(value: string) {
    return crypto.createHash("sha256").update(value).digest("hex");
  }

  private makeSlug(name: string, suffix: string): string {
    const normalized = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `${normalized || "khong-gian"}-${suffix.slice(0, 6)}`;
  }
}
