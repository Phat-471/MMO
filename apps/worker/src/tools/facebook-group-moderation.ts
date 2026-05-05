import { buildUrl, clampInt, parseOptions, parseString } from "./helpers";
import { probePage, withOptionalBrowser } from "./browser";
import type { ToolInput, ToolResult } from "./types";

type ModerationPost = {
  id?: string;
  author?: string;
  content?: string;
};

type FacebookGroupModerationOptions = {
  groupId?: string;
  groupName?: string;
  posts?: ModerationPost[];
  bannedKeywords?: string[];
  autoApprove?: boolean;
  autoReject?: boolean;
  limit?: number;
};

export async function runFacebookGroupModeration(input: ToolInput): Promise<ToolResult> {
  const options = parseOptions<FacebookGroupModerationOptions>(input.optionsJson);
  const groupId = parseString(options.groupId);
  const groupName = parseString(options.groupName) || "Facebook Group";
  const bannedKeywords = (options.bannedKeywords ?? []).map((value) => String(value).trim().toLowerCase()).filter(Boolean);
  const posts = (options.posts ?? []).slice(0, clampInt(options.limit, 25, 1, 200));
  const targetUrl = groupId ? buildUrl("https://www.facebook.com/groups/", groupId) : "https://www.facebook.com/groups/";

  return withOptionalBrowser(async (browser) => {
    const probe = await probePage(browser, targetUrl);
    const results = posts.map((post, index) => {
      const content = parseString(post.content).toLowerCase();
      const matchedKeyword = bannedKeywords.find((keyword) => keyword && content.includes(keyword)) ?? null;
      const action = matchedKeyword ? "REJECTED" : options.autoApprove === false ? "FLAGGED" : "APPROVED";

      return {
        id: post.id ?? `post-${index + 1}`,
        author: parseString(post.author) || null,
        action,
        matchedKeyword,
        content: parseString(post.content)
      };
    });

    const approvedCount = results.filter((item) => item.action === "APPROVED").length;
    const rejectedCount = results.filter((item) => item.action === "REJECTED").length;
    const flaggedCount = results.filter((item) => item.action === "FLAGGED").length;

    input.log("INFO", `Moderation group ${groupName}: ${results.length} bai ghi.`);
    input.log("SUCCESS", `Approved ${approvedCount}, rejected ${rejectedCount}, flagged ${flaggedCount}.`);

    return {
      success: true,
      fetchedCount: results.length,
      note: `Da mo phong kiem duyet group ${groupName}.`,
      details: {
        platform: input.platform,
        jobType: input.jobType,
        groupId: groupId || null,
        groupName,
        targetUrl,
        autoApprove: options.autoApprove !== false,
        autoReject: options.autoReject !== false,
        bannedKeywords,
        probe
      },
      data: {
        groupId: groupId || null,
        groupName,
        results
      },
      metrics: {
        approvedCount,
        rejectedCount,
        flaggedCount,
        reviewedCount: results.length
      }
    };
  });
}
