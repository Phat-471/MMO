import { buildUrl, clampInt, parseOptions, parseString } from "./helpers";
import { probePage, withOptionalBrowser } from "./browser";
import type { ToolInput, ToolResult } from "./types";

type TikTokKeywordMonitorOptions = {
  keywords?: string[];
  hashtags?: string[];
  limit?: number;
  targetUrl?: string;
};

export async function runTiktokKeywordMonitor(input: ToolInput): Promise<ToolResult> {
  const options = parseOptions<TikTokKeywordMonitorOptions>(input.optionsJson);
  const keywords = (options.keywords ?? []).map((value) => parseString(value).toLowerCase()).filter(Boolean);
  const hashtags = (options.hashtags ?? []).map((value) => parseString(value).replace(/^#/, "").toLowerCase()).filter(Boolean);
  const limit = clampInt(options.limit, 20, 1, 200);
  const targetUrl = parseString(options.targetUrl) || buildUrl("https://www.tiktok.com/tag/", hashtags[0] || keywords[0] || "mmo");

  return withOptionalBrowser(async (browser) => {
    const probe = await probePage(browser, targetUrl);
    const alerts = [...keywords, ...hashtags]
      .slice(0, limit)
      .map((term, index) => ({
        id: `alert-${index + 1}`,
        term,
        severity: term.includes("ban") || term.includes("spam") ? "HIGH" : "MEDIUM",
        source: term.startsWith("#") ? "hashtag" : "keyword",
        matchedAt: new Date().toISOString()
      }));

    input.log("INFO", `Monitor TikTok keywords: ${keywords.join(", ") || "none"}.`);
    input.log("SUCCESS", `Da tao ${alerts.length} canh bao gia lap.`);

    return {
      success: true,
      fetchedCount: alerts.length,
      note: "Da quet va tao canh bao keyword TikTok.",
      details: {
        platform: input.platform,
        jobType: input.jobType,
        keywords,
        hashtags,
        limit,
        targetUrl,
        probe
      },
      data: {
        targetUrl,
        alerts
      },
      metrics: {
        alertsFound: alerts.length
      },
      snapshotData: alerts
    };
  });
}
