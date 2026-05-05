"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiRequest, syncSessionProfile } from "../../lib/api";
import { useRouter } from "next/navigation";
import { formatPlatform } from "../../lib/labels";
import Sidebar from "../../components/Sidebar";

type AccountItem = {
  id: string;
  label: string;
  platform: string;
  status: string;
  groupName: string | null;
  lastFetchAt: string | null;
};

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    alive: "Hoạt động",
    dead: "Vô hiệu hóa",
    limited: "Hạn chế",
    pending: "Chờ check",
  };

  const getVariant = () => {
    if (status === "alive") return "badge-green";
    if (status === "dead") return "badge-red";
    if (status === "limited" || status === "pending") return "badge-amber";
    return "badge-soft";
  };

  return (
    <span className={`badge ${getVariant()}`} style={{ fontSize: 11, padding: "4px 10px", fontWeight: 700 }}>
      {labels[status] || status}
    </span>
  );
}

type AccountForm = {
  label: string;
  platform: "facebook" | "tiktok" | "shopee";
  status: "alive" | "dead" | "limited" | "pending";
  email: string;
  password: string;
  cookie: string;
  proxy: string;
  twoFa: string;
  tag: string;
  note: string;
  groupName: string;
};

const emptyForm: AccountForm = {
  label: "",
  platform: "facebook",
  status: "pending",
  email: "",
  password: "",
  cookie: "",
  proxy: "",
  twoFa: "",
  tag: "",
  note: "",
  groupName: ""
};

