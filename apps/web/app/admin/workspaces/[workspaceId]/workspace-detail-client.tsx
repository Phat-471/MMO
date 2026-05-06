"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest, syncSessionProfile } from "../../../../lib/api";
import { formatAccountStatus, formatJobMode, formatJobStatus, formatJobType, formatPlatform } from "../../../../lib/labels";
import AdminSidebar from "../../admin-sidebar";

type WorkspaceDetail = {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    email: string;
    role: string;
    status: string;
  };
  members: Array<{
    id: string;
    role: string;
    createdAt: string;
    user: {
      id: string;
      email: string;
      role: string;
      status: string;
    };
  }>;
  subscriptions: Array<{
    id: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    plan: {
      code: string;
      name: string;
      priceMonthly: string;
    };
  }>;
  accounts: Array<{
    id: string;
    label: string;
    platform: string;
    status: string;
    createdAt: string;
  }>;
  jobs: Array<{
    id: string;
    platform: string;
    jobType: string;
    mode: string;
    status: string;
    createdAt: string;
  }>;
  tools: Array<{
    id: string;
    enabled: boolean;
    createdAt: string;
    tool: {
      code: string;
      name: string;
      category: string;
      status: string;
    };
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    createdAt: string;
    user: { id: string; email: string } | null;
  }>;
};

