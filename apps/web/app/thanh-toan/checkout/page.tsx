"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../../components/Sidebar";
import { apiRequest, syncSessionProfile } from "../../../lib/api";

type CheckoutDetail = {
  id: string;
  checkoutCode: string;
  workspaceId: string;
  planCode: "FREE" | "STARTER" | "PRO" | "ENTERPRISE";
  planName: string;
  amount: number;
  status: "PENDING" | "PAID" | "CANCELED" | "EXPIRED";
  transferContent: string;
  bankName: string;
  bankCode: string;
  accountName: string;
  accountNumber: string;
  qrUrl: string | null;
  createdAt: string;
  paidAt: string | null;
};

type CheckoutResponse = {
  message: string;
  data: CheckoutDetail;
};

function formatMoney(value: number) {
  return value.toLocaleString("vi-VN");
}

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkoutId = searchParams.get("checkoutId");
  const workspaceIdParam = searchParams.get("workspaceId");
  const [workspaceId, setWorkspaceId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [detail, setDetail] = useState<CheckoutDetail | null>(null);
  const [message, setMessage] = useState("Đang chuẩn bị phiên thanh toán...");
  const [verified, setVerified] = useState(false);
  const [copied, setCopied] = useState(false);
  const emptyCheckoutMessage = checkoutId ? "Không tìm thấy giao dịch thanh toán." : "Thiếu mã phiên thanh toán.";

  const statusLabel = useMemo(() => {
    if (!detail) return "";
    return detail.status === "PENDING" ? "Chờ chuyển khoản" : detail.status === "PAID" ? "Đã thanh toán" : detail.status === "CANCELED" ? "Đã hủy" : "Hết hạn";
  }, [detail]);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      const session = await syncSessionProfile();
      if (!mounted) return;

      if (!session) {
        router.push("/dang-nhap");
        return;
      }

      if (!checkoutId) {
        setMessage("Thiếu mã phiên thanh toán.");
        setVerified(true);
        return;
      }

      setUserEmail(session.email);
      setWorkspaceId(workspaceIdParam || session.workspaceId);
      setUserRole(session.role);

      try {
        const checkoutWorkspaceId = workspaceIdParam || session.workspaceId;
        const res = await apiRequest<CheckoutResponse>(`/billing/checkout/${checkoutId}?workspaceId=${checkoutWorkspaceId}`);
        if (!mounted) return;
        if (res.data?.data) {
          setDetail(res.data.data);
          setMessage("");
        } else {
          setDetail(null);
          setMessage(res.data?.message || emptyCheckoutMessage);
        }
      } catch (error) {
        if (mounted) setMessage(error instanceof Error ? error.message : emptyCheckoutMessage);
      } finally {
        if (mounted) setVerified(true);
      }
    };

    void run();

    return () => {
      mounted = false;
    };
  }, [checkoutId, router]);

  async function copyContent() {
    if (!detail) return;
    await navigator.clipboard.writeText(detail.transferContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!verified) {
    return (
      <div className="auth-shell">
        <div className="pulse" style={{ color: "var(--primary)", fontWeight: 700 }}>
          Đang mở trang checkout...
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="bg-grid" />
      <Sidebar userEmail={userEmail} workspaceId={workspaceId || undefined} userRole={userRole} />

      <main className="main">
        <header className="topbar">
          <div>
            <h1>Checkout thanh toán</h1>
            <p>Xác nhận gói dịch vụ, số tiền và quét QR theo đúng nội dung chuyển khoản.</p>
          </div>
          <div className="topbar-actions">
            <Link className="button button-soft" href="/thanh-toan">
              Quay lại bảng giá
            </Link>
          </div>
        </header>

        {message && (
          <div style={{ background: "rgba(139, 92, 246, 0.1)", color: "var(--primary)", padding: "16px 24px", borderRadius: 16, marginBottom: 28, fontWeight: 600, border: "1px solid var(--primary-glow)" }}>
            {message}
          </div>
        )}

        {detail ? (
          <section style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 28, alignItems: "start" }}>
            <article className="panel" style={{ padding: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: 24 }}>
                <div>
                  <div style={{ color: "var(--text-dim)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Thông tin đơn hàng</div>
                  <h2 style={{ fontSize: "1.35rem", fontWeight: 900, color: "#fff", marginTop: 6 }}>{detail.planName}</h2>
                </div>
                <div className={`badge ${detail.status === "PAID" ? "badge-green" : "badge-soft"}`} style={{ fontSize: 11, fontWeight: 800 }}>
                  {statusLabel}
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 700 }}>Mã phiên</td>
                      <td>{detail.checkoutCode}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700 }}>Workspace</td>
                      <td>{detail.workspaceId}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700 }}>Gói dịch vụ</td>
                      <td>{detail.planCode}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700 }}>Số tiền</td>
                      <td style={{ color: "var(--primary)", fontWeight: 900 }}>{formatMoney(detail.amount)}đ</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700 }}>Ngân hàng</td>
                      <td>{detail.bankName}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700 }}>Chủ tài khoản</td>
                      <td>{detail.accountName}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700 }}>Số tài khoản</td>
                      <td>{detail.accountNumber}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700 }}>Nội dung CK</td>
                      <td>{detail.transferContent}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700 }}>Trạng thái</td>
                      <td>{statusLabel}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700 }}>Tạo lúc</td>
                      <td>{new Date(detail.createdAt).toLocaleString("vi-VN")}</td>
                    </tr>
                    {detail.paidAt ? (
                      <tr>
                        <td style={{ fontWeight: 700 }}>Thanh toán lúc</td>
                        <td>{new Date(detail.paidAt).toLocaleString("vi-VN")}</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
                <button className="button button-primary" onClick={copyContent} style={{ height: 44, borderRadius: 12, fontWeight: 800 }}>
                  {copied ? "Đã sao chép" : "Sao chép nội dung"}
                </button>
                <Link className="button button-soft" href="/thanh-toan" style={{ height: 44, borderRadius: 12, fontWeight: 800, display: "inline-flex", alignItems: "center" }}>
                  Đổi gói khác
                </Link>
              </div>
            </article>

            <article className="panel" style={{ padding: 28, position: "sticky", top: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
                <div>
                  <div style={{ color: "var(--text-dim)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>QR thanh toán</div>
                  <h2 style={{ fontSize: "1.2rem", fontWeight: 900, color: "#fff", marginTop: 6 }}>{formatMoney(detail.amount)}đ</h2>
                </div>
                <div className="badge badge-soft" style={{ fontSize: 10, fontWeight: 800 }}>
                  {detail.status}
                </div>
              </div>

              <div style={{ padding: 20, borderRadius: 24, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", textAlign: "center" }}>
                {detail.qrUrl ? (
                  <img
                    src={detail.qrUrl}
                    alt="QR thanh toán"
                    style={{ width: "100%", maxWidth: 360, aspectRatio: "1 / 1", objectFit: "contain", borderRadius: 20 }}
                  />
                ) : (
                  <div style={{ padding: "60px 20px", color: "var(--text-dim)" }}>Chưa có QR thanh toán.</div>
                )}
              </div>

              <div style={{ marginTop: 20, display: "grid", gap: 12 }}>
                <div style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 800, textTransform: "uppercase", marginBottom: 6 }}>Hướng dẫn</div>
                  <div style={{ color: "var(--text-muted)", lineHeight: 1.6, fontSize: 14 }}>
                    Quét QR bằng ứng dụng ngân hàng, kiểm tra đúng số tiền và đúng nội dung chuyển khoản trước khi thanh toán.
                  </div>
                </div>
                <div style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 12, color: "var(--text-dim)", fontWeight: 800, textTransform: "uppercase", marginBottom: 6 }}>Nội dung chuyển khoản</div>
                  <div style={{ fontWeight: 800, color: "#fff", wordBreak: "break-word" }}>{detail.transferContent}</div>
                </div>
              </div>
            </article>
          </section>
        ) : (
          <div className="panel" style={{ padding: 28, maxWidth: 720 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", marginBottom: 10 }}>Chưa có dữ liệu checkout</div>
            <div style={{ color: "var(--text-dim)", lineHeight: 1.7, marginBottom: 18 }}>
              {message || emptyCheckoutMessage} Hãy quay lại bảng giá và tạo phiên thanh toán mới để hệ thống sinh đúng số tiền và QR chuyển khoản.
            </div>
            <Link className="button button-primary" href="/thanh-toan" style={{ height: 44, borderRadius: 12, fontWeight: 800, display: "inline-flex", alignItems: "center" }}>
              Quay lại bảng giá
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
