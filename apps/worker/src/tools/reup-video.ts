import { parseOptions, parseString } from "./helpers";
import type { ToolInput, ToolResult } from "./types";

type ReupVideoOptions = {
  sourceUrl?: string;
  targetPlatform?: string;
  title?: string;
  description?: string;
  addWatermark?: boolean;
  addCaptions?: boolean;
};

export async function runReupVideo(input: ToolInput): Promise<ToolResult> {
  const options = parseOptions<ReupVideoOptions>(input.optionsJson);
  const sourceUrl = parseString(options.sourceUrl);
  const targetPlatform = parseString(options.targetPlatform) || "TIKTOK";
  const title = parseString(options.title) || "Reup video marketing";
  const description = parseString(options.description) || "Video repurpose for affiliate workflow";
  const addWatermark = options.addWatermark !== false;
  const addCaptions = options.addCaptions !== false;

  if (!sourceUrl) {
    throw new Error("Source URL is required for reup video.");
  }

  input.log("INFO", `Start reup pipeline from ${sourceUrl}.`);
  input.log("INFO", `Target platform: ${targetPlatform}`);
  input.log("INFO", `Watermark: ${addWatermark ? "on" : "off"}, Captions: ${addCaptions ? "on" : "off"}`);
  await new Promise((resolve) => setTimeout(resolve, 400));

  const output = {
    id: `reup-${Math.random().toString(36).slice(2, 8)}`,
    sourceUrl,
    targetPlatform,
    title,
    description,
    status: "READY",
    assetUrl: `https://mmo.local/video/${Math.random().toString(36).slice(2, 10)}`,
    captions: addCaptions,
    watermark: addWatermark
  };

  input.log("SUCCESS", `Da chuan bi video cho ${targetPlatform}.`);

  return {
    success: true,
    note: `Da chuan bi video reup cho ${targetPlatform}.`,
    data: output,
    snapshotData: [output],
    metrics: {
      sourceLength: sourceUrl.length,
      outputReady: 1
    }
  };
}
