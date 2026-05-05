import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthContext, RequestWithAuth } from "./auth-context";

export const CurrentAuth = createParamDecorator((_: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<RequestWithAuth>();
  return request.auth as AuthContext;
});
