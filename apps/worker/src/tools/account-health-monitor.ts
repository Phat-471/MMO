import { parseOptions, parseString } from "./helpers";
import { probePage, withOptionalBrowser } from "./browser";
import type { ToolInput, ToolResult } from "./types";

type AccountHealthOptions = {
  accountLabel?: string;
  threshold?: string;
  targetUrl?: string;
};

export async function runAccountHealthMonitor(input: ToolInput): Promise<ToolResult> {
  const options = parseOptions<AccountHealthOptions>(input.optionsJson);
  const accountLabel = parseString(options.accountLabel);
  const targetUrl = parseString(options.targetUrl) || "https://www.facebook.com/";

  return withOptionalBrowser(async (browser) => {
    const probe = await probePage(browser, targetUrl);

    return {
      fetchedCount: probe ? 1 : 0,
      note: `Da kiem tra suc khoe tai khoan ${accountLabel || "mac dinh"} voi nguong ${options.threshold ?? "normal"}.`,
      details: {
        platform: input.platform,
        jobType: input.jobType,
        accountLabel: accountLabel || null,
        threshold: options.threshold ?? null,
        targetUrl,
        probe
      }
    };
  });
}
