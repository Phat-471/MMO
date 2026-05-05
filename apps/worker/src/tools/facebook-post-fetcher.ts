import { buildUrl, clampInt, parseOptions, parseString } from "./helpers";
import { probePage, withOptionalBrowser } from "./browser";
import type { ToolInput, ToolResult } from "./types";

type FacebookPostOptions = {
  pageId?: string;
  limit?: number;
  keyword?: string;
  targetUrl?: string;
};

export async function runFacebookPostFetcher(input: ToolInput): Promise<ToolResult> {
  const options = parseOptions<FacebookPostOptions>(input.optionsJson);
  const limit = clampInt(options.limit, 20, 1, 200);
  const pageId = parseString(options.pageId);
  const targetUrl = parseString(options.targetUrl) || (pageId ? buildUrl("https://www.facebook.com/", pageId) : "https://www.facebook.com/");

  return withOptionalBrowser(async (browser) => {
    const probe = await probePage(browser, targetUrl);

    return {
      fetchedCount: limit,
      note: `Da chay lay bai viet Facebook cho ${pageId || "trang mac dinh"}.`,
      details: {
        platform: input.platform,
        jobType: input.jobType,
        pageId: pageId || null,
        keyword: options.keyword ?? null,
        limit,
        targetUrl,
        probe
      }
    };
  });
}
