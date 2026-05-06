"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest, syncSessionProfile } from "../../../../lib/api";
import { formatJobMode, formatJobStatus, formatJobType, formatPlatform } from "../../../../lib/labels";
import AdminSidebar from "../../admin-sidebar";

type AdminJobRunDetail = {
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
};

export default function AdminJobRunDetailClient({ runId }: { runId: string }) {
  const [detail, setDetail] = useState<AdminJobRunDetail | null>(null);
  const [message, setMessage] = useState("Đang tải chi tiết lần chạy...");

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const session = await syncSessionProfile();
      if (!mounted) {
        return;
      }
      if (!session || session.role !== "ADMIN") {
        setMessage("Cần quyền admin.");
        return;
      }

      apiRequest<AdminJobRunDetail>(`/admin/job-runs/${runId}/detail`)
        .then((res) => {
          setDetail(res.data);
          setMessage("Đã tải chi tiết lần chạy.");
        })
        .catch((error: Error) => setMessage(error.message));
    };

    void run();
    return () => {
      mounted = false;
    };
  }, [runId]);

  return (
    <div className="app-shell">
      <AdminSidebar title="Admin" subtitle="Chi tiết lần chạy" />

      <main className="main">
        <header className="topbar">
          <div>
            <h1>{detail ? detail.id.slice(0, 8) : "Chi tiết lần chạy"}</h1>
            <p>{message}</p>
          </div>
          <div className="topbar-actions">
            <Link className="button button-ghost" href="/admin">
              Quay lại
            </Link>
            <Link className="button button-primary" href={detail ? `/admin/jobs/${detail.job.id}` : "/admin"}>
              MềEtác vụ
            </Link>
          </div>
        </header>

        <section className="metric-grid">
          <article className="metric-card"><div className="metric-label">Trạng thái</div><div className="metric-value">{detail ? formatJobStatus(detail.status) : "-"}</div></article>
          <article className="metric-card"><div className="metric-label">Nền tảng</div><div className="metric-value">{detail ? formatPlatform(detail.job.platform) : "-"}</div></article>
          <article className="metric-card"><div className="metric-label">Loại</div><div className="metric-value">{detail ? formatJobType(detail.job.jobType) : "-"}</div></article>
          <article className="metric-card"><div className="metric-label">Chế độ</div><div className="metric-value">{detail ? formatJobMode(detail.job.mode) : "-"}</div></article>
        </section>

        <section className="content-grid">
          <article className="panel table-panel">
            <div className="panel-head"><h2>Thông tin run</h2></div>
            <table className="table">
              <tbody>
                <tr><td className="table-main">Job</td><td>{detail?.job.id ?? "-"}</td></tr>
                <tr><td className="table-main">Workspace</td><td>{detail?.job.workspace.name ?? "-"}</td></tr>
                <tr><td className="table-main">Owner</td><td>{detail?.job.workspace.owner.email ?? "-"}</td></tr>
                <tr><td className="table-main">Account</td><td>{detail?.job.account?.label ?? "-"}</td></tr>
                <tr><td className="table-main">Người tạo</td><td>{detail?.job.createdBy?.email ?? "-"}</td></tr>
                <tr><td className="table-main">Bắt đầu</td><td>{detail?.startedAt ? new Date(detail.startedAt).toLocaleString("vi-VN") : "-"}</td></tr>
                <tr><td className="table-main">Kết thúc</td><td>{detail?.finishedAt ? new Date(detail.finishedAt).toLocaleString("vi-VN") : "-"}</td></tr>
                <tr><td className="table-main">Lỗi</td><td>{detail?.errorMessage ?? "-"}</td></tr>
                <tr><td className="table-main">Metrics</td><td><pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{detail?.metricsJson ?? "-"}</pre></td></tr>
              </tbody>
            </table>
          </article>

          <article className="panel table-panel">
            <div className="panel-head">
              <h2>Log</h2>
              <span className="badge badge-green">{detail?.logs.length ?? 0} mục</span>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Mức</th>
                  <th>Thông điệp</th>
                </tr>
              </thead>
              <tbody>
                {detail?.logs.length ? detail.logs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.createdAt).toLocaleString("vi-VN")}</td>
                    <td>{log.level}</td>
                    <td>
                      <div>{log.message}</div>
                      {log.payloadJson ? <pre style={{ margin: "8px 0 0", whiteSpace: "pre-wrap" }}>{log.payloadJson}</pre> : null}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={3}>Không có log.</td></tr>
                )}
              </tbody>
            </table>
          </article>
        </section>
      </main>
    </div>
  );
}

