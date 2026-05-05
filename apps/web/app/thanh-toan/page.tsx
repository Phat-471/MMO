"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequest, logoutSession, syncSessionProfile } from "../../lib/api";

type PlanCode = "FREE" | "STARTER" | "PRO" | "ENTERPRISE";

type BillingInfo = {
  workspaceId: string;
  planCode: PlanCode;
  plan: string;
  status: string;
  limits: {
    code: string;
    name: string;
    maxAccounts: number;
    maxRunningJobs: number;
    maxWorkspaces: number;
    maxDailyFetches: number;
  } | null;
  features: string[];
};

type UsageInfo = {
  workspaceId: string;
  fetchCount: number;
  runningJobCountPeak: number;
  accountCount: number;
};

type PlanInfo = {
  id: string;
  code: PlanCode;
  name: string;
  priceMonthly: string;
  maxAccounts: number;
  maxRunningJobs: number;
  maxWorkspaces: number;
  maxDailyFetches: number;
  features: string[];
};

type CheckoutResponse = {
  workspaceId: string;
  planCode: PlanCode | null;
  planName: string | null;
  checkoutUrl: string | null;
};

function UsageCard({ label, current, max, icon }: { label: string; current: number; max: number; icon: string }) {
  const percent = max > 0 ? Math.min(Math.round((current / max) * 100), 100) : 0;
  const color = percent > 90 ? "var(--danger)" : percent > 70 ? "var(--warning)" : "var(--primary)";

  return (
    <div style={{ background: "rgba(255,255,255,0.02)", padding: 24, borderRadius: 20, border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ color: "var(--text-dim)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{current.toLocaleString()} <span style={{ fontSize: 13, color: "var(--text-dim)", fontWeight: 400 }}>/ {max.toLocaleString()}</span></div>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,0.03)", display: "grid", placeItems: "center", fontSize: 20 }}>{icon}</div>
      </div>
      <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 999, overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${percent}%`,
            background: color,
            boxShadow: `0 0 15px ${color}`,
            transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
          }}
        />
      </div>
      <div style={{ marginTop: 12, fontSize: 11, color: "var(--text-dim)", textAlign: "right", fontWeight: 600 }}>{percent}% đã sử dụng</div>
    </div>
  );
}

export default function BillingPage() {
  const router = useRouter();
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Đang tải dữ liệu thanh toán...");
  const [workspaceId, setWorkspaceId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [checked, setChecked] = useState(false);
  const currentPlanCode = billing?.planCode ?? "FREE";

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const session = await syncSessionProfile();
      if (!mounted) return;
      if (!session) { router.push("/dang-nhap"); return; }
      setUserEmail(session.email);
      setWorkspaceId(session.workspaceId);
      try {
        const [billingRes, usageRes, plansRes] = await Promise.all([
          apiRequest<BillingInfo>(`/workspaces/${session.workspaceId}/billing`),
          apiRequest<UsageInfo>(`/workspaces/${session.workspaceId}/usage`),
          apiRequest<PlanInfo[]>("/billing/plans")
        ]);
        if (!mounted) return;
        setBilling(billingRes.data);
        setUsage(usageRes.data);
        setPlans(plansRes.data);
        setMessage("");
      } catch (error) {
        if (mounted) setMessage(error instanceof Error ? error.message : "Không thể tải thông tin thanh toán.");
      } finally {
        if (mounted) { setChecked(true); setLoading(false); }
      }
    };
    void load();
    return () => { mounted = false; };
  }, [router]);

  async function handleLogout() {
    await logoutSession();
    router.push("/dang-nhap");
  }

  async function handleCheckout(planCode: PlanCode) {
    if (!workspaceId) { setMessage("Không xác định được workspace."); return; }
    try {
      setMessage(`Đang tạo phiên thanh toán cho gói ${planCode}...`);
      const res = await apiRequest<CheckoutResponse>("/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ workspaceId, planCode })
      });
      if (res.data.checkoutUrl) { window.location.assign(res.data.checkoutUrl); return; }
      setMessage(`${res.message} (Chưa kết nối cổng thanh toán)`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tạo phiên thanh toán thất bại.");
    }
  }

  if (!checked) return <div className="auth-shell"><div className="pulse" style={{ color: "var(--primary)", fontWeight: 700 }}>Đang xác thực gói cước...</div></div>;

  return (
    <div className="app-shell">
      <div className="bg-grid" />

      <aside className="sidebar">
        <Link className="brand" href="/">
          <div className="brand-mark">M</div>
          <div>
            <div className="brand-title">MMO CONTROL</div>
            <div className="brand-sub">Hệ thống vận hành MMO</div>
          </div>
        </Link>

        <nav className="nav">
          <div style={{ padding: "0 16px", color: "var(--text-dim)", fontSize: 11, fontWeight: 800, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.1em" }}>Tổng quan</div>
          <Link className="nav-item" href="/">📊 Bảng điều khiển</Link>
          <Link className="nav-item" href="/bao-cao">📈 Báo cáo hiệu suất</Link>

          <div style={{ padding: "0 16px", color: "var(--text-dim)", fontSize: 11, fontWeight: 800, margin: "24px 0 12px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Quản lý</div>
          <Link className="nav-item" href="/tai-khoan">👥 Tài khoản MMO</Link>
          <Link className="nav-item" href="/cong-cu">🛠️ Thư viện công cụ</Link>
          <Link className="nav-item" href="/du-lieu">💾 Lưu trữ dữ liệu</Link>

          <div style={{ padding: "0 16px", color: "var(--text-dim)", fontSize: 11, fontWeight: 800, margin: "24px 0 12px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Vận hành</div>
          <Link className="nav-item" href="/tao-tac-vu">⚡ Khung tạo Automation</Link>
          <Link className="nav-item" href="/shopee-aff">🧡 Shopee Affiliate</Link>

          <div style={{ padding: "0 16px", color: "var(--text-dim)", fontSize: 11, fontWeight: 800, margin: "24px 0 12px", textTransform: "uppercase", letterSpacing: "0.1em" }}>Tài khoản</div>
          <Link className="nav-item active" href="/thanh-toan">💎 Gói cước & Billing</Link>
          <Link className="nav-item" href="/thong-bao">🔔 Thông báo</Link>
          <Link className="nav-item" href="/cai-dat">⚙️ Cài đặt</Link>
        </nav>

        <div className="sidebar-note">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--primary)", display: "grid", placeItems: "center", fontSize: 14, fontWeight: 800 }}>{userEmail[0].toUpperCase()}</div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ fontWeight: 700, color: "#fff", fontSize: 13, textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail.split("@")[0]}</div>
              <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Gói: {billing?.plan ?? "FREE"}</div>
            </div>
          </div>
          <button className="button button-soft" style={{ width: "100%", height: 36, fontSize: 12, fontWeight: 700 }} onClick={handleLogout}>Đăng xuất</button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>Gói cước & Thanh toán</h1>
            <p>Quản lý hạn mức sử dụng và nâng cấp trải nghiệm vận hành của bạn.</p>
          </div>
          <div className="topbar-actions">
             <div style={{ textAlign: "right", marginRight: 16 }}>
               <div style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 800, textTransform: "uppercase" }}>Trạng thái tài khoản</div>
               <div style={{ color: "var(--success)", fontWeight: 800, fontSize: 14 }}>● {billing?.status?.toUpperCase() ?? "ACTIVE"}</div>
             </div>
            <button className="button button-soft" style={{ borderRadius: 12 }} onClick={() => window.location.reload()}>🔄 Làm mới</button>
          </div>
        </header>

        {message && (
          <div style={{ padding: "16px 24px", background: "rgba(139, 92, 246, 0.1)", color: "var(--primary)", borderRadius: 16, border: "1px solid var(--primary-glow)", marginBottom: 32, fontWeight: 600, fontSize: 14 }}>
            ✨ {message}
          </div>
        )}

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, marginBottom: 48 }}>
          <UsageCard label="Tài khoản MXH" current={usage?.accountCount ?? 0} max={billing?.limits?.maxAccounts ?? 5} icon="📱" />
          <UsageCard label="Tác vụ đồng thời" current={usage?.runningJobCountPeak ?? 0} max={billing?.limits?.maxRunningJobs ?? 1} icon="⚡" />
          <UsageCard label="Lượt Fetch hôm nay" current={usage?.fetchCount ?? 0} max={billing?.limits?.maxDailyFetches ?? 100} icon="🌐" />
        </section>

        <div style={{ marginBottom: 40 }}>
           <h2 style={{ fontSize: "1.75rem", fontWeight: 800, marginBottom: 12, letterSpacing: "-0.02em" }}>Chọn gói dịch vụ tối ưu</h2>
           <p style={{ color: "var(--text-dim)", fontSize: "1rem" }}>Nâng cấp để mở khóa các tính năng tự động hóa không giới hạn.</p>
        </div>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 32, alignItems: "stretch", marginBottom: 60 }}>
          {plans.map((plan) => {
            const isCurrent = plan.code === currentPlanCode;
            const isPro = plan.code === "PRO";
            return (
              <article
                key={plan.code}
                style={{
                  padding: "40px 32px",
                  borderRadius: 28,
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  background: isPro ? "rgba(139, 92, 246, 0.05)" : "rgba(255,255,255,0.01)",
                  border: isCurrent ? "2px solid var(--primary)" : isPro ? "1px solid var(--primary-glow)" : "1px solid var(--border)",
                  boxShadow: isPro ? "0 20px 40px rgba(139, 92, 246, 0.1)" : "none",
                  transition: "transform 0.2s ease"
                }}
              >
                {isPro && (
                  <div style={{ position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)", background: "var(--primary)", color: "#fff", fontSize: 11, fontWeight: 900, padding: "6px 16px", borderRadius: 999, letterSpacing: "0.1em", boxShadow: "0 0 20px var(--primary-glow)" }}>PHỔ BIẾN NHẤT</div>
                )}
                {isCurrent && !isPro && (
                  <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "var(--success)", color: "#fff", fontSize: 10, fontWeight: 800, padding: "4px 12px", borderRadius: 999 }}>GÓI HIỆN TẠI</div>
                )}

                <div style={{ marginBottom: 32 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>{plan.name}</div>
                  <div style={{ fontSize: "2.5rem", fontWeight: 800, display: "flex", alignItems: "baseline", gap: 8 }}>
                    {plan.code === "ENTERPRISE" ? "Liên hệ" : Number(plan.priceMonthly).toLocaleString("vi-VN") + "đ"}
                    {plan.code !== "ENTERPRISE" && <span style={{ fontSize: 14, fontWeight: 400, color: "var(--text-dim)" }}>/ tháng</span>}
                  </div>
                </div>

                <div style={{ flex: 1, display: "grid", gap: 16, marginBottom: 40 }}>
                   <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, fontWeight: 600 }}><span style={{ color: "var(--primary)" }}>✓</span> <b>{plan.maxAccounts}</b> Tài khoản tối đa</div>
                   <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, fontWeight: 600 }}><span style={{ color: "var(--primary)" }}>✓</span> <b>{plan.maxRunningJobs}</b> Tác vụ đồng thời</div>
                   <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, fontWeight: 600 }}><span style={{ color: "var(--primary)" }}>✓</span> <b>{plan.maxWorkspaces}</b> Workspace quản lý</div>
                   <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, fontWeight: 600 }}><span style={{ color: "var(--primary)" }}>✓</span> <b>{plan.maxDailyFetches.toLocaleString()}</b> Lượt Fetch / ngày</div>
                   {plan.features.slice(0, 3).map((f, idx) => (
                     <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "var(--text-dim)" }}><span style={{ color: "var(--success)" }}>●</span> {f}</div>
                   ))}
                </div>

                <button
                  className={`button ${isCurrent ? "button-soft" : "button-primary"}`}
                  style={{ width: "100%", height: 54, borderRadius: 16, fontWeight: 800, fontSize: 15 }}
                  disabled={isCurrent}
                  onClick={() => void handleCheckout(plan.code)}
                >
                  {isCurrent ? "Đang sử dụng" : plan.code === "FREE" ? "Gói cơ bản" : "Nâng cấp ngay 🚀"}
                </button>
              </article>
            );
          })}
        </section>

        <section style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: 24, padding: "40px" }}>
           <h3 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
             <span style={{ fontSize: 24 }}>💡</span> Lưu ý quan trọng về thanh toán
           </h3>
           <div style={{ color: "var(--text-dim)", lineHeight: 1.8, fontSize: "0.95rem" }}>
             <p style={{ marginBottom: 12 }}>• Hệ thống sẽ tự động gia hạn sau mỗi 30 ngày kể từ thời điểm nâng cấp thành công.</p>
             <p style={{ marginBottom: 12 }}>• Mọi giao dịch được xử lý bảo mật thông qua cổng thanh toán liên kết chính thức.</p>
             <p style={{ marginBottom: 12 }}>• Hạn mức Fetch dữ liệu sẽ được reset lại vào lúc <b>00:00</b> mỗi ngày theo giờ Việt Nam.</p>
             <p style={{ marginBottom: 0 }}>• Liên hệ bộ phận kỹ thuật nếu bạn có nhu cầu tùy chỉnh gói **Enterprise** riêng cho doanh nghiệp.</p>
           </div>
        </section>
      </main>
    </div>
  );
}
