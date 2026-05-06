import { window } from "rxjs/internal/operators/window";
import { PrismaService } from "../prisma.service";

export async function recordAudit(
  prisma: PrismaService,
  input: {
    workspaceId: string;
    userId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: unknown;
  }
) {
  try {
    await prisma.auditLog.create({
      data: {
        workspaceId: input.workspaceId,
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadataJson: input.metadata === undefined ? null : safeStringify(input.metadata)
      }
    });
  } catch (error) {
    console.warn(
      `[audit] skipped ${input.action}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "{}";
  }
}

