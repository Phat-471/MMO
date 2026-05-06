"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ToolContract } from "@mmo/shared";
import { apiRequest, syncSessionProfile } from "../../../../lib/api";
import AdminSidebar from "../../admin-sidebar";

type AdminToolDetail = {
  id: string;
  code: string;
  name: string;
  description: string;
  category: "FACEBOOK" | "TIKTOK" | "DATA" | "AUTOMATION" | "SYSTEM";
  status: "ACTIVE" | "DISABLED";
  configJson: string;
  contract: ToolContract | null;
  createdAt: string;
  updatedAt: string;
  workspaceTools: Array<{
    id: string;
    enabled: boolean;
    settingsJson: string;
    createdAt: string;
    updatedAt: string;
    workspace: {
      id: string;
      name: string;
      status: string;
      owner: {
        email: string;
      };
    };
  }>;
  toolRuns: Array<{
    id: string;
    status: string;
    startedAt: string | null;
    finishedAt: string | null;
    errorMessage: string | null;
    metricsJson: string | null;
    createdAt: string;
    job: {
      id: string;
      platform: string;
      jobType: string;
      mode: string;
      status: string;
      workspace: {
        id: string;
        name: string;
        owner: {
          email: string;
        };
      };
      account: {
        id: string;
        label: string;
      } | null;
      createdBy: {
        id: string;
        email: string;
      } | null;
    };
    logs: Array<{
      id: string;
      level: string;
      message: string;
      payloadJson: string | null;
      createdAt: string;
    }>;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    createdAt: string;
    user: {
      id: string;
      email: string;
    } | null;
    workspace: {
      id: string;
      name: string;
      owner: {
        email: string;
      };
    };
  }>;
  configVersions: Array<{
    id: string;
    action: "admin.tool.create" | "admin.tool.update" | "admin.tool.clone";
    createdAt: string;
    user: {
      id: string;
      email: string;
    } | null;
    snapshot: {
      name: string;
      description: string;
      status: "ACTIVE" | "DISABLED";
      configJson: string;
    };
  }>;
};

type ToolDraft = {
  name: string;
  description: string;
  status: "ACTIVE" | "DISABLED";
  configJson: string;
};

