import { BadRequestException, Injectable } from "@nestjs/common";
import { JobType, Platform } from "@prisma/client";
import { parseToolConfig, resolveToolContract as findToolContract, type ToolContract } from "../../../../packages/shared/src/tool-contracts";
import { PrismaService } from "../prisma.service";
import { CreateJobFromToolDto, UpdateWorkspaceToolDto } from "../dto/tool.dto";
import { WorkspaceService } from "./workspace.service";
import { recordAudit } from "../lib/audit";

const SUPPORTED_TOOL_PLATFORMS = new Set<string>(Object.values(Platform));
const SUPPORTED_TOOL_JOB_TYPES = new Set<string>(Object.values(JobType));

@Injectable()
export class ToolService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceService: WorkspaceService
  ) {}

  async listForWorkspace(workspaceId: string, userId: string) {
    await this.workspaceService.assertWorkspaceAccess(workspaceId, userId);

    const tools = await this.prisma.tool.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      include: {
        workspaceTools: {
          where: { workspaceId },
          take: 1
        }
      }
    });

    return {
      message: "Danh sach cong cu cua workspace.",
      data: tools.map((tool) => {
        const workspaceTool = tool.workspaceTools[0];
        return {
          id: tool.id,
          code: tool.code,
          name: tool.name,
          description: tool.description,
          category: tool.category,
          configJson: tool.configJson,
          contract: this.resolveContract(tool.configJson),
          enabled: workspaceTool?.enabled ?? false,
          settingsJson: workspaceTool?.settingsJson ?? "{}"
        };
      })
    };
  }

  async updateForWorkspace(workspaceId: string, toolId: string, userId: string, dto: UpdateWorkspaceToolDto) {
    await this.workspaceService.assertWorkspaceAccess(workspaceId, userId);

    const workspaceTool = await this.prisma.workspaceTool.upsert({
      where: {
        workspaceId_toolId: {
          workspaceId,
          toolId
        }
      },
      update: {
        enabled: dto.enabled,
        settingsJson: dto.settingsJson
      },
      create: {
        workspaceId,
        toolId,
        enabled: dto.enabled ?? true,
        settingsJson: dto.settingsJson ?? "{}"
      },
      include: {
        tool: true
      }
    });

    await recordAudit(this.prisma, {
      workspaceId,
      userId,
      action: "tool.workspace.update",
      entityType: "WorkspaceTool",
      entityId: workspaceTool.id,
      metadata: {
        toolId: workspaceTool.toolId,
        enabled: workspaceTool.enabled
      }
    });

    return {
      message: "Cap nhat cong cu workspace thanh cong.",
      data: workspaceTool
    };
  }

  async createJobFromTool(workspaceId: string, toolId: string, userId: string, dto: CreateJobFromToolDto) {
    await this.workspaceService.assertWorkspaceAccess(workspaceId, userId);

    const workspaceTool = await this.prisma.workspaceTool.findUnique({
      where: {
        workspaceId_toolId: {
          workspaceId,
          toolId
        }
      },
      include: {
        tool: true
      }
    });

    if (!workspaceTool?.enabled || workspaceTool.tool.status !== "ACTIVE") {
      throw new BadRequestException("Cong cu chua duoc bat trong workspace.");
    }

    const config = parseToolConfig(workspaceTool.tool.configJson);
    if (!config.platform || !config.jobType) {
      throw new BadRequestException("Cong cu nay chua ho tro tao tac vu tu dong.");
    }

    const platform = this.normalizePlatform(config.platform);
    const jobType = this.normalizeJobType(config.jobType);

    const job = await this.prisma.job.create({
      data: {
        workspaceId,
        accountId: dto.accountId || null,
        platform,
        jobType,
        mode: this.normalizeMode(dto.mode),
        scheduleCron: dto.scheduleCron || null,
        optionsJson: dto.optionsJson || workspaceTool.settingsJson || "{}",
        createdById: userId
      }
    });

    await recordAudit(this.prisma, {
      workspaceId,
      userId,
      action: "tool.job.create",
      entityType: "Job",
      entityId: job.id,
      metadata: {
        toolId,
        platform: job.platform,
        jobType: job.jobType
      }
    });

    return {
      message: "Da tao tac vu tu cong cu.",
      data: job
    };
  }

  private resolveContract(value: string): ToolContract | null {
    const config = parseToolConfig(value);
    if (!config.platform || !config.jobType) {
      return null;
    }
    return findToolContract(config.platform, config.jobType);
  }

  private normalizePlatform(value?: string): Platform {
    const platform = (value ?? "").toUpperCase();
    if (SUPPORTED_TOOL_PLATFORMS.has(platform)) {
      return platform as Platform;
    }
    throw new BadRequestException("Nen tang cong cu khong hop le.");
  }

  private normalizeJobType(value?: string): JobType {
    const jobType = (value ?? "").toUpperCase();
    if (SUPPORTED_TOOL_JOB_TYPES.has(jobType)) {
      return jobType as JobType;
    }
    throw new BadRequestException("Loai tac vu cua cong cu khong hop le.");
  }

  private normalizeMode(value?: string): "ONCE" | "SCHEDULED" | "RECURRING" {
    const mode = (value ?? "once").toLowerCase();
    if (mode === "once") {
      return "ONCE";
    }
    if (mode === "scheduled") {
      return "SCHEDULED";
    }
    if (mode === "recurring") {
      return "RECURRING";
    }
    throw new BadRequestException("Che do chay khong hop le");
  }
}
