"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest, syncSessionProfile } from "../../../../lib/api";
import { formatJobMode, formatJobStatus, formatJobType, formatPlatform } from "../../../../lib/labels";
import AdminSidebar from "../../admin-sidebar";

type JobDetail = {
  id: string;
  platform: string;
  jobType: string;
  mode: string;
  status: string;
  scheduleCron: string | null;
  optionsJson: string;
  createdAt: string;
  updatedAt: string;
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
  runs: Array<{
    id: string;
    status: string;
    startedAt: string | null;
    finishedAt: string | null;
    errorMessage: string | null;
    metricsJson: string | null;
    createdAt: string;
    logs: Array<{
      id: string;
      level: string;
      message: string;
      payloadJson: string | null;
      createdAt: string;
    }>;
  }>;
};

export default function AdminJobDetailClient({ jobId }: { jobId: string }) {
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [message, setMessage] = useState("Đang tải chi tiết tác vụ...");
  const [status, setStatus] = useState("DRAFT");
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  async function loadDetail() {
    const session = await syncSessionProfile();
    if (!session || session.role !== "ADMIN") {
      setMessage("Cần quyền admin.");
      return;
    }

    try {
      const res = await apiRequest<JobDetail>(`/admin/jobs/${jobId}/detail`);
      setDetail(res.data);
      setStatus(res.data.status);
      setMessage("Đã tải chi tiết tác vụ.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tải chi tiết tác vụ.");
    }
  }

  useEffect(() => {
    void loadDetail();
  }, [jobId]);

  async function saveJobStatus() {
    setSaving(true);
    try {
      const res = await apiRequest<JobDetail>(`/admin/jobs/${jobId}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      setDetail((current) => (current ? { ...current, status } : current));
      setMessage(res.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the cap nhat tac vu.");
    } finally {
      setSaving(false);
    }
  }

  async function pauseJob() {
    setBusyAction("pause");
    try {
      const res = await apiRequest(`/admin/jobs/${jobId}/pause`, { method: "POST" });
      setMessage(res.message);
      await loadDetail();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the tam dung tac vu.");
    } finally {
      setBusyAction(null);
    }
  }

  async function resumeJob() {
    setBusyAction("resume");
    try {
      const res = await apiRequest(`/admin/jobs/${jobId}/resume`, { method: "POST" });
      setMessage(res.message);
      await loadDetail();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the tiep tuc tac vu.");
    } finally {
      setBusyAction(null);
    }
  }

  async function retryRun(runId: string) {
    setBusyAction(runId);
    try {
      const res = await apiRequest(`/admin/job-runs/${runId}/retry`, { method: "POST" });
      setMessage(res.message);
      await loadDetail();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the retry lan chay.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="app-shell">
      <AdminSidebar title="Admin" subtitle="Chi tiết tác vụ" />

      <main className="main">
        <header className="topbar">
          <div>
            <h1>{detail ? detail.id.slice(0, 8) : "Chi tiết tác vụ"}</h1>
            <p>{message}</p>
          </div>
          <div className="topbar-actions">
            <button className="button button-ghost" type="button" onClick={loadDetail}>
              Tải lại
            </button>
            {detail?.status === "PAUSED" ? (
              <button className="button button-primary" type="button" onClick={resumeJob} disabled={busyAction !== null}>
                {busyAction === "resume" ? "Đang tiếp tục..." : "Tiếp tục"}
              </button>
            ) : (
              <button className="button button-soft" type="button" onClick={pauseJob} disabled={busyAction !== null}>
                {busyAction === "pause" ? "Đang tạm dừng..." : "Tạm dừng"}
              </button>
            )}
          </div>
        </header>

        <section className="metric-grid">
          <article className="metric-card"><div className="metric-label">Trạng thái</div><div className="metric-value">{detail ? formatJobStatus(detail.status) : "-"}</div></article>
          <article className="metric-card"><div className="metric-label">Nền tảng</div><div className="metric-value">{detail ? formatPlatform(detail.platform) : "-"}</div></article>
          <article className="metric-card"><div className="metric-label">Loại</div><div className="metric-value">{detail ? formatJobType(detail.jobType) : "-"}</div></article>
          <article className="metric-card"><div className="metric-label">Lần chạy</div><div className="metric-value">{detail?.runs.length ?? 0}</div></article>
        </section>

        <section className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-head">
            <h2>Hành động</h2>
            <button className="button button-primary" type="button" onClick={saveJobStatus} disabled={saving || !detail}>
              {saving ? "Đang lưu..." : "Lưu trạng thái"}
            </button>
          </div>
          <label className="field" style={{ maxWidth: 320 }}>
            <span>Cập nhật trạng thái tác vụ</span>
            <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="DRAFT">DRAFT</option>
              <option value="QUEUED">QUEUED</option>
              <option value="RUNNING">RUNNING</option>
              <option value="PAUSED">PAUSED</option>
              <option value="DONE">DONE</option>
              <option value="FAILED">FAILED</option>
            </select>
          </label>
        </section>

        <section className="content-grid">
          <article className="panel table-panel">
            <div className="panel-head"><h2>Thông tin</h2></div>
            <table className="table">
              <tbody>
                <tr><td className="table-main">Workspace</td><td>{detail?.workspace.name ?? "-"}</td></tr>
                <tr><td className="table-main">Owner</td><td>{detail?.workspace.owner.email ?? "-"}</td></tr>
                <tr><td className="table-main">Account</td><td>{detail?.account?.label ?? "-"}</td></tr>
                <tr><td className="table-main">Người tạo</td><td>{detail?.createdBy?.email ?? "-"}</td></tr>
                <tr><td className="table-main">Lệnh cron</td><td>{detail?.scheduleCron ?? "-"}</td></tr>
                <tr>
                  <td className="table-main">Options</td>
                  <td><pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{detail?.optionsJson ?? "{}"}</pre></td>
                </tr>
              </tbody>
            </table>
          </article>

          <article className="panel table-panel">
            <div className="panel-head">
              <h2>Lần chạy gan nhat</h2>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Trạng thái</th>
                  <th>Bắt đầu</th>
                  <th>Kết thúc</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {detail?.runs.length ? detail.runs.map((run) => (
                  <tr key={run.id}>
                    <td className="table-main">{run.id.slice(0, 8)}</td>
                    <td>{formatJobStatus(run.status)}</td>
                    <td>{run.startedAt ? new Date(run.startedAt).toLocaleString("vi-VN") : "-"}</td>
                    <td>{run.finishedAt ? new Date(run.finishedAt).toLocaleString("vi-VN") : "-"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Link className="button button-soft" href={`/admin/job-runs/${run.id}`}>
                          Mở run
                        </Link>
                        {run.status === "FAILED" ? (
                          <button className="button button-soft" type="button" onClick={() => retryRun(run.id)} disabled={busyAction === run.id}>
                            {busyAction === run.id ? "Đang retry..." : "Retry"}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )) : <tr><td colSpan={5}>Không có lần chạy.</td></tr>}
              </tbody>
            </table>
          </article>

          <article className="panel table-panel" style={{ gridColumn: "1 / -1" }}>
            <div className="panel-head"><h2>Log</h2></div>
            <table className="table">
              <thead>
                <tr>
                  <th>Lần chạy</th>
                  <th>Thời gian</th>
                  <th>Mức</th>
                  <th>Thông điệp</th>
                </tr>
              </thead>
              <tbody>
                {detail?.runs.flatMãp((run) => run.logs.map((log) => (
                  <tr key={log.id}>
                    <td className="table-main">{run.id.slice(0, 8)}</td>
                    <td>{new Date(log.createdAt).toLocaleString("vi-VN")}</td>
                    <td>{log.level}</td>
                    <td>
                      <div>{log.message}</div>
                      {log.payloadJson ? <pre style={{ margin: "8px 0 0", whiteSpace: "pre-wrap" }}>{log.payloadJson}</pre> : null}
                    </td>
                  </tr>
                )))}
                {detail && detail.runs.every((run) => run.logs.length === 0) ? (
                  <tr><td colSpan={4}>Không có log.</td></tr>
                ) : null}
              </tbody>
            </table>
          </article>
        </section>
      </main>
    </div>
  );
}
