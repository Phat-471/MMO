"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { apiRequest, syncSessionProfile } from "../../lib/api";
import Sidebar from "../../components/Sidebar";

type WorkspaceDetail = {
  id: string;
  ownerUserId: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "SUSPENDED";
  currentMemberRole: "ADMIN" | "USER" | "VIEWER" | "AFFILIATE" | null;
  members: Array<{
    id: string;
    userId: string;
    role: "ADMIN" | "USER" | "VIEWER" | "AFFILIATE";
  }>;
  subscriptions: Array<{
    id: string;
    status: string;
    currentPeriodEnd: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

type WorkspaceForm = {
  name: string;
  slug: string;
};

export default function CaiDatPage() {
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [form, setForm] = useState<WorkspaceForm>({ name: "", slug: "" });
  const [message, setMessage] = useState("Đang tải cấu hình workspace...");
  const [verified, setVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage = workspace?.currentMemberRole === "ADMIN";

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const session = await syncSessionProfile();
      if (!mounted) return;

      if (!session) {
        router.push("/dang-nhap");
        return;
      }

      setUserEmail(session.email);
      setWorkspaceId(session.workspaceId);
      setUserRole(session.role);
      setVerified(true);
      await loadWorkspace(session.workspaceId);
    };

    void run();
    return () => {
      mounted = false;
    };
  }, [router]);

  async function loadWorkspace(currentWorkspaceId: string) {
    try {
      const res = await apiRequest<WorkspaceDetail>(`/workspaces/${currentWorkspaceId}`);
      setWorkspace(res.data);
      setForm({ name: res.data.name, slug: res.data.slug });
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tải cấu hình workspace.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspaceId || !canManage) return;
    setIsSubmitting(true);

    try {
      const res = await apiRequest<WorkspaceDetail>(`/workspaces/${workspaceId}`, {
        method: "PATCH",
        body: JSON.stringify(form)
      });
      setWorkspace(res.data);
      setMessage(res.message);
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Cập nhật thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!verified) {
    return (
      <div className="auth-shell">
        <div className="pulse" style={{ color: "var(--primary)", fontWeight: 700 }}>XÁC THỰC QUYỀN TRUY CẬP...</div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="bg-grid"></div>
      <Sidebar userEmail={userEmail} workspaceId={workspaceId} userRole={userRole} />

      <main className="main">
        <header className="topbar">
          <div>
            <h1>Cài đặt Workspace</h1>
            <p>Quản lý định danh, quyền hạn và các thiết lập hệ thống của không gian làm việc.</p>
          </div>
          <div className="topbar-actions">
            <button className="button button-soft" onClick={() => workspaceId && loadWorkspace(workspaceId)}>
              <span style={{ marginRight: 8 }}>🔄</span> Làm mới
            </button>
          </div>
        </header>

        <section className="metric-grid" style={{ marginBottom: 40 }}>
          <article className="metric-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div className="metric-label">Không gian MMO</div>
                <div className="metric-value" style={{ fontSize: "1.25rem", color: "#fff" }}>{workspace?.name ?? "-"}</div>
              </div>
              <div style={{ fontSize: 24, opacity: 0.5 }}>🏢</div>
            </div>
          </article>
          <article className="metric-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div className="metric-label">Vai trò hiện tại</div>
                <div className="metric-value" style={{ fontSize: "1.5rem", color: "var(--primary)" }}>{workspace?.currentMemberRole ?? "NONE"}</div>
              </div>
              <div style={{ fontSize: 24, opacity: 0.5 }}>🔑</div>
            </div>
          </article>
          <article className="metric-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div className="metric-label">Thành viên</div>
                <div className="metric-value">{workspace?.members.length ?? 0}</div>
              </div>
              <div style={{ fontSize: 24, opacity: 0.5 }}>👥</div>
            </div>
          </article>
          <article className="metric-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div className="metric-label">Trạng thái</div>
                <div className="metric-value" style={{ fontSize: "1.25rem", color: workspace?.status === "ACTIVE" ? "var(--success)" : "var(--warning)" }}>
                  {workspace?.status === "ACTIVE" ? "ĐANG HOẠT ĐỘNG" : "BỊ TẠM NGƯNG"}
                </div>
              </div>
              <div style={{ fontSize: 24, opacity: 0.5 }}>{workspace?.status === "ACTIVE" ? "✅" : "⚠️"}</div>
            </div>
          </article>
        </section>

        {message && (
          <div style={{ background: "rgba(139, 92, 246, 0.1)", color: "var(--primary)", padding: "16px 24px", borderRadius: 16, marginBottom: 32, fontWeight: 600, border: "1px solid var(--primary-glow)", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 20 }}>ℹ️</span> {message}
          </div>
        )}

        <section style={{ maxWidth: 800, margin: "0 auto" }}>
          <article className="panel" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "24px 32px", borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.02)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Thông tin Workspace</h2>

            </div>

            <form onSubmit={handleSubmit} style={{ padding: 32, display: "flex", flexDirection: "column", gap: 24 }}>
              <div className="input-group">
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 10, color: "var(--text-muted)" }}>Tên Workspace</label>
                <input
                  disabled={!canManage}
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Ví dụ: MMO Growth Lab"
                  style={{ width: "100%", height: 48, padding: "0 16px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none", transition: "all 0.2s" }}
                />
              </div>

              <div className="input-group">
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 10, color: "var(--text-muted)" }}>Slug định danh (URL)</label>
                <div style={{ position: "relative" }}>
                  <input
                    disabled={!canManage}
                    value={form.slug}
                    onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                    placeholder="workspace-slug"
                    style={{ width: "100%", height: 48, padding: "0 16px 0 44px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none", transition: "all 0.2s" }}
                  />
                  <span style={{ position: "absolute", left: 16, top: 13, fontSize: 16, opacity: 0.5 }}>🔗</span>
                </div>
              </div>

              <button className="button button-primary" type="submit" disabled={!canManage || isSubmitting} style={{ width: "100%", height: 52, borderRadius: 14, fontWeight: 800, fontSize: 16, marginTop: 12 }}>
                {isSubmitting ? "Đang lưu..." : "Lưu thay đổi ✨"}
              </button>
            </form>
          </article>
        </section>
      </main>

      <style jsx>{`
        .input-group input:focus {
           border-color: var(--primary) !important;
           box-shadow: 0 0 0 1px var(--primary-glow);
           background: rgba(139, 92, 246, 0.05) !important;
        }
      `}</style>
    </div>
  );
}