export default function AdminToolDetailClient({ toolId }: { toolId: string }) {
  const router = useRouter();
  const [detail, setDetail] = useState<AdminToolDetail | null>(null);
  const [draft, setDraft] = useState<ToolDraft | null>(null);
  const [message, setMessage] = useState("Dang tai chi tiet cong cu...");
  const [saving, setSaving] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [rollingBack, setRollingBack] = useState<string | null>(null);

  async function loadDetail() {
    const session = await syncSessionProfile();
    if (!session || session.role !== "ADMIN") {
      setMessage("Cần quyền admin.");
      return;
    }

    try {
      const res = await apiRequest<AdminToolDetail>(`/admin/tools/${toolId}/detail`);
      setDetail(res.data);
      setDraft({
        name: res.data.name,
        description: res.data.description,
        status: res.data.status,
        configJson: res.data.configJson
      });
      setMessage("Da tai chi tiet cong cu.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the tai chi tiet cong cu.");
    }
  }

  useEffect(() => {
    void loadDetail();
  }, [toolId]);

  async function saveTool() {
    if (!draft) {
      return;
    }

    setSaving(true);
    try {
      const res = await apiRequest<AdminToolDetail>(`/admin/tools/${toolId}`, {
        method: "PATCH",
        body: JSON.stringify(draft)
      });
      setDetail((current) => (current ? { ...current, ...draft } : current));
      setMessage(res.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the cap nhat cong cu.");
    } finally {
      setSaving(false);
    }
  }

  async function cloneTool() {
    setCloning(true);
    try {
      const res = await apiRequest<{ id: string; code: string }>(`/admin/tools/${toolId}/clone`, {
        method: "POST"
      });
      setMessage(`${res.message} Mã moi: ${res.data.code}.`);
      router.push(`/admin/tools/${res.data.id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the nhan ban cong cu.");
    } finally {
      setCloning(false);
    }
  }

  async function rollbackVersion(versionId: string) {
    setRollingBack(versionId);
    try {
      const res = await apiRequest<{ id: string }>(`/admin/tools/${toolId}/rollback`, {
        method: "POST",
        body: JSON.stringify({ versionId })
      });
      setMessage(res.message);
      await loadDetail();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the khoi phuc phien ban.");
    } finally {
      setRollingBack(null);
    }
  }

  return (
    <div className="app-shell">
      <AdminSidebar title="Admin" subtitle="Chi tiet cong cu" />

      <main className="main">
        <header className="topbar">
          <div>
            <h1>{detail?.code ?? "Chi tiet cong cu"}</h1>
            <p>{message}</p>
          </div>
          <div className="topbar-actions">
            <Link className="button button-ghost" href="/admin">
              Quay lại
            </Link>
            <button className="button button-soft" type="button" onClick={cloneTool} disabled={cloning || !detail}>
              {cloning ? "Dang nhan ban..." : "Nhan ban cong cu"}
            </button>
            <button className="button button-primary" type="button" onClick={saveTool} disabled={!draft || saving}>
              {saving ? "Đang lưu..." : "Luu cong cu"}
            </button>
          </div>
        </header>

        <section className="metric-grid">
          <article className="metric-card"><div className="metric-label">Trạng thái</div><div className="metric-value">{detail?.status ?? "-"}</div></article>
          <article className="metric-card"><div className="metric-label">Danh mục</div><div className="metric-value">{detail?.category ?? "-"}</div></article>
          <article className="metric-card"><div className="metric-label">Stage</div><div className="metric-value">{detail?.contract?.stage ?? "-"}</div></article>
          <article className="metric-card"><div className="metric-label">Runtime</div><div className="metric-value" style={{ fontSize: 22 }}>{detail?.contract?.requiredRuntime?.join(", ") || "-"}</div></article>
          <article className="metric-card"><div className="metric-label">Workspace dung</div><div className="metric-value">{detail?.workspaceTools.length ?? 0}</div></article>
          <article className="metric-card"><div className="metric-label">Run / log</div><div className="metric-value">{detail?.toolRuns.length ?? 0}</div></article>
          <article className="metric-card"><div className="metric-label">Audit log</div><div className="metric-value">{detail?.auditLogs.length ?? 0}</div></article>
        </section>

        <section className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-head">
            <h2>Hành động</h2>
          </div>
          {draft ? (
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
              <label className="field">
                <span>Tên cong cu</span>
                <input value={draft.name} onChange={(event) => setDraft((current) => (current ? { ...current, name: event.target.value } : current))} />
              </label>
              <label className="field">
                <span>Trạng thái</span>
                <select value={draft.status} onChange={(event) => setDraft((current) => (current ? { ...current, status: event.target.value as "ACTIVE" | "DISABLED" } : current))}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DISABLED">DISABLED</option>
                </select>
              </label>
              <label className="field">
                <span>Mo ta</span>
                <textarea value={draft.description} onChange={(event) => setDraft((current) => (current ? { ...current, description: event.target.value } : current))} />
              </label>
              <label className="field">
                <span>Cau hinh JSON</span>
                <textarea value={draft.configJson} onChange={(event) => setDraft((current) => (current ? { ...current, configJson: event.target.value } : current))} />
              </label>
            </div>
          ) : null}
        </section>

        <section className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-head">
            <h2>Contract</h2>
          </div>
          {detail?.contract ? (
            <div style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className="badge badge-soft">Platform: {detail.contract.platform}</span>
                <span className="badge badge-soft">JobType: {detail.contract.jobType}</span>
                <span className="badge badge-soft">Stage: {detail.contract.stage}</span>
                <span className="badge badge-soft">Category: {detail.contract.category}</span>
              </div>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                <article className="metric-card"><div className="metric-label">Required runtime</div><div className="metric-value" style={{ fontSize: 20 }}>{detail.contract.requiredRuntime?.join(", ") || "-"}</div></article>
                <article className="metric-card"><div className="metric-label">Input fields</div><div className="metric-value" style={{ fontSize: 20 }}>{detail.contract.input.length}</div></article>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {detail.contract.input.map((field) => (
                  <div key={field.key} style={{ padding: 14, borderRadius: 14, border: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                      <strong>{field.key}</strong>
                      <span className="badge badge-soft">{field.type}</span>
                    </div>
                    <div style={{ color: "var(--text-dim)", fontSize: 13, lineHeight: 1.5 }}>{field.description}</div>
                    {field.required ? <div style={{ marginTop: 6, fontSize: 11, color: "var(--warning)" }}>Required</div> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ color: "var(--text-dim)" }}>Khong tim thay contract hop le cho tool nay.</div>
          )}
        </section>

        <section className="content-grid">
          <article className="panel table-panel">
            <div className="panel-head">
              <h2>Workspace su dung</h2>
              <span className="badge badge-green">{detail?.workspaceTools.length ?? 0} mục</span>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Workspace</th>
                  <th>Chủ sở hữu</th>
                  <th>Trạng thái</th>
                  <th>Bat</th>
                  <th>Ngay</th>
                </tr>
              </thead>
              <tbody>
                {detail?.workspaceTools.length ? detail.workspaceTools.map((item) => (
                  <tr key={item.id}>
                    <td className="table-main">
                      <Link href={`/admin/workspaces/${item.workspace.id}`}>{item.workspace.name}</Link>
                    </td>
                    <td>{item.workspace.owner.email}</td>
                    <td>{item.workspace.status}</td>
                    <td>{item.enabled ? "YES" : "NO"}</td>
                    <td>{new Date(item.createdAt).toLocaleDateString("vi-VN")}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={5}>Chua co workspace nao dung tool nay.</td></tr>
                )}
              </tbody>
            </table>
          </article>

          <article className="panel table-panel" style={{ gridColumn: "1 / -1" }}>
            <div className="panel-head">
              <h2>Phiên bản cau hinh</h2>
              <span className="badge badge-green">{detail?.configVersions.length ?? 0} mục</span>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Người thực hiện</th>
                  <th>Hành động</th>
                  <th>Tên</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {detail?.configVersions.length ? detail.configVersions.map((version) => (
                  <tr key={version.id}>
                    <td>{new Date(version.createdAt).toLocaleString("vi-VN")}</td>
                    <td>{version.user?.email ?? "-"}</td>
                    <td>{version.action}</td>
                    <td className="table-main">{version.snapshot.name}</td>
                    <td>{version.snapshot.status}</td>
                    <td>
                      <button className="button button-soft" type="button" onClick={() => rollbackVersion(version.id)} disabled={rollingBack === version.id}>
                        {rollingBack === version.id ? "Dang khoi phuc..." : "Khoi phuc"}
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6}>Chua co phien ban nao.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </article>

          <article className="panel table-panel" style={{ gridColumn: "1 / -1" }}>
            <div className="panel-head">
              <h2>Log chay tu cong cu</h2>
              <span className="badge badge-green">{detail?.toolRuns.length ?? 0} run</span>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {detail?.toolRuns.length ? (
                detail.toolRuns.map((run) => (
                  <details key={run.id} className="panel" style={{ background: "var(--panel-soft)" }}>
                    <summary style={{ cursor: "pointer", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
                      <span className="table-main">
                        {run.id.slice(0, 8)} | {run.job.workspace.name} | {run.job.account?.label ?? "-"} | {run.status}
                      </span>
                      <span className="auth-note" style={{ color: "var(--muted)" }}>
                        {new Date(run.createdAt).toLocaleString("vi-VN")}
                      </span>
                    </summary>

                    <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
                        <div>
                          <div className="metric-label">Tác vụ</div>
                          <div className="table-main">{run.job.id.slice(0, 8)}</div>
                        </div>
                        <div>
                          <div className="metric-label">Trạng thái</div>
                          <div className="table-main">{run.status}</div>
                        </div>
                        <div>
                          <div className="metric-label">Bắt đầu</div>
                          <div className="table-main">{run.startedAt ? new Date(run.startedAt).toLocaleString("vi-VN") : "-"}</div>
                        </div>
                        <div>
                          <div className="metric-label">Kết thúc</div>
                          <div className="table-main">{run.finishedAt ? new Date(run.finishedAt).toLocaleString("vi-VN") : "-"}</div>
                        </div>
                      </div>

                      {run.errorMessage ? (
                        <div style={{ color: "var(--danger)", whiteSpace: "pre-wrap" }}>
                          {run.errorMessage}
                        </div>
                      ) : null}

                      <table className="table">
                        <thead>
                          <tr>
                            <th>Thời gian</th>
                            <th>Mức</th>
                            <th>Thông điệp</th>
                            <th>Payload</th>
                          </tr>
                        </thead>
                        <tbody>
                          {run.logs.length ? (
                            run.logs.map((log) => (
                              <tr key={log.id}>
                                <td>{new Date(log.createdAt).toLocaleString("vi-VN")}</td>
                                <td>{log.level}</td>
                                <td>{log.message}</td>
                                <td style={{ maxWidth: 360, whiteSpace: "pre-wrap" }}>{log.payloadJson ?? "-"}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4}>Khong co log cho run nay.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </details>
                ))
              ) : (
                <div className="auth-note" style={{ color: "var(--muted)" }}>
                  Chua co run nao khop voi cong cu nay.
                </div>
              )}
            </div>
          </article>

          <article className="panel table-panel" style={{ gridColumn: "1 / -1" }}>
            <div className="panel-head">
              <h2>Audit log</h2>
              <span className="badge badge-green">{detail?.auditLogs.length ?? 0} mục</span>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Hành động</th>
                  <th>Workspace</th>
                  <th>Người thực hiện</th>
                </tr>
              </thead>
              <tbody>
                {detail?.auditLogs.length ? detail.auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.createdAt).toLocaleString("vi-VN")}</td>
                    <td>{log.action}</td>
                    <td>{log.workspace.name}</td>
                    <td>{log.user?.email ?? "-"}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={4}>Không có log.</td></tr>
                )}
              </tbody>
            </table>
          </article>
        </section>
      </main>
    </div>
  );
}
