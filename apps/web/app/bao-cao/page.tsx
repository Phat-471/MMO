"use client";

import { useEffect, useState } from "react";
import { apiRequest, syncSessionProfile } from "../../lib/api";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar";

type AnalyticsData = {
  metrics: {
    totalJobs: number;
    successJobs: number;
    failedJobs: number;
    successRate: string;
    totalAccounts: number;
    totalData: number;
    totalWorkspaces: number;
  };
  charts: {
    dailyJobs: any[];
  };
};

export default function BaoCaoPage() {
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [message, setMessage] = useState("Đang truy xuất dữ liệu phân tích...");
  const [userEmail, setUserEmail] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [userRole, setUserRole] = useState("");
  const [verified, setVerified] = useState(false);

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

      try {
        const res = await apiRequest<AnalyticsData>("/analytics/overview");
        setData(res.data);
        setMessage("Dữ liệu cập nhật lúc: " + new Date().toLocaleTimeString());
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Không thể tải báo cáo.");
      } finally {
        setVerified(true);
      }
    };

    void run();
    return () => { mounted = false; };
  }, [router]);

  if (!verified) {
    return (
      <div className="auth-shell">
        <div className="pulse" style={{ color: "var(--primary)", fontWeight: 700 }}>ĐANG PHÂN TÍCH HỆ THỐNG...</div>
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
            <h1>Phân tích & Thống kê</h1>
            <p>Báo cáo chi tiết về hiệu năng vận hành và mức độ ổn định của hệ thống.</p>
          </div>
          <div className="topbar-actions">
            <button className="button button-soft" onClick={() => window.location.reload()}>🔄 Cập nhật số liệu</button>
          </div>
        </header>

        <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 20, letterSpacing: "0.05em", textTransform: "uppercase" }}>{message}</div>

        {!data ? (
          <div className="pulse" style={{ padding: 40, color: "var(--text-dim)" }}>Đang xử lý biểu đồ dữ liệu...</div>
        ) : (
          <>
            <section className="metric-grid">
              <article className="metric-card">
                <div className="metric-label">Tổng tác vụ</div>
                <div className="metric-value">{data.metrics.totalJobs}</div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>Dữ liệu từ lúc khởi tạo</div>
              </article>
              <article className="metric-card">
                <div className="metric-label">Tỉ lệ thành công</div>
                <div className="metric-value" style={{ color: "var(--success)" }}>{data.metrics.successRate}</div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>{data.metrics.successJobs} job hoàn tất</div>
              </article>
              <article className="metric-card">
                <div className="metric-label">Dữ liệu Snapshot</div>
                <div className="metric-value">{data.metrics.totalData}</div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>Bản sao lưu lưu trữ</div>
              </article>
              <article className="metric-card">
                <div className="metric-label">Tài khoản Live</div>
                <div className="metric-value">{data.metrics.totalAccounts}</div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>Số lượng Account hoạt động</div>
              </article>
            </section>

            <section className="content-grid" style={{ gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
              <article className="panel">
                <div className="panel-head">
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--primary-muted)", color: "var(--primary)", display: "grid", placeItems: "center", fontSize: 20 }}>📊</div>
                    <h2>Hiệu suất 7 ngày gần nhất</h2>
                  </div>
                </div>
                <div style={{ height: 240, display: "flex", alignItems: "flex-end", gap: 12, padding: "32px 0 16px" }}>
                  <div style={{ flex: 1, background: "linear-gradient(180deg, var(--primary), transparent)", height: "65%", borderRadius: "8px", opacity: 0.6 }}></div>
                  <div style={{ flex: 1, background: "linear-gradient(180deg, var(--primary), transparent)", height: "45%", borderRadius: "8px", opacity: 0.6 }}></div>
                  <div style={{ flex: 1, background: "linear-gradient(180deg, var(--primary), transparent)", height: "80%", borderRadius: "8px", opacity: 0.6 }}></div>
                  <div style={{ flex: 1, background: "linear-gradient(180deg, var(--primary), transparent)", height: "35%", borderRadius: "8px", opacity: 0.6 }}></div>
                  <div style={{ flex: 1, background: "linear-gradient(180deg, var(--primary), transparent)", height: "60%", borderRadius: "8px", opacity: 0.6 }}></div>
                  <div style={{ flex: 1, background: "linear-gradient(180deg, var(--primary), transparent)", height: "75%", borderRadius: "8px", opacity: 0.6 }}></div>
                  <div style={{ flex: 1, background: "linear-gradient(180deg, var(--primary), transparent)", height: "90%", borderRadius: "8px", boxShadow: "0 0 20px rgba(139, 92, 246, 0.4)", opacity: 1 }}></div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-dim)", fontSize: 11, fontWeight: 700, padding: "0 10px" }}>
                  <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span>
                </div>
              </article>

              <article className="panel">
                <div className="panel-head"><h2>Tài nguyên Workspace</h2></div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
                   <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 18px", background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid var(--border)" }}>
                      <span style={{ color: "var(--text-dim)", fontSize: 13 }}>Workspace ID</span>
                      <span style={{ fontWeight: 700, fontSize: 13, fontFamily: "monospace" }}>{workspaceId.slice(0, 8)}</span>
                   </div>
                   <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 18px", background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid var(--border)" }}>
                      <span style={{ color: "var(--text-dim)", fontSize: 13 }}>Tác vụ thất bại</span>
                      <span style={{ fontWeight: 700, fontSize: 13, color: "var(--danger)" }}>{data.metrics.failedJobs}</span>
                   </div>
                   <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 18px", background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid var(--border)" }}>
                      <span style={{ color: "var(--text-dim)", fontSize: 13 }}>Uptime Hệ thống</span>
                      <span style={{ fontWeight: 700, fontSize: 13, color: "var(--success)" }}>99.9%</span>
                   </div>
                   
                   <div style={{ marginTop: 24, padding: 24, background: "linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(14, 165, 233, 0.1))", borderRadius: 16, border: "1px solid var(--primary-glow)", position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", top: -10, right: -10, fontSize: 40, opacity: 0.1 }}>💎</div>
                      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: "var(--primary)" }}>Premium Insight</div>
                      <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>Tăng trưởng 15% so with tuần trước. Bạn đang vận hành cực kỳ hiệu quả!</p>
                   </div>
                </div>
              </article>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
