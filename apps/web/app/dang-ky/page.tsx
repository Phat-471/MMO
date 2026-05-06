"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiRequest, saveSession } from "../../lib/api";

type RegisterResponse = {
  user: {
    id: string;
    email: string;
    role: "USER" | "ADMIN";
  };
  workspace: {
    id: string;
  };
  accessToken: string;
  refreshToken: string;
  tokenType: string;
};

function DangKyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get("plan") || "FREE";
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("Không gian MMO của tôi");
  const [message, setMessage] = useState(`Bạn đang đăng ký gói: ${selectedPlan}`);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const res = await apiRequest<RegisterResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, workspaceName })
      });

      saveSession({
        accessToken: res.data.accessToken,
        refreshToken: res.data.refreshToken,
        workspaceId: res.data.workspace.id,
        email: res.data.user.email,
        userId: res.data.user.id,
        role: res.data.user.role
      });

      setMessage("Đăng ký thành công! Đang chuẩn bị không gian làm việc...");
      router.push("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Đăng ký thất bại. Email có thể đã tồn tại.");
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", position: "relative", overflow: "hidden", background: "#050505" }}>
      {/* Background Decor */}
      <div style={{ position: "absolute", top: "10%", right: "10%", width: "50vw", height: "50vw", background: "var(--primary)", filter: "blur(180px)", opacity: 0.1, borderRadius: "50%", pointerEvents: "none" }}></div>
      <div style={{ position: "absolute", bottom: "-5%", left: "5%", width: "40vw", height: "40vw", background: "var(--accent)", filter: "blur(150px)", opacity: 0.1, borderRadius: "50%", pointerEvents: "none" }}></div>
      <div className="bg-grid"></div>

      <div className="auth-card" style={{ width: "100%", maxWidth: 480, padding: "48px 40px", borderRadius: 32, background: "rgba(20, 20, 25, 0.75)", backdropFilter: "blur(25px)", border: "1px solid rgba(255, 255, 255, 0.1)", boxShadow: "0 30px 60px -12px rgba(0, 0, 0, 0.6)", position: "relative", zIndex: 1, margin: 20 }}>
        <div className="auth-brand" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 40 }}>
          <div className="brand-mark" style={{ width: 64, height: 64, background: "linear-gradient(135deg, var(--primary), var(--accent))", borderRadius: 20, display: "grid", placeItems: "center", fontSize: 26, fontWeight: 900, color: "#fff", marginBottom: 20, boxShadow: "0 0 35px var(--primary-glow)" }}>M</div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0 0 8px 0", color: "#fff" }}>Bắt đầu hành trình</h1>
          <p style={{ fontSize: "0.95rem", color: "var(--text-dim)", margin: 0 }}>Tham gia cộng đồng MMO lớn mạnh nhất</p>
        </div>

        {message && (
          <div style={{ padding: "14px 18px", borderRadius: 14, background: message.includes("thành công") ? "rgba(16, 185, 129, 0.1)" : "rgba(139, 92, 246, 0.1)", color: message.includes("thành công") ? "var(--success)" : "var(--primary)", fontSize: "0.9rem", fontWeight: 600, textAlign: "center", marginBottom: 28, border: "1px solid rgba(255,255,255,0.06)" }}>
            {message}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div className="input-group">
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-dim)", marginBottom: 10 }}>Địa chỉ Email</label>
            <div style={{ position: "relative" }}>
              <input 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                type="email" 
                placeholder="tenban@gmail.com" 
                required
                style={{ width: "100%", height: 56, padding: "0 20px 0 54px", borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", outline: "none", fontSize: "1rem", transition: "all 0.2s" }}
              />
              <span style={{ position: "absolute", left: 20, top: 16, fontSize: 18, opacity: 0.6 }}>📧</span>
            </div>
          </div>

          <div className="input-group">
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-dim)", marginBottom: 10 }}>Mật khẩu bảo mật</label>
            <div style={{ position: "relative" }}>
              <input 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                type="password" 
                placeholder="Tối thiểu 8 ký tự" 
                required
                style={{ width: "100%", height: 56, padding: "0 20px 0 54px", borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", outline: "none", fontSize: "1rem", transition: "all 0.2s" }}
              />
              <span style={{ position: "absolute", left: 20, top: 16, fontSize: 18, opacity: 0.6 }}>🔒</span>
            </div>
          </div>

          <div className="input-group">
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-dim)", marginBottom: 10 }}>Tên Workspace</label>
            <div style={{ position: "relative" }}>
              <input 
                value={workspaceName} 
                onChange={(e) => setWorkspaceName(e.target.value)} 
                type="text" 
                placeholder="Ví dụ: Team MMO Pro" 
                required
                style={{ width: "100%", height: 56, padding: "0 20px 0 54px", borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", outline: "none", fontSize: "1rem", transition: "all 0.2s" }}
              />
              <span style={{ position: "absolute", left: 20, top: 16, fontSize: 18, opacity: 0.6 }}>🏢</span>
            </div>
          </div>

          <button 
            className="button button-primary" 
            type="submit" 
            disabled={loading}
            style={{ height: 60, borderRadius: 18, fontSize: "1.05rem", fontWeight: 900, marginTop: 12, boxShadow: "0 15px 30px var(--primary-glow)", textTransform: "uppercase", letterSpacing: "0.02em" }}
          >
            {loading ? "Đang xử lý..." : "Khởi tạo tài khoản ✨"}
          </button>
        </form>

        <div className="auth-footer" style={{ marginTop: 36, textAlign: "center", fontSize: "0.95rem", color: "var(--text-dim)" }}>
          Đã có tài khoản thành viên?{" "}
          <Link href="/dang-nhap" style={{ color: "var(--primary)", fontWeight: 700, textDecoration: "none" }}>Đăng nhập ngay</Link>
        </div>
      </div>
    </div>
  );
}

export default function DangKyPage() {
  return (
    <Suspense fallback={null}>
      <DangKyContent />
    </Suspense>
  );
}
