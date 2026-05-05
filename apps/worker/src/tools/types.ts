import type {
  ToolCategory,
  ToolContract,
  ToolJobType,
  ToolOptionDefinition,
  ToolPlatform,
  ToolRuntimeRequirement,
  ToolStage
} from "../../../../packages/shared/src/tool-contracts";

export type { ToolCategory, ToolJobType, ToolOptionDefinition, ToolPlatform, ToolRuntimeRequirement, ToolStage };

export type ToolDefinition = ToolContract & {
  runner: ToolRunner;
};

export type ToolValidationIssue = {
  field: string;
  message: string;
};

export type ToolInput = {
  platform: string;
  jobType: string;
  optionsJson: string;
  options: Record<string, any>;
  proxy?: string;
  log: (level: "INFO" | "SUCCESS" | "ERROR" | "WARNING", message: string) => void;
};

export type ToolResult = {
  success?: boolean;
  data?: any;
  fetchedCount?: number;
  note?: string;
  details?: Record<string, unknown>;
  snapshotData?: any[];
  metrics?: Record<string, any>;
  error?: string;
  tool?: {
    key: string;
    code: string;
    name: string;
    stage: ToolStage;
  };
};

export type NormalizedToolResult = Required<Pick<ToolResult, "success" | "fetchedCount" | "note" | "snapshotData" | "metrics">> &
  Omit<ToolResult, "success" | "fetchedCount" | "note" | "snapshotData" | "metrics">;

export type ToolRunner = (input: ToolInput) => Promise<ToolResult>;
