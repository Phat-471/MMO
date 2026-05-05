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
  const [message, setMessage] = useState("Dang tai chi tiet tac vu...");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  async function loadData(nextSelectedRunId?: string | null) {
    const session = loadSession();
    if (!session) {
      setMessage("Ban can dang nhap truoc khi xem chi tiet tac vu.");
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
      setMessage("Da tai chi tiet tac vu.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the tai chi tiet tac vu.");
    }
  }

  useEffect(() => {
    void loadData();
  }, [jobId]);

  const selectedRunLabel = useMemo(() => {
    if (!selectedRun) {
      return "Chua co lan chay nao.";
    }
    return `${selectedRun.status} | ${new Date(selectedRun.createdAt).toLocaleString("vi-VN")}`;
  }, [selectedRun]);

  async function runJob() {
    setBusyAction("run");
    try {
      await apiRequest(`/jobs/${jobId}/run`, {
        method: "POST"
      });
      setMessage("Da dua tac vu vao hang doi.");
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the chay tac vu.");
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
      setMessage(error instanceof Error ? error.message : "Khong the tam dung tac vu.");
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
      setMessage(error instanceof Error ? error.message : "Khong the tiep tuc tac vu.");
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
      setMessage(error instanceof Error ? error.message : "Khong the retry lan chay.");
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
            <div className="brand-title">Chi tiet tac vu</div>
            <div className="brand-sub">Xem job, run, log</div>
          </div>
        </div>

        <nav className="nav">
          <Link className="nav-item" href="/">Bang dieu khien</Link>
          <Link className="nav-item" href="/cong-cu">Cong cu</Link>
          <Link className="nav-item active" href="/tao-tac-vu">Tao tac vu</Link>
          <Link className="nav-item" href="/thanh-toan">Thanh toan</Link>
          <Link className="nav-item" href="/admin">Admin</Link>
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>Chi tiet tac vu</h1>
            <p>Job, lan chay va log duoc hien thi trong mot man.</p>
          </div>
          <div className="topbar-actions">
            <button className="button button-ghost" type="button" onClick={() => loadData()}>
              Tai lai
            </button>
            {job?.status === "PAUSED" ? (
              <button className="button button-primary" type="button" onClick={resumeJob} disabled={busyAction !== null}>
                {busyAction === "resume" ? "Dang tiep tuc..." : "Tiep tuc"}
              </button>
            ) : (
              <button className="button button-soft" type="button" onClick={pauseJob} disabled={busyAction !== null}>
                {busyAction === "pause" ? "Dang tam dung..." : "Tam dung"}
              </button>
            )}
            <button className="button button-primary" type="button" onClick={runJob} disabled={busyAction === "run"}>
              {busyAction === "run" ? "Dang chay..." : "Chay lai"}
            </button>
          </div>
        </header>

        <div className="auth-note" style={{ color: "var(--muted)", marginBottom: 16 }}>{message}</div>

        <section className="metric-grid">
          <article className="metric-card"><div className="metric-label">Ma job</div><div className="metric-value">{job?.id.slice(0, 8) ?? "-"}</div></article>
          <article className="metric-card"><div className="metric-label">Nen tang</div><div className="metric-value">{job ? formatPlatform(job.platform) : "-"}</div></article>
          <article className="metric-card"><div className="metric-label">Loai</div><div className="metric-value">{job ? formatJobType(job.jobType) : "-"}</div></article>
          <article className="metric-card"><div className="metric-label">Trang thai</div><div className="metric-value">{job ? formatJobStatus(job.status) : "-"}</div></article>
        </section>

        <section className="content-grid">
          <article className="panel table-panel">
            <div className="panel-head">
              <h2>Thong tin job</h2>
              <span className="badge badge-green">{job ? formatJobMode(job.mode) : "-"}</span>
            </div>
            <table className="table">
              <tbody>
                <tr><td className="table-main">Lenh cron</td><td>{job?.scheduleCron ?? "-"}</td></tr>
                <tr><td className="table-main">Account</td><td>{job?.accountId ?? "-"}</td></tr>
                <tr><td className="table-main">Tao luc</td><td>{job ? new Date(job.createdAt).toLocaleString("vi-VN") : "-"}</td></tr>
                <tr><td className="table-main">Cap nhat luc</td><td>{job ? new Date(job.updatedAt).toLocaleString("vi-VN") : "-"}</td></tr>
                <tr><td className="table-main">Options</td><td><pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{job?.optionsJson ?? "{}"}</pre></td></tr>
              </tbody>
            </table>
          </article>

          <article className="panel table-panel">
            <div className="panel-head">
              <h2>Lan chay</h2>
              <span className="badge badge-green">{runs.length} muc</span>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Ma</th>
                  <th>Trang thai</th>
                  <th>Bat dau</th>
                  <th>Ket thuc</th>
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
                            {busyAction === run.id ? "Dang retry..." : "Retry"}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5}>Chua co lan chay nao.</td></tr>
                )}
              </tbody>
            </table>
          </article>

          <article className="panel table-panel" style={{ gridColumn: "1 / -1" }}>
            <div className="panel-head">
              <h2>Log lan chay</h2>
              <span className="badge badge-green">{selectedRunLabel}</span>
              {selectedRun?.status === "FAILED" ? (
                <button className="button button-soft" type="button" onClick={() => retryRun(selectedRun.id)} disabled={busyAction === selectedRun.id}>
                  {busyAction === selectedRun.id ? "Dang retry..." : "Retry run nay"}
                </button>
              ) : null}
            </div>

            {selectedRun ? (
              <table className="table">
                <thead>
                  <tr>
                    <th>Thoi gian</th>
                    <th>Muc</th>
                    <th>Thong diep</th>
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
                    <tr><td colSpan={3}>Lan chay nay chua co log.</td></tr>
                  )}
                </tbody>
              </table>
            ) : (
              <div className="auth-note" style={{ color: "var(--muted)" }}>Chon mot lan chay de xem log.</div>
            )}
          </article>
        </section>
      </main>
    </div>
  );
}
