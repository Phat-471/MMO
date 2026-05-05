import { Controller, Get } from "@nestjs/common";
import { Public } from "../auth/public.decorator";

@Controller("health")
export class HealthController {
  @Public()
  @Get()
  check() {
    return {
      message: "API đang hoạt động bình thường.",
      data: {
        status: "ok",
        service: "mmo-api"
      }
    };
  }
}
