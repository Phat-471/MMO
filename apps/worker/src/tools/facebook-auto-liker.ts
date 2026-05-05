import { buildUrl, clampInt, parseOptions, parseString } from "./helpers";
import { probePage, withOptionalBrowser } from "./browser";
import type { ToolInput, ToolResult } from "./types";

type AutoLikeOptions = {
  targetUrls?: string[];
  limit?: number;
};

export async function runFacebookAutoLiker(input: ToolInput): Promise<ToolResult> {
  const options = parseOptions<AutoLikeOptions>(input.optionsJson);
  const limit = clampInt(options.limit, 10, 1, 100);
  const urls = Array.isArray(options.targetUrls) ? options.targetUrls : ["https://www.facebook.com/"];

  return withOptionalBrowser(async (browser) => {
    const probe = await probePage(browser, urls[0]);

    return {
      fetchedCount: limit,
      note: `Da mo phong auto like Facebook cho ${limit} bai viet.`,
      details: {
        platform: input.platform,
        jobType: input.jobType,
        targetCount: urls.length,
        limit,
        firstTarget: urls[0],
        probe
      },
      snapshotData: urls.map((url, i) => ({
        url,
        action: "liked",
        success: true
      }))
    };
  });
}
