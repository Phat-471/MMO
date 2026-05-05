import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma.service";
import { WorkspaceService } from "./workspace.service";
import { BulkImportMediaAssetDto, CreateMediaAssetDto, EnrichMediaAssetDto, UpdateMediaAssetDto } from "../dto/media-asset.dto";
import { recordAudit } from "../lib/audit";

type MediaAssetTypeValue = "IMAGE" | "VIDEO" | "AUDIO" | "TEMPLATE";

type MediaAssetRow = {
  id: string;
  workspaceId: string;
  label: string;
  assetType: MediaAssetTypeValue;
  sourceUrl: string;
  thumbnailUrl: string | null;
  approved: number | boolean;
  tagsJson: string;
  metadataJson: string;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
};

type EnrichedProductAssets = {
  title: string;
  description: string;
  imageUrls: string[];
  canonicalUrl: string;
};

@Injectable()
export class MediaAssetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceService: WorkspaceService
  ) {}

  async list(workspaceId: string, userId: string) {
    await this.workspaceService.assertWorkspaceAccess(workspaceId, userId);
    const assets = await this.prisma.$queryRaw<MediaAssetRow[]>(
      Prisma.sql`
        SELECT *
        FROM MediaAsset
        WHERE workspaceId = ${workspaceId}
        ORDER BY approved DESC, usageCount DESC, createdAt DESC
      `
    );

    return {
      message: "Danh sach asset.",
      data: assets.map((asset) => this.serialize(asset))
    };
  }

  async create(workspaceId: string, userId: string, dto: CreateMediaAssetDto) {
    await this.workspaceService.assertWorkspaceAccess(workspaceId, userId);
    const label = dto.label.trim();
    const sourceUrl = dto.sourceUrl.trim();
    if (!label || !sourceUrl) {
      throw new BadRequestException("Label va sourceUrl khong duoc de trong.");
    }

    const asset = await this.insertAsset(workspaceId, {
      label,
      assetType: this.normalizeAssetType(dto.assetType),
      sourceUrl,
      thumbnailUrl: dto.thumbnailUrl?.trim() || null,
      approved: dto.approved ?? true,
      tagsJson: this.toJsonArray(dto.tags),
      metadataJson: this.toJsonObject(dto.metadataJson)
    });

    await recordAudit(this.prisma, {
      workspaceId,
      userId,
      action: "media_asset.create",
      entityType: "MediaAsset",
      entityId: asset.id,
      metadata: {
        label: asset.label,
        assetType: asset.assetType,
        approved: asset.approved
      }
    });

    return {
      message: "Da tao asset.",
      data: this.serialize(asset)
    };
  }

  async bulkImport(workspaceId: string, userId: string, dto: BulkImportMediaAssetDto) {
    await this.workspaceService.assertWorkspaceAccess(workspaceId, userId);
    const items = this.normalizeBulkItems(dto);
    if (items.length === 0) {
      throw new BadRequestException("Khong co asset nao de import.");
    }

    const created: MediaAssetRow[] = [];
    for (const item of items.slice(0, 100)) {
      const label = item.label.trim();
      const sourceUrl = item.sourceUrl.trim();
      if (!label || !sourceUrl) {
        continue;
      }

      created.push(
        await this.insertAsset(workspaceId, {
          label,
          assetType: this.normalizeAssetType(item.assetType),
          sourceUrl,
          thumbnailUrl: item.thumbnailUrl?.trim() || null,
          approved: item.approved ?? dto.defaultApproved ?? true,
          tagsJson: this.toJsonArray(item.tags),
          metadataJson: this.toJsonObject(item.metadataJson)
        })
      );
    }

    await recordAudit(this.prisma, {
      workspaceId,
      userId,
      action: "media_asset.bulk_import",
      entityType: "MediaAsset",
      metadata: {
        requested: items.length,
        created: created.length
      }
    });

    return {
      message: `Da import ${created.length} asset.`,
      data: {
        requested: items.length,
        created: created.length,
        assets: created.map((asset) => this.serialize(asset))
      }
    };
  }

  async enrich(workspaceId: string, userId: string, dto: EnrichMediaAssetDto) {
    await this.workspaceService.assertWorkspaceAccess(workspaceId, userId);
    const productUrl = dto.productUrl?.trim();
    if (!productUrl) {
      throw new BadRequestException("productUrl khong duoc de trong.");
    }

    const productNameQuery = dto.productNameQuery?.trim() || "Shopee product";
    const enriched = await this.fetchProductAssets(productUrl, productNameQuery);
    const candidates = enriched.imageUrls.map((sourceUrl, index) => ({
      label: `${enriched.title || productNameQuery} #${index + 1}`.slice(0, 180),
      assetType: "IMAGE" as MediaAssetTypeValue,
      sourceUrl,
      thumbnailUrl: sourceUrl,
      approved: dto.approved ?? false,
      tags: this.mergeTags(dto.tags, ["shopee", "product-page", productNameQuery]),
      metadataJson: {
        productUrl,
        productNameQuery,
        canonicalUrl: enriched.canonicalUrl,
        description: enriched.description,
        source: "product_page_enrich"
      }
    }));

    const created: MediaAssetRow[] = [];
    if (dto.createAssets) {
      for (const candidate of candidates.slice(0, 20)) {
        created.push(
          await this.insertAsset(workspaceId, {
            label: candidate.label,
            assetType: candidate.assetType,
            sourceUrl: candidate.sourceUrl,
            thumbnailUrl: candidate.thumbnailUrl,
            approved: candidate.approved,
            tagsJson: this.toJsonArray(candidate.tags),
            metadataJson: this.toJsonObject(candidate.metadataJson)
          })
        );
      }
    }

    await recordAudit(this.prisma, {
      workspaceId,
      userId,
      action: "media_asset.enrich",
      entityType: "MediaAsset",
      metadata: {
        productUrl,
        productNameQuery,
        candidates: candidates.length,
        created: created.length
      }
    });

    return {
      message: dto.createAssets ? `Da enrich va tao ${created.length} asset.` : "Da enrich asset tu productUrl.",
      data: {
        product: enriched,
        candidates,
        created: created.map((asset) => this.serialize(asset))
      }
    };
  }

  async update(workspaceId: string, assetId: string, userId: string, dto: UpdateMediaAssetDto) {
    await this.workspaceService.assertWorkspaceAccess(workspaceId, userId);
    const current = await this.findOne(workspaceId, assetId);
    if (!current) {
      throw new NotFoundException("Khong tim thay asset.");
    }

    const next = await this.updateAsset(workspaceId, assetId, {
      label: dto.label !== undefined ? dto.label.trim() : current.label,
      assetType: dto.assetType !== undefined ? this.normalizeAssetType(dto.assetType) : current.assetType,
      sourceUrl: dto.sourceUrl !== undefined ? dto.sourceUrl.trim() : current.sourceUrl,
      thumbnailUrl: dto.thumbnailUrl !== undefined ? dto.thumbnailUrl?.trim() || null : current.thumbnailUrl,
      approved: dto.approved ?? Boolean(current.approved),
      tagsJson: dto.tags !== undefined ? this.toJsonArray(dto.tags) : current.tagsJson,
      metadataJson: dto.metadataJson !== undefined ? this.toJsonObject(dto.metadataJson) : current.metadataJson
    });

    await recordAudit(this.prisma, {
      workspaceId,
      userId,
      action: "media_asset.update",
      entityType: "MediaAsset",
      entityId: next.id,
      metadata: {
        label: next.label,
        assetType: next.assetType,
        approved: next.approved
      }
    });

    return {
      message: "Da cap nhat asset.",
      data: this.serialize(next)
    };
  }

  async remove(workspaceId: string, assetId: string, userId: string) {
    await this.workspaceService.assertWorkspaceAccess(workspaceId, userId);
    const current = await this.findOne(workspaceId, assetId);
    if (!current) {
      throw new NotFoundException("Khong tim thay asset.");
    }

    await this.prisma.$executeRaw(
      Prisma.sql`
        DELETE FROM MediaAsset
        WHERE id = ${assetId} AND workspaceId = ${workspaceId}
      `
    );

    await recordAudit(this.prisma, {
      workspaceId,
      userId,
      action: "media_asset.delete",
      entityType: "MediaAsset",
      entityId: assetId,
      metadata: {
        label: current.label,
        assetType: current.assetType
      }
    });

    return {
      message: "Da xoa asset.",
      data: { id: assetId }
    };
  }

  async incrementUsage(workspaceId: string, assetId: string, userId: string) {
    await this.workspaceService.assertWorkspaceAccess(workspaceId, userId);
    const current = await this.findOne(workspaceId, assetId);
    if (!current) {
      throw new NotFoundException("Khong tim thay asset.");
    }

    await this.prisma.$executeRaw(
      Prisma.sql`
        UPDATE MediaAsset
        SET usageCount = usageCount + 1
        WHERE id = ${assetId} AND workspaceId = ${workspaceId}
      `
    );

    const next = await this.findOne(workspaceId, assetId);
    if (!next) {
      throw new NotFoundException("Khong tim thay asset.");
    }

    return {
      message: "Da cap nhat usage asset.",
      data: this.serialize(next)
    };
  }

  private async findOne(workspaceId: string, assetId: string) {
    const rows = await this.prisma.$queryRaw<MediaAssetRow[]>(
      Prisma.sql`
        SELECT *
        FROM MediaAsset
        WHERE workspaceId = ${workspaceId} AND id = ${assetId}
        LIMIT 1
      `
    );

    return rows[0] ?? null;
  }

  private async insertAsset(
    workspaceId: string,
    data: {
      label: string;
      assetType: MediaAssetTypeValue;
      sourceUrl: string;
      thumbnailUrl: string | null;
      approved: boolean;
      tagsJson: string;
      metadataJson: string;
    }
  ) {
    const id = randomUUID();
    await this.prisma.$executeRaw(
      Prisma.sql`
        INSERT INTO MediaAsset (
          id,
          workspaceId,
          label,
          assetType,
          sourceUrl,
          thumbnailUrl,
          approved,
          tagsJson,
          metadataJson,
          usageCount,
          createdAt,
          updatedAt
        ) VALUES (
          ${id},
          ${workspaceId},
          ${data.label},
          ${data.assetType},
          ${data.sourceUrl},
          ${data.thumbnailUrl},
          ${data.approved},
          ${data.tagsJson},
          ${data.metadataJson},
          0,
          NOW(3),
          NOW(3)
        )
      `
    );

    const created = await this.findOne(workspaceId, id);
    if (!created) {
      throw new NotFoundException("Khong the tao asset.");
    }

    return created;
  }

  private async updateAsset(
    workspaceId: string,
    assetId: string,
    data: {
      label: string;
      assetType: MediaAssetTypeValue;
      sourceUrl: string;
      thumbnailUrl: string | null;
      approved: boolean;
      tagsJson: string;
      metadataJson: string;
    }
  ) {
    await this.prisma.$executeRaw(
      Prisma.sql`
        UPDATE MediaAsset
        SET
          label = ${data.label},
          assetType = ${data.assetType},
          sourceUrl = ${data.sourceUrl},
          thumbnailUrl = ${data.thumbnailUrl},
          approved = ${data.approved},
          tagsJson = ${data.tagsJson},
          metadataJson = ${data.metadataJson},
          updatedAt = NOW(3)
        WHERE id = ${assetId} AND workspaceId = ${workspaceId}
      `
    );

    const updated = await this.findOne(workspaceId, assetId);
    if (!updated) {
      throw new NotFoundException("Khong the cap nhat asset.");
    }

    return updated;
  }

  private normalizeAssetType(value: string): MediaAssetTypeValue {
    const normalized = value.toUpperCase();
    if (normalized === "IMAGE" || normalized === "VIDEO" || normalized === "AUDIO" || normalized === "TEMPLATE") {
      return normalized;
    }
    throw new BadRequestException("Loai asset khong hop le.");
  }

  private normalizeBulkItems(dto: BulkImportMediaAssetDto): CreateMediaAssetDto[] {
    if (Array.isArray(dto.items) && dto.items.length > 0) {
      return dto.items.map((item) => ({
        ...item,
        assetType: item.assetType ?? dto.defaultAssetType ?? "IMAGE",
        approved: item.approved ?? dto.defaultApproved ?? true
      }));
    }

    const raw = dto.raw?.trim();
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => ({
          label: String(item.label ?? item.name ?? item.sourceUrl ?? "Imported asset"),
          assetType: this.normalizeAssetType(String(item.assetType ?? item.type ?? dto.defaultAssetType ?? "IMAGE")),
          sourceUrl: String(item.sourceUrl ?? item.url ?? ""),
          thumbnailUrl: item.thumbnailUrl ? String(item.thumbnailUrl) : undefined,
          approved: item.approved ?? dto.defaultApproved ?? true,
          tags: item.tags,
          metadataJson: item.metadataJson ?? item.metadata
        }));
      }
    } catch {
      // Fallback to line parser below.
    }

    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [label, sourceUrl, assetType, tags] = line.split(",").map((part) => part.trim());
        const resolvedUrl = sourceUrl || label;
        return {
          label: sourceUrl ? label : resolvedUrl.split("/").pop() || "Imported asset",
          assetType: this.normalizeAssetType(assetType || dto.defaultAssetType || "IMAGE"),
          sourceUrl: resolvedUrl,
          approved: dto.defaultApproved ?? true,
          tags: tags ? tags.split("|").map((tag) => tag.trim()) : []
        };
      });
  }

  private mergeTags(value: string[] | string | undefined, fallback: string[]) {
    const base = JSON.parse(this.toJsonArray(value)) as string[];
    return Array.from(new Set([...base, ...fallback].map((item) => item.trim()).filter(Boolean)));
  }

  private extractMeta(html: string, keys: string[]) {
    for (const key of keys) {
      const pattern = new RegExp(
        `<meta[^>]+(?:property|name)=["']${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]+content=["']([^"']+)["'][^>]*>`,
        "i"
      );
      const match = html.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
    }

    return "";
  }

  private extractMetaImages(html: string, baseUrl: string) {
    const urls = new Set<string>();
    const pattern = /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image|twitter:image:src|image)["'][^>]+content=["']([^"']+)["'][^>]*>/gi;
    for (const match of html.matchAll(pattern)) {
      const value = match[1]?.trim();
      if (!value) {
        continue;
      }

      try {
        urls.add(new URL(value, baseUrl).toString());
      } catch {
        urls.add(value);
      }
    }

    return Array.from(urls);
  }

  private async fetchProductAssets(productUrl: string, fallbackTitle: string): Promise<EnrichedProductAssets> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(productUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        },
        signal: controller.signal
      });

      if (!response.ok) {
        return {
          title: fallbackTitle,
          description: "",
          imageUrls: [],
          canonicalUrl: productUrl
        };
      }

      const html = await response.text();
      const title =
        this.extractMeta(html, ["og:title", "twitter:title"]) ||
        (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? fallbackTitle);

      return {
        title: title || fallbackTitle,
        description: this.extractMeta(html, ["og:description", "description", "twitter:description"]),
        imageUrls: this.extractMetaImages(html, productUrl),
        canonicalUrl: this.extractMeta(html, ["og:url"]) || productUrl
      };
    } catch {
      return {
        title: fallbackTitle,
        description: "",
        imageUrls: [],
        canonicalUrl: productUrl
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private toJsonArray(value?: string[] | string) {
    if (Array.isArray(value)) {
      return JSON.stringify(value.map((item) => String(item).trim()).filter(Boolean));
    }

    if (typeof value === "string") {
      const items = value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      return JSON.stringify(items);
    }

    return "[]";
  }

  private toJsonObject(value?: string | Record<string, unknown>) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) {
        return "{}";
      }

      try {
        const parsed = JSON.parse(trimmed);
        return JSON.stringify(parsed && typeof parsed === "object" ? parsed : {});
      } catch {
        return JSON.stringify({ raw: trimmed });
      }
    }

    if (value && typeof value === "object") {
      return JSON.stringify(value);
    }

    return "{}";
  }

  private parseJson(value: string) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  private serialize(asset: MediaAssetRow) {
    const tags = this.parseJson(asset.tagsJson);
    const metadata = this.parseJson(asset.metadataJson);
    return {
      ...asset,
      approved: Boolean(asset.approved),
      tags: Array.isArray(tags) ? tags : [],
      metadata
    };
  }
}
