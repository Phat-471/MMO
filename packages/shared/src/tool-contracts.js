"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOOL_CONTRACTS = void 0;
exports.makeToolKey = makeToolKey;
exports.resolveToolContract = resolveToolContract;
exports.resolveToolContractByCode = resolveToolContractByCode;
exports.parseToolConfig = parseToolConfig;
function normalize(value) {
    return value.trim().toUpperCase();
}
function makeToolKey(platform, jobType) {
    return `${normalize(platform)}:${normalize(jobType)}`;
}
function defineTool(contract) {
    return {
        ...contract,
        key: makeToolKey(contract.platform, contract.jobType)
    };
}
exports.TOOL_CONTRACTS = [
    defineTool({
        platform: "FACEBOOK",
        jobType: "FETCH_POSTS",
        code: "facebook-post-fetcher",
        name: "Facebook post fetcher",
        stage: "stable",
        category: "facebook",
        input: [
            { key: "pageId", type: "string", description: "Facebook page id or slug." },
            { key: "targetUrl", type: "string", description: "Direct page URL override." },
            { key: "limit", type: "number", description: "Number of posts to fetch." }
        ],
        output: { data: "Probe details and request context.", metrics: ["fetchedCount"] },
        requiredRuntime: ["browser"]
    }),
    defineTool({
        platform: "FACEBOOK",
        jobType: "FETCH_COMMENTS",
        code: "facebook-comment-fetcher",
        name: "Facebook comment fetcher",
        stage: "stable",
        category: "facebook",
        input: [
            { key: "postId", type: "string", description: "Facebook post id." },
            { key: "targetUrl", type: "string", description: "Direct post URL override." },
            { key: "limit", type: "number", description: "Number of comments to fetch." }
        ],
        output: { data: "Probe details and request context.", metrics: ["fetchedCount"] },
        requiredRuntime: ["browser"]
    }),
    defineTool({
        platform: "FACEBOOK",
        jobType: "FETCH_PROFILE",
        code: "facebook-profile-checker",
        name: "Facebook profile checker",
        stage: "stable",
        category: "facebook",
        input: [
            { key: "username", type: "string", description: "Facebook username." },
            { key: "targetUrl", type: "string", description: "Direct profile URL override." }
        ],
        output: { data: "Profile probe details.", metrics: ["fetchedCount"] },
        requiredRuntime: ["browser"]
    }),
    defineTool({
        platform: "FACEBOOK",
        jobType: "POST_GROUP",
        code: "facebook-group-poster",
        name: "Facebook group poster",
        stage: "beta",
        category: "automation",
        input: [
            { key: "groupId", type: "string", description: "Target group id or slug." },
            { key: "content", type: "string", description: "Post content." },
            { key: "mediaUrls", type: "string[]", description: "Optional media URLs." }
        ],
        output: { data: "Posting simulation details.", metrics: ["postedCount"] },
        requiredRuntime: ["browser", "account"]
    }),
    defineTool({
        platform: "FACEBOOK",
        jobType: "NURTURE_ACCOUNT",
        code: "facebook-account-nurturer",
        name: "Facebook account nurturer",
        stage: "beta",
        category: "automation",
        input: [
            { key: "durationMinutes", type: "number", description: "Run duration." },
            { key: "actionsPerMinute", type: "number", description: "Action pacing." }
        ],
        output: { snapshotData: "Synthetic nurture action log.", metrics: ["actionCount"] },
        requiredRuntime: ["browser", "account"]
    }),
    defineTool({
        platform: "FACEBOOK",
        jobType: "AUTO_LIKE",
        code: "facebook-auto-liker",
        name: "Facebook auto liker",
        stage: "beta",
        category: "automation",
        input: [
            { key: "targetUrls", type: "string[]", description: "Post URLs to like." },
            { key: "limit", type: "number", description: "Maximum actions." }
        ],
        output: { snapshotData: "Like action results.", metrics: ["likedCount"] },
        requiredRuntime: ["browser", "account"]
    }),
    defineTool({
        platform: "FACEBOOK",
        jobType: "AUTO_COMMENT",
        code: "facebook-auto-commenter",
        name: "Facebook auto commenter",
        stage: "beta",
        category: "automation",
        input: [
            { key: "targetUrls", type: "string[]", description: "Post URLs to comment." },
            { key: "comments", type: "string[]", description: "Comment pool." },
            { key: "limit", type: "number", description: "Maximum actions." }
        ],
        output: { snapshotData: "Comment action results.", metrics: ["commentedCount"] },
        requiredRuntime: ["browser", "account"]
    }),
    defineTool({
        platform: "FACEBOOK",
        jobType: "GROUP_MODERATION",
        code: "facebook-group-moderation",
        name: "Facebook group moderation",
        stage: "stable",
        category: "facebook",
        input: [
            { key: "groupId", type: "string", description: "Target group id." },
            { key: "posts", type: "object[]", description: "Posts to classify." },
            { key: "bannedKeywords", type: "string[]", description: "Blocked terms." }
        ],
        output: { snapshotData: "Moderation decisions.", metrics: ["approved", "flagged", "rejected"] }
    }),
    defineTool({
        platform: "FACEBOOK",
        jobType: "AI_CONTENT",
        code: "ai-content-writer",
        name: "AI content writer",
        stage: "experimental",
        category: "automation",
        input: [
            { key: "topic", type: "string", description: "Content topic." },
            { key: "tone", type: "string", description: "Writing tone." },
            { key: "keywords", type: "string[]", description: "Target keywords." }
        ],
        output: { data: "Generated content draft.", metrics: ["wordCount"] }
    }),
    defineTool({
        platform: "FACEBOOK",
        jobType: "BULK_MSG",
        code: "facebook-bulk-messaging",
        name: "Facebook bulk messaging",
        stage: "experimental",
        category: "automation",
        input: [
            { key: "targetUids", type: "string[]", description: "Recipient user ids." },
            { key: "message", type: "string", description: "Message body." },
            { key: "delay", type: "number", description: "Delay between messages." }
        ],
        output: { data: "Messaging summary.", metrics: ["sentCount"] },
        requiredRuntime: ["account"]
    }),
    defineTool({
        platform: "FACEBOOK",
        jobType: "ACCOUNT_HEALTH",
        code: "account-health-monitor",
        name: "Account health monitor",
        stage: "stable",
        category: "system",
        input: [
            { key: "accountLabel", type: "string", description: "Account label." },
            { key: "targetUrl", type: "string", description: "Health probe URL." }
        ],
        output: { data: "Health probe result.", metrics: ["healthScore"] },
        requiredRuntime: ["browser"]
    }),
    defineTool({
        platform: "FACEBOOK",
        jobType: "CHECK_PROXY",
        code: "proxy-checker",
        name: "Proxy checker",
        stage: "stable",
        category: "system",
        input: [{ key: "proxy", type: "string", required: true, description: "Proxy from selected account." }],
        output: { data: "Proxy status and latency.", metrics: ["latencyMs"] },
        requiredRuntime: ["proxy"]
    }),
    defineTool({
        platform: "FACEBOOK",
        jobType: "WORKFLOW_BUILD",
        code: "workflow-builder",
        name: "Workflow builder",
        stage: "beta",
        category: "automation",
        input: [
            { key: "workflowName", type: "string", description: "Workflow name." },
            { key: "steps", type: "object[]", description: "Workflow steps." },
            { key: "dryRun", type: "boolean", description: "Validate only." }
        ],
        output: { data: "Normalized workflow.", metrics: ["stepCount"] }
    }),
    defineTool({
        platform: "FACEBOOK",
        jobType: "CHANGE_PASSWORD",
        code: "password-changer",
        name: "Password changer",
        stage: "experimental",
        category: "system",
        input: [
            { key: "newPassword", type: "string", description: "New password." },
            { key: "logoutOthers", type: "boolean", description: "Logout other sessions." }
        ],
        output: { data: "Password change simulation.", metrics: ["changedCount"] },
        requiredRuntime: ["account"]
    }),
    defineTool({
        platform: "FACEBOOK",
        jobType: "REG_ACCOUNT",
        code: "account-reg-tool",
        name: "Account registrator",
        stage: "experimental",
        category: "system",
        input: [
            { key: "platform", type: "string", description: "Target platform." },
            { key: "useProxy", type: "boolean", description: "Use proxy during registration." }
        ],
        output: { data: "Registration simulation.", metrics: ["registeredCount"] }
    }),
    defineTool({
        platform: "TIKTOK",
        jobType: "FETCH_PROFILE",
        code: "tiktok-profile-checker",
        name: "TikTok profile checker",
        stage: "stable",
        category: "tiktok",
        input: [
            { key: "username", type: "string", description: "TikTok username." },
            { key: "targetUrl", type: "string", description: "Direct profile URL override." }
        ],
        output: { data: "Profile probe details.", metrics: ["fetchedCount"] },
        requiredRuntime: ["browser"]
    }),
    defineTool({
        platform: "TIKTOK",
        jobType: "FETCH_VIDEOS",
        code: "tiktok-video-fetcher",
        name: "TikTok video fetcher",
        stage: "stable",
        category: "tiktok",
        input: [
            { key: "username", type: "string", description: "TikTok username." },
            { key: "hashtag", type: "string", description: "Hashtag to fetch." },
            { key: "limit", type: "number", description: "Number of videos." }
        ],
        output: { snapshotData: "Video snapshots.", metrics: ["fetchedCount"] },
        requiredRuntime: ["browser"]
    }),
    defineTool({
        platform: "TIKTOK",
        jobType: "KEYWORD_MONITOR",
        code: "tiktok-keyword-monitor",
        name: "TikTok keyword monitor",
        stage: "stable",
        category: "tiktok",
        input: [
            { key: "keywords", type: "string[]", description: "Terms to monitor." },
            { key: "hashtags", type: "string[]", description: "Hashtags to monitor." },
            { key: "limit", type: "number", description: "Alert limit." }
        ],
        output: { snapshotData: "Keyword alerts.", metrics: ["alertsFound"] },
        requiredRuntime: ["browser"]
    }),
    defineTool({
        platform: "TIKTOK",
        jobType: "REUP_VIDEO",
        code: "video-reup-tool",
        name: "TikTok reup video",
        stage: "beta",
        category: "automation",
        input: [
            { key: "sourceUrl", type: "string", description: "Source video URL." },
            { key: "targetPlatform", type: "string", description: "Destination platform." }
        ],
        output: { snapshotData: "Video republish artifact.", metrics: ["durationSeconds"] }
    }),
    defineTool({
        platform: "TIKTOK",
        jobType: "REG_ACCOUNT",
        code: "account-reg-tool",
        name: "TikTok account registrator",
        stage: "experimental",
        category: "system",
        input: [
            { key: "platform", type: "string", description: "Target platform." },
            { key: "useProxy", type: "boolean", description: "Use proxy during registration." }
        ],
        output: { data: "Registration simulation.", metrics: ["registeredCount"] }
    }),
    defineTool({
        platform: "TIKTOK",
        jobType: "AUTO_DM",
        code: "tiktok-auto-dm",
        name: "TikTok auto DM",
        stage: "experimental",
        category: "automation",
        input: [
            { key: "targetUsers", type: "string[]", description: "Recipient usernames." },
            { key: "message", type: "string", description: "Message body." }
        ],
        output: { data: "Default runner execution context.", metrics: ["fetchedCount"] },
        requiredRuntime: ["account"]
    }),
    defineTool({
        platform: "TIKTOK",
        jobType: "CLEANUP",
        code: "tiktok-cleanup",
        name: "TikTok cleanup",
        stage: "experimental",
        category: "automation",
        input: [{ key: "targetUrl", type: "string", description: "Target URL for cleanup probe." }],
        output: { data: "Default runner execution context.", metrics: ["fetchedCount"] }
    }),
    defineTool({
        platform: "YOUTUBE",
        jobType: "REUP_VIDEO",
        code: "video-reup-tool",
        name: "YouTube reup video",
        stage: "beta",
        category: "youtube",
        input: [
            { key: "sourceUrl", type: "string", description: "Source video URL." },
            { key: "targetPlatform", type: "string", description: "Destination platform." }
        ],
        output: { snapshotData: "Video republish artifact.", metrics: ["durationSeconds"] }
    }),
    defineTool({
        platform: "SHOPEE",
        jobType: "SHOPEE_VIDEO_AFF",
        code: "shopee-video-affiliate",
        name: "Shopee video affiliate",
        stage: "beta",
        category: "shopee",
        input: [
            { key: "productUrl", type: "string", description: "Shopee product URL." },
            { key: "affiliateId", type: "string", description: "Affiliate id." },
            { key: "script", type: "string", description: "Video script." }
        ],
        output: { snapshotData: "Generated video plan.", metrics: ["videoCount"] }
    }),
    defineTool({
        platform: "SHOPEE",
        jobType: "SHOPEE_LINK_CONVERT",
        code: "shopee-link-converter",
        name: "Shopee link converter",
        stage: "stable",
        category: "shopee",
        input: [
            { key: "productUrls", type: "string[]", description: "Product URLs." },
            { key: "affiliateId", type: "string", description: "Affiliate id." },
            { key: "subId", type: "string", description: "Sub tracking id." }
        ],
        output: { snapshotData: "Converted affiliate links.", metrics: ["convertedCount"] }
    }),
    defineTool({
        platform: "FACEBOOK",
        jobType: "MARKETPLACE_SCAN",
        code: "facebook-marketplace-scanner",
        name: "Facebook marketplace scanner",
        stage: "experimental",
        category: "data",
        input: [
            { key: "keyword", type: "string", description: "Search keyword." },
            { key: "targetUrl", type: "string", description: "Marketplace URL override." }
        ],
        output: { data: "Default runner execution context.", metrics: ["fetchedCount"] },
        requiredRuntime: ["browser"]
    }),
    defineTool({
        platform: "FACEBOOK",
        jobType: "AUTO_JOIN_GROUP",
        code: "facebook-auto-joiner",
        name: "Facebook auto join group",
        stage: "experimental",
        category: "automation",
        input: [
            { key: "keywords", type: "string[]", description: "Group discovery keywords." },
            { key: "limit", type: "number", description: "Maximum groups." }
        ],
        output: { data: "Default runner execution context.", metrics: ["fetchedCount"] },
        requiredRuntime: ["browser", "account"]
    }),
    defineTool({
        platform: "SHOPEE",
        jobType: "SHOPEE_TRENDING",
        code: "shopee-trending",
        name: "Shopee trending discovery",
        stage: "experimental",
        category: "data",
        input: [
            { key: "productUrl", type: "string", description: "Seed product URL." },
            { key: "affiliateId", type: "string", description: "Affiliate id." }
        ],
        output: { snapshotData: "Trending product/video candidates.", metrics: ["videoCount"] }
    }),
    defineTool({
        platform: "DATA",
        jobType: "EXPORT_DATA",
        code: "data-export",
        name: "Data export",
        stage: "stable",
        category: "data",
        input: [
            { key: "entity", type: "string", description: "Entity to export." },
            { key: "format", type: "string", description: "csv or json." },
            { key: "limit", type: "number", description: "Maximum rows." }
        ],
        output: { data: "Export payload.", metrics: ["rowCount"] }
    }),
    defineTool({
        platform: "SYSTEM",
        jobType: "STRESS_TEST",
        code: "system-stress-test",
        name: "System stress test",
        stage: "stable",
        category: "system",
        input: [
            { key: "durationSeconds", type: "number", description: "Duration in seconds." },
            { key: "logIntervalSeconds", type: "number", description: "Log interval." }
        ],
        output: { snapshotData: "Stress test trace.", metrics: ["durationSeconds"] }
    }),
    defineTool({
        platform: "SYSTEM",
        jobType: "CHECK_PROXY",
        code: "proxy-checker",
        name: "System proxy checker",
        stage: "stable",
        category: "system",
        input: [{ key: "proxy", type: "string", required: true, description: "Proxy from selected account." }],
        output: { data: "Proxy status and latency.", metrics: ["latencyMs"] },
        requiredRuntime: ["proxy"]
    }),
    defineTool({
        platform: "SYSTEM",
        jobType: "WORKFLOW_BUILD",
        code: "workflow-builder",
        name: "System workflow builder",
        stage: "beta",
        category: "automation",
        input: [{ key: "steps", type: "object[]", description: "Workflow steps." }],
        output: { data: "Normalized workflow.", metrics: ["stepCount"] }
    }),
    defineTool({
        platform: "SYSTEM",
        jobType: "CLEANUP",
        code: "system-cleanup",
        name: "System cleanup",
        stage: "experimental",
        category: "system",
        input: [{ key: "targetUrl", type: "string", description: "Target URL for cleanup probe." }],
        output: { data: "Default runner execution context.", metrics: ["fetchedCount"] }
    })
];
const CONTRACT_BY_KEY = new Map(exports.TOOL_CONTRACTS.map((contract) => [contract.key, contract]));
const CONTRACT_BY_CODE = new Map(exports.TOOL_CONTRACTS.map((contract) => [contract.code, contract]));
function resolveToolContract(platform, jobType) {
    return CONTRACT_BY_KEY.get(makeToolKey(platform, jobType)) ?? null;
}
function resolveToolContractByCode(code) {
    return CONTRACT_BY_CODE.get(code.trim().toLowerCase()) ?? CONTRACT_BY_CODE.get(code.trim()) ?? null;
}
function parseToolConfig(value) {
    try {
        return JSON.parse(value);
    }
    catch {
        return {};
    }
}
