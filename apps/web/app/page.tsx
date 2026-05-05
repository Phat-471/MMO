"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequest, syncSessionProfile } from "../lib/api";
import {
  formatJobMode,
  formatJobType,
  formatPlatform
} from "../lib/labels";
import { getSocket, joinWorkspace } from "../lib/socket";
import Sidebar from "../components/Sidebar";

function StatusBadge({ status }: { status: string; type: "job" | "account" }) {
  const labels: Record<string, string> = {
    QUEUED: "Đang chờ",
    RUNNING: "Đang chạy",
    DONE: "Hoàn tất",
    FAILED: "Lỗi",
    PAUSED: "Tạm dừng",
    ALIVE: "Live",
    DEAD: "Dead",
    LIMITED: "Hạn chế",
    PENDING: "Chờ duyệt",
  };

  const getVariant = () => {
    const s = status.toUpperCase();
    if (s === "RUNNING" || s === "ALIVE" || s === "DONE") return "badge-green";
    if (s === "FAILED" || s === "DEAD") return "badge-red";
    if (s === "PAUSED" || s === "LIMITED" || s === "QUEUED") return "badge-amber";
    return "badge-soft";
  };

  return <span className={`badge ${getVariant()}`} style={{ fontWeight: 800 }}>{labels[status.toUpperCase()] || status}</span>;
}

type SummaryData = {
  totalAccounts: number;
  totalJobs: number;
  fetchToday: number;
  activePlan: string;
  usageLimit: number;
  usageUsed: number;
  unreadNotifications: number;
};

type RecentJob = {
  id: string;
  jobType: string;
  platform: string;
  mode: string;
  status: string;
};

type RiskAccount = {
  id: string;
  label: string;
  platform: string;
  status: string;
  groupName: string | null;
};

