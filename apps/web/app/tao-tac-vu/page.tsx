"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, syncSessionProfile } from "../../lib/api";
import { formatJobMode, formatJobStatus, formatJobType, formatPlatform } from "../../lib/labels";
import Sidebar from "../../components/Sidebar";

type JobItem = {
  id: string;
  platform: string;
  jobType: string;
  mode: string;
  status: string;
  scheduleCron: string | null;
};

type JobType =
  | "fetch_posts"
  | "fetch_comments"
  | "fetch_profile"
  | "check_proxy"
  | "account_health"
  | "group_moderation"
  | "keyword_monitor"
  | "workflow_build"
  | "fetch_videos"
  | "post_group"
  | "nurture_account"
  | "auto_like"
  | "auto_comment"
  | "reup_video"
  | "SHOPEE_VIDEO_AFF"
  | "SHOPEE_LINK_CONVERT"
  | "AI_CONTENT"
  | "MARKETPLACE_SCAN"
  | "BULK_MSG"
  | "AUTO_JOIN_GROUP"
  | "CHANGE_PASSWORD"
  | "REG_ACCOUNT"
  ;

type JobForm = {
  platform: "facebook" | "tiktok" | "shopee" | "youtube";
  jobType: JobType;
  mode: "once" | "scheduled" | "recurring";
  scheduleCron: string;
  accountId: string;
  optionsJson: string;
};

const jobTypeOptions: Array<{ value: JobType; label: string }> = [
  { value: "fetch_posts", label: "Quét bài viết" },
  { value: "fetch_comments", label: "Quét bình luận" },
  { value: "fetch_profile", label: "Quét profile" },
  { value: "check_proxy", label: "Kiểm tra proxy" },
  { value: "account_health", label: "Sức khỏe tài khoản" },
  { value: "group_moderation", label: "Duyệt group" },
  { value: "keyword_monitor", label: "Theo dõi từ khóa" },
  { value: "workflow_build", label: "Workflow builder" },
  { value: "fetch_videos", label: "Quét video" },
  { value: "post_group", label: "Đăng group" },
  { value: "nurture_account", label: "Nuôi tài khoản" },
  { value: "auto_like", label: "Auto like" },
  { value: "auto_comment", label: "Auto comment" },
  { value: "reup_video", label: "Reup video" },
  { value: "SHOPEE_VIDEO_AFF", label: "Shopee video affiliate" },
  { value: "SHOPEE_LINK_CONVERT", label: "Shopee link convert" },
  { value: "AI_CONTENT", label: "Viết nội dung AI" },
  { value: "MARKETPLACE_SCAN", label: "Quét Mãrketplace" },
  { value: "BULK_MSG", label: "Gửi tin nhắn hàng loạt" },
  { value: "AUTO_JOIN_GROUP", label: "Tự động vào group" },
  { value: "CHANGE_PASSWORD", label: "Đổi mật khẩu" },
  { value: "REG_ACCOUNT", label: "Tạo tài khoản mới" },
];

const platformByJobType: Record<JobType, JobForm["platform"]> = {
  fetch_posts: "facebook",
  fetch_comments: "facebook",
  fetch_profile: "facebook",
  check_proxy: "facebook",
  account_health: "facebook",
  group_moderation: "facebook",
  keyword_monitor: "tiktok",
  workflow_build: "facebook",
  fetch_videos: "tiktok",
  post_group: "facebook",
  nurture_account: "facebook",
  auto_like: "facebook",
  auto_comment: "facebook",
  reup_video: "youtube",
  SHOPEE_VIDEO_AFF: "shopee",
  SHOPEE_LINK_CONVERT: "shopee",
  AI_CONTENT: "facebook",
  MARKETPLACE_SCAN: "facebook",
  BULK_MSG: "facebook",
  AUTO_JOIN_GROUP: "facebook",
  CHANGE_PASSWORD: "facebook",
  REG_ACCOUNT: "facebook",
};