export default function TaiKhoanPage() {
  const router = useRouter();
  const [items, setItems] = useState<AccountItem[]>([]);
  const [message, setMessage] = useState("");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState("");
  const [form, setForm] = useState<AccountForm>(emptyForm);
  const [verified, setVerified] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      loadAccounts(session.workspaceId);
    };

    void run();
    return () => {
      mounted = false;
    };
  }, [router]);

  function loadAccounts(currentWorkspaceId: string) {
    apiRequest<AccountItem[]>(`/workspaces/${currentWorkspaceId}/accounts`)
      .then((res) => {
        setItems(res.data);
      })
      .catch((error: Error) => setMessage(error.message));
  }

  function updateForm<K extends keyof AccountForm>(key: K, value: AccountForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspaceId) return;
    setIsSubmitting(true);

    try {
      const res = await apiRequest<AccountItem>(`/workspaces/${workspaceId}/accounts`, {
        method: "POST",
        body: JSON.stringify(form)
      });
      setMessage(res.message);
      setForm(emptyForm);
      loadAccounts(workspaceId);
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tạo tài khoản thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(accountId: string) {
    if (!confirm("Bạn chắc chắn muốn xóa tài khoản này?")) return;
    try {
      const res = await apiRequest<{ id: string }>(`/accounts/${accountId}`, {
        method: "DELETE"
      });
      setMessage(res.message);
      if (workspaceId) loadAccounts(workspaceId);
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Xóa tài khoản thất bại.");
    }
  }

  const aliveCount = items.filter(i => i.status === "alive").length;
  const deadCount = items.filter(i => i.status === "dead").length;

  if (!verified) {
    return (
      <div className="auth-shell">
        <div className="pulse" style={{ color: "var(--primary)", fontWeight: 700 }}>XÁC THỰC CƠ SỞ DỮ LIỆU TÀI KHOẢN...</div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="bg-grid"></div>
      <Sidebar userEmail={userEmail} workspaceId={workspaceId ?? undefined} userRole={userRole} />

      <main className="main">
        <header className="topbar">
          <div>
            <h1>Quản lý tài khoản MMO</h1>
            <p>Quản trị tập trung thông tin đăng nhập, cookie và proxy bảo mật.</p>
          </div>
          <div className="topbar-actions">
            <button className="button button-soft" onClick={() => workspaceId && loadAccounts(workspaceId)}>
              <span style={{ marginRight: 8 }}>🔄</span> Tải lại dữ liệu
            </button>
          </div>
        </header>

        <section className="metric-grid" style={{ marginBottom: 40 }}>
          <article className="metric-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div className="metric-label">Tổng tài khoản</div>
                <div className="metric-value">{items.length}</div>
              </div>
              <div style={{ fontSize: 24, opacity: 0.5 }}>👥</div>
            </div>
          </article>
          <article className="metric-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div className="metric-label">Đang hoạt động</div>
                <div className="metric-value" style={{ color: "var(--success)" }}>{aliveCount}</div>
              </div>
              <div style={{ fontSize: 24, opacity: 0.5 }}>🟢</div>
            </div>
          </article>
          <article className="metric-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div className="metric-label">Vô hiệu hóa</div>
                <div className="metric-value" style={{ color: "var(--danger)" }}>{deadCount}</div>
              </div>
              <div style={{ fontSize: 24, opacity: 0.5 }}>🔴</div>
            </div>
          </article>
          <article className="metric-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div className="metric-label">Cần kiểm tra</div>
                <div className="metric-value" style={{ color: "var(--warning)" }}>{items.length - aliveCount - deadCount}</div>
              </div>
              <div style={{ fontSize: 24, opacity: 0.5 }}>🟡</div>
            </div>
          </article>
        </section>

        {message && (
          <div style={{ 
            background: "rgba(139, 92, 246, 0.1)", 
            color: "var(--primary)", 
            padding: "16px 24px", 
            borderRadius: 16, 
            marginBottom: 32, 
            fontWeight: 600, 
            border: "1px solid var(--primary-glow)",
            display: "flex",
            alignItems: "center",
            gap: 12
          }}>
            <span style={{ fontSize: 20 }}>✨</span> {message}
          </div>
        )}

        <section className="content-grid" style={{ gridTemplateColumns: "1fr 2.2fr", gap: 32 }}>
          {/* Left: Form */}
          <article className="panel" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "24px 32px", borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Thêm tài khoản mới</h2>
              <p style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 4 }}>Nhập thông tin xác thực để bắt đầu automation.</p>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: 32, display: "flex", flexDirection: "column", gap: 24 }}>
              <div className="input-group">
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "var(--text-muted)" }}>Tên hiển thị</label>
                <input 
                  value={form.label} 
                  onChange={(e) => updateForm("label", e.target.value)} 
                  type="text" 
                  placeholder="Ví dụ: Acc Marketing 01" 
                  style={{ width: "100%", height: 44, padding: "0 16px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none", transition: "all 0.2s" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="input-group">
                  <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "var(--text-muted)" }}>Nền tảng</label>
                  <select 
                    value={form.platform} 
                    onChange={(e) => updateForm("platform", e.target.value as any)}
                    style={{ width: "100%", height: 44, padding: "0 12px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }}
                  >
                    <option value="facebook">Facebook</option>
                    <option value="tiktok">TikTok</option>
                    <option value="shopee">Shopee</option>
                  </select>
                </div>
                <div className="input-group">
                  <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "var(--text-muted)" }}>Trạng thái</label>
                  <select 
                    value={form.status} 
                    onChange={(e) => updateForm("status", e.target.value as any)}
                    style={{ width: "100%", height: 44, padding: "0 12px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }}
                  >
                    <option value="pending">Chờ check</option>
                    <option value="alive">Hoạt động</option>
                    <option value="limited">Hạn chế</option>
                    <option value="dead">Vô hiệu hóa</option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "var(--text-muted)" }}>Email / Username</label>
                <input 
                  value={form.email} 
                  onChange={(e) => updateForm("email", e.target.value)} 
                  type="text" 
                  placeholder="email@example.com" 
                  style={{ width: "100%", height: 44, padding: "0 16px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }}
                />
              </div>

              <div className="input-group">
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "var(--text-muted)" }}>Mật khẩu tài khoản</label>
                <input 
                  value={form.password} 
                  onChange={(e) => updateForm("password", e.target.value)} 
                  type="password" 
                  placeholder="••••••••" 
                  style={{ width: "100%", height: 44, padding: "0 16px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }}
                />
              </div>

              <div className="input-group">
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "var(--text-muted)" }}>Proxy (Host:Port:User:Pass)</label>
                <input 
                  value={form.proxy} 
                  onChange={(e) => updateForm("proxy", e.target.value)} 
                  type="text" 
                  placeholder="1.1.1.1:8080:user:pass" 
                  style={{ width: "100%", height: 44, padding: "0 16px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }}
                />
              </div>

              <div className="input-group">
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "var(--text-muted)" }}>Mã bảo mật 2FA</label>
                <input 
                  value={form.twoFa} 
                  onChange={(e) => updateForm("twoFa", e.target.value)} 
                  type="text" 
                  placeholder="2FA Secret" 
                  style={{ width: "100%", height: 44, padding: "0 16px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }}
                />
              </div>

              <div className="input-group">
                <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: "var(--text-muted)" }}>Dữ liệu Cookie</label>
                <textarea 
                  value={form.cookie} 
                  onChange={(e) => updateForm("cookie", e.target.value)} 
                  placeholder="Dán cookie tại đây..." 
                  style={{ width: "100%", minHeight: 80, padding: 12, borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none", resize: "vertical" }} 
                />
              </div>

              <button 
                type="submit" 
                className="button button-primary" 
                disabled={isSubmitting}
                style={{ width: "100%", height: 52, borderRadius: 14, fontWeight: 800, fontSize: 16, background: "linear-gradient(135deg, var(--primary), var(--accent))", border: "none", boxShadow: "0 8px 20px rgba(139, 92, 246, 0.2)", cursor: "pointer", transition: "all 0.2s" }}
              >
                {isSubmitting ? "Đang lưu..." : "Lưu tài khoản ✨"}
              </button>
            </form>
          </article>

          {/* Right: Table */}
          <article className="panel" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "24px 32px", borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.02)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Danh sách cơ sở dữ liệu</h2>
              <div className="badge badge-soft" style={{ padding: "6px 12px", borderRadius: 10 }}>{items.length} tài khoản</div>
            </div>

            <div className="table-container" style={{ padding: "12px 24px" }}>
              {items.length ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: 16 }}>Tài khoản</th>
                      <th>Nền tảng</th>
                      <th>Trạng thái</th>
                      <th>Nhóm</th>
                      <th>Cập nhật cuối</th>
                      <th style={{ textAlign: "right", paddingRight: 16 }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td style={{ padding: "20px 16px" }}>
                          <div style={{ fontWeight: 800, color: "#fff", fontSize: 15 }}>{item.label}</div>
                          <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4 }}>ID: #{item.id.slice(0, 8)}</div>
                        </td>
                        <td>
                          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 16 }}>
                              {item.platform === "facebook" ? "📘" : item.platform === "tiktok" ? "🎵" : "🧡"}
                            </span>
                            <span style={{ fontWeight: 600 }}>{formatPlatform(item.platform)}</span>
                          </span>
                        </td>
                        <td><StatusBadge status={item.status} /></td>
                        <td><span style={{ color: "var(--text-muted)", fontSize: 13 }}>{item.groupName ?? "Mặc định"}</span></td>
                        <td>
                          <div style={{ fontSize: 13, color: "var(--text-dim)" }}>
                            {item.lastFetchAt ? new Date(item.lastFetchAt).toLocaleDateString("vi-VN") : "Chưa cập nhật"}
                          </div>
                        </td>
                        <td style={{ textAlign: "right", paddingRight: 16 }}>
                          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                             <button className="button button-ghost" style={{ padding: "6px 10px", borderRadius: 10 }}>⚙️</button>
                             <button 
                               className="button" 
                               style={{ padding: "6px 10px", borderRadius: 10, background: "rgba(244, 63, 94, 0.1)", color: "var(--danger)", border: "1px solid rgba(244, 63, 94, 0.1)" }} 
                               onClick={() => handleDelete(item.id)}
                             >
                               🗑️
                             </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ textAlign: "center", padding: "120px 40px", color: "var(--text-dim)" }}>
                  <div style={{ fontSize: 64, marginBottom: 24, opacity: 0.1 }}>📁</div>
                  <h3 style={{ fontSize: 18, color: "var(--text-main)", marginBottom: 8 }}>Chưa có dữ liệu</h3>
                  <p style={{ maxWidth: 300, marginInline: "auto", lineHeight: 1.6 }}>Hệ thống chưa ghi nhận tài khoản nào trong workspace này. Hãy thêm mới từ form bên trái.</p>
                </div>
              )}
            </div>
          </article>
        </section>
      </main>

      <style jsx>{`
        .input-group input:focus, .input-group select:focus, .input-group textarea:focus {
           border-color: var(--primary) !important;
           box-shadow: 0 0 0 1px var(--primary-glow);
           background: rgba(139, 92, 246, 0.05) !important;
        }
        .table thead th {
          border-bottom: 1px solid var(--border);
          color: var(--text-dim);
          font-weight: 700;
          padding: 16px;
        }
        .table tbody tr {
          transition: all 0.2s;
        }
        .table tbody tr:hover td {
          background: rgba(255, 255, 255, 0.02);
        }
      `}</style>
    </div>
  );
}
