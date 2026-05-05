import { clampInt, parseOptions, parseString } from "./helpers";
import { fetchShopeeProductAssets } from "./shopee-product-assets";
import { renderVideoPreview } from "./video-preview-renderer";
import type { ToolInput, ToolResult } from "./types";

type ShopeeVideoAffiliateOptions = {
  sourceType?: string;
  sourceUrl?: string;
  imageUrls?: string[] | string;
  productUrl?: string;
  productNameQuery?: string;
  affiliateId?: string;
  productTitle?: string;
  price?: string | number;
  approvedAssetUrls?: string[] | string;
  assetPolicy?: string;
  templateId?: string;
  durationSeconds?: string | number;
  musicTrack?: string;
  voiceoverText?: string;
  subtitleText?: string;
  hook?: string;
  script?: string;
  targetPlatform?: string;
  selfCreate?: boolean;
};

function makeAffiliateLink(productUrl: string, affiliateId: string) {
  const slug = productUrl.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "product";
  return `https://shopee.vn/${slug}?aff_id=${encodeURIComponent(affiliateId)}`;
}

function parseStringArray(value: string[] | string | undefined): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => parseString(item)).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function uniq(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

export async function runShopeeVideoAffiliate(input: ToolInput): Promise<ToolResult> {
  const options = parseOptions<ShopeeVideoAffiliateOptions>(input.optionsJson);
  const sourceUrl = parseString(options.sourceUrl) || "https://www.tiktok.com/";
  const imageUrls = parseStringArray(options.imageUrls);
  const approvedAssetUrls = parseStringArray(options.approvedAssetUrls);
  const sourceTypeInput = parseString(options.sourceType);
  const productUrl = parseString(options.productUrl) || "https://shopee.vn/product";
  const productNameQuery = parseString(options.productNameQuery) || parseString(options.productTitle) || "San pham Shopee";
  const affiliateId = parseString(options.affiliateId) || "MMO-AFF-001";
  const productTitle = parseString(options.productTitle) || "San pham bat ky";
  const price = parseString(options.price) || "250000";
  const assetPolicy = parseString(options.assetPolicy) || (approvedAssetUrls.length > 0 ? "approved_only" : "mixed");
  const templateId = parseString(options.templateId) || "shopee-vertical-basic";
  const musicTrack = parseString(options.musicTrack) || "ambient-light";
  const fetchedAssets = await fetchShopeeProductAssets(productUrl, productTitle);
  const resolvedProductTitle = parseString(options.productTitle) || fetchedAssets.title || productNameQuery || productTitle;
  const productPageImages = fetchedAssets.imageUrls;
  const approvedImages = uniq([...approvedAssetUrls, ...imageUrls]);
  const resolvedImageUrls =
    assetPolicy === "product_page_only"
      ? productPageImages
      : assetPolicy === "approved_only"
        ? approvedImages.length > 0
          ? approvedImages
          : productPageImages
        : uniq([...approvedImages, ...productPageImages]);
  const sourceType = sourceTypeInput || (resolvedImageUrls.length > 0 ? "images" : "video");
  const durationSeconds = clampInt(options.durationSeconds, sourceType === "images" ? 18 : 15, 8, 120);
  const voiceoverText = parseString(options.voiceoverText) || `Gioi thieu ${resolvedProductTitle}`;
  const subtitleText = parseString(options.subtitleText) || parseString(options.script) || `Xem ngay ${resolvedProductTitle}`;
  const hook = parseString(options.hook) || "Giai phap nhanh cho nguoi ban MMO.";
  const script = parseString(options.script) || "Mo ta san pham, loi ich, va CTA roi ro.";
  const targetPlatform = parseString(options.targetPlatform) || "SHOPEE";
  const assetSummary = {
    sourceType,
    sourceUrl,
    imageCount: resolvedImageUrls.length,
    approvedAssetCount: approvedImages.length,
    productPageImageCount: productPageImages.length,
    assetPolicy,
    productNameQuery,
    templateId,
    musicTrack,
    durationSeconds,
    fetchedTitle: fetchedAssets.title,
    fetchedDescription: fetchedAssets.description,
    fetchedCanonicalUrl: fetchedAssets.canonicalUrl
  };
  const steps = [
    sourceType === "images"
      ? "Tai bo anh san pham va sap xep thanh slideshow."
      : sourceType === "mixed"
        ? "Ket hop video demo voi anh san pham va overlay."
        : sourceType === "template"
          ? "Gan input vao template video co san."
          : "Kiem tra san pham va link nguon video.",
    "Tao phieu noi dung video theo san pham.",
    "Gan affiliate link va sub-id.",
    "Chen subtitle, voiceover va nhac nen.",
    "Dong goi video cho upload len kenh dich."
  ];

  input.log("INFO", `Bat dau pipeline Shopee Affiliate: ${resolvedProductTitle}.`);
  input.log("INFO", `Source type: ${sourceType} | Template: ${templateId} | Duration: ${durationSeconds}s`);
  input.log("INFO", `Asset policy: ${assetPolicy} | Query: ${productNameQuery}`);
  input.log("INFO", `Nguon video: ${sourceUrl}`);
  input.log("INFO", `Fetched title: ${fetchedAssets.title}`);
  input.log("INFO", `Fetched canonical URL: ${fetchedAssets.canonicalUrl}`);
  if (approvedImages.length > 0) {
    input.log("INFO", `Approved asset URLs: ${approvedImages.length}`);
  }
  if (resolvedImageUrls.length > 0) {
    input.log("INFO", `So anh san pham: ${resolvedImageUrls.length}`);
  }
  input.log("INFO", `San pham: ${resolvedProductTitle} | Gia: ${price}`);
  input.log("INFO", `Hook: ${hook}`);

  for (const step of steps) {
    input.log("INFO", step);
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  const affiliateLink = makeAffiliateLink(productUrl, affiliateId);
  const contentScript = [
    `0-3s: ${hook}`,
    `3-8s: Hien thi ${resolvedProductTitle} va gia ${price}.`,
    `8-15s: Neu loi ich chinh va CTA dan den link.`,
    `CTA: Kiem tra ngay voi affiliate link rieng.`
  ].join(" ");

  const renderPlan = {
    sourceType,
    templateId,
    durationSeconds,
    targetPlatform,
    assetSummary,
    editSteps: [
      {
        step: "SOURCE",
      description: sourceType === "images" ? "Use product images as primary storyboard." : sourceType === "mixed" ? "Use source video with image overlays." : "Use demo video as primary source."
      },
      {
        step: "HOOK",
        description: hook
      },
      {
        step: "OVERLAY",
        description: `Insert ${resolvedProductTitle}, price ${price}, and CTA.`
      },
      {
        step: "VOICEOVER",
        description: voiceoverText
      },
      {
        step: "SUBTITLE",
        description: subtitleText
      },
      {
        step: "EXPORT",
        description: "Render 9:16 mp4 for short-form publishing."
      }
    ]
  };

  const renderOutput = await renderVideoPreview({
    title: `Shopee video affiliate - ${resolvedProductTitle}`,
    productTitle: resolvedProductTitle,
    productUrl,
    affiliateLink,
    hook,
    script,
    subtitleText,
    voiceoverText,
    sourceType,
    templateId,
    durationSeconds,
    musicTrack,
    steps,
    imageUrls: resolvedImageUrls,
    sourceUrl
  });

  const generatedVideos = [
    {
      id: `video-${Math.random().toString(36).slice(2, 8)}`,
      platform: targetPlatform,
      title: resolvedProductTitle,
      sourceType,
      productNameQuery,
      assetPolicy,
      sourceUrl,
      imageUrls: resolvedImageUrls,
      approvedAssetUrls: approvedImages,
      productUrl,
      affiliateLink,
      templateId,
      durationSeconds,
      musicTrack,
      voiceoverText,
      subtitleText,
      hook,
      script: `${hook} ${script}`,
      renderPlan,
      renderOutput,
      fetchedAssets,
      status: "READY"
    }
  ];

  input.log("SUCCESS", "Da tao kich ban, render plan va gan link affiliate.");

  return {
    success: true,
    note: `Da tao video affiliate cho ${resolvedProductTitle}.`,
    data: {
      productTitle: resolvedProductTitle,
      fetchedProductTitle: fetchedAssets.title,
      productUrl,
      affiliateLink,
      productNameQuery,
      assetPolicy,
      contentScript,
      renderPlan,
      renderOutput,
      fetchedAssets,
      generatedVideos
    },
    snapshotData: generatedVideos,
    metrics: {
      videosBuilt: generatedVideos.length,
      affiliateLinksGenerated: 1,
      assetCount: resolvedImageUrls.length + approvedImages.length + (sourceUrl ? 1 : 0),
      approvedAssetCount: approvedImages.length,
      renderSteps: renderPlan.editSteps.length,
      renderStatus: renderOutput.status,
      assetFetchCount: 1
    }
  };
}
