"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { syncSessionProfile } from "../../lib/api";

const deployExamples = [
  {
    label: "MMO VPS",
    command: "cd ~/MMO && git pull && pnpm install && pnpm build && pm2 restart mmo-web mmo-api mmo-worker --update-env"
  },
  {
    label: "Node.js",
    command: "git pull && npm install && npm run build && pm2 restart all"
  },
  {
    label: "Laravel/PHP",
    command: "git pull && composer install --no-dev && php artisan migrate --force"
  },
  {
    label: "Docker",
    command: "git pull && docker compose up -d --build"
  }
];

export default function AutoDeployPage() {
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [verified, setVerified] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [script, setScript] = useState(deployExamples[0].command);

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
    };

    void run();
    return () => {
      mounted = false;
    };
  }, [router]);

  if (!verified) return null;

  return (
    <div className="app-shell">
      <div className="bg-grid" />
      <Sidebar userEmail={userEmail} workspaceId={workspaceId} userRole={userRole} />

      <main className="main">
        <header className="topbar">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            <div>
              <h1>Auto Deploy Webhooks</h1>
              <p>Tự động triển khai mã nguồn lên VPS khi có cập nhật mới từ GitHub/GitLab.</p>
            </div>
            <div className="topbar-actions">
              <button className="button button-soft">Làm mới</button>
              <button className="button button-primary" onClick={() => setShowModal(true)}>
                Tạo webhook
              </button>
            </div>
          </div>
        </header>

        <section className="guide-card">
          <h2 style={{ marginBottom: 20, fontSize: "1.4rem" }}>Hướng dẫn sử dụng</h2>
          <p style={{ marginBottom: 24, color: "var(--text-muted)", fontSize: "1.05rem", lineHeight: 1.6 }}>
            Webhook dùng để chạy một chuỗi lệnh deploy trên VPS như{" "}
            <span className="code-inline">git pull</span>, <span className="code-inline">pnpm build</span> và{" "}
            <span className="code-inline">pm2 restart</span>. Phần này mới là giao diện cấu hình, cần thêm API lưu
            webhook và executor trước khi mở chạy thật.
          </p>

          <div style={{ display: "grid", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "flex-start" }}>
              <span className="step-number">1</span>
              <div>
                <strong style={{ color: "#fff" }}>Tạo webhook</strong> và nhập script deploy muốn chạy.
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start" }}>
              <span className="step-number">2</span>
              <div>
                Copy Payload URL và cấu hình trong <strong style={{ color: "#fff" }}>Settings / Webhooks</strong> của
                GitHub/GitLab.
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start" }}>
              <span className="step-number">3</span>
              <div>
                Chọn Content type là <span className="code-inline">application/json</span>, chỉ bật event cần thiết như
                push vào nhánh deploy.
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start" }}>
              <span className="step-number">4</span>
              <div>
                Theo dõi log deploy để biết lần chạy thành công hay thất bại.
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 32,
              padding: 20,
              background: "rgba(244, 63, 94, 0.05)",
              border: "1px solid rgba(244, 63, 94, 0.2)",
              borderRadius: 12
            }}
          >
            <h4 style={{ color: "var(--danger)", marginBottom: 12 }}>Lưu ý bảo mật</h4>
            <ul style={{ display: "grid", gap: 10, color: "var(--text-muted)", fontSize: "0.95rem", paddingLeft: 18 }}>
              <li>Không chạy webhook public nếu chưa có secret signature.</li>
              <li>Không cho phép người dùng nhập lệnh shell tùy ý nếu chưa có cơ chế phân quyền và audit.</li>
              <li>Repository private nên dùng deploy key hoặc token giới hạn quyền.</li>
            </ul>
          </div>
        </section>

        <section className="panel" style={{ padding: "56px 40px" }}>
          <h3 style={{ fontSize: "1.5rem", marginBottom: 12 }}>Chưa có webhook nào</h3>
          <p style={{ color: "var(--text-dim)", marginBottom: 32 }}>
            Tạo webhook mới để cấu hình quy trình deploy tự động. Nên hoàn thiện backend trước khi dùng trên production.
          </p>
          <button className="button button-primary" onClick={() => setShowModal(true)}>
            Tạo webhook
          </button>
        </section>

        {showModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.8)",
              backdropFilter: "blur(8px)",
              display: "grid",
              placeItems: "center",
              zIndex: 1000
            }}
          >
            <div className="panel" style={{ width: "100%", maxWidth: 640, padding: 40 }}>
              <h2 style={{ marginTop: 0, marginBottom: 28 }}>Tạo Webhook Auto-Deploy</h2>

              <div style={{ display: "grid", gap: 24 }}>
                <label className="field">
                  <span>Tên / ghi chú</span>
                  <input className="input" placeholder="VD: Deploy MMO production" />
                </label>

                <label className="field">
                  <span>Lệnh thực thi</span>
                  <textarea
                    className="input"
                    value={script}
                    onChange={(event) => setScript(event.target.value)}
                    style={{ minHeight: 150 }}
                  />
                </label>

                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-dim)", marginBottom: 12 }}>
                    Lệnh mẫu
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {deployExamples.map((example) => (
                      <button
                        key={example.label}
                        className="button button-soft"
                        onClick={() => setScript(example.command)}
                        style={{ justifyContent: "flex-start", padding: "10px 16px", fontSize: "0.85rem", textAlign: "left" }}
                      >
                        <strong style={{ color: "var(--primary)", marginRight: 8 }}>[{example.label}]</strong>
                        {example.command}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                  <button className="button button-primary" style={{ flex: 1 }} disabled>
                    Chưa bật backend
                  </button>
                  <button className="button button-soft" onClick={() => setShowModal(false)} style={{ flex: 0.3 }}>
                    Hủy
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
