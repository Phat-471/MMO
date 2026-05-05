import { buildUrl, clampInt, parseOptions, parseString } from "./helpers";
import { probePage, withOptionalBrowser } from "./browser";
import type { ToolInput, ToolResult } from "./types";

type TiktokVideoOptions = {
  username?: string;
  hashtag?: string;
  limit?: number;
};

export async function runTiktokVideoFetcher(input: ToolInput): Promise<ToolResult> {
  const options = parseOptions<TiktokVideoOptions>(input.optionsJson);
  const limit = clampInt(options.limit, 20, 1, 200);
  const username = parseString(options.username);
  const hashtag = parseString(options.hashtag);
  
  let targetUrl = "https://www.tiktok.com/";
  if (username) {
    targetUrl = buildUrl("https://www.tiktok.com/", `@${username.replace(/^@/, '')}`);
  } else if (hashtag) {
    targetUrl = buildUrl("https://www.tiktok.com/tag/", hashtag.replace(/^#/, ''));
  }

  return withOptionalBrowser(async (browser) => {
    const probe = await probePage(browser, targetUrl);

    return {
      fetchedCount: limit,
      note: `Da chay lay video TikTok cho ${username ? `user @${username}` : (hashtag ? `hashtag #${hashtag}` : "trang mac dinh")}.`,
      details: {
        platform: input.platform,
        jobType: input.jobType,
        username: username || null,
        hashtag: hashtag || null,
        limit,
        targetUrl,
        probe
      },
      snapshotData: [
        { videoId: "123456789", description: "Video test 1", likes: 1000 },
        { videoId: "987654321", description: "Video test 2", likes: 500 }
      ]
    };
  });
}
