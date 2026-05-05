export type ContentTone = "review" | "sales" | "educational" | "viral";
export type ContentFormat = "caption" | "post" | "script";
export type ContentChannel = "TIKTOK" | "SHOPEE" | "YOUTUBE";
export type TargetPlatform = "SHOPEE" | "TIKTOK" | "YOUTUBE";

export type ContentFormInput = {
  audience: string;
  angle: string;
  benefit: string;
  tone: ContentTone;
  format: ContentFormat;
  targetChannel: ContentChannel;
  keywords: string;
  cta: string;
};

export type AffiliateFormInput = {
  productTitle: string;
  productUrl: string;
  affiliateId: string;
  subId: string;
  sourceUrl: string;
  targetPlatform: TargetPlatform;
  hook: string;
  script: string;
  sourceLinks: string;
};

export function splitKeywords(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function toHashtag(value: string) {
  const normalized = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24);

  return normalized ? `#${normalized}` : "#";
}

export type BatchContentItem = {
  productTitle: string;
  productUrl: string;
  audience?: string;
  angle?: string;
};

export function parseBatchContentItems(value: string): BatchContentItem[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [productTitle, productUrl, audience, angle] = line.split("|").map((item) => item.trim());
      return {
        productTitle: productTitle || "San pham",
        productUrl: productUrl || "",
        audience: audience || undefined,
        angle: angle || undefined
      };
    })
    .filter((item) => Boolean(item.productUrl));
}

export function buildContentDraft(productTitle: string, contentForm: ContentFormInput) {
  const title = productTitle.trim() || "San pham";
  const audience = contentForm.audience.trim() || "khach hang muc tieu";
  const angle = contentForm.angle.trim() || "review thuc te";
  const benefit = contentForm.benefit.trim() || "Noi bat o gia tri san pham.";
  const cta = contentForm.cta.trim() || "Xem link de lay uu dai.";
  const keywords = splitKeywords(contentForm.keywords);
  const hashtags = Array.from(new Set([title, audience, ...keywords].filter(Boolean).map((item) => toHashtag(item))))
    .filter((tag) => tag !== "#")
    .slice(0, 6)
    .join(" ");

  const hook = `${title} - ${angle}`;
  const caption = [hook, `Cho ${audience}: ${benefit}`, cta, hashtags].filter(Boolean).join("\n");
  const post = [`${title} phu hop cho ${audience}.`, angle, benefit, cta, hashtags].filter(Boolean).join("\n\n");
  const script = [`Mo dau: ${hook}`, `Than bai: ${benefit}`, `CTA: ${cta}`].join("\n");

  return { hook, caption, post, script, hashtags };
}

export function buildContentOptions(productTitle: string, productUrl: string, contentForm: ContentFormInput) {
  return {
    topic: `${productTitle} ${contentForm.angle}`.trim(),
    tone: contentForm.tone,
    keywords: splitKeywords(contentForm.keywords),
    audience: contentForm.audience,
    format: contentForm.format,
    targetChannel: contentForm.targetChannel,
    productUrl,
    productTitle,
    cta: contentForm.cta
  };
}

export function buildLinkOptions(sourceLinks: string, affiliateId: string, subId: string) {
  return {
    productUrls: sourceLinks
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    affiliateId,
    subId
  };
}

export function buildAffiliateVideoOptions(form: AffiliateFormInput, contentDraft: { hook: string; script: string }) {
  return {
    sourceUrl: form.sourceUrl,
    productUrl: form.productUrl,
    affiliateId: form.affiliateId,
    productTitle: form.productTitle,
    hook: contentDraft.hook,
    script: contentDraft.script,
    targetPlatform: form.targetPlatform
  };
}

export function buildReupOptions(form: AffiliateFormInput, caption: string) {
  return {
    sourceUrl: form.sourceUrl,
    targetPlatform: form.targetPlatform,
    title: form.productTitle || "Reup video",
    description: caption,
    addWatermark: true,
    addCaptions: true
  };
}

export function buildBatchVideoJob(
  item: BatchContentItem,
  form: AffiliateFormInput,
  contentForm: ContentFormInput
) {
  const draft = buildContentDraft(item.productTitle, {
    audience: item.audience ?? contentForm.audience,
    angle: item.angle ?? contentForm.angle,
    benefit: contentForm.benefit,
    tone: contentForm.tone,
    format: contentForm.format,
    targetChannel: contentForm.targetChannel,
    keywords: contentForm.keywords,
    cta: contentForm.cta
  });

  if (form.targetPlatform === "SHOPEE") {
    return {
      toolCode: "shopee-video-affiliate",
      options: buildAffiliateVideoOptions(
        {
          ...form,
          productTitle: item.productTitle,
          productUrl: item.productUrl
        },
        {
          hook: draft.hook,
          script: draft.script
        }
      ),
      draft
    };
  }

  return {
    toolCode: "video-reup-tool",
    options: buildReupOptions(
      {
        ...form,
        productTitle: item.productTitle,
        productUrl: item.productUrl
      },
      draft.caption
    ),
    draft
  };
}
