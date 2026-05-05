import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentAuth } from "../auth/current-auth.decorator";
import { BulkImportMediaAssetDto, CreateMediaAssetDto, EnrichMediaAssetDto, UpdateMediaAssetDto } from "../dto/media-asset.dto";
import { MediaAssetService } from "../services/media-asset.service";

@Controller("workspaces/:workspaceId/media-assets")
export class MediaAssetController {
  constructor(private readonly mediaAssetService: MediaAssetService) {}

  @Get()
  list(@Param("workspaceId") workspaceId: string, @CurrentAuth() auth: { userId: string }) {
    return this.mediaAssetService.list(workspaceId, auth.userId);
  }

  @Get("suggest")
  suggest(
    @Param("workspaceId") workspaceId: string,
    @Query("query") query: string | undefined,
    @CurrentAuth() auth: { userId: string }
  ) {
    return this.mediaAssetService.list(workspaceId, auth.userId).then((response) => {
      const normalized = (query ?? "").trim().toLowerCase();
      const assets = (response.data as Array<Record<string, any>>).filter((asset) => {
        if (!normalized) {
          return true;
        }

        const label = String(asset.label ?? "").toLowerCase();
        const tags = Array.isArray(asset.tags) ? asset.tags.join(" ").toLowerCase() : "";
        const metadata = JSON.stringify(asset.metadata ?? {}).toLowerCase();
        return label.includes(normalized) || tags.includes(normalized) || metadata.includes(normalized);
      });

      return {
        message: "Danh sach asset goi y.",
        data: {
          query: query ?? "",
          assets
        }
      };
    });
  }

  @Post()
  create(
    @Param("workspaceId") workspaceId: string,
    @CurrentAuth() auth: { userId: string },
    @Body() body: CreateMediaAssetDto
  ) {
    return this.mediaAssetService.create(workspaceId, auth.userId, body);
  }

  @Post("bulk-import")
  bulkImport(
    @Param("workspaceId") workspaceId: string,
    @CurrentAuth() auth: { userId: string },
    @Body() body: BulkImportMediaAssetDto
  ) {
    return this.mediaAssetService.bulkImport(workspaceId, auth.userId, body);
  }

  @Post("enrich")
  enrich(
    @Param("workspaceId") workspaceId: string,
    @CurrentAuth() auth: { userId: string },
    @Body() body: EnrichMediaAssetDto
  ) {
    return this.mediaAssetService.enrich(workspaceId, auth.userId, body);
  }

  @Patch(":assetId")
  update(
    @Param("workspaceId") workspaceId: string,
    @Param("assetId") assetId: string,
    @CurrentAuth() auth: { userId: string },
    @Body() body: UpdateMediaAssetDto
  ) {
    return this.mediaAssetService.update(workspaceId, assetId, auth.userId, body);
  }

  @Post(":assetId/use")
  use(
    @Param("workspaceId") workspaceId: string,
    @Param("assetId") assetId: string,
    @CurrentAuth() auth: { userId: string }
  ) {
    return this.mediaAssetService.incrementUsage(workspaceId, assetId, auth.userId);
  }

  @Delete(":assetId")
  remove(
    @Param("workspaceId") workspaceId: string,
    @Param("assetId") assetId: string,
    @CurrentAuth() auth: { userId: string }
  ) {
    return this.mediaAssetService.remove(workspaceId, assetId, auth.userId);
  }
}
