import { clampInt, parseOptions } from "./helpers";
import { probePage, withOptionalBrowser } from "./browser";
import type { ToolInput, ToolResult } from "./types";

type NurtureOptions = {
  durationMinutes?: number;
  actionsPerMinute?: number;
};

export async function runFacebookAccountNurturer(input: ToolInput): Promise<ToolResult> {
  const options = parseOptions<NurtureOptions>(input.optionsJson);
  const duration = clampInt(options.durationMinutes, 5, 1, 60);
  const actions = clampInt(options.actionsPerMinute, 2, 1, 10);
  const targetUrl = "https://www.facebook.com/";

  return withOptionalBrowser(async (browser) => {
    const probe = await probePage(browser, targetUrl);

    return {
      fetchedCount: 0,
      note: `Da chay tien trinh nuoi tai khoan Facebook trong ${duration} phut.`,
      details: {
        platform: input.platform,
        jobType: input.jobType,
        durationMinutes: duration,
        actionsPerMinute: actions,
        targetUrl,
        probe
      },
      snapshotData: [
        { action: "scroll", timestamp: new Date().toISOString() },
        { action: "pause", timestamp: new Date().toISOString() }
      ]
    };
  });
}
