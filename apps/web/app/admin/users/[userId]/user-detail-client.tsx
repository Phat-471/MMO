"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest, syncSessionProfile } from "../../../../lib/api";
import AdminSidebar from "../../admin-sidebar";

type UserDetail = {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "DISABLED";
  createdAt: string;
  updatedAt: string;
  _count: {
    workspaces: number;
    memberOf: number;
    refreshSessions: number;
    createdByJobs: number;
    auditLogs: number;
  };
  workspaces: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    createdAt: string;
  }>;
  memberOf: Array<{
    id: string;
    role: string;
    createdAt: string;
    workspace: {
      id: string;
      name: string;
      status: string;
    };
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    createdAt: string;
  }>;
};

export default function AdminUserDetailClient({ userId }: { userId: string }) {
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [message, setMessage] = useState("Dang tai chi tiet nguoi dung...");
  const [role, setRole] = useState<"USER" | "ADMIN">("USER");
  const [status, setStatus] = useState<"ACTIVE" | "DISABLED">("ACTIVE");
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

      apiRequest<UserDetail>(`/admin/users/${userId}/detail`)
        .then((res) => {
          setDetail(res.data);
          setMessage("Da tai chi tiet nguoi dung.");
        })
        .catch((error: Error) => setMessage(error.message));
    };

    void run();
    return () => {
      mounted = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!detail) {
      return;
    }
    setRole(detail.role);
    setStatus(detail.status);
  }, [detail]);

  async function saveUser() {
    setSaving(true);
    try {
      const res = await apiRequest<UserDetail>(`/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ role, status })
      });
      setDetail((current) => (current ? { ...current, role, status } : current));
      setMessage(res.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the cap nhat nguoi dung.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-shell">
      <AdminSidebar title="Admin" subtitle="Chi tiết người dùng" />

      <main className="main">
        <header className="topbar">
          <div>
            <h1>{detail?.email ?? "Chi tiết người dùng"}</h1>
            <p>{message}</p>
          </div>
        </header>

        <section className="metric-grid">
          <article className="metric-card"><div className="metric-label">Quyen</div><div className="metric-value">{detail?.role ?? "-"}</div></article>
          <article className="metric-card"><div className="metric-label">Trang thai</div><div className="metric-value">{detail?.status ?? "-"}</div></article>
          <article className="metric-card"><div className="metric-label">Workspace</div><div className="metric-value">{detail?._count.workspaces ?? 0}</div></article>
          <article className="metric-card"><div className="metric-label">Member</div><div className="metric-value">{detail?._count.memberOf ?? 0}</div></article>
        </section>

        <section className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-head">
            <h2>Hanh dong</h2>
            <button className="button button-primary" type="button" onClick={saveUser} disabled={saving || !detail}>
              {saving ? "Dang luu..." : "Luu cap nhat"}
            </button>
          </div>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            <label className="field">
              <span>Quyen</span>
              <select className="input" value={role} onChange={(event) => setRole(event.target.value as "USER" | "ADMIN")}>
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </label>
            <label className="field">
              <span>Trang thai</span>
              <select className="input" value={status} onChange={(event) => setStatus(event.target.value as "ACTIVE" | "DISABLED")}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="DISABLED">DISABLED</option>
              </select>
            </label>
          </div>
        </section>

        <section className="content-grid">
          <article className="panel table-panel">
            <div className="panel-head"><h2>Workspace so huu</h2></div>
            <table className="table">
              <tbody>
                {detail?.workspaces.length ? detail.workspaces.map((workspace) => (
                  <tr key={workspace.id}>
                    <td className="table-main">{workspace.name}</td>
                    <td>{workspace.slug}</td>
                    <td>{workspace.status}</td>
                    <td>{new Date(workspace.createdAt).toLocaleDateString("vi-VN")}</td>
                  </tr>
                )) : <tr><td>Khong co workspace.</td></tr>}
              </tbody>
            </table>
          </article>

          <article className="panel table-panel">
            <div className="panel-head"><h2>Workspace tham gia</h2></div>
            <table className="table">
              <tbody>
                {detail?.memberOf.length ? detail.memberOf.map((item) => (
                  <tr key={item.id}>
                    <td className="table-main">{item.workspace.name}</td>
                    <td>{item.role}</td>
                    <td>{item.workspace.status}</td>
                    <td>{new Date(item.createdAt).toLocaleDateString("vi-VN")}</td>
                  </tr>
                )) : <tr><td>Khong co workspace tham gia.</td></tr>}
              </tbody>
            </table>
          </article>

          <article className="panel table-panel" style={{ gridColumn: "1 / -1" }}>
            <div className="panel-head"><h2>Audit log gan nhat</h2><span className="badge badge-green">{detail?.auditLogs.length ?? 0} muc</span></div>
            <table className="table">
              <thead><tr><th>Thoi gian</th><th>Action</th><th>Doi tuong</th><th>ID</th></tr></thead>
              <tbody>
                {detail?.auditLogs.length ? detail.auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.createdAt).toLocaleString("vi-VN")}</td>
                    <td>{log.action}</td>
                    <td>{log.entityType}</td>
                    <td>{log.entityId ?? "-"}</td>
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

