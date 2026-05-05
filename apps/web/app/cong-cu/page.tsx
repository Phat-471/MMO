"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, syncSessionProfile } from "../../lib/api";
import Sidebar from "../../components/Sidebar";
import type { ToolContract } from "@mmo/shared";

type WorkspaceTool = {
  id: string;
  code: string;
  name: string;
  description: string;
  category: "FACEBOOK" | "TIKTOK" | "DATA" | "AUTOMATION" | "SYSTEM";
  configJson: string;
  contract: ToolContract | null;
  enabled: boolean;
  settingsJson: string;
};

type CreatedJob = {
  id: string;
};

const categoryLabels: Record<WorkspaceTool["category"], string> = {
  FACEBOOK: "Facebook",
  TIKTOK: "TikTok",
  DATA: "Dữ liệu",
  AUTOMATION: "Tự động hóa",
  SYSTEM: "Hệ thống"
};

const categoryIcons: Record<WorkspaceTool["category"], string> = {
  FACEBOOK: "📘",
  TIKTOK: "🎵",
  DATA: "💾",
  AUTOMATION: "⚡",
  SYSTEM: "⚙️"
};

const stageLabels: Record<NonNullable<ToolContract["stage"]>, string> = {
  stable: "Ổn định",
  beta: "Thử nghiệm Beta",
  experimental: "Lab / Alpha"
};

const stageOrder: Array<"all" | ToolContract["stage"]> = ["all", "stable", "beta", "experimental"];
const categoryOrder: Array<"all" | WorkspaceTool["category"]> = ["all", "FACEBOOK", "TIKTOK", "DATA", "AUTOMATION", "SYSTEM"];