export default function HomePage() {
  const router = useRouter();
  const [summary, setSummary] = useState<SummaryData>({
    totalAccounts: 0,
    totalJobs: 0,
    fetchToday: 0,
    activePlan: "FREE",
    usageLimit: 100,
    usageUsed: 0,
    unreadNotifications: 0
  });
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [riskItems, setRiskItems] = useState<RiskAccount[]>([]);
  const [message, setMessage] = useState("Đang tải dữ liệu...");
  const [workspaceId, setWorkspaceId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [verified, setVerified] = useState(false);
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const session = await syncSessionProfile();
      if (!mounted) return;
      if (!session) { router.push("/dang-nhap"); return; }
      setUserEmail(session.email);
      setWorkspaceId(session.workspaceId);
      setUserRole(session.role);
      setVerified(true);
      const socket = getSocket();
      joinWorkspace(session.workspaceId);
      socket.on("job_status", (data: { jobId: string; status: string }) => {
        setRecentJobs((prev) => prev.map((j) => (j.id === data.jobId ? { ...j, status: data.status } : j)));
      });
      Promise.all([
        apiRequest<SummaryData>("/dashboard/summary"),
        apiRequest<RecentJob[]>("/dashboard/recent-jobs"),
        apiRequest<RiskAccount[]>("/dashboard/risk-items")
      ])
        .then(([summaryRes, jobsRes, riskRes]) => {
          if (!mounted) return;
          setSummary(summaryRes.data);
          setRecentJobs(jobsRes.data);
          setRiskItems(riskRes.data);
          setMessage("");
        })
        .catch((error: Error) => { if (mounted) setMessage(error.message); });
    };
    void run();
    return () => {
      mounted = false;
      const socket = getSocket();
      socket.off("job_status");
    };
  }, [router]);

  async function cancelJob(jobId: string) {
    if (!confirm("Bạn có chắc chắn muốn hủy tác vụ này?")) return;
    try {
      const res = await apiRequest(`/jobs/${jobId}/cancel`, { method: "POST" });
      setMessage(res.message);
      const jobsRes = await apiRequest<RecentJob[]>("/dashboard/recent-jobs");
      setRecentJobs(jobsRes.data);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Hủy tác vụ thất bại."); }
  }

  if (!verified) return <div className="auth-shell"><div className="pulse" style={{ color: "var(--primary)", fontWeight: 700 }}>ĐANG KHỞI TẠO HỆ THỐNG...</div></div>;

  const usagePercent = Math.min(Math.round((summary.usageUsed / summary.usageLimit) * 100), 100);

  return (
    <div className="app-shell">
      <div className="bg-grid"></div>
      <Sidebar userEmail={userEmail} workspaceId={workspaceId} userRole={userRole} />

      <main className="main">
        <header className="topbar">
          <div>
            <h1 style={{ marginBottom: 4 }}>Xin chào, {userEmail.split("@")[0]}!</h1>
            <p style={{ color: "var(--text-dim)", fontSize: "1.1rem" }}>Hệ thống MMO của bạn hiện tại đang vận hành ổn định.</p>
          </div>
          <div className="topbar-actions">
             <div style={{ display: "flex", alignItems: "center", gap: 16, background: "rgba(255,255,255,0.02)", padding: "8px 20px", borderRadius: 16, border: "1px solid var(--border)" }}>
               <div style={{ textAlign: "right" }}>
                 <div style={{ fontSize: 10, color: "var(--text-dim)", fontWeight: 800, textTransform: "uppercase" }}>Gói cước hiện tại</div>
                 <div style={{ fontSize: 13, fontWeight: 800, color: "var(--primary)" }}>{summary.activePlan === "FREE" ? "MIỄN PHÍ" : summary.activePlan}</div>
               </div>
               <div style={{ width: 1, height: 24, background: "var(--border)" }}></div>
               <Link href="/thanh-toan" style={{ fontSize: 13, fontWeight: 700, color: "#fff", textDecoration: "none" }}>💎 Nâng cấp</Link>
             </div>
             <Link className="button button-primary" style={{ borderRadius: 12, height: 44, padding: "0 24px", fontWeight: 800 }} href="/tao-tac-vu">⚡ Automation Mới</Link>
          </div>
        </header>

        {message && (
          <div style={{ padding: "16px 24px", background: "rgba(139, 92, 246, 0.1)", color: "var(--primary)", borderRadius: 16, border: "1px solid var(--primary-glow)", marginBottom: 32, fontWeight: 700 }}>
            ✨ {message}
          </div>
        )}

        <section className="metric-grid" style={{ marginBottom: 48 }}>
           <article className="metric-card" style={{ border: "1px solid var(--primary-glow)" }}>
             <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <div className="metric-label">Tài khoản MMO</div>
                <div style={{ fontSize: 24 }}>📱</div>
             </div>
             <div className="metric-value">{summary.totalAccounts}</div>
             <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 8 }}>Tăng 12% so với tuần trước</div>
           </article>

           <article className="metric-card">
             <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <div className="metric-label">Tác vụ thực thi</div>
                <div style={{ fontSize: 24 }}>⚡</div>
             </div>
             <div className="metric-value">{summary.totalJobs}</div>
             <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 8 }}>3 tác vụ đang chạy đồng thời</div>
           </article>

           <article className="metric-card">
             <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <div className="metric-label">Hạn mức sử dụng</div>
                <div style={{ fontSize: 24 }}>🔄</div>
             </div>
             <div className="metric-value">{summary.usageUsed} <span style={{ fontSize: 16, color: "var(--text-dim)", fontWeight: 400 }}>/ {summary.usageLimit}</span></div>
             <div style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, marginTop: 16, overflow: "hidden" }}>
                <div style={{ width: `${usagePercent}%`, height: "100%", background: "var(--primary)", boxShadow: "0 0 10px var(--primary-glow)" }}></div>
             </div>
           </article>

           <article className="metric-card">
             <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <div className="metric-label">Thông báo mới</div>
                <div style={{ fontSize: 24 }}>🔔</div>
             </div>
             <div className="metric-value">{summary.unreadNotifications}</div>
             <div style={{ fontSize: 12, color: "var(--success)", marginTop: 8, fontWeight: 700 }}>● Hệ thống bình thường</div>
           </article>
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 32, alignItems: "start" }}>
           <section className="panel" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "24px 32px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.01)" }}>
                 <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>Lịch sử Automation gần đây</h2>
                 <Link href="/du-lieu" style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)", textDecoration: "none" }}>Xem tất cả →</Link>
              </div>
              <div style={{ padding: "0 12px" }}>
                <table className="table" style={{ borderCollapse: "separate", borderSpacing: "0 8px" }}>
                   <thead>
                     <tr>
                       <th style={{ paddingLeft: 20 }}>Mã số</th>
                       <th>Công cụ</th>
                       <th>Nền tảng</th>
                       <th>Trạng thái</th>
                       <th style={{ textAlign: "right", paddingRight: 20 }}>Thao tác</th>
                     </tr>
                   </thead>
                   <tbody>
                     {recentJobs.length ? recentJobs.map(job => (
                       <tr key={job.id}>
                         <td style={{ paddingLeft: 20, fontWeight: 700 }}>#{job.id.slice(0, 6)}</td>
                         <td>{formatJobType(job.jobType)}</td>
                         <td>{formatPlatform(job.platform)}</td>
                         <td><StatusBadge status={job.status} type="job" /></td>
                         <td style={{ textAlign: "right", paddingRight: 20 }}>
                           {(job.status === "QUEUED" || job.status === "RUNNING") ? (
                             <button onClick={() => cancelJob(job.id)} className="button" style={{ height: 32, padding: "0 12px", fontSize: 11, background: "rgba(244, 63, 94, 0.1)", color: "var(--danger)", border: "1px solid rgba(244, 63, 94, 0.2)" }}>Dừng</button>
                           ) : (
                             <span style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 700 }}>Đã xong</span>
                           )}
                         </td>
                       </tr>
                     )) : (
                       <tr><td colSpan={5} style={{ textAlign: "center", padding: "60px 0", color: "var(--text-dim)" }}>Chưa có tác vụ nào được thực thi.</td></tr>
                     )}
                   </tbody>
                </table>
              </div>
           </section>

           <section style={{ display: "grid", gap: 24 }}>
              <article className="panel" style={{ padding: 28, background: "linear-gradient(135deg, rgba(244, 63, 94, 0.05), transparent)", border: "1px solid rgba(244, 63, 94, 0.2)" }}>
                 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--danger)" }}>Cảnh báo rủi ro</h2>
                    <span style={{ fontSize: 20 }}>⚠️</span>
                 </div>
                 <div style={{ display: "grid", gap: 12 }}>
                    {riskItems.length ? riskItems.map(item => (
                      <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 16, background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "1px solid var(--border)" }}>
                         <div>
                            <div style={{ fontWeight: 800, fontSize: 13 }}>{item.label}</div>
                            <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>{formatPlatform(item.platform)}</div>
                         </div>
                         <StatusBadge status={item.status} type="account" />
                      </div>
                    )) : (
                      <div style={{ textAlign: "center", padding: "32px 0" }}>
                         <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
                         <p style={{ fontSize: 13, color: "var(--text-dim)" }}>Tất cả tài khoản đều an toàn.</p>
                      </div>
                    )}
                 </div>
                 <Link href="/tai-khoan" className="button button-soft" style={{ width: "100%", marginTop: 24, borderRadius: 12, height: 44, fontWeight: 700 }}>Kiểm tra toàn bộ</Link>
              </article>

              <article className="panel" style={{ padding: 28, background: "linear-gradient(135deg, rgba(139, 92, 246, 0.05), transparent)" }}>
                 <div style={{ marginBottom: 20 }}>
                    <h2 style={{ fontSize: "1.1rem", fontWeight: 800 }}>Mẹo vận hành</h2>
                 </div>
                 <div style={{ display: "grid", gap: 16 }}>
                    <div style={{ display: "flex", gap: 12 }}>
                       <div style={{ fontSize: 18 }}>💡</div>
                       <p style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.6 }}>Nên kết nối ít nhất 5 tài khoản mỗi nền tảng để tối ưu hóa hiệu suất chạy Automation.</p>
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                       <div style={{ fontSize: 18 }}>🛡️</div>
                       <p style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.6 }}>Luôn sử dụng Proxy riêng cho mỗi nhóm tài khoản Facebook để tránh bị quét diện rộng.</p>
                    </div>
                 </div>
              </article>
           </section>
        </div>
      </main>
    </div>
  );
}
