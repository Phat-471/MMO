"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "../../../components/Sidebar";
import { apiRequest, syncSessionProfile } from "../../../lib/api";
import { formatJobMode, formatJobStatus, formatJobType } from "../../../lib/labels";
import { resolveToolContract, type ToolContract } from "@mmo/shared";

type JobLog = {
  id: string;
  level: string;
  message: string;
  payloadJson: string | null;
  createdAt: string;
};

type JobRun = {
  id: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  errorMessage: string | null;
  metricsJson: string | null;
  createdAt: string;
  logs?: JobLog[];
};

type JobDetail = {
  id: string;
  workspaceId: string;
  platform: string;
  jobType: string;
  mode: string;
  status: string;
  scheduleCron: string | null;
  optionsJson: string;
  accountId: string | null;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
  runs: JobRun[];
};

function parseJsonObject(value: string | null | undefined): Record<string, any> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, any>) : {};
  } catch {
    return {};
  }
}

function sortDescByCreatedAt<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function formatDateTime(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString("vi-VN") : "—";
}

function formatDuration(startedAt: string | null, finishedAt: string | null) {
  if (!startedAt || !finishedAt) return "—";
  const diffMs = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return "—";
  if (diffMs < 1000) return `${diffMs}ms`;
  return `${(diffMs / 1000).toFixed(1)}s`;
}

function badgeStyle(status: string) {
  const upper = status.toUpperCase();
  if (upper === "DONE" || upper === "SUCCESS") return { background: "rgba(16, 185, 129, 0.14)", color: "#86efac", border: "1px solid rgba(16, 185, 129, 0.25)" };
  if (upper === "FAILED" || upper === "ERROR") return { background: "rgba(239, 68, 68, 0.14)", color: "#fca5a5", border: "1px solid rgba(239, 68, 68, 0.25)" };
  if (upper === "RUNNING") return { background: "rgba(59, 130, 246, 0.14)", color: "#93c5fd", border: "1px solid rgba(59, 130, 246, 0.25)" };
  if (upper === "QUEUED") return { background: "rgba(250, 204, 21, 0.14)", color: "#fde68a", border: "1px solid rgba(250, 204, 21, 0.25)" };
  if (upper === "PAUSED") return { background: "rgba(168, 85, 247, 0.14)", color: "#d8b4fe", border: "1px solid rgba(168, 85, 247, 0.25)" };
  return { background: "rgba(255,255,255,0.06)", color: "var(--text-muted)", border: "1px solid var(--border)" };
}

function toneStyle(tone: "stable" | "beta" | "experimental" | "proxy" | "browser" | "redis" | "account") {
  if (tone === "stable") return { background: "rgba(16, 185, 129, 0.14)", color: "#86efac", border: "1px solid rgba(16, 185, 129, 0.25)" };
  if (tone === "beta") return { background: "rgba(59, 130, 246, 0.14)", color: "#93c5fd", border: "1px solid rgba(59, 130, 246, 0.25)" };
  if (tone === "experimental") return { background: "rgba(250, 204, 21, 0.14)", color: "#fde68a", border: "1px solid rgba(250, 204, 21, 0.25)" };
  return { background: "rgba(255,255,255,0.06)", color: "var(--text-muted)", border: "1px solid var(--border)" };
}

function getContract(jobType: string | null | undefined): ToolContract | null {
  if (!jobType) return null;
  return resolveToolContract("SHOPEE", jobType) ?? null;
}

function buildOptionsPreview(job: JobDetail) {
  const options = parseJsonObject(job.optionsJson);
  return JSON.stringify(options, null, 2);
}