export default function AdminWorkspaceDetailClient({ workspaceId }: { workspaceId: string }) {
  const [detail, setDetail] = useState<WorkspaceDetail | null>(null);
  const [message, setMessage] = useState("Dang tai chi tiet workspace...");
  const [status, setStatus] = useState<"ACTIVE" | "SUSPENDED">("ACTIVE");
  const [planCode, setPlanCode] = useState<"FREE" | "STARTER" | "PRO" | "ENTERPRISE">("FREE");
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);

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

      apiRequest<WorkspaceDetail>(`/admin/workspaces/${workspaceId}/detail`)
        .then((res) => {
          setDetail(res.data);
          setMessage("Da tai chi tiet workspace.");
        })
        .catch((error: Error) => setMessage(error.message));
    };

    void run();
    return () => {
      mounted = false;
    };
  }, [workspaceId]);

  useEffect(() => {
    if (!detail) {
      return;
    }
    setStatus(detail.status as "ACTIVE" | "SUSPENDED");
    setPlanCode((detail.subscriptions[0]?.plan.code as "FREE" | "STARTER" | "PRO" | "ENTERPRISE") ?? "FREE");
  }, [detail]);

  async function saveStatus() {
    setSavingStatus(true);
    try {
      const res = await apiRequest<WorkspaceDetail>(`/admin/workspaces/${workspaceId}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      setDetail((current) => (current ? { ...current, status } : current));
      setMessage(res.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the cap nhat workspace.");
    } finally {
      setSavingStatus(false);
    }
  }

  async function savePlan() {
    setSavingPlan(true);
    try {
      const res = await apiRequest(`/admin/workspaces/${workspaceId}/plan`, {
        method: "PATCH",
        body: JSON.stringify({ planCode })
      });
      setMessage(res.message);
      await apiRequest<WorkspaceDetail>(`/admin/workspaces/${workspaceId}/detail`).then((response) => setDetail(response.data));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Khong the gan goi dich vu.");
    } finally {
      setSavingPlan(false);
    }
  }

  return (
    <div className="app-shell">
      <AdminSidebar title="Admin" subtitle="Chi tiết workspace" />

      <main className="main">
        <header className="topbar">
          <div>
            <h1>{detail?.name ?? "Chi tiết workspace"}</h1>
            <p>{message}</p>
          </div>
        </header>

        <section className="metric-grid">
          <article className="metric-card"><div className="metric-label">Trạng thái</div><div className="metric-value">{detail?.status ?? "-"}</div></article>
          <article className="metric-card"><div className="metric-label">Owner</div><div className="metric-value">{detail?.owner.email ?? "-"}</div></article>
          <article className="metric-card"><div className="metric-label">Member</div><div className="metric-value">{detail?.members.length ?? 0}</div></article>
          <article className="metric-card"><div className="metric-label">Job</div><div className="metric-value">{detail?.jobs.length ?? 0}</div></article>
        </section>

        <section className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-head">
            <h2>Hành động</h2>
          </div>
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            <div style={{ display: "grid", gap: 12 }}>
              <label className="field">
                <span>Trạng thái workspace</span>
                <select className="input" value={status} onChange={(event) => setStatus(event.target.value as "ACTIVE" | "SUSPENDED")}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </label>
              <button className="button button-primary" type="button" onClick={saveStatus} disabled={savingStatus || !detail}>
                {savingStatus ? "Đang lưu..." : "Lưu trạng thái"}
              </button>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              <label className="field">
                <span>Gói dịch vụ</span>
                <select className="input" value={planCode} onChange={(event) => setPlanCode(event.target.value as "FREE" | "STARTER" | "PRO" | "ENTERPRISE")}>
                  <option value="FREE">FREE</option>
                  <option value="STARTER">STARTER</option>
                  <option value="PRO">PRO</option>
                  <option value="ENTERPRISE">ENTERPRISE</option>
                </select>
              </label>
              <button className="button button-primary" type="button" onClick={savePlan} disabled={savingPlan || !detail}>
                {savingPlan ? "Đang lưu..." : "Gan goi"}
              </button>
            </div>
          </div>
        </section>

        <section className="content-grid">
          <article className="panel table-panel">
            <div className="panel-head"><h2>Dang ky</h2></div>
            <table className="table">
              <tbody>
                {detail?.subscriptions.length ? detail.subscriptions.map((sub) => (
                  <tr key={sub.id}>
                    <td className="table-main">{sub.plan.name}</td>
                    <td>{sub.plan.code}</td>
                    <td>{sub.status}</td>
                    <td>{new Date(sub.currentPeriodEnd).toLocaleDateString("vi-VN")}</td>
                  </tr>
                )) : <tr><td>Khong co goi dang ky.</td></tr>}
              </tbody>
            </table>
          </article>

          <article className="panel table-panel">
            <div className="panel-head"><h2>Thành viên</h2></div>
            <table className="table">
              <thead><tr><th>Email</th><th>Vai trò</th><th>Trạng thái</th><th>Ngay</th></tr></thead>
              <tbody>
                {detail?.members.length ? detail.members.map((member) => (
                  <tr key={member.id}>
                    <td className="table-main">{member.user.email}</td>
                    <td>{member.role}</td>
                    <td>{member.user.status}</td>
                    <td>{new Date(member.createdAt).toLocaleDateString("vi-VN")}</td>
                  </tr>
                )) : <tr><td colSpan={4}>Không có thành viên.</td></tr>}
              </tbody>
            </table>
          </article>

          <article className="panel table-panel">
            <div className="panel-head"><h2>Tài khoản</h2></div>
            <table className="table">
              <thead><tr><th>Tên</th><th>Nền tảng</th><th>Trạng thái</th><th>Ngày tạo</th></tr></thead>
              <tbody>
                {detail?.accounts.length ? detail.accounts.map((account) => (
                  <tr key={account.id}>
                    <td className="table-main">{account.label}</td>
                    <td>{formatPlatform(account.platform)}</td>
                    <td>{formatAccountStatus(account.status)}</td>
                    <td>{new Date(account.createdAt).toLocaleDateString("vi-VN")}</td>
                  </tr>
                )) : <tr><td colSpan={4}>Không có tài khoản.</td></tr>}
              </tbody>
            </table>
          </article>

          <article className="panel table-panel">
            <div className="panel-head"><h2>Công cụ</h2></div>
            <table className="table">
              <thead><tr><th>Code</th><th>Tên</th><th>Trạng thái</th><th>Bật</th></tr></thead>
              <tbody>
                {detail?.tools.length ? detail.tools.map((item) => (
                  <tr key={item.id}>
                    <td className="table-main">{item.tool.code}</td>
                    <td>{item.tool.name}</td>
                    <td>{item.tool.status}</td>
                    <td>{item.enabled ? "YES" : "NO"}</td>
                  </tr>
                )) : <tr><td colSpan={4}>Khong co cong cu.</td></tr>}
              </tbody>
            </table>
          </article>

          <article className="panel table-panel">
            <div className="panel-head"><h2>Tác vụ</h2></div>
            <table className="table">
              <thead><tr><th>Mã</th><th>Loại</th><th>Nền tảng</th><th>Chế độ</th><th>Trạng thái</th></tr></thead>
              <tbody>
                {detail?.jobs.length ? detail.jobs.map((job) => (
                  <tr key={job.id}>
                    <td className="table-main">{job.id.slice(0, 8)}</td>
                    <td>{formatJobType(job.jobType)}</td>
                    <td>{formatPlatform(job.platform)}</td>
                    <td>{formatJobMode(job.mode)}</td>
                    <td>{formatJobStatus(job.status)}</td>
                  </tr>
                )) : <tr><td colSpan={5}>Không có tác vụ.</td></tr>}
              </tbody>
            </table>
          </article>

          <article className="panel table-panel" style={{ gridColumn: "1 / -1" }}>
            <div className="panel-head"><h2>Audit log</h2><span className="badge badge-green">{detail?.auditLogs.length ?? 0} mục</span></div>
            <table className="table">
              <thead><tr><th>Thời gian</th><th>Action</th><th>Đối tượng</th><th>Người dùng</th></tr></thead>
              <tbody>
                {detail?.auditLogs.length ? detail.auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.createdAt).toLocaleString("vi-VN")}</td>
                    <td>{log.action}</td>
                    <td>{log.entityType}</td>
                    <td>{log.user?.email ?? "-"}</td>
                  </tr>
                )) : <tr><td colSpan={4}>Không có log.</td></tr>}
              </tbody>
            </table>
          </article>
        </section>
      </main>
    </div>
  );
}

