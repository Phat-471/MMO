"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

const plans = [
  {
    name: "Cơ bản (FREE)",
    price: "0đ",
    features: [
      "Quản lý tối đa 5 tài khoản",
      "100 tác vụ/tháng",
      "Công cụ cơ bản (FB, TikTok)",
      "Hỗ trợ cộng đồng"
    ],
    cta: "Bắt đầu ngay",
    type: "FREE"
  },
  {
    name: "Chuyên nghiệp (PRO)",
    price: "199.000đ",
    period: "/tháng",
    features: [
      "Quản lý 50 tài khoản",
      "Tác vụ không giới hạn",
      "AI Content Studio (Shopee PRO)",
      "Hỗ trợ ưu tiên 24/7",
      "Báo cáo chuyên sâu"
    ],
    cta: "Nâng cấp PRO",
    type: "PRO",
    popular: true
  },
  {
    name: "Doanh nghiệp (ULTIMATE)",
    price: "499.000đ",
    period: "/tháng",
    features: [
      "Tài khoản không giới hạn",
      "API riêng cho hệ thống",
      "Tùy chỉnh công cụ theo yêu cầu",
      "Quản lý nhóm (Team)",
      "Bảo mật đa tầng"
    ],
    cta: "Liên hệ ngay",
    type: "ULTIMATE"
  }
];

export default function BangGiaPage() {
  const router = useRouter();

  return (
    <div className="auth-shell" style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 20px" }}>
      <header style={{ textAlign: "center", marginBottom: 48 }}>
        <h1 style={{ fontSize: 32, marginBottom: 12 }}>Chọn gói dịch vụ MMO</h1>
        <p style={{ color: "var(--muted)" }}>Nâng tầm công việc của bạn với các công cụ tự động hóa chuyên sâu.</p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
        {plans.map((plan) => (
          <article 
            key={plan.name} 
            className="panel" 
            style={{ 
              display: "flex", 
              flexDirection: "column", 
              border: plan.popular ? "2px solid var(--primary)" : "1px solid var(--border)",
              position: "relative"
            }}
          >
            {plan.popular && (
              <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "var(--primary)", color: "#fff", padding: "2px 12px", borderRadius: 12, fontSize: 10, fontWeight: 700 }}>
                PHỔ BIẾN NHẤT
              </div>
            )}
            <div className="panel-head">
              <h2>{plan.name}</h2>
            </div>
            <div style={{ margin: "24px 0" }}>
              <span style={{ fontSize: 32, fontWeight: 700 }}>{plan.price}</span>
              <span style={{ color: "var(--muted)" }}>{plan.period}</span>
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px 0", flex: 1 }}>
              {plan.features.map(f => (
                <li key={f} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 14 }}>
                  ✅ {f}
                </li>
              ))}
            </ul>
            <Link 
              href={`/dang-ky?plan=${plan.type}`}
              className={`button ${plan.popular ? "button-primary" : "button-soft"}`} 
              style={{ textAlign: "center" }}
            >
              {plan.cta}
            </Link>
          </article>
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: 40 }}>
        <Link href="/dang-nhap" style={{ color: "var(--muted)", fontSize: 14 }}>Trở về trang Đăng nhập</Link>
      </div>
    </div>
  );
}
