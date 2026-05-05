import { parseOptions, parseString } from "./helpers";
import type { ToolInput, ToolResult } from "./types";

type ShopeeLinkConverterOptions = {
  productUrls?: string[];
  affiliateId?: string;
  subId?: string;
};

function toAffiliateLink(productUrl: string, affiliateId: string, subId?: string) {
  const clean = productUrl.trim();
  const token = clean.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 36) || "item";
  const suffix = subId ? `&sub_id=${encodeURIComponent(subId)}` : "";
  return `https://shopee.vn/${token}?aff_id=${encodeURIComponent(affiliateId)}${suffix}`;
}

export async function runShopeeLinkConverter(input: ToolInput): Promise<ToolResult> {
  const options = parseOptions<ShopeeLinkConverterOptions>(input.optionsJson);
  const affiliateId = parseString(options.affiliateId) || "MMO-AFF-001";
  const subId = parseString(options.subId) || "default";
  const productUrls = (options.productUrls ?? []).map((value) => parseString(value)).filter(Boolean);

  const links = productUrls.map((productUrl, index) => ({
    id: `link-${index + 1}`,
    productUrl,
    affiliateUrl: toAffiliateLink(productUrl, affiliateId, subId)
  }));

  input.log("INFO", `Convert ${links.length} Shopee links.`);
  input.log("SUCCESS", "Da tao link affiliate cho danh sach san pham.");

  return {
    success: true,
    note: "Da chuyen doi link san pham sang link affiliate.",
    data: {
      affiliateId,
      subId,
      links
    },
    snapshotData: links,
    metrics: {
      convertedCount: links.length
    }
  };
}
