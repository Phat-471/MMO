"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest, syncSessionProfile } from "../../../../lib/api";
import { formatAccountStatus, formatJobMode, formatJobStatus, formatJobType, formatPlatform } from "../../../../lib/labels";
import AdminSidebar from "../../admin-sidebar";

type AccountDetail = {
  id: string;
  label: string;
  platform: "FACEBOOK" | "TIKTOK";
  status: "ALIVE" | "DEAD" | "LIMITED" | "PENDING";
  tag: string | null;
  groupName: string | null;
  note: string | null;
  lastLoginAt: string | null;
  lastFetchAt: string | null;
  createdAt: string;
  updatedAt: string;
  workspace: {
    id: string;
    name: string;
    status: string;
    owner: {
      id: string;
      email: string;
    };
  };
  jobs: Array<{
    id: string;
    platform: string;
    jobType: string;
    mode: string;
    status: string;
    createdAt: string;
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
  }>;
};

export default function AdminAccountDetailClient({ accountId }: { accountId: string }) {
  const [detail, setDetail] = useState<AccountDetail | null>(null);
  const [message, setMessage] = useState("Dang tai chi tiet tai khoan...");
  const [label, setLabel] = useState("");
  const [platform, setPlatform] = useState<"FACEBOOK" | "TIKTOK">("FACEBOOK");
  const [status, setStatus] = useState<"ALIVE" | "DEAD" | "LIMITED" | "PENDING">("PENDING");
  const [tag, setTag] = useState("");
  const [groupName, setGroupName] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const session = await syncSessionProfile();
      if (!mounted) {
        return;
      }
      if (!session || session.role !== "ADMIN") {
        setMessage("Can quyen admin.");
        return;
      }

      apiRequest<AccountDetail>(`/admin/accounts/${accountId}/detail`)
        .then((res) => {
          setDetail(res.data);
          setLabel(res.data.label);
          setPlatform(res.data.platform);
          setStatus(res.data.status);
          setTag(res.data.tag ?? "");
          setGroupName(res.data.groupName ?? "");
          setNote(res.data.note ?? "");
          setMessage("Da tai chi tiet tai khoan.");
        })
        .catch((error: Error) => setMessage(error.message));
    };

    void run();
    return () => {
      mounted = false;
    };
  }, [accountId]);

  async function saveAccount() {
    setSaving(true);
    try {
      const res = await apiRequest<AccountDetail>(`/admin/accounts/${accountId}`, {
        method: "PATCH",
        body: JSON.stringify({
          label,
          platform,
          status,
          tag: tag.trim() ? tag.trim() : null,
          groupName: groupName.trim() ? groupName.trim() : null,
          note: note.trim() ? note.trim() : null
        })
      });
      setDetail((current) =>
        current
          ? {
              ...current,
              label,
              platform,
              status,
              tag: tag.trim() ? tag.trim() : null,
              groupName: groupName.trim() ? groupName.trim() : null,
              note: note.trim() ? note.trim() : null
            }
          : current
      );
      setMessage(res.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the cap nhat tai khoan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-shell">
      <AdminSidebar title="Admin" subtitle="Chi tiết tài khoản" />

      <main className="main">
        <header className="topbar">
          <div>
            <h1>{detail?.label ?? "Chi tiết tài khoản"}</h1>
            <p>{message}</p>
          </div>
        </header>

        <section className="metric-grid">
          <article className="metric-card"><div className="metric-label">Trang thai</div><div className="metric-value">{detail ? formatAccountStatus(detail.status) : "-"}</div></article>
          <article className="metric-card"><div className="metric-label">Nen tang</div><div className="metric-value">{detail ? formatPlatform(detail.platform) : "-"}</div></article>
          <article className="metric-card"><div className="metric-label">Job</div><div className="metric-value">{detail?.jobs.length ?? 0}</div></article>
          <article className="metric-card"><div className="metric-label">Audit log</div><div className="metric-value">{detail?.auditLogs.length ?? 0}</div></article>
        </section>

        <section className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-head">
            <h2>Hanh dong</h2>
            <button className="button button-primary" type="button" onClick={saveAccount} disabled={saving || !detail}>
              {saving ? "Dang luu..." : "Luu cap nhat"}
            </button>
          </div>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            <label className="field">
              <span>Ten tai khoan</span>
              <input value={label} onChange={(event) => setLabel(event.target.value)} />
            </label>
            <label className="field">
              <span>Nen tang</span>
              <select value={platform} onChange={(event) => setPlatform(event.target.value as "FACEBOOK" | "TIKTOK")}>
                <option value="FACEBOOK">FACEBOOK</option>
                <option value="TIKTOK">TIKTOK</option>
              </select>
            </label>
            <label className="field">
              <span>Trang thai</span>
              <select value={status} onChange={(event) => setStatus(event.target.value as "ALIVE" | "DEAD" | "LIMITED" | "PENDING")}>
                <option value="ALIVE">ALIVE</option>
                <option value="DEAD">DEAD</option>
                <option value="LIMITED">LIMITED</option>
                <option value="PENDING">PENDING</option>
              </select>
            </label>
            <label className="field">
              <span>Group</span>
              <input value={groupName} onChange={(event) => setGroupName(event.target.value)} />
            </label>
            <label className="field">
              <span>Tag</span>
              <input value={tag} onChange={(event) => setTag(event.target.value)} />
            </label>
            <label className="field">
              <span>Ghi chu</span>
              <textarea value={note} onChange={(event) => setNote(event.target.value)} />
            </label>
          </div>
        </section>

        <section className="content-grid">
          <article className="panel table-panel">
            <div className="panel-head"><h2>Workspace</h2></div>
            <table className="table">
              <tbody>
                <tr><td className="table-main">Ten</td><td>{detail?.workspace.name ?? "-"}</td></tr>
                <tr><td className="table-main">Owner</td><td>{detail?.workspace.owner.email ?? "-"}</td></tr>
                <tr><td className="table-main">Trang thai</td><td>{detail?.workspace.status ?? "-"}</td></tr>
              </tbody>
            </table>
          </article>

          <article className="panel table-panel">
            <div className="panel-head"><h2>Thong tin</h2></div>
            <table className="table">
              <tbody>
                <tr><td className="table-main">Ngay tao</td><td>{detail ? new Date(detail.createdAt).toLocaleString("vi-VN") : "-"}</td></tr>
                <tr><td className="table-main">Cap nhat</td><td>{detail ? new Date(detail.updatedAt).toLocaleString("vi-VN") : "-"}</td></tr>
                <tr><td className="table-main">Lan dang nhap cuoi</td><td>{detail?.lastLoginAt ? new Date(detail.lastLoginAt).toLocaleString("vi-VN") : "-"}</td></tr>
                <tr><td className="table-main">Lan lay du lieu cuoi</td><td>{detail?.lastFetchAt ? new Date(detail.lastFetchAt).toLocaleString("vi-VN") : "-"}</td></tr>
              </tbody>
            </table>
          </article>

          <article className="panel table-panel">
            <div className="panel-head"><h2>Tac vu gan nhat</h2></div>
            <table className="table">
              <thead><tr><th>Ma</th><th>Loai</th><th>Nen tang</th><th>Che do</th><th>Trang thai</th></tr></thead>
              <tbody>
                {detail?.jobs.length ? detail.jobs.map((job) => (
                  <tr key={job.id}>
                    <td className="table-main">{job.id.slice(0, 8)}</td>
                    <td>{formatJobType(job.jobType)}</td>
                    <td>{formatPlatform(job.platform)}</td>
                    <td>{formatJobMode(job.mode)}</td>
                    <td>{formatJobStatus(job.status)}</td>
                  </tr>
                )) : <tr><td colSpan={5}>Khong co tac vu.</td></tr>}
              </tbody>
            </table>
          </article>

          <article className="panel table-panel" style={{ gridColumn: "1 / -1" }}>
            <div className="panel-head"><h2>Audit log</h2><span className="badge badge-green">{detail?.auditLogs.length ?? 0} muc</span></div>
            <table className="table">
              <thead><tr><th>Thoi gian</th><th>Hanh dong</th><th>Doi tuong</th><th>Nguoi thuc hien</th></tr></thead>
              <tbody>
                {detail?.auditLogs.length ? detail.auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.createdAt).toLocaleString("vi-VN")}</td>
                    <td>{log.action}</td>
                    <td>{log.entityType}</td>
                    <td>{log.user?.email ?? "-"}</td>
                  </tr>
                )) : <tr><td colSpan={4}>Khong co log.</td></tr>}
              </tbody>
            </table>
          </article>
        </section>
      </main>
    </div>
  );
}

