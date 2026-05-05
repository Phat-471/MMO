import { buildUrl, clampInt, parseOptions, parseString } from "./helpers";
import { probePage, withOptionalBrowser } from "./browser";
import type { ToolInput, ToolResult } from "./types";

type FacebookGroupPostOptions = {
  groupId?: string;
  content?: string;
  mediaUrls?: string[];
};

export async function runFacebookGroupPoster(input: ToolInput): Promise<ToolResult> {
  const options = parseOptions<FacebookGroupPostOptions>(input.optionsJson);
  const groupId = parseString(options.groupId);
  const content = parseString(options.content) || "No content provided";
  const mediaUrls = Array.isArray(options.mediaUrls) ? options.mediaUrls : [];
  
  const targetUrl = groupId ? buildUrl("https://www.facebook.com/groups/", groupId) : "https://www.facebook.com/groups/";

  return withOptionalBrowser(async (browser) => {
    const probe = await probePage(browser, targetUrl);

    return {
      fetchedCount: 1,
      note: `Da mo phong dang bai len group Facebook ${groupId || "mac dinh"}.`,
      details: {
        platform: input.platform,
        jobType: input.jobType,
        groupId: groupId || null,
        contentLength: content.length,
        mediaCount: mediaUrls.length,
        targetUrl,
        probe
      }
    };
  });
}
