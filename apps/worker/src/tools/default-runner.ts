import { parseOptions, parseString } from "./helpers";
import { probePage, withOptionalBrowser } from "./browser";
import type { ToolInput, ToolResult } from "./types";

export async function runDefaultTool(input: ToolInput): Promise<ToolResult> {
  const options = parseOptions<Record<string, unknown>>(input.optionsJson);
  const targetUrl = parseString(options.targetUrl);

  return withOptionalBrowser(async (browser) => {
    const probe = targetUrl ? await probePage(browser, targetUrl) : null;

    return {
      fetchedCount: 0,
      note: `Da mo runner mac dinh cho ${input.jobType} tren ${input.platform}.`,
      details: {
        platform: input.platform,
        jobType: input.jobType,
        options,
        targetUrl: targetUrl || null,
        probe
      }
    };
  });
}
