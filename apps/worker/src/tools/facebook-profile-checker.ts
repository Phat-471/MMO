import { parseOptions, parseString } from "./helpers";
import { probePage, withOptionalBrowser } from "./browser";
import type { ToolInput, ToolResult } from "./types";

type FacebookProfileOptions = {
  username?: string;
  profileMode?: string;
  targetUrl?: string;
};

export async function runFacebookProfileChecker(input: ToolInput): Promise<ToolResult> {
  const options = parseOptions<FacebookProfileOptions>(input.optionsJson);
  const username = parseString(options.username).replace(/^@/, "");
  const targetUrl = parseString(options.targetUrl) || (username ? `https://www.facebook.com/${username}` : "https://www.facebook.com/");

  return withOptionalBrowser(async (browser) => {
    const probe = await probePage(browser, targetUrl);

    return {
      fetchedCount: 1,
      note: `Da kiem tra ho so Facebook ${username || "mac dinh"}.`,
      details: {
        platform: input.platform,
        jobType: input.jobType,
        username: username || null,
        profileMode: options.profileMode ?? null,
        targetUrl,
        probe
      }
    };
  });
}
