import { TOOL_CONTRACTS, makeToolKey, resolveToolContract as findToolContract, type ToolContract } from "../../../../packages/shared/src/tool-contracts";
import type { ToolDefinition, ToolInput, ToolRunner } from "./types";
import { runAIContentWriter } from "./ai-content-writer";
import { runAccountHealthMonitor } from "./account-health-monitor";
import { runAccountRegistrator } from "./account-registrator";
import { runBulkMessaging } from "./bulk-messaging";
import { runDataExport } from "./data-export";
import { runDefaultTool } from "./default-runner";
import { runFacebookAccountNurturer } from "./facebook-account-nurturer";
import { runFacebookAutoCommenter } from "./facebook-auto-commenter";
import { runFacebookAutoLiker } from "./facebook-auto-liker";
import { runFacebookCommentFetcher } from "./facebook-comment-fetcher";
import { runFacebookGroupModeration } from "./facebook-group-moderation";
import { runFacebookGroupPoster } from "./facebook-group-poster";
import { runFacebookPostFetcher } from "./facebook-post-fetcher";
import { runFacebookProfileChecker } from "./facebook-profile-checker";
import { runPasswordChanger } from "./password-changer";
import { runProxyChecker } from "./proxy-checker";
import { runReupVideo } from "./reup-video";
import { runShopeeLinkConverter } from "./shopee-link-converter";
import { runShopeeVideoAffiliate } from "./shopee-video-affiliate";
import { runStressTest } from "./stress-test";
import { runTiktokKeywordMonitor } from "./tiktok-keyword-monitor";
import { runTiktokProfileChecker } from "./tiktok-profile-checker";
import { runTiktokVideoFetcher } from "./tiktok-video-fetcher";
import { runWorkflowBuilder } from "./workflow-builder";

const TOOL_RUNNERS = new Map<string, ToolRunner>([
  [makeToolKey("FACEBOOK", "FETCH_POSTS"), runFacebookPostFetcher],
  [makeToolKey("FACEBOOK", "FETCH_COMMENTS"), runFacebookCommentFetcher],
  [makeToolKey("FACEBOOK", "FETCH_PROFILE"), runFacebookProfileChecker],
  [makeToolKey("FACEBOOK", "POST_GROUP"), runFacebookGroupPoster],
  [makeToolKey("FACEBOOK", "NURTURE_ACCOUNT"), runFacebookAccountNurturer],
  [makeToolKey("FACEBOOK", "AUTO_LIKE"), runFacebookAutoLiker],
  [makeToolKey("FACEBOOK", "AUTO_COMMENT"), runFacebookAutoCommenter],
  [makeToolKey("FACEBOOK", "GROUP_MODERATION"), runFacebookGroupModeration],
  [makeToolKey("FACEBOOK", "AI_CONTENT"), runAIContentWriter],
  [makeToolKey("FACEBOOK", "BULK_MSG"), runBulkMessaging],
  [makeToolKey("FACEBOOK", "ACCOUNT_HEALTH"), runAccountHealthMonitor],
  [makeToolKey("FACEBOOK", "CHECK_PROXY"), runProxyChecker],
  [makeToolKey("FACEBOOK", "WORKFLOW_BUILD"), runWorkflowBuilder],
  [makeToolKey("FACEBOOK", "CHANGE_PASSWORD"), runPasswordChanger],
  [makeToolKey("FACEBOOK", "REG_ACCOUNT"), runAccountRegistrator],
  [makeToolKey("FACEBOOK", "MARKETPLACE_SCAN"), runDefaultTool],
  [makeToolKey("FACEBOOK", "AUTO_JOIN_GROUP"), runDefaultTool],
  [makeToolKey("TIKTOK", "FETCH_PROFILE"), runTiktokProfileChecker],
  [makeToolKey("TIKTOK", "FETCH_VIDEOS"), runTiktokVideoFetcher],
  [makeToolKey("TIKTOK", "KEYWORD_MONITOR"), runTiktokKeywordMonitor],
  [makeToolKey("TIKTOK", "REUP_VIDEO"), runReupVideo],
  [makeToolKey("TIKTOK", "REG_ACCOUNT"), runAccountRegistrator],
  [makeToolKey("TIKTOK", "AUTO_DM"), runDefaultTool],
  [makeToolKey("TIKTOK", "CLEANUP"), runDefaultTool],
  [makeToolKey("YOUTUBE", "REUP_VIDEO"), runReupVideo],
  [makeToolKey("SHOPEE", "SHOPEE_VIDEO_AFF"), runShopeeVideoAffiliate],
  [makeToolKey("SHOPEE", "SHOPEE_LINK_CONVERT"), runShopeeLinkConverter],
  [makeToolKey("SHOPEE", "SHOPEE_TRENDING"), runShopeeVideoAffiliate],
  [makeToolKey("DATA", "EXPORT_DATA"), runDataExport],
  [makeToolKey("SYSTEM", "STRESS_TEST"), runStressTest],
  [makeToolKey("SYSTEM", "CHECK_PROXY"), runProxyChecker],
  [makeToolKey("SYSTEM", "WORKFLOW_BUILD"), runWorkflowBuilder],
  [makeToolKey("SYSTEM", "CLEANUP"), runDefaultTool]
]);

function buildToolDefinition(contract: ToolContract): ToolDefinition {
  return {
    ...contract,
    runner: TOOL_RUNNERS.get(contract.key) ?? runDefaultTool
  };
}

export const TOOL_DEFINITIONS: ToolDefinition[] = TOOL_CONTRACTS.map(buildToolDefinition);

export function resolveToolDefinition(input: Pick<ToolInput, "platform" | "jobType">): ToolDefinition | null {
  const contract = findToolContract(input.platform, input.jobType);
  return contract ? buildToolDefinition(contract) : null;
}

export function resolveToolRunner(input: Pick<ToolInput, "platform" | "jobType">): ToolRunner {
  return TOOL_RUNNERS.get(makeToolKey(input.platform, input.jobType)) ?? runDefaultTool;
}
