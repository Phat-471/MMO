import { Controller, Get, Param, Query } from "@nestjs/common";
import { CurrentAuth } from "../auth/current-auth.decorator";
import { DataService } from "../services/data.service";

@Controller("data")
export class DataController {
  constructor(private readonly dataService: DataService) {}

  @Get("snapshots/:workspaceId")
  snapshots(
    @Param("workspaceId") workspaceId: string,
    @CurrentAuth() auth: { userId: string }
  ) {
    return this.dataService.snapshots(workspaceId, auth.userId);
  }

  @Get("snapshots/:workspaceId/export")
  exportSnapshots(
    @Param("workspaceId") workspaceId: string,
    @Query("format") format: "csv" | "json" | undefined,
    @CurrentAuth() auth: { userId: string }
  ) {
    return this.dataService.exportSnapshots(workspaceId, auth.userId, format ?? "json");
  }

  @Get("snapshot/:id")
  getSnapshot(
    @Param("id") id: string,
    @CurrentAuth() auth: { userId: string }
  ) {
    return this.dataService.getSnapshot(id, auth.userId);
  }
}
