"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiRequest, saveSession } from "../../lib/api";

type LoginResponse = {
  user: {
    id: string;
    email: string;
    role: "USER" | "ADMIN";
  };
  workspace: {
    id: string;
  } | null;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
};

export default function DangNhapPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Chào mừng bạn quay trở lại!");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const res = await apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });

      if (!res.data.workspace) {
        throw new Error("Tài khoản chưa có không gian làm việc. Vui lòng liên hệ hỗ trợ.");
      }

      saveSession({
        accessToken: res.data.accessToken,
        refreshToken: res.data.refreshToken,
        workspaceId: res.data.workspace.id,
        email: res.data.user.email,
        userId: res.data.user.id,
        role: res.data.user.role
      });

      setMessage("Đăng nhập thành công! Đang chuyển hướng...");
      router.push("/");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Đăng nhập thất bại. Kiểm tra lại thông tin.");
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", position: "relative", overflow: "hidden", background: "#050505" }}>
      {/* Background Decor */}
      <div style={{ position: "absolute", top: "20%", left: "10%", width: "40vw", height: "40vw", background: "var(--primary)", filter: "blur(150px)", opacity: 0.15, borderRadius: "50%", pointerEvents: "none" }}></div>
      <div style={{ position: "absolute", bottom: "10%", right: "5%", width: "30vw", height: "30vw", background: "var(--accent)", filter: "blur(120px)", opacity: 0.1, borderRadius: "50%", pointerEvents: "none" }}></div>
      <div className="bg-grid"></div>

      <div className="auth-card" style={{ width: "100%", maxWidth: 440, padding: "48px 40px", borderRadius: 28, background: "rgba(20, 20, 25, 0.7)", backdropFilter: "blur(20px)", border: "1px solid rgba(255, 255, 255, 0.08)", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)", position: "relative", zIndex: 1, margin: 20 }}>
        <div className="auth-brand" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 40 }}>
          <div className="brand-mark" style={{ width: 64, height: 64, background: "var(--primary)", borderRadius: 18, display: "grid", placeItems: "center", fontSize: 24, fontWeight: 900, color: "#fff", marginBottom: 20, boxShadow: "0 0 30px var(--primary-glow)" }}>M</div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0 0 8px 0", color: "#fff" }}>Đăng nhập hệ thống</h1>
          <p style={{ fontSize: "0.95rem", color: "var(--text-dim)", margin: 0 }}>Vui lòng nhập thông tin để truy cập Dashboard</p>
        </div>

        {message && (
          <div style={{ padding: "12px 16px", borderRadius: 12, background: message.includes("thành công") ? "rgba(16, 185, 129, 0.1)" : "rgba(139, 92, 246, 0.1)", color: message.includes("thành công") ? "var(--success)" : "var(--primary)", fontSize: "0.9rem", fontWeight: 600, textAlign: "center", marginBottom: 24, border: "1px solid rgba(255,255,255,0.05)" }}>
            {message}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="input-group">
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-dim)", marginBottom: 10 }}>Địa chỉ Email</label>
            <div style={{ position: "relative" }}>
              <input 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                type="email" 
                placeholder="tenban@mien.vn" 
                required
                style={{ width: "100%", height: 54, padding: "0 20px 0 52px", borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", outline: "none", fontSize: "1rem", transition: "all 0.2s" }}
              />
              <span style={{ position: "absolute", left: 20, top: 16, fontSize: 18, opacity: 0.5 }}>📧</span>
            </div>
          </div>

          <div className="input-group">
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-dim)", marginBottom: 10 }}>Mật khẩu</label>
            <div style={{ position: "relative" }}>
              <input 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                type="password" 
                placeholder="••••••••" 
                required
                style={{ width: "100%", height: 54, padding: "0 20px 0 52px", borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", outline: "none", fontSize: "1rem", transition: "all 0.2s" }}
              />
              <span style={{ position: "absolute", left: 20, top: 16, fontSize: 18, opacity: 0.5 }}>🔒</span>
            </div>
          </div>

          <button 
            className="button button-primary" 
            type="submit" 
            disabled={loading}
            style={{ height: 58, borderRadius: 18, fontSize: "1rem", fontWeight: 800, marginTop: 8, boxShadow: "0 10px 25px var(--primary-glow)" }}
          >
            {loading ? "Đang xác thực..." : "Đăng nhập ngay 🚀"}
          </button>
        </form>

        <div className="auth-footer" style={{ marginTop: 32, textAlign: "center", fontSize: "0.9rem", color: "var(--text-dim)" }}>
          Bạn chưa có tài khoản?{" "}
          <Link href="/dang-ky" style={{ color: "var(--primary)", fontWeight: 700, textDecoration: "none" }}>Đăng ký miễn phí</Link>
        </div>
      </div>
    </div>
  );
}