export default function CongCuPage() {
  const router = useRouter();
  const [tools, setTools] = useState<WorkspaceTool[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState("");
  const [message, setMessage] = useState("Đang tải danh sách công cụ...");
  const [verified, setVerified] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<"all" | ToolContract["stage"]>("all");
  const [selectedCategory, setSelectedCategory] = useState<"all" | WorkspaceTool["category"]>("all");

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
      loadTools(session.workspaceId);
    };
    void run();
    return () => { mounted = false; };
  }, [router]);

  function loadTools(currentWorkspaceId: string) {
    apiRequest<WorkspaceTool[]>(`/workspaces/${currentWorkspaceId}/tools`)
      .then((res) => {
        setTools(res.data);
        setSelectedToolId((current) => (current && res.data.some((t) => t.id === current) ? current : res.data[0]?.id ?? null));
        setMessage("");
      })
      .catch((error: Error) => setMessage(error.message));
  }

  async function toggleTool(tool: WorkspaceTool) {
    if (!workspaceId) return;
    const res = await apiRequest(`/workspaces/${workspaceId}/tools/${tool.id}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled: !tool.enabled, settingsJson: tool.settingsJson || "{}" })
    });
    setMessage(res.message);
    loadTools(workspaceId);
    setTimeout(() => setMessage(""), 3000);
  }

  async function createJob(tool: WorkspaceTool) {
    if (!workspaceId) return;
    try {
      const res = await apiRequest<CreatedJob>(`/workspaces/${workspaceId}/tools/${tool.id}/jobs`, {
        method: "POST",
        body: JSON.stringify({ mode: "once", optionsJson: tool.settingsJson || "{}" })
      });
      setMessage(`Khởi tạo tác vụ thành công! Mã: ${res.data.id.slice(0, 8)}`);
      setTimeout(() => setMessage(""), 5000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Thất bại khi tạo tác vụ.");
    }
  }

  const filteredTools = useMemo(
    () => tools.filter((t) => (selectedStage === "all" || t.contract?.stage === selectedStage) && (selectedCategory === "all" || t.category === selectedCategory)),
    [tools, selectedCategory, selectedStage]
  );

  const enabledCount = tools.filter((tool) => tool.enabled).length;
  const selectedTool = filteredTools.find((tool) => tool.id === selectedToolId) ?? filteredTools[0] ?? null;

  if (!verified) return <div className="auth-shell"><div className="pulse" style={{ color: "var(--primary)", fontWeight: 700 }}>Đang khởi tạo thư viện...</div></div>;

  return (
    <div className="app-shell">
      <div className="bg-grid"></div>
      <Sidebar userEmail={userEmail} workspaceId={workspaceId ?? undefined} userRole={userRole} />

      <main className="main">
        <header className="topbar">
          <div>
            <h1>Thư viện công cụ</h1>
            <p>Kích hoạt và cấu hình các module automation mạnh mẽ cho doanh nghiệp.</p>
          </div>
          <div className="topbar-actions">
            <button className="button button-soft" style={{ borderRadius: 12 }} onClick={() => workspaceId && loadTools(workspaceId)}>🔄 Làm mới danh sách</button>
          </div>
        </header>

        <section className="metric-grid" style={{ marginBottom: 48 }}>
          <article className="metric-card" style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="metric-label">TỔNG MODULE</div>
            <div className="metric-value">{tools.length}</div>
          </article>
          <article className="metric-card" style={{ border: "1px solid var(--primary-glow)" }}>
            <div className="metric-label">ĐANG HOẠT ĐỘNG</div>
            <div className="metric-value" style={{ color: "var(--success)" }}>{enabledCount}</div>
          </article>
          <article className="metric-card" style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="metric-label">CHƯA KÍCH HOẠT</div>
            <div className="metric-value" style={{ color: "var(--text-dim)" }}>{tools.length - enabledCount}</div>
          </article>
        </section>

        {message && (
          <div style={{ background: "rgba(139, 92, 246, 0.1)", color: "var(--primary)", padding: "16px 24px", borderRadius: 16, marginBottom: 32, fontWeight: 700, border: "1px solid var(--primary-glow)", display: "flex", gap: 12, alignItems: "center" }}>
            <span>✨</span> {message}
          </div>
        )}

        <section style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 40, alignItems: "start" }}>
          <div>
             <div style={{ marginBottom: 32 }}>
                <div style={{ color: "var(--text-dim)", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Bộ lọc thông minh</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
                  {categoryOrder.map((cat) => (
                    <button key={cat} onClick={() => setSelectedCategory(cat)} className={`badge ${selectedCategory === cat ? "badge-green" : "badge-soft"}`} style={{ height: 32, padding: "0 14px", cursor: "pointer", border: "none", fontWeight: 700 }}>
                      {cat === "all" ? "Tất cả nhóm" : categoryLabels[cat]}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {stageOrder.map((stg) => (
                    <button key={stg} onClick={() => setSelectedStage(stg)} className={`badge ${selectedStage === stg ? "badge-green" : "badge-soft"}`} style={{ height: 32, padding: "0 14px", cursor: "pointer", border: "none", fontWeight: 700 }}>
                      {stg === "all" ? "Tất cả trạng thái" : stageLabels[stg]}
                    </button>
                  ))}
                </div>
             </div>

             <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
                {filteredTools.map((tool) => {
                  const isSelected = tool.id === selectedToolId;
                  return (
                    <article 
                      key={tool.id} 
                      onClick={() => setSelectedToolId(tool.id)}
                      style={{ padding: 28, borderRadius: 24, background: isSelected ? "rgba(139, 92, 246, 0.05)" : "var(--glass)", border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border)", cursor: "pointer", transition: "all 0.2s", position: "relative", overflow: "hidden", boxShadow: isSelected ? "0 20px 40px rgba(139, 92, 246, 0.15)" : "none" }}
                    >
                      {isSelected && <div style={{ position: "absolute", top: 0, right: 0, width: 40, height: 40, background: "var(--primary)", clipPath: "polygon(100% 0, 0 0, 100% 100%)", display: "grid", placeItems: "center", paddingBottom: 10, paddingLeft: 10 }}><span style={{ color: "#fff", fontSize: 12 }}>✓</span></div>}
                      
                      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 20 }}>
                        <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(255,255,255,0.03)", display: "grid", placeItems: "center", fontSize: 28, border: "1px solid var(--border)" }}>{categoryIcons[tool.category]}</div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{categoryLabels[tool.category]}</div>
                          <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#fff", marginTop: 2 }}>{tool.name}</h3>
                        </div>
                      </div>

                      <p style={{ color: "var(--text-dim)", fontSize: 14, lineHeight: 1.6, marginBottom: 24, height: 44, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{tool.description}</p>

                      <div style={{ display: "flex", gap: 12 }}>
                        <button className={`button ${tool.enabled ? "button-soft" : "button-primary"}`} style={{ flex: 1, height: 44, borderRadius: 12, fontWeight: 700 }} onClick={(e) => { e.stopPropagation(); toggleTool(tool); }}>{tool.enabled ? "Vô hiệu hóa" : "Kích hoạt"}</button>
                        {tool.enabled && <button className="button button-primary" style={{ flex: 1, height: 44, borderRadius: 12, fontWeight: 700, background: "var(--success)", border: "none", boxShadow: "0 10px 20px rgba(16, 185, 129, 0.2)" }} onClick={(e) => { e.stopPropagation(); createJob(tool); }}>Chạy ngay</button>}
                      </div>
                    </article>
                  );
                })}
             </div>
          </div>

          <aside style={{ position: "sticky", top: 24 }}>
             <article className="panel" style={{ padding: 32, borderRadius: 28, border: "1px solid var(--primary-glow)", background: "rgba(139, 92, 246, 0.02)" }}>
               <div style={{ marginBottom: 32 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Chi tiết module</div>
                  <h2 style={{ fontSize: "1.75rem", fontWeight: 900, color: "#fff", letterSpacing: "-0.02em" }}>{selectedTool?.name ?? "Chọn module"}</h2>
                  <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                    <span className="badge badge-green" style={{ padding: "4px 12px", borderRadius: 8 }}>{selectedTool ? stageLabels[selectedTool.contract?.stage ?? "stable"] : "-"}</span>
                    <span className="badge badge-soft" style={{ padding: "4px 12px", borderRadius: 8 }}>{selectedTool?.contract?.platform.toUpperCase() ?? "-"}</span>
                  </div>
               </div>

               {selectedTool ? (
                 <div style={{ display: "grid", gap: 24 }}>
                   <div className="metric-card" style={{ background: "transparent", padding: 0, border: "none" }}>
                      <div className="metric-label" style={{ marginBottom: 8 }}>Mô tả kỹ thuật</div>
                      <p style={{ color: "var(--text-dim)", fontSize: 14, lineHeight: 1.7, margin: 0 }}>{selectedTool.description}</p>
                   </div>
                   
                   <div className="metric-card" style={{ background: "transparent", padding: 0, border: "none" }}>
                      <div className="metric-label" style={{ marginBottom: 12 }}>Yêu cầu Runtime</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {selectedTool.contract?.requiredRuntime?.map(r => <span key={r} className="badge badge-soft" style={{ textTransform: "uppercase", fontWeight: 800 }}>{r}</span>) ?? <span style={{ color: "var(--text-dim)", fontSize: 13 }}>Tự động</span>}
                      </div>
                   </div>

                   <div className="metric-card" style={{ background: "transparent", padding: 0, border: "none" }}>
                      <div className="metric-label" style={{ marginBottom: 12 }}>Tham số đầu vào</div>
                      <div style={{ display: "grid", gap: 12 }}>
                        {selectedTool.contract?.input?.map(f => (
                          <div key={f.key} style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ fontWeight: 800, color: "var(--primary)" }}>{f.key}</span>
                              <span style={{ fontSize: 10, fontWeight: 900, textTransform: "uppercase", opacity: 0.5 }}>{f.type}</span>
                            </div>
                            <div style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.5 }}>{f.description}</div>
                          </div>
                        )) ?? <div style={{ fontSize: 13, color: "var(--text-dim)" }}>Không cần tham số</div>}
                      </div>
                   </div>

                   <div className="metric-card" style={{ background: "transparent", padding: 0, border: "none" }}>
                      <div className="metric-label" style={{ marginBottom: 8 }}>Định danh module (Code)</div>
                      <code style={{ display: "block", padding: 12, borderRadius: 10, background: "#000", color: "var(--success)", fontSize: 12, fontFamily: "monospace", border: "1px solid rgba(255,255,255,0.05)" }}>{selectedTool.code}</code>
                   </div>
                 </div>
               ) : (
                 <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-dim)" }}>
                   <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                   <p>Chọn một module bên trái để xem cấu hình chi tiết và các tham số vận hành.</p>
                 </div>
               )}
             </article>
          </aside>
        </section>
      </main>
    </div>
  );
}