const templateByJobType: Partial<Record<JobType, string>> = {
  fetch_posts: JSON.stringify({ pageId: "page-growth-01", limit: 20 }, null, 2),
  fetch_comments: JSON.stringify({ pageId: "page-growth-01", limit: 50 }, null, 2),
  fetch_profile: JSON.stringify({ profileUrl: "https://www.facebook.com/..." }, null, 2),
  check_proxy: JSON.stringify({ proxy: "127.0.0.1:8080:seed:seed", targetUrl: "https://api.ipify.org?format=json" }, null, 2),
  account_health: JSON.stringify({ accountLabel: "FB-GROWTH-01", targetUrl: "https://www.facebook.com/", threshold: "normal" }, null, 2),
  group_moderation: JSON.stringify({
    groupId: "growth-lab",
    groupName: "Growth Lab",
    bannedKeywords: ["spam", "sale"],
    posts: [
      { id: "post-1", author: "user1", content: "Mẫu quảng cáo spam" },
      { id: "post-2", author: "user2", content: "Hỏi về kinh nghiệm MMO" }
    ]
  }, null, 2),
  keyword_monitor: JSON.stringify({ keywords: ["mmo", "affiliate"], hashtags: ["growth"], limit: 10 }, null, 2),
  workflow_build: JSON.stringify({
    workflowName: "Growth workflow",
    dryRun: true,
    steps: [
      { code: "monitor", name: "Theo dõi từ khóa" },
      { code: "moderate", name: "Kiểm duyệt bài viết" }
    ]
  }, null, 2),
  fetch_videos: JSON.stringify({ keyword: "mmo", limit: 12 }, null, 2),
  post_group: JSON.stringify({ groupId: "growth-lab", content: "Nội dung bài viết..." }, null, 2),
  nurture_account: JSON.stringify({ accountLabel: "FB-GROWTH-01", steps: ["like", "comment", "follow"] }, null, 2),
  auto_like: JSON.stringify({ postIds: ["post-1", "post-2"] }, null, 2),
  auto_comment: JSON.stringify({ postIds: ["post-1", "post-2"], comments: ["Hay quá", "Cảm ơn bạn"] }, null, 2),
  reup_video: JSON.stringify({ sourceUrl: "https://www.youtube.com/shorts/...", targetPlatform: "YOUTUBE", addWatermark: true, addCaptions: true }, null, 2),
  SHOPEE_VIDEO_AFF: JSON.stringify({
    sourceUrl: "https://www.tiktok.com/@seed/video/1",
    productUrl: "https://shopee.vn/product/seed-01",
    affiliateId: "AFF-SEED-001",
    productTitle: "Shopee deal seed",
    hook: "Sản phẩm đang được mua nhiều.",
    script: "Mô tả lợi ích sản phẩm, giá và CTA.",
    targetPlatform: "SHOPEE"
  }, null, 2),
  SHOPEE_LINK_CONVERT: JSON.stringify({
    productUrls: ["https://shopee.vn/product/seed-01", "https://shopee.vn/product/seed-02"],
    affiliateId: "AFF-SEED-001",
    subId: "admin"
  }, null, 2),
  AI_CONTENT: JSON.stringify({ topic: "Kinh doanh online", tone: "Hổ hung", keywords: ["dropshipping", "kiếm tiền online"] }, null, 2),
  MARKETPLACE_SCAN: JSON.stringify({ keyword: "iphone 15", minPrice: 10000000, maxPrice: 15000000, location: "Hà Nội" }, null, 2),
  BULK_MSG: JSON.stringify({ message: "Chào bạn, mình quan tâm đến sản phẩm này.", targetUids: ["1000001", "1000002"], delay: 30 }, null, 2),
  AUTO_JOIN_GROUP: JSON.stringify({ keyword: "MMO Việt Nam", limit: 5 }, null, 2),
  CHANGE_PASSWORD: JSON.stringify({ newPassword: "random_password_123", logoutOthers: true }, null, 2),
  REG_ACCOUNT: JSON.stringify({ platform: "facebook", amount: 10, proxyType: "dcom" }, null, 2),
};

const emptyForm: JobForm = {
  platform: "facebook",
  jobType: "fetch_posts",
  mode: "once",
  scheduleCron: "",
  accountId: "",
  optionsJson: templateByJobType.fetch_posts ?? "{}"
};

