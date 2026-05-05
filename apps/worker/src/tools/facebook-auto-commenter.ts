import { buildUrl, clampInt, parseOptions, parseString } from "./helpers";
import { probePage, withOptionalBrowser } from "./browser";
import type { ToolInput, ToolResult } from "./types";

type AutoCommentOptions = {
  targetUrls?: string[];
  comments?: string[];
  limit?: number;
};

export async function runFacebookAutoCommenter(input: ToolInput): Promise<ToolResult> {
  const options = parseOptions<AutoCommentOptions>(input.optionsJson);
  const limit = clampInt(options.limit, 5, 1, 50);
  const urls = Array.isArray(options.targetUrls) ? options.targetUrls : ["https://www.facebook.com/"];
  const comments = Array.isArray(options.comments) ? options.comments : ["Chấm", "Tuyệt vời", "Quan tâm"];

  return withOptionalBrowser(async (browser) => {
    const probe = await probePage(browser, urls[0]);

    return {
      fetchedCount: limit,
      note: `Da mo phong auto comment Facebook cho ${limit} bai viet.`,
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
        comment: comments[i % comments.length],
        success: true
      }))
    };
  });
}
