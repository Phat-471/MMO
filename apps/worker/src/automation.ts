import { resolveToolDefinition, resolveToolRunner } from "./tools/registry";
import type { NormalizedToolResult, ToolDefinition, ToolInput, ToolResult, ToolValidationIssue } from "./tools/types";

export type AutomationInput = ToolInput;
export type AutomationResult = NormalizedToolResult;

export async function executeAutomation(input: AutomationInput): Promise<AutomationResult> {
  const definition = resolveToolDefinition(input);
  const runner = definition?.runner ?? resolveToolRunner(input);
  const validationIssues = validateInput(input, definition);

  if (validationIssues.length > 0) {
    return normalizeResult(
      {
        success: false,
        note: "Tool input khong hop le.",
        error: validationIssues.map((issue) => `${issue.field}: ${issue.message}`).join("; "),
        details: {
          validationIssues
        }
      },
      definition,
      input
    );
  }

  input.log("INFO", definition ? `Chay tool ${definition.code} (${definition.stage}).` : `Chay runner mac dinh cho ${input.platform}:${input.jobType}.`);

  try {
    const result = await runner(input);
    return normalizeResult(result, definition, input);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tool runner failed.";
    input.log("ERROR", message);
    return normalizeResult(
      {
        success: false,
        note: "Tool runner gap loi.",
        error: message
      },
      definition,
      input
    );
  }
}

function validateInput(input: AutomationInput, definition: ToolDefinition | null): ToolValidationIssue[] {
  const issues: ToolValidationIssue[] = [];

  try {
    JSON.parse(input.optionsJson || "{}");
  } catch {
    issues.push({
      field: "optionsJson",
      message: "JSON khong hop le."
    });
  }

  if (!definition) {
    return issues;
  }

  if (definition.requiredRuntime?.includes("proxy") && !input.proxy) {
    issues.push({
      field: "proxy",
      message: "Tool nay can proxy tu tai khoan."
    });
  }

  for (const option of definition.input) {
    if (!option.required || option.key === "proxy") {
      continue;
    }

    const value = input.options?.[option.key];
    if (value === undefined || value === null || value === "") {
      issues.push({
        field: option.key,
        message: "Thieu gia tri bat buoc."
      });
    }
  }

  return issues;
}

function normalizeResult(result: ToolResult, definition: ToolDefinition | null, input: AutomationInput): AutomationResult {
  const snapshotData = Array.isArray(result.snapshotData) ? result.snapshotData : [];
  const fetchedCount = typeof result.fetchedCount === "number" ? result.fetchedCount : snapshotData.length;
  const success = result.success ?? !result.error;
  const note = result.note ?? (success ? "Tool completed." : "Tool failed.");

  return {
    ...result,
    success,
    fetchedCount,
    note,
    snapshotData,
    metrics: {
      fetchedCount,
      ...(result.metrics ?? {})
    },
    details: {
      platform: input.platform,
      jobType: input.jobType,
      ...(definition
        ? {
            toolKey: definition.key,
            toolCode: definition.code,
            toolStage: definition.stage
          }
        : {}),
      ...(result.details ?? {})
    },
    tool: definition
      ? {
          key: definition.key,
          code: definition.code,
          name: definition.name,
          stage: definition.stage
        }
      : undefined
  };
}