export default function TaoTacVuPage() {
  const router = useRouter();
  const [items, setItems] = useState<JobItem[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState<string>("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<JobForm>(emptyForm);
  const [verified, setVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const jobPreview = useMemo(() => {
    return {
      platform: formatPlatform(form.platform),
      type: formatJobType(form.jobType),
      mode: formatJobMode(form.mode),
      icon: form.platform === "facebook" ? "📘" : form.platform === "tiktok" ? "🎵" : form.platform === "shopee" ? "🧡" : "📺"
    };
  }, [form.jobType, form.mode, form.platform]);

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
      loadJobs(session.workspaceId);
    };

    void run();
    return () => {
      mounted = false;
    };
  }, [router]);

  function loadJobs(currentWorkspaceId: string) {
    apiRequest<JobItem[]>(`/workspaces/${currentWorkspaceId}/jobs`)
      .then((res) => {
        setItems(res.data);
      })
      .catch((error: Error) => {
        if (error.message.includes("Failed to fetch")) {
          setMessage("Lỗi kết nối Server. Vui lòng kiểm tra API Backend.");
        } else {
          setMessage(error.message);
        }
      });
  }

  function updateForm<K extends keyof JobForm>(key: K, value: JobForm[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };

      if (key === "jobType") {
        const selected = value as JobType;
        next.platform = platformByJobType[selected];
        next.optionsJson = templateByJobType[selected] ?? current.optionsJson;
      }

      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspaceId) return;
    setIsSubmitting(true);

    try {
      const res = await apiRequest<JobItem>(`/workspaces/${workspaceId}/jobs`, {
        method: "POST",
        body: JSON.stringify({
          ...form,
          scheduleCron: form.scheduleCron || null,
          accountId: form.accountId || null
        })
      });

      setMessage(res.message);
      setForm({ ...emptyForm, jobType: "fetch_posts", platform: "facebook", optionsJson: templateByJobType.fetch_posts ?? "{}" });
      loadJobs(workspaceId);
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Tạo tác vụ thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRun(jobId: string) {
    try {
      const res = await apiRequest<{ id: string }>(`/jobs/${jobId}/run`, { method: "POST" });
      setMessage(res.message);
      if (workspaceId) loadJobs(workspaceId);
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Thực thi thất bại.");
    }
  }

  async function handleDelete(jobId: string) {
    if (!confirm("Xác nhận xóa tác vụ này?")) return;

    try {
      const res = await apiRequest<{ id: string }>(`/jobs/${jobId}`, { method: "DELETE" });
      setMessage(res.message);
      if (workspaceId) loadJobs(workspaceId);
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Xóa thất bại.");
    }
  }

  if (!verified) {
    return (
      <div className="auth-shell">
        <div className="pulse" style={{ color: "var(--primary)", fontWeight: 700 }}>
          Đang kiểm tra đăng nhập...
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="bg-grid" />
      <Sidebar userEmail={userEmail} workspaceId={workspaceId ?? undefined} userRole={userRole} />

      <main className="main">
        <header className="topbar">
          <div>
            <h1>Khởi tạo Automation</h1>
            <p>Thiết lập quy trình chạy tự động cho các tài khoản MMO của bạn.</p>
          </div>
          <div className="topbar-actions">
            <button type="button" className="button button-soft" onClick={() => workspaceId && loadJobs(workspaceId)}>
              <span style={{ fontSize: 16 }}>🔄</span> Làm mới danh sách
            </button>
          </div>
        </header>

        {message && (
          <div style={{ 
            background: message.includes("Lỗi") ? "rgba(244, 63, 94, 0.1)" : "rgba(16, 185, 129, 0.1)", 
            color: message.includes("Lỗi") ? "var(--danger)" : "var(--success)", 
            padding: "16px 24px", 
            borderRadius: "var(--radius-md)", 
            marginBottom: 32, 
            fontSize: 14, 
            fontWeight: 600,
            border: "1px solid",
            borderColor: message.includes("Lỗi") ? "rgba(244, 63, 94, 0.2)" : "rgba(16, 185, 129, 0.2)",
            display: "flex",
            alignItems: "center",
            gap: 12
          }}>
            <span style={{ fontSize: 20 }}>{message.includes("Lỗi") ? "⚠️" : "✅"}</span>
            {message}
          </div>
        )}

        <section className="content-grid" style={{ gridTemplateColumns: "1.1fr 0.9fr", gap: 32 }}>
          {/* Left: Form */}
          <article className="panel" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "24px 32px", borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.02)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--primary-muted)", display: "grid", placeItems: "center", fontSize: 24 }}>
                  ⚡
                </div>
                <div>
                  <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Thiết lập quy trình</h2>
                  <p style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 4 }}>Chọn loại tác vụ và cấu hình runner.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: 32, display: "flex", flexDirection: "column", gap: 32 }}>
              {/* Preview Card */}
              <div style={{ 
                padding: 24, 
                background: "linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(14, 165, 233, 0.1))", 
                borderRadius: 16, 
                border: "1px solid var(--primary-glow)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow: "var(--shadow-glow)"
              }}>
                <div>
                  <div style={{ fontSize: 11, color: "var(--primary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                    Đang thiết lập
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 24 }}>{jobPreview.icon}</span>
                    {jobPreview.type}
                  </div>
                  <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 6 }}>
                    Chế độ: <span style={{ color: "var(--text-main)", fontWeight: 700 }}>{jobPreview.mode}</span>
                  </div>
                </div>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,0.05)", display: "grid", placeItems: "center", fontSize: 28, boxShadow: "inset 0 0 10px rgba(255,255,255,0.05)" }}>
                  ✨
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div className="input-group">
                  <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 10, color: "var(--text-muted)" }}>Loại tác vụ</label>
                  <select 
                    value={form.jobType} 
                    onChange={(e) => updateForm("jobType", e.target.value as JobType)}
                    style={{ width: "100%", height: 48, padding: "0 16px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", fontSize: 14, outline: "none", transition: "all 0.2s" }}
                  >
                    {jobTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                  <div className="input-group">
                    <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 10, color: "var(--text-muted)" }}>Chế độ vận hành</label>
                    <select 
                      value={form.mode} 
                      onChange={(e) => updateForm("mode", e.target.value as JobForm["mode"])}
                      style={{ width: "100%", height: 48, padding: "0 16px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", fontSize: 14, outline: "none" }}
                    >
                      <option value="once">Chạy một lần</option>
                      <option value="scheduled">Theo lịch hẹn</option>
                      <option value="recurring">Lặp lại (Cron)</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 10, color: "var(--text-muted)" }}>Mã tài khoản (Account ID)</label>
                    <input 
                      value={form.accountId} 
                      onChange={(e) => updateForm("accountId", e.target.value)} 
                      type="text" 
                      placeholder="Để trống nếu áp dụng toàn hệ thống" 
                      style={{ width: "100%", height: 48, padding: "0 16px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", fontSize: 14, outline: "none" }}
                    />
                  </div>
                </div>

                {form.mode !== "once" && (
                  <div className="input-group">
                    <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 10, color: "var(--text-muted)" }}>Lịch chạy (Cron Expression)</label>
                    <div style={{ position: "relative" }}>
                      <input 
                        value={form.scheduleCron} 
                        onChange={(e) => updateForm("scheduleCron", e.target.value)} 
                        type="text" 
                        placeholder="Ví dụ: 0 8 * * * (8h sáng mỗi ngày)" 
                        style={{ width: "100%", height: 48, padding: "0 16px 0 44px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", fontSize: 14, outline: "none" }}
                      />
                      <span style={{ position: "absolute", left: 16, top: 13, fontSize: 18 }}>⏰</span>
                    </div>
                  </div>
                )}

                <div className="input-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <label style={{ fontSize: 14, fontWeight: 600, color: "var(--text-muted)" }}>Tham số cấu hình (JSON)</label>
                    <div style={{ fontSize: 11, color: "var(--primary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Template: {jobPreview.type}</div>
                  </div>
                  <textarea
                    value={form.optionsJson}
                    onChange={(e) => updateForm("optionsJson", e.target.value)}
                    style={{ 
                      width: "100%",
                      minHeight: 240, 
                      padding: 20,
                      borderRadius: 12, 
                      background: "#05070a", 
                      border: "1px solid var(--border)", 
                      color: "#60a5fa", 
                      fontFamily: "'Fira Code', monospace", 
                      fontSize: 13, 
                      lineHeight: 1.6, 
                      resize: "vertical",
                      outline: "none",
                      boxShadow: "inset 0 4px 12px rgba(0,0,0,0.5)"
                    }}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="button button-primary" 
                disabled={isSubmitting}
                style={{ 
                  width: "100%", 
                  height: 56, 
                  fontSize: 16, 
                  fontWeight: 800,
                  borderRadius: 16,
                  background: "linear-gradient(135deg, var(--primary), var(--accent))",
                  border: "none",
                  boxShadow: "0 8px 32px rgba(139, 92, 246, 0.3)",
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                }}
              >
                {isSubmitting ? "Đang xử lý..." : "Kích hoạt Tác vụ ngay ⚡"}
              </button>
            </form>
          </article>

          {/* Right: List */}
          <article className="panel" style={{ padding: 0, overflow: "hidden" }}>
             <div style={{ padding: "24px 32px", borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.02)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Danh sách đang chạy</h2>
                <p style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 4 }}>Các tác vụ đang hoạt động trong workspace.</p>
              </div>
              <div className="badge badge-soft" style={{ fontSize: 12, padding: "6px 12px", borderRadius: 10 }}>{items.length} items</div>
            </div>

            <div className="table-container" style={{ padding: 24, maxHeight: 800, overflowY: "auto" }}>
              {items.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {items.map((item) => (
                    <div key={item.id} style={{ 
                      background: "rgba(255,255,255,0.02)", 
                      border: "1px solid var(--border)", 
                      borderRadius: 16, 
                      padding: 20,
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 20,
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      cursor: "default",
                      position: "relative",
                      overflow: "hidden"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--primary-glow)";
                      e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                    }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                          <div style={{ fontSize: 20 }}>
                            {item.platform === "facebook" ? "📘" : item.platform === "tiktok" ? "🎵" : item.platform === "shopee" ? "🧡" : "📺"}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 16, color: "#fff" }}>{formatJobType(item.jobType)}</div>
                            <div style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>ID: #{item.id.slice(0, 8)}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 16, fontSize: 13, color: "var(--text-muted)", marginTop: 12 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 14 }}>⚡</span> {formatJobMode(item.mode)}
                          </span>
                          {item.scheduleCron && (
                            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 14 }}>⏰</span> {item.scheduleCron}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 10, background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)" }}>
                           <span
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                background:
                                  item.status === "DONE" || item.status === "done"
                                    ? "var(--success)"
                                    : item.status === "FAILED" || item.status === "failed"
                                      ? "var(--danger)"
                                      : "var(--warning)",
                                boxShadow: item.status === "RUNNING" || item.status === "running" ? "0 0 12px var(--warning)" : "none"
                              }}
                              className={item.status === "RUNNING" || item.status === "running" ? "pulse" : ""}
                            />
                            <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#fff" }}>
                              {formatJobStatus(item.status)}
                            </span>
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                          <button 
                            type="button" 
                            className="button button-soft" 
                            style={{ padding: "6px 14px", fontSize: 12, fontWeight: 700, borderRadius: 10, minHeight: 32 }} 
                            onClick={() => handleRun(item.id)}
                          >
                            Thực thi
                          </button>
                          <button 
                            type="button" 
                            className="button" 
                            style={{ 
                              padding: "6px 12px", 
                              fontSize: 12, 
                              fontWeight: 700,
                              borderRadius: 10,
                              minHeight: 32, 
                              background: "rgba(244, 63, 94, 0.1)", 
                              color: "var(--danger)", 
                              border: "1px solid rgba(244, 63, 94, 0.1)" 
                            }} 
                            onClick={() => handleDelete(item.id)}
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "120px 40px", color: "var(--text-dim)" }}>
                  <div style={{ fontSize: 64, marginBottom: 24, opacity: 0.1 }}>🗭</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-main)" }}>Chưa có tác vụ nào</div>
                  <p style={{ fontSize: 14, marginTop: 8, maxWidth: 260, marginInline: "auto", lineHeight: 1.6 }}>Hãy bắt đầu bằng cách khởi tạo quy trình tự động hóa bên trái.</p>
                </div>
              )}
            </div>
          </article>
        </section>
      </main>

      <style jsx>{`
        .input-group select:focus, .input-group input:focus, .input-group textarea:focus {
           border-color: var(--primary) !important;
           box-shadow: 0 0 0 1px var(--primary-glow);
           background: rgba(139, 92, 246, 0.05) !important;
        }
        .pulse {
          animation: pulse-ring 2s infinite;
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