export default function ShopeeAffJobDetailPage() {
  const router = useRouter();
  const params = useParams<{ jobId: string }>();
  const jobId = params?.jobId ?? "";

  const [verified, setVerified] = useState(false);
  const [workspaceId, setWorkspaceId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [job, setJob] = useState<JobDetail | null>(null);
  const [runs, setRuns] = useState<JobRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [message, setMessage] = useState("Đang tải chi tiết cấu hình...");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const selectedRun = useMemo(() => runs.find((run) => run.id === selectedRunId) ?? runs[0] ?? null, [runs, selectedRunId]);
  const selectedContract = useMemo(() => getContract(job?.jobType), [job]);
  const selectedMetrics = useMemo(() => (selectedRun ? parseJsonObject(selectedRun.metricsJson) : {}), [selectedRun]);
  const selectedRenderPlan = useMemo(() => {
    const data = selectedMetrics && typeof selectedMetrics === "object" ? (selectedMetrics as Record<string, any>).data : null;
    return data && typeof data === "object" ? ((data as Record<string, any>).renderPlan ?? null) : null;
  }, [selectedMetrics]);
  const selectedRenderOutput = useMemo(() => {
    const data = selectedMetrics && typeof selectedMetrics === "object" ? (selectedMetrics as Record<string, any>).data : null;
    return data && typeof data === "object" ? ((data as Record<string, any>).renderOutput ?? null) : null;
  }, [selectedMetrics]);

  async function loadData(nextSelectedRunId?: string | null) {
    try {
      const [jobRes, runsRes] = await Promise.all([
        apiRequest<JobDetail>(`/jobs/${jobId}`),
        apiRequest<JobRun[]>(`/jobs/${jobId}/runs`)
      ]);

      const nextJob = {
        ...jobRes.data,
        runs: sortDescByCreatedAt(jobRes.data.runs ?? [])
      };
      const nextRuns = sortDescByCreatedAt(runsRes.data);

      setJob(nextJob);
      setRuns(nextRuns);
      setSelectedRunId(nextSelectedRunId ?? nextRuns[0]?.id ?? null);
      setMessage("Đã tải chi tiết cấu hình.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tải chi tiết cấu hình.");
    }
  }

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const session = await syncSessionProfile();
      if (!mounted) return;

      if (!session) {
        router.push("/dang-nhap");
        return;
      }

      setUserEmail(session.email);
      setUserRole(session.role);
      setWorkspaceId(session.workspaceId);
      setVerified(true);

      if (jobId) {
        await loadData();
      }
    };

    void init();
    return () => {
      mounted = false;
    };
  }, [jobId, router]);

  async function runJob() {
    if (!job) return;
    setBusyAction("run");
    try {
      const response = await apiRequest(`/jobs/${job.id}/run`, { method: "POST" });
      setMessage(response.message);
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể chạy cấu hình.");
    } finally {
      setBusyAction(null);
    }
  }

  async function pauseJob() {
    if (!job) return;
    setBusyAction("pause");
    try {
      const response = await apiRequest(`/jobs/${job.id}/pause`, { method: "POST" });
      setMessage(response.message);
      await loadData(selectedRunId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tạm dừng.");
    } finally {
      setBusyAction(null);
    }
  }

  async function resumeJob() {
    if (!job) return;
    setBusyAction("resume");
    try {
      const response = await apiRequest(`/jobs/${job.id}/resume`, { method: "POST" });
      setMessage(response.message);
      await loadData(selectedRunId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể khôi phục.");
    } finally {
      setBusyAction(null);
    }
  }

  async function retryRun(runId: string) {
    if (!job) return;
    setBusyAction(runId);
    try {
      const response = await apiRequest<JobRun>(`/job-runs/${runId}/retry`, { method: "POST" });
      setMessage(response.message);
      await loadData(response.data.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể retry run.");
    } finally {
      setBusyAction(null);
    }
  }

  if (!verified) {
    return (
      <div className="auth-shell">
        <div className="pulse" style={{ color: "var(--primary)", fontWeight: 700 }}>
          Đang tải chi tiết cấu hình...
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="bg-grid" />
      <Sidebar userEmail={userEmail} workspaceId={workspaceId} userRole={userRole} />

      <main className="main">
        <header className="topbar">
          <div>
            <h1>Shopee config detail</h1>
            <p>Một trang riêng cho từng cấu hình để share link và kiểm tra run/log nhanh hơn.</p>
          </div>

          <div className="topbar-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link className="button button-soft" href="/shopee-aff">
              Quay lại dashboard
            </Link>
            <button type="button" className="button button-soft" onClick={() => loadData(selectedRunId)}>
              Làm mới
            </button>
            {job?.status === "PAUSED" ? (
              <button type="button" className="button button-primary" onClick={resumeJob} disabled={busyAction !== null}>
                {busyAction === "resume" ? "Đang khôi phục..." : "Khôi phục"}
              </button>
            ) : (
              <button type="button" className="button button-soft" onClick={pauseJob} disabled={busyAction !== null}>
                {busyAction === "pause" ? "Đang tạm dừng..." : "Tạm dừng"}
              </button>
            )}
            <button type="button" className="button button-primary" onClick={runJob} disabled={busyAction === "run"}>
              {busyAction === "run" ? "Đang chạy..." : "Chạy ngay"}
            </button>
          </div>
        </header>

        {message ? (
          <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: 16, border: "1px solid rgba(139, 92, 246, 0.3)", background: "rgba(139, 92, 246, 0.12)", color: "#e9d5ff", fontWeight: 600 }}>
            {message}
          </div>
        ) : null}

        <section className="metric-grid">
          <article className="metric-card"><div className="metric-label">Trạng thái</div><div className="metric-value">{job ? formatJobStatus(job.status) : "-"}</div></article>
          <article className="metric-card"><div className="metric-label">Loại</div><div className="metric-value">{job ? formatJobType(job.jobType) : "-"}</div></article>
          <article className="metric-card"><div className="metric-label">Chế độ</div><div className="metric-value">{job ? formatJobMode(job.mode) : "-"}</div></article>
          <article className="metric-card"><div className="metric-label">Runs</div><div className="metric-value">{runs.length}</div></article>
        </section>

        <div className="content-grid" style={{ gridTemplateColumns: "1.05fr 0.95fr", gap: 20, marginTop: 20 }}>
          <div className="panel" style={{ padding: 24 }}>
            <div className="panel-head" style={{ marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0 }}>{job ? parseJsonObject(job.optionsJson).title ?? job.id.slice(0, 8) : "Chi tiết cấu hình"}</h2>
                <p style={{ marginTop: 6, color: "var(--text-muted)" }}>{job ? formatJobType(job.jobType) : "-"}</p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {job ? <span className="badge" style={badgeStyle(job.status)}>{formatJobStatus(job.status)}</span> : null}
                {selectedContract ? <span className="badge" style={toneStyle(selectedContract.stage)}>{selectedContract.stage}</span> : null}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
              <div style={{ padding: 12, borderRadius: 14, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }}>
                <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Tạo lúc</div>
                <div style={{ fontWeight: 700 }}>{formatDateTime(job?.createdAt)}</div>
              </div>
              <div style={{ padding: 12, borderRadius: 14, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }}>
                <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Cập nhật lúc</div>
                <div style={{ fontWeight: 700 }}>{formatDateTime(job?.updatedAt)}</div>
              </div>
              <div style={{ padding: 12, borderRadius: 14, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }}>
                <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Lần chạy cuối</div>
                <div style={{ fontWeight: 700 }}>{formatDateTime(job?.lastRunAt)}</div>
              </div>
              <div style={{ padding: 12, borderRadius: 14, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }}>
                <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Lần chạy kế tiếp</div>
                <div style={{ fontWeight: 700 }}>{formatDateTime(job?.nextRunAt)}</div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
              <Link className="button button-soft" href={`/shopee-aff?jobId=${job?.id ?? ""}`}>
                Mở dashboard
              </Link>
              <button type="button" className="button button-soft" onClick={() => job && runJob()} disabled={busyAction === "run"}>
                {busyAction === "run" ? "Đang chạy..." : "Chạy ngay"}
              </button>
              <button type="button" className="button button-soft" onClick={() => job && loadData(selectedRunId)}>
                Tải lại
              </button>
            </div>
          </div>

          <div className="panel" style={{ padding: 24 }}>
            <div className="panel-head" style={{ marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>Metadata</h2>
            </div>
            {selectedContract ? (
              <div style={{ display: "grid", gap: 14 }}>
                <div><strong>Code:</strong> {selectedContract.code}</div>
                <div><strong>Stage:</strong> {selectedContract.stage}</div>
                <div><strong>Category:</strong> {selectedContract.category}</div>
                <div><strong>Runtime:</strong> {selectedContract.requiredRuntime?.join(", ") || "—"}</div>
                <div>
                  <strong>Input:</strong>
                  <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                    {selectedContract.input.map((input) => (
                      <div key={input.key} style={{ padding: 12, borderRadius: 14, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <strong>{input.key}</strong>
                          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{input.type}</span>
                        </div>
                        <div style={{ color: "var(--text-dim)", marginTop: 6, fontSize: 13 }}>{input.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)", margin: 0 }}>Không tìm thấy metadata contract cho job này.</p>
            )}
          </div>
        </div>

        <div className="content-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 20 }}>
          <div className="panel" style={{ padding: 24 }}>
            <div className="panel-head" style={{ marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>Options JSON</h2>
            </div>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", color: "var(--text-dim)" }}>
              {buildOptionsPreview(job ?? null as any)}
            </pre>
          </div>

          <div className="panel" style={{ padding: 24 }}>
            <div className="panel-head" style={{ marginBottom: 16 }}>
              <h2 style={{ margin: 0 }}>Kết quả run gần nhất</h2>
            </div>
            {selectedRun ? (
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                  <div style={{ padding: 12, borderRadius: 14, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }}>
                    <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Trạng thái</div>
                    <div><span className="badge" style={badgeStyle(selectedRun.status)}>{formatJobStatus(selectedRun.status)}</span></div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 14, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }}>
                    <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Bắt đầu</div>
                    <div style={{ fontWeight: 700 }}>{formatDateTime(selectedRun.startedAt)}</div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 14, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }}>
                    <div style={{ color: "var(--text-muted)", fontSize: 12 }}>Thời gian</div>
                    <div style={{ fontWeight: 700 }}>{formatDuration(selectedRun.startedAt, selectedRun.finishedAt)}</div>
                  </div>
                </div>

                <div style={{ padding: 12, borderRadius: 14, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }}>
                  <div style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 8 }}>Note / error</div>
                  <div>{selectedRun.status === "DONE" ? String(selectedMetrics.note ?? "Hoàn thành") : selectedRun.errorMessage ?? "—"}</div>
                </div>

                {selectedRenderPlan ? (
                  <div style={{ padding: 12, borderRadius: 14, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }}>
                    <div style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 8 }}>Render plan</div>
                    <div style={{ display: "grid", gap: 10 }}>
                      <div><strong>Source:</strong> {String((selectedRenderPlan as Record<string, any>).sourceType ?? "—")}</div>
                      <div><strong>Template:</strong> {String((selectedRenderPlan as Record<string, any>).templateId ?? "—")}</div>
                      <div><strong>Duration:</strong> {String((selectedRenderPlan as Record<string, any>).durationSeconds ?? "—")}s</div>
                      <div><strong>Assets:</strong> {JSON.stringify((selectedRenderPlan as Record<string, any>).assetSummary ?? {}, null, 2)}</div>
                      <div>
                        <strong>Steps:</strong>
                        <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                          {Array.isArray((selectedRenderPlan as Record<string, any>).editSteps)
                            ? (selectedRenderPlan as Record<string, any>).editSteps.map((step: Record<string, any>) => (
                                <div key={String(step.step)} style={{ padding: 10, borderRadius: 12, border: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
                                  <strong>{String(step.step)}</strong>
                                  <div style={{ color: "var(--text-dim)", marginTop: 4 }}>{String(step.description ?? "")}</div>
                                </div>
                              ))
                            : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {selectedRenderOutput ? (
                  <div style={{ padding: 12, borderRadius: 14, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }}>
                    <div style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 8 }}>Render output</div>
                    <div style={{ display: "grid", gap: 8 }}>
                      <div><strong>Status:</strong> {String((selectedRenderOutput as Record<string, any>).status ?? "—")}</div>
                      <div><strong>Engine:</strong> {String((selectedRenderOutput as Record<string, any>).engine ?? "—")}</div>
                      <div><strong>Format:</strong> {String((selectedRenderOutput as Record<string, any>).format ?? "—")}</div>
                      <div style={{ wordBreak: "break-word" }}><strong>Preview HTML:</strong> {String((selectedRenderOutput as Record<string, any>).previewHtmlPath ?? "—")}</div>
                      <div style={{ wordBreak: "break-word" }}><strong>Video file:</strong> {String((selectedRenderOutput as Record<string, any>).artifactPath ?? "—")}</div>
                      <div style={{ wordBreak: "break-word" }}><strong>Video URL:</strong> {String((selectedRenderOutput as Record<string, any>).artifactUrl ?? "—")}</div>
                      <div style={{ color: "var(--text-dim)" }}>{String((selectedRenderOutput as Record<string, any>).message ?? "")}</div>
                    </div>
                  </div>
                ) : null}

                <div style={{ padding: 12, borderRadius: 14, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }}>
                  <div style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 8 }}>Metrics</div>
                  <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {JSON.stringify(selectedMetrics, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)", margin: 0 }}>Chưa có run nào.</p>
            )}
          </div>
        </div>

        <div className="panel" style={{ padding: 24, marginTop: 20 }}>
          <div className="panel-head" style={{ marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Lịch sử chạy</h2>
          </div>
          {runs.length === 0 ? (
            <p style={{ color: "var(--text-muted)", margin: 0 }}>Config này chưa có run nào.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Run</th>
                    <th>Trạng thái</th>
                    <th>Bắt đầu</th>
                    <th>Kết thúc</th>
                    <th>Thời gian</th>
                    <th>Kết quả</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id} onClick={() => setSelectedRunId(run.id)} style={{ cursor: "pointer", background: selectedRunId === run.id ? "rgba(139, 92, 246, 0.06)" : "transparent" }}>
                      <td className="table-main">{run.id.slice(0, 8)}</td>
                      <td><span className="badge" style={badgeStyle(run.status)}>{formatJobStatus(run.status)}</span></td>
                      <td>{formatDateTime(run.startedAt)}</td>
                      <td>{formatDateTime(run.finishedAt)}</td>
                      <td>{formatDuration(run.startedAt, run.finishedAt)}</td>
                      <td style={{ maxWidth: 280, whiteSpace: "normal" }}>
                        {run.status === "DONE" ? String(parseJsonObject(run.metricsJson).note ?? "Hoàn thành") : run.errorMessage ?? "—"}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button type="button" className="button button-soft" onClick={(event) => { event.stopPropagation(); setSelectedRunId(run.id); }}>
                            Xem logs
                          </button>
                          {run.status === "FAILED" ? (
                            <button type="button" className="button button-soft" onClick={(event) => { event.stopPropagation(); void retryRun(run.id); }} disabled={busyAction === run.id}>
                              {busyAction === run.id ? "Đang retry..." : "Retry"}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel" style={{ padding: 24, marginTop: 20 }}>
          <div className="panel-head" style={{ marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Logs chi tiết</h2>
          </div>
          {!selectedRun ? (
            <p style={{ color: "var(--text-muted)", margin: 0 }}>Chọn một run để xem log.</p>
          ) : selectedRun.logs && selectedRun.logs.length > 0 ? (
            <div style={{ display: "grid", gap: 10 }}>
              {selectedRun.logs.map((log) => (
                <div key={log.id} style={{ padding: 12, borderRadius: 14, border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <strong>{log.level.toUpperCase()}</strong>
                    <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{formatDateTime(log.createdAt)}</span>
                  </div>
                  <div style={{ marginTop: 8 }}>{log.message}</div>
                  {log.payloadJson ? (
                    <pre style={{ marginTop: 10, marginBottom: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", color: "var(--text-dim)" }}>{log.payloadJson}</pre>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "var(--text-muted)", margin: 0 }}>Run này chưa có log.</p>
          )}
        </div>
      </main>
    </div>
  );
}
