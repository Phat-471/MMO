"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutSession } from "../lib/api";
import { useRouter } from "next/navigation";

interface SidebarProps {
  userEmail: string;
  workspaceId?: string;
  userRole?: string;
}

export default function Sidebar({ userEmail, workspaceId, userRole }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await logoutSession();
    router.push("/dang-nhap");
  }

  const navItems = [
    { label: "Bảng điều khiển", href: "/", icon: "🏠", category: "Tổng quan" },
    { label: "Báo cáo hiệu suất", href: "/bao-cao", icon: "📊", category: "Tổng quan" },
    
    { label: "Tài khoản MMO", href: "/tai-khoan", icon: "👥", category: "Quản lý" },
    { label: "Thư viện công cụ", href: "/cong-cu", icon: "🛠️", category: "Quản lý" },
    { label: "Lưu trữ dữ liệu", href: "/du-lieu", icon: "🗄️", category: "Quản lý" },
    
    { label: "Khởi tạo Automation", href: "/tao-tac-vu", icon: "⚡", category: "Vận hành" },
    { label: "Shopee Affiliate", href: "/shopee-aff", icon: "🧡", category: "Vận hành" },
    
    { label: "Gói cước & Billing", href: "/thanh-toan", icon: "💳", category: "Tài khoản" },
    { label: "Thông báo", href: "/thong-bao", icon: "🔔", category: "Tài khoản" },
    { label: "Cài đặt", href: "/cai-dat", icon: "⚙️", category: "Tài khoản" },
  ];

  const categories = ["Tổng quan", "Quản lý", "Vận hành", "Tài khoản"];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">M</div>
        <div>
          <div className="brand-title">MMO CONTROL</div>
          <div className="brand-sub">Hệ điều hành MMO</div>
        </div>
      </div>

      <nav className="nav">
        {categories.map((cat) => (
          <div key={cat}>
            <div style={{ padding: "0 16px", color: "var(--text-dim)", fontSize: 11, fontWeight: 700, margin: cat === "Tổng quan" ? "0 0 8px" : "20px 0 8px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {cat}
            </div>
            {navItems.filter(item => item.category === cat).map((item) => (
              <Link 
                key={item.href} 
                className={`nav-item ${pathname === item.href ? "active" : ""}`} 
                href={item.href}
              >
                <span style={{ marginRight: 8 }}>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-note">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--primary-glow)", display: "grid", placeItems: "center", fontSize: 12 }}>
            👤
          </div>
          <div>
            <div style={{ fontWeight: 700, color: "#fff", fontSize: 13 }}>{userEmail.split("@")[0]}</div>
            <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
              {workspaceId ? `WS: ${workspaceId.slice(0, 8)}` : "No Workspace"}
            </div>
          </div>
        </div>
        
        {userRole === "ADMIN" && (
          <Link className="button button-soft" href="/admin" style={{ width: "100%", height: 32, fontSize: 11, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
            Vào khu admin
          </Link>
        )}

        <button type="button" className="button button-ghost" style={{ width: "100%", height: 32, fontSize: 12 }} onClick={handleLogout}>
          🚪 Đăng xuất
        </button>
      </div>
    </aside>
  );
}
