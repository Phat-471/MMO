import { clampInt, parseOptions, parseString } from "./helpers";
import type { ToolInput, ToolResult } from "./types";

type WorkflowStep = {
  code?: string;
  name?: string;
  enabled?: boolean;
  options?: Record<string, unknown>;
};

type WorkflowBuilderOptions = {
  workflowName?: string;
  steps?: WorkflowStep[];
  dryRun?: boolean;
};

export async function runWorkflowBuilder(input: ToolInput): Promise<ToolResult> {
  const options = parseOptions<WorkflowBuilderOptions>(input.optionsJson);
  const workflowName = parseString(options.workflowName) || "Untitled workflow";
  const steps = (options.steps ?? []).slice(0, clampInt(options.steps?.length, 10, 1, 50));
  const dryRun = options.dryRun !== false;

  const normalizedSteps = steps.map((step, index) => ({
    index: index + 1,
    code: parseString(step.code) || `step-${index + 1}`,
    name: parseString(step.name) || `Step ${index + 1}`,
    enabled: step.enabled !== false,
    options: step.options ?? {},
    status: step.enabled === false ? "SKIPPED" : dryRun ? "READY" : "QUEUED"
  }));

  input.log("INFO", `Workflow ${workflowName} co ${normalizedSteps.length} buoc.`);
  for (const step of normalizedSteps) {
    input.log("INFO", `Buoc ${step.index}: ${step.name} (${step.status}).`);
  }

  return {
    success: true,
    fetchedCount: normalizedSteps.length,
    note: `Da xay dung workflow ${workflowName}.`,
    details: {
      platform: input.platform,
      jobType: input.jobType,
      workflowName,
      dryRun,
      steps: normalizedSteps
    },
    data: {
      workflowName,
      dryRun,
      steps: normalizedSteps
    },
    metrics: {
      totalSteps: normalizedSteps.length,
      enabledSteps: normalizedSteps.filter((step) => step.enabled).length
    }
  };
}
