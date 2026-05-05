import { clampInt, parseOptions, parseString } from "./helpers";
import type { ToolInput, ToolResult } from "./types";

type DataExportOptions = {
  format?: "csv" | "json";
  entity?: string;
  limit?: number;
  includeHeaders?: boolean;
};

export async function runDataExport(input: ToolInput): Promise<ToolResult> {
  const options = parseOptions<DataExportOptions>(input.optionsJson);
  const format = options.format === "json" ? "json" : "csv";
  const entity = parseString(options.entity) || "jobs";
  const limit = clampInt(options.limit, 100, 1, 10000);
  const includeHeaders = options.includeHeaders !== false;

  return {
    fetchedCount: limit,
    note: `Da chuan bi goi xuat du lieu ${entity} dang ${format.toUpperCase()}.`,
    details: {
      platform: input.platform,
      jobType: input.jobType,
      entity,
      format,
      limit,
      includeHeaders
    }
  };
}
