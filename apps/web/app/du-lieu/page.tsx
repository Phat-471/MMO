"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiRequest, syncSessionProfile } from "../../lib/api";
import { formatPlatform } from "../../lib/labels";
import Sidebar from "../../components/Sidebar";

type Snapshot = {
  id: string;
  dataType: string;
  sourcePlatform: string;
  fetchedAt: string;
  payloadJson: string;
  account?: {
    label: string;
  };
};

type ExportPayload = {
  filename: string;
  mimeType: string;
  content: string;
};

export default function DataPage() {
  const router = useRouter();
  const [items, setItems] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    const load = async () => {
      const session = await syncSessionProfile();
      if (!session) {
        router.push("/dang-nhap");
        return;
      }
      setUserEmail(session.email);
      setWorkspaceId(session.workspaceId);
      setUserRole(session.role);

      try {
        const res = await apiRequest<Snapshot[]>(`/data/snapshots/${session.workspaceId}`);
        setItems(res.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setVerified(true);
        setLoading(false);
      }
    };
    void load();
  }, [router]);

  async function downloadExport(format: "csv" | "json") {
    if (!workspaceId) return;

    try {
      const res = await apiRequest<ExportPayload>(`/data/snapshots/${workspaceId}/export?format=${format}`);
      downloadTextFile(res.data.filename, res.data.content, res.data.mimeType);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xuất dữ liệu thất bại.");
    }
  }

  const selectedItem = items.find(i => i.id === selectedId);

  if (!verified) {
    return (
      <div className="auth-shell">
        <div className="pulse" style={{ color: "var(--primary)", fontWeight: 700 }}>TRUY XUẤT CƠ SỞ DỮ LIỆU SNAPSHOT...</div>
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
            <h1>Kho lưu trữ dữ liệu</h1>
            <p>Kết quả thu thập từ các tác vụ Automation được lưu trữ tập trung.</p>
          </div>
          <div className="topbar-actions">
            <button type="button" className="button button-soft" onClick={() => window.location.reload()}>🔄 Làm mới</button>
            <button type="button" className="button button-soft" onClick={() => downloadExport("csv")}>Xuất CSV</button>
            <button type="button" className="button button-primary" onClick={() => downloadExport("json")}>Xuất JSON</button>
          </div>
        </header>

        {loading ? (
          <div className="pulse" style={{ padding: 40, color: "var(--text-dim)" }}>Đang đọc dữ liệu snapshot...</div>
        ) : error ? (
          <div className="panel" style={{ color: "var(--danger)", border: "1px solid var(--danger)" }}>Lỗi hệ thống: {error}</div>
        ) : (
          <section className="content-grid" style={{ gridTemplateColumns: "1fr 2.5fr", gap: "24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: "calc(100vh - 220px)", overflowY: "auto", paddingRight: 8 }}>
              {items.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40, color: "var(--text-dim)" }}>Chưa có bản ghi nào được tạo.</div>
              ) : (
                items.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className="panel"
                    style={{ 
                      cursor: "pointer",
                      padding: "16px 20px",
                      border: selectedId === item.id ? "1px solid var(--primary)" : "1px solid var(--border)",
                      background: selectedId === item.id ? "rgba(139, 92, 246, 0.1)" : "var(--glass)",
                      boxShadow: selectedId === item.id ? "var(--shadow-glow)" : "none",
                      transition: "all 0.2s"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span className="badge badge-soft" style={{ fontSize: 10 }}>{item.dataType.replace("FETCH_", "")}</span>
                      <span style={{ fontSize: 10, color: "var(--text-dim)" }}>{new Date(item.fetchedAt).toLocaleDateString("vi-VN")}</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{item.account?.label || "Anonymous"}</div>
                    <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>{formatPlatform(item.sourcePlatform)}</div>
                  </div>
                ))
              )}
            </div>

            <div style={{ height: "100%" }}>
              {selectedItem ? (
                <article className="panel" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 600 }}>
                  <div style={{ padding: "24px 32px", borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.02)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h2 style={{ fontSize: 20 }}>{selectedItem.account?.label || "Dữ liệu chi tiết"}</h2>
                      <div style={{ color: "var(--text-dim)", fontSize: 13, marginTop: 4 }}>
                        {formatPlatform(selectedItem.sourcePlatform)} • {selectedItem.dataType}
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        downloadTextFile(`mmo-data-${selectedItem.id.slice(0, 8)}.json`, selectedItem.payloadJson, "application/json");
                      }}
                      className="button button-primary"
                    >
                      Tải File JSON
                    </button>
                  </div>
                  <div style={{ flex: 1, padding: 24, background: "#050505", overflow: "auto" }}>
                    <pre style={{ margin: 0, color: "#10b981", fontSize: 13, fontFamily: "'Fira Code', monospace", lineHeight: 1.6 }}>
                      {JSON.stringify(JSON.parse(selectedItem.payloadJson), null, 2)}
                    </pre>
                  </div>
                  <div style={{ padding: 12, borderTop: "1px solid var(--border)", textAlign: "right", fontSize: 11, color: "var(--text-dim)" }}>
                    UUID: {selectedItem.id} • Thu thập: {new Date(selectedItem.fetchedAt).toLocaleString("vi-VN")}
                  </div>
                </article>
              ) : (
                <div className="panel" style={{ height: 600, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", textAlign: "center" }}>
                   <div style={{ fontSize: 64, marginBottom: 20, opacity: 0.1 }}>📁</div>
                   <h3 style={{ fontSize: 18, color: "var(--text-main)", marginBottom: 8 }}>Chọn dữ liệu để xem</h3>
                   <p style={{ maxWidth: 300 }}>Chọn một bản ghi snapshot từ danh sách bên trái để phân tích nội dung chi tiết.</p>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
