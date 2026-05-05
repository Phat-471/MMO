import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { WorkspaceService } from "./workspace.service";

@Injectable()
export class DataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceService: WorkspaceService
  ) {}

  async snapshots(workspaceId: string, userId: string) {
    await this.workspaceService.assertWorkspaceAccess(workspaceId, userId);

    const snapshots = await this.listSnapshots(workspaceId);

    return {
      message: "Danh sach du lieu thu thap.",
      data: snapshots
    };
  }

  async exportSnapshots(workspaceId: string, userId: string, format: "csv" | "json") {
    await this.workspaceService.assertWorkspaceAccess(workspaceId, userId);
    if (!["csv", "json"].includes(format)) {
      throw new BadRequestException("Dinh dang export khong hop le.");
    }

    const snapshots = await this.listSnapshots(workspaceId);
    const exportedAt = new Date().toISOString();
    const filename = `mmo-snapshots-${workspaceId.slice(0, 8)}-${exportedAt.slice(0, 10)}.${format}`;

    if (format === "csv") {
      return {
        message: "Xuat du lieu CSV thanh cong.",
        data: {
          filename,
          mimeType: "text/csv",
          content: this.toCsv(snapshots)
        }
      };
    }

    return {
      message: "Xuat du lieu JSON thanh cong.",
      data: {
        filename,
        mimeType: "application/json",
        content: JSON.stringify(
          {
            workspaceId,
            exportedAt,
            total: snapshots.length,
            items: snapshots.map((snapshot) => ({
              ...snapshot,
              payload: this.parsePayload(snapshot.payloadJson)
            }))
          },
          null,
          2
        )
      }
    };
  }

  async getSnapshot(id: string, userId: string) {
    const snapshot = await this.prisma.dataSnapshot.findUnique({
      where: { id },
      include: { account: true }
    });

    if (!snapshot) {
      throw new NotFoundException("Khong tim thay du lieu.");
    }

    await this.workspaceService.assertWorkspaceAccess(snapshot.workspaceId, userId);

    return {
      message: "Chi tiet du lieu.",
      data: snapshot
    };
  }

  private listSnapshots(workspaceId: string) {
    return this.prisma.dataSnapshot.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 1000,
      include: {
        account: { select: { id: true, label: true, platform: true } }
      }
    });
  }

  private toCsv(snapshots: Awaited<ReturnType<DataService["listSnapshots"]>>) {
    const header = ["id", "dataType", "sourcePlatform", "accountLabel", "fetchedAt", "createdAt", "payloadJson"];
    const rows = snapshots.map((snapshot) => [
      snapshot.id,
      snapshot.dataType,
      snapshot.sourcePlatform,
      snapshot.account?.label ?? "",
      snapshot.fetchedAt.toISOString(),
      snapshot.createdAt.toISOString(),
      snapshot.payloadJson
    ]);

    return [header, ...rows].map((row) => row.map((value) => this.escapeCsv(value)).join(",")).join("\n");
  }

  private escapeCsv(value: string) {
    const escaped = value.replace(/"/g, '""');
    return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
  }

  private parsePayload(value: string) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
}
