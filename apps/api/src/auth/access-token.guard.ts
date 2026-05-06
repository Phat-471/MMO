import { CanActivate, ExecutionContext, Injectable, InternalServerErrorException, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthContext, RequestWithAuth } from "./auth-context";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { bearerToken, verifyToken, type TokenPayload } from "../lib/token";

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const token = bearerToken(request.headers?.authorization);
    if (!token) {
      throw new UnauthorizedException("Bạn cần đăng nhập để tiếp tục.");
    }

    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      throw new InternalServerErrorException("Server missing JWT_ACCESS_SECRET.");
    }

    let payload: TokenPayload;
    try {
      payload = verifyToken(token, secret);
    } catch {
      throw new UnauthorizedException("Phiên đăng nhập không hợp lệ hoặc đã hết hạn.");
    }

    if (payload.type !== "access") {
      throw new UnauthorizedException("Mã đăng nhập không hợp lệ.");
    }

    const auth: AuthContext = {
      userId: payload.sub,
      workspaceId: payload.workspaceId ?? null,
      sessionId: payload.sessionId ?? null,
      tokenType: "access"
    };

    request.auth = auth;
    return true;
  }
}
