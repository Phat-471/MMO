import { Body, Controller, Get, Headers, Post } from "@nestjs/common";
import { CurrentAuth } from "../auth/current-auth.decorator";
import { Public } from "../auth/public.decorator";
import { AuthLoginDto, AuthRegisterDto } from "../dto/auth.dto";
import { AuthService } from "../services/auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("register")
  register(@Body() body: AuthRegisterDto) {
    return this.authService.register(body);
  }

  @Public()
  @Post("login")
  login(@Body() body: AuthLoginDto) {
    return this.authService.login(body);
  }

  @Public()
  @Post("refresh")
  refresh(@Headers("x-refresh-token") refreshToken?: string) {
    if (!refreshToken) {
      return {
        message: "Thiếu mã làm mới.",
        data: {
          refreshed: false
        }
      };
    }

    return this.authService.refresh(refreshToken);
  }

  @Public()
  @Post("logout")
  logout(@Headers("x-refresh-token") refreshToken?: string) {
    if (!refreshToken) {
      return {
        message: "Thiếu mã làm mới.",
        data: {
          loggedOut: false
        }
      };
    }

    return this.authService.logout(refreshToken);
  }

  @Get("me")
  me(@CurrentAuth() auth: { userId: string; workspaceId: string | null }) {
    return this.authService.me(auth.userId, auth.workspaceId);
  }
}
