"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiRequest, loadSession } from "../../../lib/api";
import { formatJobMode, formatJobStatus, formatJobType, formatPlatform } from "../../../lib/labels";

type JobDetail = {
  id: string;
  platform: string;
  jobType: string;
  mode: string;
  status: string;
  scheduleCron: string | null;
  optionsJson: string;
  accountId: string | null;
  createdAt: string;
  updatedAt: string;
  runs: Array<{
    id: string;
    status: string;
    startedAt: string | null;
    finishedAt: string | null;
    errorMessage: string | null;
    createdAt: string;
  }>;
};

type RunDetail = {
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
};

export default function JobDetailClient({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<JobDetail | null>(null);
  const [runs, setRuns] = useState<RunDetail[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<RunDetail | null>(null);
  const [message, setMessage] = useState("Đang tải chi tiết tác vụ...");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  async function loadData(nextSelectedRunId?: string | null) {
    const session = loadSession();
    if (!session) {
      setMessage("Bạn cần đăng nhập trước khi xem chi tiết tác vụ.");
      return;
    }

    try {
      const [jobRes, runsRes] = await Promise.all([
        apiRequest<JobDetail>(`/jobs/${jobId}`),
        apiRequest<RunDetail[]>(`/jobs/${jobId}/runs`)
      ]);
      setJob(jobRes.data);
      setRuns(runsRes.data);

      const resolvedSelectedRunId = nextSelectedRunId ?? runsRes.data[0]?.id ?? null;
      setSelectedRunId(resolvedSelectedRunId);
      setSelectedRun(resolvedSelectedRunId ? runsRes.data.find((run) => run.id === resolvedSelectedRunId) ?? runsRes.data[0] ?? null : runsRes.data[0] ?? null);
      setMessage("Đã tải chi tiết tác vụ.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tải chi tiết tác vụ.");
    }
  }

  useEffect(() => {
    void loadData();
  }, [jobId]);

  const selectedRunLabel = useMemo(() => {
    if (!selectedRun) {
      return "Chưa có lần chạy nào.";
    }
    return `${selectedRun.status} | ${new Date(selectedRun.createdAt).toLocaleString("vi-VN")}`;
  }, [selectedRun]);

  async function runJob() {
    setBusyAction("run");
    try {
      await apiRequest(`/jobs/${jobId}/run`, {
        method: "POST"
      });
      setMessage("Đã đưa tác vụ vào hàng đợi.");
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể chạy tác vụ.");
    } finally {
      setBusyAction(null);
    }
  }

  async function pauseJob() {
    setBusyAction("pause");
    try {
      const res = await apiRequest(`/jobs/${jobId}/pause`, { method: "POST" });
      setMessage(res.message);
      await loadData(selectedRunId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tạm dừng tác vụ.");
    } finally {
      setBusyAction(null);
    }
  }

  async function resumeJob() {
    setBusyAction("resume");
    try {
      const res = await apiRequest(`/jobs/${jobId}/resume`, { method: "POST" });
      setMessage(res.message);
      await loadData(selectedRunId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tiếp tục tác vụ.");
    } finally {
      setBusyAction(null);
    }
  }

  async function selectRun(runId: string) {
    const res = await apiRequest<RunDetail>(`/job-runs/${runId}`);
    setSelectedRunId(runId);
    setSelectedRun(res.data);
  }

  async function retryRun(runId: string) {
    if (!runId) {
      return;
    }

    setBusyAction(runId);
    try {
      const res = await apiRequest<RunDetail>(`/job-runs/${runId}/retry`, {
        method: "POST"
      });
      setMessage(res.message);
      await loadData(res.data.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể retry lần chạy.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">MMO</div>
          <div>
            <div className="brand-title">Chi tiết tác vụ</div>
            <div className="brand-sub">Xem job, run, log</div>
          </div>
        </div>

        <nav className="nav">
          <Link className="nav-item" href="/">Bảng điều khiển</Link>
          <Link className="nav-item" href="/cong-cu">Công cụ</Link>
          <Link className="nav-item active" href="/tao-tac-vu">Tạo tác vụ</Link>
          <Link className="nav-item" href="/thanh-toan">Thanh toán</Link>
          <Link className="nav-item" href="/admin">Admin Hub</Link>
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>Chi tiết tác vụ</h1>
            <p>Job, lần chạy và log được hiển thị trong một màn.</p>
          </div>
          <div className="topbar-actions">
            <button className="button button-ghost" type="button" onClick={() => loadData()}>
              Tải lại
            </button>
            {job?.status === "PAUSED" ? (
              <button className="button button-primary" type="button" onClick={resumeJob} disabled={busyAction !== null}>
                {busyAction === "resume" ? "Đang tiếp tục..." : "Tiếp tục"}
              </button>
            ) : (
              <button className="button button-soft" type="button" onClick={pauseJob} disabled={busyAction !== null}>
                {busyAction === "pause" ? "Đang tạm dừng..." : "Tạm dừng"}
              </button>
            )}
            <button className="button button-primary" type="button" onClick={runJob} disabled={busyAction === "run"}>
              {busyAction === "run" ? "Đang chạy..." : "Chạy lại"}
            </button>
          </div>
        </header>

        <div className="auth-note" style={{ color: "var(--muted)", marginBottom: 16 }}>{message}</div>

        <section className="metric-grid">
          <article className="metric-card"><div className="metric-label">Mã job</div><div className="metric-value">{job?.id.slice(0, 8) ?? "-"}</div></article>
          <article className="metric-card"><div className="metric-label">Nền tảng</div><div className="metric-value">{job ? formatPlatform(job.platform) : "-"}</div></article>
          <article className="metric-card"><div className="metric-label">Loại</div><div className="metric-value">{job ? formatJobType(job.jobType) : "-"}</div></article>
          <article className="metric-card"><div className="metric-label">Trạng thái</div><div className="metric-value">{job ? formatJobStatus(job.status) : "-"}</div></article>
        </section>

        <section className="content-grid">
          <article className="panel table-panel">
            <div className="panel-head">
              <h2>Thông tin job</h2>
              <span className="badge badge-green">{job ? formatJobMode(job.mode) : "-"}</span>
            </div>
            <table className="table">
              <tbody>
                <tr><td className="table-main">Lệnh cron</td><td>{job?.scheduleCron ?? "-"}</td></tr>
                <tr><td className="table-main">Tài khoản</td><td>{job?.accountId ?? "-"}</td></tr>
                <tr><td className="table-main">Tạo lúc</td><td>{job ? new Date(job.createdAt).toLocaleString("vi-VN") : "-"}</td></tr>
                <tr><td className="table-main">Cập nhật lúc</td><td>{job ? new Date(job.updatedAt).toLocaleString("vi-VN") : "-"}</td></tr>
                <tr><td className="table-main">Options</td><td><pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{job?.optionsJson ?? "{}"}</pre></td></tr>
              </tbody>
            </table>
          </article>

          <article className="panel table-panel">
            <div className="panel-head">
              <h2>Lần chạy</h2>
              <span className="badge badge-green">{runs.length} mục</span>
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
                {runs.length ? runs.map((run) => (
                  <tr key={run.id}>
                    <td className="table-main">{run.id.slice(0, 8)}</td>
                    <td>{formatJobStatus(run.status)}</td>
                    <td>{run.startedAt ? new Date(run.startedAt).toLocaleString("vi-VN") : "-"}</td>
                    <td>{run.finishedAt ? new Date(run.finishedAt).toLocaleString("vi-VN") : "-"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button className="button button-soft" type="button" onClick={() => selectRun(run.id)}>
                          Xem log
                        </button>
                        {run.status === "FAILED" ? (
                          <button className="button button-soft" type="button" onClick={() => retryRun(run.id)} disabled={busyAction === run.id}>
                            {busyAction === run.id ? "Đang retry..." : "Retry"}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5}>Chưa có lần chạy nào.</td></tr>
                )}
              </tbody>
            </table>
          </article>

          <article className="panel table-panel" style={{ gridColumn: "1 / -1" }}>
            <div className="panel-head">
              <h2>Log lần chạy</h2>
              <span className="badge badge-green">{selectedRunLabel}</span>
              {selectedRun?.status === "FAILED" ? (
                <button className="button button-soft" type="button" onClick={() => retryRun(selectedRun.id)} disabled={busyAction === selectedRun.id}>
                  {busyAction === selectedRun.id ? "Đang retry..." : "Retry run này"}
                </button>
              ) : null}
            </div>

            {selectedRun ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Mức</th>
                    <th>Thông điệp</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRun.logs.length ? selectedRun.logs.map((log) => (
                    <tr key={log.id}>
                      <td>{new Date(log.createdAt).toLocaleString("vi-VN")}</td>
                      <td>{log.level}</td>
                      <td>
                        <div>{log.message}</div>
                        {log.payloadJson ? <pre style={{ margin: "8px 0 0", whiteSpace: "pre-wrap" }}>{log.payloadJson}</pre> : null}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={3}>Lần chạy này chưa có log.</td></tr>
                  )}
                </tbody>
              </table>
            ) : (
              <div className="auth-note" style={{ color: "var(--muted)" }}>Chọn một lần chạy để xem log.</div>
            )}
          </article>
        </section>
      </main>
    </div>
  );
}
