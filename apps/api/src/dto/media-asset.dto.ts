export type MediaAssetTypeValue = "IMAGE" | "VIDEO" | "AUDIO" | "TEMPLATE";

export type CreateMediaAssetDto = {
  label: string;
  assetType: MediaAssetTypeValue;
  sourceUrl: string;
  thumbnailUrl?: string | null;
  approved?: boolean;
  tags?: string[] | string;
  metadataJson?: string | Record<string, unknown>;
};

export type UpdateMediaAssetDto = Partial<CreateMediaAssetDto>;

export type BulkImportMediaAssetDto = {
  items?: CreateMediaAssetDto[];
  raw?: string;
  defaultAssetType?: MediaAssetTypeValue;
  defaultApproved?: boolean;
};

export type EnrichMediaAssetDto = {
  productUrl: string;
  productNameQuery?: string;
  createAssets?: boolean;
  approved?: boolean;
  tags?: string[] | string;
};
