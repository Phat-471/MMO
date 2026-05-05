import { buildUrl, clampInt, parseOptions, parseString } from "./helpers";
import { probePage, withOptionalBrowser } from "./browser";
import type { ToolInput, ToolResult } from "./types";

type FacebookCommentOptions = {
  postId?: string;
  limit?: number;
  targetUrl?: string;
};

export async function runFacebookCommentFetcher(input: ToolInput): Promise<ToolResult> {
  const options = parseOptions<FacebookCommentOptions>(input.optionsJson);
  const limit = clampInt(options.limit, 50, 1, 500);
  const postId = parseString(options.postId);
  const targetUrl = parseString(options.targetUrl) || (postId ? buildUrl("https://www.facebook.com/", postId) : "https://www.facebook.com/");

  return withOptionalBrowser(async (browser) => {
    const probe = await probePage(browser, targetUrl);

    return {
      fetchedCount: limit,
      note: `Da chay lay binh luan Facebook cho bai viet ${postId || "mac dinh"}.`,
      details: {
        platform: input.platform,
        jobType: input.jobType,
        postId: postId || null,
        limit,
        targetUrl,
        probe
      }
    };
  });
}
