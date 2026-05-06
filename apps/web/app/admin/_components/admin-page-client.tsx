"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ToolContract } from "@mmo/shared";
import { apiRequest, syncSessionProfile } from "../../../lib/api";
import { getSocket } from "../../../lib/socket";
import { formatAccountStatus, formatJobMode, formatJobStatus, formatJobType, formatPlatform } from "../../../lib/labels";
import AdminSidebar from "./admin-sidebar";

type AdminSection = "dashboard" | "insights" | "users" | "workspaces" | "accounts" | "jobs" | "tools" | "plans" | "audit-logs" | "activity" | "data" | "system";
type Status = "ACTIVE" | "DISABLED";
type WorkspaceStatus = "ACTIVE" | "SUSPENDED";
type AccountStatus = "ALIVE" | "DEAD" | "LIMITED" | "PENDING";
type JobStatus = "DRAFT" | "QUEUED" | "RUNNING" | "PAUSED" | "DONE" | "FAILED";
type ToolStatus = "ACTIVE" | "DISABLED";
type PageData<T> = { items: T[]; total: number; page: number; pageSize: number; pageCount: number; query: string };
type PageMeta = Pick<PageData<unknown>, "total" | "page" | "pageSize" | "pageCount">;

type AdminOverview = { totalUsers: number; totalWorkspaces: number; totalAccounts: number; totalJobs: number; runningJobs: number; failedJobs: number; queuedJobs: number; pausedJobs: number; activeTools: number };
type AdminPlan = {
  id: string;
  code: "FREE" | "STARTER" | "PRO" | "ENTERPRISE";
  name: string;
  priceMonthly: string;
  maxAccounts: number;
  maxRunningJobs: number;
  maxWorkspaces: number;
  maxDailyFetches: number;
  featuresJson: string;
};
type AdminUser = { id: string; email: string; role: "USER" | "ADMIN"; status: Status; createdAt: string; _count: { workspaces: number; memberOf: number } };
type AdminWorkspace = { id: string; name: string; status: WorkspaceStatus; owner: { email: string }; subscriptions: Array<{ plan: AdminPlan }>; _count: { members: number; accounts: number; jobs: number; tools: number } };
type AdminAccount = { id: string; label: string; platform: string; status: AccountStatus; workspace: { id: string; name: string; owner: { email: string } } };
type AdminJob = { id: string; platform: string; jobType: string; mode: string; status: JobStatus; workspace: { name: string }; account: { label: string } | null; createdBy: { email: string } | null; _count: { runs: number } };
type AdminTool = { id: string; code: string; name: string; category: string; status: ToolStatus; contract: ToolContract | null; _count: { workspaceTools: number } };
type AdminAuditLog = { id: string; action: string; entityType: string; entityId: string | null; metadataJson: string | null; createdAt: string; user: { email: string } | null; workspace: { name: string } };
type AdminSnapshot = { id: string; sourcePlatform: string; dataType: string; payloadJson: string; fetchedAt: string; createdAt: string; workspace: { name: string }; account: { label: string } | null };
type AdminJobLog = { id: string; level: string; message: string; createdAt: string; workspace: { name: string }; jobRun: { job: { jobType: string; platform: string } } };
type AdminPaymentSetting = {
  id: string;
  bankName: string;
  bankCode: string;
  accountName: string;
  accountNumber: string;
  transferPrefix: string;
  note: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
type AdminPaymentTransaction = {
  id: string;
  checkoutCode: string;
  workspace: { id: string; name: string };
  planCode: string;
  planName: string;
  amount: number;
  status: "PENDING" | "PAID" | "CANCELED" | "EXPIRED";
  transferContent: string;
  bankName: string;
  bankCode: string;
  accountName: string;
  accountNumber: string;
  qrUrl: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};
type AdminIntegrationSettings = {
  id: string | null;
  apiBaseUrl: string;
  apiKey: string;
  apiSecret: string;
  webhookUrl: string;
  webhookSecret: string;
  redisHost: string;
  redisPort: number;
  workerConcurrency: number;
  note: string;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};
type AdminSystem = {
  database: { status: string; latencyMs: number | null; error: string | null };
  queue: {
    status: string;
    queueName: string;
    ping?: string | null;
    counts: { waiting: number; active: number; failed: number; delayed?: number; completed?: number; paused?: number };
    error?: string;
  };
  jobs: { recent: Array<{ id: string; platform: string; jobType: string; status: string; workspace: { name: string }; account: { label: string } | null }> };
  tools: { active: number; disabled: number };
  payment: { settings: AdminPaymentSetting | null; transactions: AdminPaymentTransaction[]; integrations: AdminIntegrationSettings };
  storage: AdminStorageSettings;
  security: AdminSecuritySettings;
  latencyMs: number;
};
type AdminStorageSettings = {
  id: string | null;
  assetBaseUrl: string;
  cdnBaseUrl: string;
  uploadPath: string;
  assetMode: "LOCAL" | "CDN" | "HYBRID";
  autoApproveAssets: boolean;
  allowRemoteFetch: boolean;
  defaultVideoWatermark: boolean;
  note: string;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};
type AdminSecuritySettings = {
  id: string | null;
  maintenanceMode: boolean;
  requireTwoFactor: boolean;
  apiRateLimitPerMinute: number;
  sessionTtlHours: number;
  adminIpWhitelist: string;
  note: string;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};
type SystemTab = "payment" | "worker-queue" | "connectivity" | "storage" | "security" | "audit-logs";
type AdminInsights = {
  generatedAt: string;
  totalWorkspaces: number;
  activeWorkspaces: number;
  suspendedWorkspaces: number;
  fetchToday: number;
  unreadNotifications: number;
  planDistribution: Array<{ code: string; name: string; count: number }>;
  workspaces: Array<{ id: string; name: string; slug: string; status: WorkspaceStatus; owner: { email: string }; plan: { code: string; name: string } | null; fetchToday: number; usageLimit: number; unreadNotifications: number; healthScore: number; level: string }>;
  alerts: Array<{ kind: string; severity: string; message: string; workspace: { id: string; name: string }; metric: number }>;
};

type RequestFn = (path: string, method: "PATCH" | "DELETE" | "POST", body?: unknown, clear?: () => void) => void;
type SectionProps<T extends Record<string, unknown>> = T & {
  meta: PageMeta;
  query: string;
  page: number;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  selected?: string[];
  setSelected?: React.Dispatch<React.SetStateAction<string[]>>;
  toggle?: (id: string, ids: string[], setIds: (next: string[]) => void) => void;
  togglePage?: (ids: string[], selected: string[], setSelected: (next: string[]) => void) => void;
  request?: RequestFn;
};
const sections: AdminSection[] = ["dashboard", "insights", "users", "workspaces", "accounts", "jobs", "tools", "plans", "audit-logs", "activity", "data", "system"];
const pageSize = 10;
const emptyMeta: PageMeta = { total: 0, page: 1, pageSize, pageCount: 1 };
const BANK_OPTIONS = [
  { label: "Vietcombank", code: "VCB" },
  { label: "VietinBank", code: "ICB" },
  { label: "BIDV", code: "BIDV" },
  { label: "Agribank", code: "VBA" },
  { label: "MB Bank", code: "MB" },
  { label: "Techcombank", code: "TCB" },
  { label: "ACB", code: "ACB" },
  { label: "VPBank", code: "VPB" },
  { label: "TPBank", code: "TPB" },
  { label: "Sacombank", code: "STB" },
  { label: "HDBank", code: "HDB" },
  { label: "VIB", code: "VIB" },
  { label: "SHB", code: "SHB" },
  { label: "Eximbank", code: "EIB" },
  { label: "OCB", code: "OCB" },
  { label: "MSB", code: "MSB" },
  { label: "Nam A Bank", code: "NAB" },
  { label: "SeABank", code: "SEAB" },
  { label: "Kienlongbank", code: "KLB" },
  { label: "NCB", code: "NCB" },
  { label: "Bac A Bank", code: "BAB" },
  { label: "BaoVietBank", code: "BVB" }
] as const;

function normalizeSection(value: string | null | undefined): AdminSection { return sections.includes(value as AdminSection) ? (value as AdminSection) : "dashboard"; }
function parsePage<T>(data: PageData<T> | T[]): { items: T[]; meta: PageMeta } { return Array.isArray(data) ? { items: data, meta: { total: data.length, page: 1, pageSize, pageCount: Math.max(1, Math.ceil(data.length / pageSize)) } } : { items: data.items, meta: { total: data.total, page: data.page, pageSize: data.pageSize, pageCount: data.pageCount } }; }
function safeSetter<T>(setter: (items: T[]) => void, section: AdminSection, data: PageData<T> | T[], setMeta: React.Dispatch<React.SetStateAction<Partial<Record<AdminSection, PageMeta>>>>) { const parsed = parsePage(data); setter(parsed.items); setMeta((current) => ({ ...current, [section]: parsed.meta })); }
function selectedOrEmpty(value?: string[]) { return value ?? []; }
function noop() { return undefined; }

function exportToCsv(data: unknown[], filename: string) {
  if (!data.length) { alert("Không có dữ liệu để xuất."); return; }
  const headers = Object.keys(data[0] as Record<string, unknown>);
  const rows = data.map((row) => headers.map((header) => {
    const value = (row as Record<string, unknown>)[header];
    if (value === null || value === undefined) return '""';
    const text = typeof value === "object" ? JSON.stringify(value) : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  }).join(","));
  const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}

export function AdminPage({ sectionOverride }: { sectionOverride?: AdminSection } = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState<AdminSection>(() => normalizeSection(sectionOverride ?? searchParams.get("section")));
  const [message, setMessage] = useState("Đang tải dữ liệu quản trị...");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [system, setSystem] = useState<AdminSystem | null>(null);
  const [insights, setInsights] = useState<AdminInsights | null>(null);
  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([]);
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [tools, setTools] = useState<AdminTool[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [jobLogs, setJobLogs] = useState<AdminJobLog[]>([]);
  const [snapshots, setSnapshots] = useState<AdminSnapshot[]>([]);
  const [meta, setMeta] = useState<Partial<Record<AdminSection, PageMeta>>>({});
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedWorkspaces, setSelectedWorkspaces] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [verified, setVerified] = useState(false);

  useEffect(() => { setActiveSection(normalizeSection(sectionOverride ?? searchParams.get("section"))); }, [sectionOverride, searchParams]);
  useEffect(() => { void verify(); }, [router]);
  useEffect(() => { if (verified) loadAdminData(); }, [verified, page, query]);

  async function verify() {
    const session = await syncSessionProfile();
    if (!session) { router.push("/dang-nhap"); return; }
    if (session.role !== "ADMIN") { router.push("/"); return; }
    setCurrentUserId(session.userId); setVerified(true);
  }

  function changeSection(section: string) {
    const next = normalizeSection(section); setActiveSection(next); setQuery(""); setPage(1);
    window.history.pushState(null, "", next === "dashboard" ? "/admin" : `/admin?section=${next}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function listPath(path: string) {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (query.trim()) params.set("query", query.trim());
    return `${path}?${params.toString()}`;
  }

  function loadAdminData() {
    Promise.all([
      apiRequest<AdminOverview>("/admin/overview"), apiRequest<AdminPlan[]>("/admin/plans"), apiRequest<AdminSystem>("/admin/system"), apiRequest<AdminInsights>("/admin/insights"),
      apiRequest<PageData<AdminUser>>(listPath("/admin/users")), apiRequest<PageData<AdminWorkspace>>(listPath("/admin/workspaces")),
      apiRequest<PageData<AdminAccount>>(listPath("/admin/accounts")), apiRequest<PageData<AdminJob>>(listPath("/admin/jobs")), apiRequest<PageData<AdminTool>>(listPath("/admin/tools")),
      apiRequest<PageData<AdminAuditLog>>(listPath("/admin/audit-logs")), apiRequest<PageData<AdminJobLog>>(listPath("/admin/job-logs")), apiRequest<PageData<AdminSnapshot>>(listPath("/admin/snapshots"))
    ]).then(([overviewRes, plansRes, systemRes, insightsRes, usersRes, workspacesRes, accountsRes, jobsRes, toolsRes, auditRes, activityRes, dataRes]) => {
      setOverview(overviewRes.data); setPlans(plansRes.data); setSystem(systemRes.data); setInsights(insightsRes.data);
      safeSetter(setUsers, "users", usersRes.data, setMeta); safeSetter(setWorkspaces, "workspaces", workspacesRes.data, setMeta); safeSetter(setAccounts, "accounts", accountsRes.data, setMeta);
      safeSetter(setJobs, "jobs", jobsRes.data, setMeta); safeSetter(setTools, "tools", toolsRes.data, setMeta); safeSetter(setAuditLogs, "audit-logs", auditRes.data, setMeta);
      safeSetter(setJobLogs, "activity", activityRes.data, setMeta); safeSetter(setSnapshots, "data", dataRes.data, setMeta); setMessage("");
    }).catch((error: Error) => setMessage(error.message));
  }

  async function request(path: string, method: "PATCH" | "DELETE" | "POST", body?: unknown, clear?: () => void) {
    try { const res = await apiRequest(path, { method, body: body ? JSON.stringify(body) : undefined }); setMessage(res.message); clear?.(); loadAdminData(); setTimeout(() => setMessage(""), 3000); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Thất bại."); }
  }

  function toggle(id: string, ids: string[], setIds: (next: string[]) => void) { setIds(ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]); }
  function togglePage(ids: string[], selected: string[], setSelected: (next: string[]) => void) { const allSelected = ids.length > 0 && ids.every((id) => selected.includes(id)); setSelected(allSelected ? selected.filter((id) => !ids.includes(id)) : Array.from(new Set([...selected, ...ids]))); }

  const metrics = [
    { label: "Người dùng", value: overview?.totalUsers ?? 0, icon: "👥", color: "var(--primary)" },
    { label: "Workspace", value: overview?.totalWorkspaces ?? 0, icon: "🏢", color: "var(--accent)" },
    { label: "Tài khoản", value: overview?.totalAccounts ?? 0, icon: "📱", color: "var(--warning)" },
    { label: "Tác vụ", value: overview?.totalJobs ?? 0, icon: "⚡", color: "var(--primary)" },
    { label: "Đang chạy", value: overview?.runningJobs ?? 0, icon: "🟢", color: "var(--success)" },
    { label: "Thất bại", value: overview?.failedJobs ?? 0, icon: "🔴", color: "var(--danger)" }
  ];

  if (!verified) return <div className="app-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--primary)", fontWeight: 700 }}>ĐANG XÁC THỰC QUYỀN TRUY CẬP...</div>;

  return (
    <div className="app-shell">
      <div className="bg-grid"></div>
      <AdminSidebar title="Quản trị hệ thống" subtitle="Trung tâm điều hành MMO" activeSection={activeSection} onSectionChange={changeSection} />
      
      <main className="main">
        <header className="topbar">
          <div>
            <h1>Tổng quan quản trị</h1>
            <p>Hệ thống lõi quản lý {overview?.totalUsers} người dùng và {overview?.totalJobs} tác vụ automation.</p>
          </div>
          <div className="topbar-actions">
            <span className="badge badge-green" style={{ padding: "6px 14px", borderRadius: 10, letterSpacing: "0.1em", fontWeight: 800 }}>SYSTEM ONLINE</span>
            <button className="button button-soft" onClick={loadAdminData}>🔄 Refresh Data</button>
          </div>
        </header>

        {message && (
          <div style={{ background: "rgba(139, 92, 246, 0.1)", color: "var(--primary)", padding: "16px 24px", borderRadius: 16, marginBottom: 24, fontWeight: 600, border: "1px solid var(--primary-glow)", display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 20 }}>✨</span> {message}
          </div>
        )}

        <section className="metric-grid" style={{ marginBottom: 40 }}>
          {metrics.map((m, i) => (
            <article className="metric-card" key={i} style={{ border: `1px solid rgba(255,255,255,0.05)`, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -10, right: -10, fontSize: 64, opacity: 0.03, transform: "rotate(15deg)" }}>{m.icon}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                  <div className="metric-label" style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}>{m.label}</div>
                  <div className="metric-value" style={{ color: m.color, fontSize: "2rem" }}>{m.value}</div>
                </div>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.03)", display: "grid", placeItems: "center", fontSize: 20, border: "1px solid var(--border)" }}>{m.icon}</div>
              </div>
            </article>
          ))}
        </section>

        {activeSection === "dashboard" && <DashboardSection tools={tools} plans={plans} auditLogs={auditLogs} system={system} onSectionChange={changeSection} />}
        {activeSection === "insights" && <InsightsSection insights={insights} onSectionChange={changeSection} />}
        {activeSection === "users" && <UsersSection users={users} meta={meta.users ?? emptyMeta} query={query} page={page} setQuery={setQuery} setPage={setPage} selected={selectedUsers} currentUserId={currentUserId} setSelected={setSelectedUsers} toggle={toggle} togglePage={togglePage} request={request} />}
        {activeSection === "workspaces" && <WorkspacesSection workspaces={workspaces} plans={plans} meta={meta.workspaces ?? emptyMeta} query={query} page={page} setQuery={setQuery} setPage={setPage} selected={selectedWorkspaces} setSelected={setSelectedWorkspaces} toggle={toggle} togglePage={togglePage} request={request} />}
        {activeSection === "accounts" && <AccountsSection accounts={accounts} meta={meta.accounts ?? emptyMeta} query={query} page={page} setQuery={setQuery} setPage={setPage} selected={selectedAccounts} setSelected={setSelectedAccounts} toggle={toggle} togglePage={togglePage} request={request} />}
        {activeSection === "jobs" && <JobsSection jobs={jobs} meta={meta.jobs ?? emptyMeta} query={query} page={page} setQuery={setQuery} setPage={setPage} selected={selectedJobs} setSelected={setSelectedJobs} toggle={toggle} togglePage={togglePage} request={request} />}
        {activeSection === "tools" && <ToolsSection tools={tools} meta={meta.tools ?? emptyMeta} query={query} page={page} setQuery={setQuery} setPage={setPage} selected={selectedTools} setSelected={setSelectedTools} toggle={toggle} togglePage={togglePage} request={request} />}
        {activeSection === "plans" && <PlansSection plans={plans} request={request} />}
        {activeSection === "audit-logs" && <AuditSection logs={auditLogs} meta={meta["audit-logs"] ?? emptyMeta} query={query} page={page} setQuery={setQuery} setPage={setPage} />}
        {activeSection === "activity" && <ActivitySection logs={jobLogs} meta={meta.activity ?? emptyMeta} query={query} page={page} setQuery={setQuery} setPage={setPage} />}
        {activeSection === "data" && <SnapshotsSection snapshots={snapshots} meta={meta.data ?? emptyMeta} query={query} page={page} setQuery={setQuery} setPage={setPage} />}
        {activeSection === "system" && <SystemHubSection system={system} auditLogs={auditLogs} auditMeta={meta["audit-logs"] ?? emptyMeta} request={request} query={query} page={page} setQuery={setQuery} setPage={setPage} />}
      </main>
    </div>
  );
}

function SystemHubSection({
  system,
  auditLogs,
  auditMeta,
  request,
  query,
  page,
  setQuery,
  setPage
}: {
  system: AdminSystem | null;
  auditLogs: AdminAuditLog[];
  auditMeta: PageMeta;
  request: RequestFn;
  query: string;
  page: number;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  setPage: React.Dispatch<React.SetStateAction<number>>;
}) {
  const [tab, setTab] = useState<SystemTab>("payment");

  const tabs: Array<{ key: SystemTab; label: string; hint: string }> = [
    { key: "payment", label: "Thanh toán", hint: "Ngan hang va giao dich" },
    { key: "worker-queue", label: "Worker / Queue", hint: "Redis va runtime" },
    { key: "connectivity", label: "Ket noi", hint: "Test API / Socket" },
    { key: "storage", label: "Asset / Storage", hint: "CDN va upload" },
    { key: "security", label: "Security", hint: "Bao mat admin" },
    { key: "audit-logs", label: "Audit logs", hint: "Lich su quan tri" }
  ];

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div className="panel" style={{ padding: 24 }}>
        <div className="metric-grid">
          <article className="metric-card">
            <div className="metric-label">Database</div>
            <div className="metric-value" style={{ color: "var(--success)" }}>{system?.database.status ?? "-"}</div>
          </article>
          <article className="metric-card">
            <div className="metric-label">Queue</div>
            <div className="metric-value">{system?.queue.status ?? "-"}</div>
          </article>
          <article className="metric-card">
            <div className="metric-label">Waiting</div>
            <div className="metric-value" style={{ color: "var(--warning)" }}>{system?.queue.counts.waiting ?? 0}</div>
          </article>
          <article className="metric-card">
            <div className="metric-label">Latency</div>
            <div className="metric-value" style={{ color: "var(--accent)" }}>{system?.latencyMs ?? 0}ms</div>
          </article>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 24 }}>
          {tabs.map((item) => (
            <button
              key={item.key}
              className={`button ${tab === item.key ? "button-primary" : "button-soft"}`}
              style={{ minWidth: 160, justifyContent: "flex-start" }}
              onClick={() => setTab(item.key)}
            >
              <span style={{ display: "block", textAlign: "left" }}>
                <span style={{ display: "block", fontWeight: 800 }}>{item.label}</span>
                <span style={{ display: "block", fontSize: 11, opacity: 0.7, marginTop: 4 }}>{item.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {tab === "payment" && <SystemPaymentTab system={system} request={request} />}
      {tab === "worker-queue" && <SystemWorkerQueueTab system={system} request={request} />}
      {tab === "connectivity" && <SystemConnectivityTab system={system} request={request} />}
      {tab === "storage" && <SystemStorageTab system={system} request={request} />}
      {tab === "security" && <SystemSecurityTab system={system} request={request} />}
      {tab === "audit-logs" && <SystemAuditTab logs={auditLogs} meta={auditMeta} query={query} page={page} setQuery={setQuery} setPage={setPage} />}
    </div>
  );
}

function SystemPaymentTab({ system, request }: { system: AdminSystem | null; request: RequestFn }) {
  const [bankName, setBankName] = useState(system?.payment.settings?.bankName ?? "");
  const [bankCode, setBankCode] = useState(system?.payment.settings?.bankCode ?? "");
  const [accountName, setAccountName] = useState(system?.payment.settings?.accountName ?? "");
  const [accountNumber, setAccountNumber] = useState(system?.payment.settings?.accountNumber ?? "");
  const [transferPrefix, setTransferPrefix] = useState(system?.payment.settings?.transferPrefix ?? "MMO");
  const [note, setNote] = useState(system?.payment.settings?.note ?? "");
  const [isActive, setIsActive] = useState(system?.payment.settings?.isActive ?? true);

  useEffect(() => {
    setBankName(system?.payment.settings?.bankName ?? "");
    setBankCode(system?.payment.settings?.bankCode ?? "");
    setAccountName(system?.payment.settings?.accountName ?? "");
    setAccountNumber(system?.payment.settings?.accountNumber ?? "");
    setTransferPrefix(system?.payment.settings?.transferPrefix ?? "MMO");
    setNote(system?.payment.settings?.note ?? "");
    setIsActive(system?.payment.settings?.isActive ?? true);
  }, [system]);

  const selectedBank = BANK_OPTIONS.find((bank) => bank.code === bankCode) ?? null;

  function savePaymentSettings() {
    request("/admin/system/payment", "PATCH", {
      bankName,
      bankCode,
      accountName,
      accountNumber,
      transferPrefix,
      note,
      isActive
    });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
      <div className="panel" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Thông tin tai khoan thanh toan</h3>
        <div style={{ display: "grid", gap: 16 }}>
          <div className="input-group">
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>Chon ngan hang</label>
            <select
              value={selectedBank?.code ?? ""}
              onChange={(event) => {
                const nextBank = BANK_OPTIONS.find((bank) => bank.code === event.target.value) ?? null;
                setBankName(nextBank?.label ?? "");
                setBankCode(nextBank?.code ?? "");
              }}
              style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }}
            >
              <option value="">-- Chon ngan hang --</option>
              {BANK_OPTIONS.map((bank) => (
                <option key={bank.code} value={bank.code}>
                  {bank.label} ({bank.code})
                </option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>Mã ngan hang</label>
            <input value={bankCode} readOnly style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", color: "#fff", outline: "none", opacity: 0.9 }} />
          </div>
          <div className="input-group">
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>Tên chu tai khoan</label>
            <input value={accountName} onChange={(event) => setAccountName(event.target.value)} style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
          </div>
          <div className="input-group">
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>Số tài khoản</label>
            <input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
          </div>
          <div className="input-group">
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>Noi dung chuyen khoan</label>
            <input value={transferPrefix} onChange={(event) => setTransferPrefix(event.target.value)} placeholder="MMO" style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
          </div>
          <div className="input-group">
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>Ghi chú</label>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} style={{ width: "100%", padding: 14, borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none", resize: "vertical" }} />
          </div>
          <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: "var(--text-muted)" }}>
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            Kích hoạt cau hinh thanh toan nay
          </label>
          <button className="button button-primary" style={{ height: 48, borderRadius: 12, fontWeight: 800 }} onClick={savePaymentSettings}>
            Luu cau hinh thanh toan
          </button>
        </div>
      </div>

      <div className="panel" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Lich su giao dich</h3>
        <div style={{ display: "grid", gap: 12 }}>
          {(system?.payment.transactions ?? []).length ? (
            system?.payment.transactions.map((transaction) => (
              <div key={transaction.id} style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 800, color: "#fff" }}>{transaction.planName}</div>
                    <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>{transaction.workspace.name} • {transaction.checkoutCode}</div>
                  </div>
                  <span className={`badge ${transaction.status === "PAID" ? "badge-green" : transaction.status === "CANCELED" ? "badge-red" : "badge-soft"}`} style={{ fontWeight: 800, fontSize: 10 }}>
                    {transaction.status}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginTop: 12, fontSize: 13 }}>
                  <div>
                    So tien: <b style={{ color: "var(--primary)" }}>{transaction.amount.toLocaleString("vi-VN")}đ</b>
                  </div>
                  <div>
                    Thời gian: <b>{new Date(transaction.createdAt).toLocaleString("vi-VN")}</b>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    Noi dung: <b>{transaction.transferContent}</b>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ color: "var(--text-dim)", fontSize: 14, lineHeight: 1.6 }}>
              Chua co giao dich nao. Khi nguoi dung bat dau thanh toan, lich su se hien thi o day.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SystemWorkerQueueTab({ system, request }: { system: AdminSystem | null; request: RequestFn }) {
  const [apiBaseUrl, setApiBaseUrl] = useState(system?.payment.integrations?.apiBaseUrl ?? "");
  const [apiKey, setApiKey] = useState(system?.payment.integrations?.apiKey ?? "");
  const [apiSecret, setApiSecret] = useState(system?.payment.integrations?.apiSecret ?? "");
  const [webhookUrl, setWebhookUrl] = useState(system?.payment.integrations?.webhookUrl ?? "");
  const [webhookSecret, setWebhookSecret] = useState(system?.payment.integrations?.webhookSecret ?? "");
  const [redisHost, setRedisHost] = useState(system?.payment.integrations?.redisHost ?? "127.0.0.1");
  const [redisPort, setRedisPort] = useState(String(system?.payment.integrations?.redisPort ?? 6379));
  const [workerConcurrency, setWorkerConcurrency] = useState(String(system?.payment.integrations?.workerConcurrency ?? 2));
  const [integrationNote, setIntegrationNote] = useState(system?.payment.integrations?.note ?? "");
  const [integrationActive, setIntegrationActive] = useState(system?.payment.integrations?.isActive ?? true);

  useEffect(() => {
    setApiBaseUrl(system?.payment.integrations?.apiBaseUrl ?? "");
    setApiKey(system?.payment.integrations?.apiKey ?? "");
    setApiSecret(system?.payment.integrations?.apiSecret ?? "");
    setWebhookUrl(system?.payment.integrations?.webhookUrl ?? "");
    setWebhookSecret(system?.payment.integrations?.webhookSecret ?? "");
    setRedisHost(system?.payment.integrations?.redisHost ?? "127.0.0.1");
    setRedisPort(String(system?.payment.integrations?.redisPort ?? 6379));
    setWorkerConcurrency(String(system?.payment.integrations?.workerConcurrency ?? 2));
    setIntegrationNote(system?.payment.integrations?.note ?? "");
    setIntegrationActive(system?.payment.integrations?.isActive ?? true);
  }, [system]);

  function saveIntegrationSettings() {
    request("/admin/system/integration", "PATCH", {
      apiBaseUrl,
      apiKey,
      apiSecret,
      webhookUrl,
      webhookSecret,
      redisHost,
      redisPort: Number(redisPort),
      workerConcurrency: Number(workerConcurrency),
      note: integrationNote,
      isActive: integrationActive
    });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 24, alignItems: "start" }}>
      <div className="panel" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Worker / Queue config</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="input-group">
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>API Base URL</label>
            <input value={apiBaseUrl} onChange={(event) => setApiBaseUrl(event.target.value)} placeholder="https://api.example.com" style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
          </div>
          <div className="input-group">
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>API Key</label>
            <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
          </div>
          <div className="input-group">
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>API Secret</label>
            <input value={apiSecret} onChange={(event) => setApiSecret(event.target.value)} style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
          </div>
          <div className="input-group">
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>Webhook URL</label>
            <input value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} placeholder="https://..." style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
          </div>
          <div className="input-group">
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>Webhook Secret</label>
            <input value={webhookSecret} onChange={(event) => setWebhookSecret(event.target.value)} style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
          </div>
          <div className="input-group">
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>Redis Host</label>
            <input value={redisHost} onChange={(event) => setRedisHost(event.target.value)} style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
          </div>
          <div className="input-group">
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>Redis Port</label>
            <input type="number" value={redisPort} onChange={(event) => setRedisPort(event.target.value)} style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
          </div>
          <div className="input-group">
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>Worker concurrency</label>
            <input type="number" value={workerConcurrency} onChange={(event) => setWorkerConcurrency(event.target.value)} style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
          </div>
        </div>

        <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
          <div className="input-group">
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>Ghi chú</label>
            <textarea value={integrationNote} onChange={(event) => setIntegrationNote(event.target.value)} rows={4} style={{ width: "100%", padding: 14, borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none", resize: "vertical" }} />
          </div>
          <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: "var(--text-muted)" }}>
            <input type="checkbox" checked={integrationActive} onChange={(event) => setIntegrationActive(event.target.checked)} />
            Kích hoạt cau hinh worker / queue nay
          </label>
          <button className="button button-primary" style={{ height: 48, borderRadius: 12, fontWeight: 800 }} onClick={saveIntegrationSettings}>
            Luu cau hinh worker
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gap: 24 }}>
        <div className="panel" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Trạng thái runtime</h3>
          <div className="metric-grid">
            <article className="metric-card">
              <div className="metric-label">Queue status</div>
              <div className="metric-value">{system?.queue.status ?? "-"}</div>
            </article>
            <article className="metric-card">
              <div className="metric-label">Active</div>
              <div className="metric-value" style={{ color: "var(--success)" }}>{system?.queue.counts.active ?? 0}</div>
            </article>
            <article className="metric-card">
              <div className="metric-label">Failed</div>
              <div className="metric-value" style={{ color: "var(--danger)" }}>{system?.queue.counts.failed ?? 0}</div>
            </article>
            <article className="metric-card">
              <div className="metric-label">Concurrency</div>
              <div className="metric-value" style={{ color: "var(--accent)" }}>{system?.payment.integrations?.workerConcurrency ?? 0}</div>
            </article>
          </div>
          <div style={{ marginTop: 16, color: "var(--text-dim)", fontSize: 13, lineHeight: 1.7 }}>
            Queue: <b style={{ color: "#fff" }}>{system?.queue.queueName ?? "-"}</b>
            <br />
            Redis: <b style={{ color: "#fff" }}>{system?.payment.integrations?.redisHost ?? "-"}:{system?.payment.integrations?.redisPort ?? 0}</b>
            <br />
            Ping: <b style={{ color: "#fff" }}>{system?.queue.ping ?? system?.queue.error ?? "-"}</b>
          </div>
        </div>

        <div className="panel" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Job gan day</h3>
          <div style={{ display: "grid", gap: 12 }}>
            {(system?.jobs.recent ?? []).length ? (
              system?.jobs.recent.map((job) => (
                <div key={job.id} style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 800, color: "#fff" }}>{formatJobType(job.jobType)}</div>
                      <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>{job.workspace.name}{job.account ? ` • ${job.account.label}` : ""}</div>
                    </div>
                    <span className={`badge ${job.status === "DONE" ? "badge-green" : job.status === "FAILED" ? "badge-red" : "badge-soft"}`} style={{ fontWeight: 800, fontSize: 10 }}>
                      {job.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 10 }}>
                    Platform: <b style={{ color: "#fff" }}>{formatPlatform(job.platform)}</b>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: "var(--text-dim)", fontSize: 14, lineHeight: 1.6 }}>
                Chua co job gan day.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SystemConnectivityTab({ system }: { system: AdminSystem | null; request: RequestFn }) {
  const [apiStatus, setApiStatus] = useState<"idle" | "checking" | "ok" | "error">("idle");
  const [apiMessage, setApiMessage] = useState<string>("Chua kiem tra");
  const [socketStatus, setSocketStatus] = useState<"idle" | "checking" | "ok" | "error">("idle");
  const [socketMessage, setSocketMessage] = useState<string>("Chua kiem tra");
  const [copiedHint, setCopiedHint] = useState<string>("");

  useEffect(() => {
    setApiStatus("idle");
    setApiMessage("Chua kiem tra");
    setSocketStatus("idle");
    setSocketMessage("Chua kiem tra");
    setCopiedHint("");
  }, [system]);

  async function testApi() {
    setApiStatus("checking");
    setApiMessage("Dang goi /health...");
    try {
      const response = await apiRequest<{ status: string; service: string }>("/health");
      setApiStatus("ok");
      setApiMessage(`${response.data.status} / ${response.data.service}`);
    } catch (error) {
      setApiStatus("error");
      setApiMessage(error instanceof Error ? error.message : "API test failed");
    }
  }

  async function testSocket() {
    setSocketStatus("checking");
    setSocketMessage("Dang ket noi socket...");
    const socket = getSocket();
    const alreadyConnected = socket.connected;

    if (alreadyConnected) {
      setSocketStatus("ok");
      setSocketMessage(`Da ket noi: ${socket.id ?? "-"}`);
      return;
    }

    await new Promise<void>((resolve) => {
      let finished = false;
      const timeout = window.setTimeout(() => {
        if (finished) return;
        finished = true;
        cleanup();
        setSocketStatus("error");
        setSocketMessage("Het thoi gian cho ket noi socket");
        resolve();
      }, 7000);

      const cleanup = () => {
        window.clearTimeout(timeout);
        socket.off("connect", onConnect);
        socket.off("connect_error", onError);
      };

      const onConnect = () => {
        if (finished) return;
        finished = true;
        cleanup();
        setSocketStatus("ok");
        setSocketMessage(`Da ket noi: ${socket.id ?? "-"}`);
        resolve();
      };

      const onError = (error: Error) => {
        if (finished) return;
        finished = true;
        cleanup();
        setSocketStatus("error");
        setSocketMessage(error.message || "Socket connection error");
        resolve();
      };

      socket.once("connect", onConnect);
      socket.once("connect_error", onError);
      socket.connect();
    });
  }

  async function copyEnv(kind: "local" | "vps") {
    const local = [
      "APP_ENV=local",
      "NODE_ENV=development",
      "APP_URL=http://localhost:3000",
      "NEXT_PUBLIC_API_URL=/api",
      "NEXT_PUBLIC_SOCKET_URL=http://localhost:4000",
      "API_URL=http://127.0.0.1:4000/api",
      "API_ORIGIN=http://127.0.0.1:4000",
      "DATABASE_URL=mysql://root:root@127.0.0.1:3306/mmo",
      "REDIS_URL=redis://127.0.0.1:6379"
    ].join("\n");
    const vps = [
      "APP_ENV=vps",
      "NODE_ENV=production",
      "APP_URL=https://your-domain.com",
      "NEXT_PUBLIC_API_URL=/api",
      "NEXT_PUBLIC_SOCKET_URL=https://your-domain.com",
      "API_URL=http://127.0.0.1:4000/api",
      "API_ORIGIN=http://127.0.0.1:4000",
      "DATABASE_URL=mysql://mmo:change-this-password@127.0.0.1:3306/mmo",
      "REDIS_URL=redis://127.0.0.1:6379"
    ].join("\n");
    const text = kind === "local" ? local : vps;
    await navigator.clipboard.writeText(text);
    setCopiedHint(kind === "local" ? "Đã copy mẫu local" : "Đã copy mẫu VPS");
    window.setTimeout(() => setCopiedHint(""), 1800);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
      <div className="panel" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Hướng dẫn kết nối local / VPS</h3>
        <div style={{ display: "grid", gap: 16, color: "var(--text-dim)", fontSize: 13, lineHeight: 1.7 }}>
          <div style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 800, color: "#fff", marginBottom: 8 }}>Local</div>
            <div>1. Chạy API backend trên <b style={{ color: "#fff" }}>localhost:4000</b>.</div>
            <div>2. Web vào qua <b style={{ color: "#fff" }}>/api</b> để gọi backend.</div>
            <div>3. Socket kết nối tới <b style={{ color: "#fff" }}>http://localhost:4000</b>.</div>
          </div>
          <div style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
            <div style={{ fontWeight: 800, color: "#fff", marginBottom: 8 }}>VPS / Production</div>
            <div>1. Để web gọi API qua <b style={{ color: "#fff" }}>/api</b> cùng origin.</div>
            <div>2. Gắn <b style={{ color: "#fff" }}>API_ORIGIN</b> về <b style={{ color: "#fff" }}>127.0.0.1:4000</b> và <b style={{ color: "#fff" }}>NEXT_PUBLIC_SOCKET_URL</b> về IP public.</div>
            <div>3. Restart web để rewrite có hiệu lực.</div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <button className="button button-soft" onClick={() => void copyEnv("local")}>Copy env local</button>
            <button className="button button-soft" onClick={() => void copyEnv("vps")}>Copy env VPS</button>
          </div>
          {copiedHint ? <div style={{ color: "var(--success)", fontWeight: 700 }}>{copiedHint}</div> : null}
          <div style={{ padding: 16, borderRadius: 16, background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.35)" }}>
            <div style={{ fontWeight: 800, color: "#fff", marginBottom: 6 }}>Mẫu file .env</div>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12, color: "var(--text-dim)" }}>
{`NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
API_URL=http://127.0.0.1:4000/api
API_ORIGIN=http://127.0.0.1:4000
APP_ENV=local
NODE_ENV=development`}
            </pre>
          </div>
        </div>
      </div>

      <div className="panel" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Kiểm tra thực tế</h3>
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 12, color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 800 }}>API Health</div>
            <div style={{ marginTop: 8, fontWeight: 800, color: apiStatus === "ok" ? "var(--success)" : apiStatus === "error" ? "var(--danger)" : "#fff" }}>{apiMessage}</div>
            <button className="button button-primary" style={{ marginTop: 12 }} onClick={() => void testApi()} disabled={apiStatus === "checking"}>
              {apiStatus === "checking" ? "Đang test..." : "Test API"}
            </button>
          </div>

          <div style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 12, color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 800 }}>Socket</div>
            <div style={{ marginTop: 8, fontWeight: 800, color: socketStatus === "ok" ? "var(--success)" : socketStatus === "error" ? "var(--danger)" : "#fff" }}>{socketMessage}</div>
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-dim)" }}>
              Socket origin: <b style={{ color: "#fff" }}>{process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}</b>
            </div>
            <button className="button button-primary" style={{ marginTop: 12 }} onClick={() => void testSocket()} disabled={socketStatus === "checking"}>
              {socketStatus === "checking" ? "Đang test..." : "Test Socket"}
            </button>
          </div>

          <div style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 12, color: "var(--text-dim)", textTransform: "uppercase", fontWeight: 800 }}>Thông tin hệ thống</div>
            <div style={{ marginTop: 8, color: "var(--text-dim)", lineHeight: 1.75 }}>
              Database: <b style={{ color: "#fff" }}>{system?.database.status ?? "-"}</b>
              <br />
              Queue: <b style={{ color: "#fff" }}>{system?.queue.status ?? "-"}</b>
              <br />
              Redis: <b style={{ color: "#fff" }}>{system?.payment.integrations?.redisHost ?? "-"}:{system?.payment.integrations?.redisPort ?? 0}</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SystemStorageTab({ system, request }: { system: AdminSystem | null; request: RequestFn }) {
  const [assetBaseUrl, setAssetBaseUrl] = useState(system?.storage.assetBaseUrl ?? "");
  const [cdnBaseUrl, setCdnBaseUrl] = useState(system?.storage.cdnBaseUrl ?? "");
  const [uploadPath, setUploadPath] = useState(system?.storage.uploadPath ?? "/uploads");
  const [assetMode, setAssetMode] = useState<SystemStorageMode>(system?.storage.assetMode ?? "HYBRID");
  const [autoApproveAssets, setAutoApproveAssets] = useState(system?.storage.autoApproveAssets ?? false);
  const [allowRemoteFetch, setAllowRemoteFetch] = useState(system?.storage.allowRemoteFetch ?? true);
  const [defaultVideoWatermark, setDefaultVideoWatermark] = useState(system?.storage.defaultVideoWatermark ?? false);
  const [note, setNote] = useState(system?.storage.note ?? "");
  const [isActive, setIsActive] = useState(system?.storage.isActive ?? true);

  useEffect(() => {
    setAssetBaseUrl(system?.storage.assetBaseUrl ?? "");
    setCdnBaseUrl(system?.storage.cdnBaseUrl ?? "");
    setUploadPath(system?.storage.uploadPath ?? "/uploads");
    setAssetMode(system?.storage.assetMode ?? "HYBRID");
    setAutoApproveAssets(system?.storage.autoApproveAssets ?? false);
    setAllowRemoteFetch(system?.storage.allowRemoteFetch ?? true);
    setDefaultVideoWatermark(system?.storage.defaultVideoWatermark ?? false);
    setNote(system?.storage.note ?? "");
    setIsActive(system?.storage.isActive ?? true);
  }, [system]);

  function saveStorageSettings() {
    request("/admin/system/storage", "PATCH", {
      assetBaseUrl,
      cdnBaseUrl,
      uploadPath,
      assetMode,
      autoApproveAssets,
      allowRemoteFetch,
      defaultVideoWatermark,
      note,
      isActive
    });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
      <div className="panel" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Cấu hình Tài nguyên / Lưu trữ</h3>
        <div style={{ display: "grid", gap: 16 }}>
          <div className="input-group">
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>URL Cơ sở tài nguyên</label>
            <input value={assetBaseUrl} onChange={(event) => setAssetBaseUrl(event.target.value)} placeholder="https://assets.example.com" style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
          </div>
          <div className="input-group">
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>URL Cơ sở CDN</label>
            <input value={cdnBaseUrl} onChange={(event) => setCdnBaseUrl(event.target.value)} placeholder="https://cdn.example.com" style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
          </div>
          <div className="input-group">
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>Đường dẫn Tải lên</label>
            <input value={uploadPath} onChange={(event) => setUploadPath(event.target.value)} placeholder="/uploads" style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
          </div>
          <div className="input-group">
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>Chế độ Tài nguyên</label>
            <select value={assetMode} onChange={(event) => setAssetMode(event.target.value as SystemStorageMode)} style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }}>
              <option value="LOCAL">LOCAL</option>
              <option value="CDN">CDN</option>
              <option value="HYBRID">HYBRID</option>
            </select>
          </div>
          <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: "var(--text-muted)" }}>
            <input type="checkbox" checked={autoApproveAssets} onChange={(event) => setAutoApproveAssets(event.target.checked)} />
            Tự động duyệt tài nguyên (Auto approve)
          </label>
          <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: "var(--text-muted)" }}>
            <input type="checkbox" checked={allowRemoteFetch} onChange={(event) => setAllowRemoteFetch(event.target.checked)} />
            Cho phép thu thập từ xa (Remote fetch)
          </label>
          <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: "var(--text-muted)" }}>
            <input type="checkbox" checked={defaultVideoWatermark} onChange={(event) => setDefaultVideoWatermark(event.target.checked)} />
            Watermark video mặc định
          </label>
          <div className="input-group">
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>Ghi chú</label>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} style={{ width: "100%", padding: 14, borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none", resize: "vertical" }} />
          </div>
          <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: "var(--text-muted)" }}>
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            Kích hoạt cấu hình lưu trữ này
          </label>
          <button className="button button-primary" style={{ height: 48, borderRadius: 12, fontWeight: 800 }} onClick={saveStorageSettings}>
            Lưu cấu hình lưu trữ
          </button>
        </div>
      </div>

      <div className="panel" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Hướng dẫn vận hành</h3>
        <div style={{ color: "var(--text-dim)", fontSize: 13, lineHeight: 1.75, display: "grid", gap: 10 }}>
          <div>Asset Base URL: <b style={{ color: "#fff" }}>{system?.storage.assetBaseUrl || "-"}</b></div>
          <div>CDN Base URL: <b style={{ color: "#fff" }}>{system?.storage.cdnBaseUrl || "-"}</b></div>
          <div>Upload Path: <b style={{ color: "#fff" }}>{system?.storage.uploadPath || "-"}</b></div>
          <div>Chế độ: <b style={{ color: "#fff" }}>{system?.storage.assetMode || "-"}</b></div>
          <div>Tự động duyệt: <b style={{ color: "#fff" }}>{system?.storage.autoApproveAssets ? "BẬT" : "TẮT"}</b></div>
          <div>Thu thập từ xa: <b style={{ color: "#fff" }}>{system?.storage.allowRemoteFetch ? "BẬT" : "TẮT"}</b></div>
          <div>Watermark: <b style={{ color: "#fff" }}>{system?.storage.defaultVideoWatermark ? "BẬT" : "TẮT"}</b></div>
          <div>Trạng thái: <b style={{ color: "#fff" }}>{system?.storage.isActive ? "HOẠT ĐỘNG" : "VÔ HIỆU"}</b></div>
        </div>
      </div>
    </div>
  );
}

type SystemStorageMode = "LOCAL" | "CDN" | "HYBRID";

function SystemSecurityTab({ system, request }: { system: AdminSystem | null; request: RequestFn }) {
  const [maintenanceMode, setMãintenanceMode] = useState(system?.security.maintenanceMode ?? false);
  const [requireTwoFactor, setRequireTwoFactor] = useState(system?.security.requireTwoFactor ?? false);
  const [apiRateLimitPerMinute, setApiRateLimitPerMinute] = useState(String(system?.security.apiRateLimitPerMinute ?? 120));
  const [sessionTtlHours, setSessionTtlHours] = useState(String(system?.security.sessionTtlHours ?? 72));
  const [adminIpWhitelist, setAdminIpWhitelist] = useState(system?.security.adminIpWhitelist ?? "");
  const [note, setNote] = useState(system?.security.note ?? "");
  const [isActive, setIsActive] = useState(system?.security.isActive ?? true);

  useEffect(() => {
    setMãintenanceMode(system?.security.maintenanceMode ?? false);
    setRequireTwoFactor(system?.security.requireTwoFactor ?? false);
    setApiRateLimitPerMinute(String(system?.security.apiRateLimitPerMinute ?? 120));
    setSessionTtlHours(String(system?.security.sessionTtlHours ?? 72));
    setAdminIpWhitelist(system?.security.adminIpWhitelist ?? "");
    setNote(system?.security.note ?? "");
    setIsActive(system?.security.isActive ?? true);
  }, [system]);

  function saveSecuritySettings() {
    request("/admin/system/security", "PATCH", {
      maintenanceMode,
      requireTwoFactor,
      apiRateLimitPerMinute: Number(apiRateLimitPerMinute),
      sessionTtlHours: Number(sessionTtlHours),
      adminIpWhitelist,
      note,
      isActive
    });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
      <div className="panel" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Cấu hình Bảo mật</h3>
        <div style={{ display: "grid", gap: 16 }}>
          <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: "var(--text-muted)" }}>
            <input type="checkbox" checked={maintenanceMode} onChange={(event) => setMãintenanceMode(event.target.checked)} />
            Chế độ bảo trì (Mãintenance mode)
          </label>
          <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: "var(--text-muted)" }}>
            <input type="checkbox" checked={requireTwoFactor} onChange={(event) => setRequireTwoFactor(event.target.checked)} />
            Yêu cầu 2FA cho quản trị viên
          </label>
          <div className="input-group">
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>Giới hạn API / Phút</label>
            <input type="number" value={apiRateLimitPerMinute} onChange={(event) => setApiRateLimitPerMinute(event.target.value)} style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
          </div>
          <div className="input-group">
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>Thời gian Session (giờ)</label>
            <input type="number" value={sessionTtlHours} onChange={(event) => setSessionTtlHours(event.target.value)} style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
          </div>
          <div className="input-group">
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>Danh sách IP trắng (Admin)</label>
            <textarea value={adminIpWhitelist} onChange={(event) => setAdminIpWhitelist(event.target.value)} rows={4} placeholder="192.168.1.10\n10.0.0.0/24" style={{ width: "100%", padding: 14, borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none", resize: "vertical" }} />
          </div>
          <div className="input-group">
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>Ghi chú bảo mật</label>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} style={{ width: "100%", padding: 14, borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none", resize: "vertical" }} />
          </div>
          <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: "var(--text-muted)" }}>
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            Kích hoạt cấu hình bảo mật này
          </label>
          <button className="button button-primary" style={{ height: 48, borderRadius: 12, fontWeight: 800 }} onClick={saveSecuritySettings}>
            Lưu cấu hình bảo mật
          </button>
        </div>
      </div>

      <div className="panel" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Giá trị hiện tại</h3>
        <div style={{ color: "var(--text-dim)", fontSize: 13, lineHeight: 1.75, display: "grid", gap: 10 }}>
          <div>Bảo trì: <b style={{ color: "#fff" }}>{system?.security.maintenanceMode ? "BẬT" : "TẮT"}</b></div>
          <div>Yêu cầu 2FA: <b style={{ color: "#fff" }}>{system?.security.requireTwoFactor ? "BẬT" : "TẮT"}</b></div>
          <div>Giới hạn: <b style={{ color: "#fff" }}>{system?.security.apiRateLimitPerMinute ?? 0}/phút</b></div>
          <div>Session TTL: <b style={{ color: "#fff" }}>{system?.security.sessionTtlHours ?? 0} giờ</b></div>
          <div>IP trắng: <b style={{ color: "#fff" }}>{system?.security.adminIpWhitelist || "-"}</b></div>
          <div>Trạng thái: <b style={{ color: "#fff" }}>{system?.security.isActive ? "HOẠT ĐỘNG" : "VÔ HIỆU"}</b></div>
        </div>
      </div>
    </div>
  );
}

function SystemAuditTab({
  logs,
  meta,
  query,
  page,
  setQuery,
  setPage
}: {
  logs: AdminAuditLog[];
  meta: PageMeta;
  query: string;
  page: number;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  setPage: React.Dispatch<React.SetStateAction<number>>;
}) {
  return (
    <TablePanel
      title="Audit logs"
      count={meta.total}
      action={<Link className="button button-soft" href="/admin?section=audit-logs">Mở trang audit log đầy đủ</Link>}
    >
      <SearchBox value={query} onChange={(value) => { setQuery(value); setPage(1); }} label="Tìm kiếm audit log" />
      <table className="table">
        <thead>
          <tr>
            <th>Thời gian</th>
            <th>Hành động</th>
            <th>Workspace</th>
            <th>Người dùng</th>
            <th>Thông tin</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td>{new Date(log.createdAt).toLocaleString("vi-VN")}</td>
              <td className="table-main" style={{ fontWeight: 800 }}>{log.action}</td>
              <td>{log.workspace.name}</td>
              <td>{log.user?.email ?? "-"}</td>
              <td style={{ fontSize: 12, color: "var(--text-dim)" }}>
                {log.entityType}
                {log.entityId ? ` #${log.entityId}` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pager meta={meta} page={page} setPage={setPage} />
    </TablePanel>
  );
}

function SearchBox({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) { 
  return (
    <div style={{ marginBottom: 24, position: "relative" }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: "var(--primary)", marginBottom: 8, letterSpacing: "0.05em" }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input 
          value={value} 
          onChange={(event) => onChange(event.target.value)} 
          placeholder="Nhập từ khóa tìm kiếm..." 
          style={{ width: "100%", height: 52, padding: "0 16px 0 52px", borderRadius: 14, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none", fontSize: 15, transition: "all 0.2s" }} 
        />
        <span style={{ position: "absolute", left: 18, top: 15, fontSize: 18, opacity: 0.5 }}>🔍</span>
      </div>
    </div>
  ); 
}

function Pager({ meta, page, setPage }: { meta: PageMeta; page: number; setPage: (value: number) => void }) { 
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 32, padding: "0 16px" }}>
      <div style={{ fontSize: 13, color: "var(--text-dim)" }}>Hiển thị <b>{Math.min(meta.total, meta.pageSize)}</b> trong số <b>{meta.total}</b> bản ghi</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 12, marginRight: 8, color: "var(--text-dim)" }}>Trang {page} / {meta.pageCount}</span>
        <button className="button button-soft" style={{ width: 40, height: 40, padding: 0, borderRadius: 12 }} disabled={page <= 1} onClick={() => setPage(Math.max(1, page - 1))}>◀</button>
        <button className="button button-soft" style={{ width: 40, height: 40, padding: 0, borderRadius: 12 }} disabled={page >= meta.pageCount} onClick={() => setPage(Math.min(meta.pageCount, page + 1))}>▶</button>
      </div>
    </div>
  ); 
}

function StatusBadge({ status, type }: { status: string; type: "account" | "job" | "user" | "workspace" | "tool" }) { 
  const success = ["ACTIVE", "ALIVE", "DONE", "RUNNING"].includes(status); 
  const danger = ["DISABLED", "DEAD", "FAILED", "SUSPENDED"].includes(status); 
  const label = type === "account" ? formatAccountStatus(status) : type === "job" ? formatJobStatus(status) : status; 
  return (
    <span className={`badge ${success ? "badge-green" : danger ? "badge-red" : "badge-soft"}`} style={{ fontSize: 10, fontWeight: 900, padding: "4px 10px", borderRadius: 8, textTransform: "uppercase" }}>
      {label}
    </span>
  ); 
}

function TablePanel({ title, count, children, action }: { title: string; count: number; children: React.ReactNode; action?: React.ReactNode }) { 
  return (
    <section className="content-grid" style={{ gridTemplateColumns: "1fr" }}>
      <article className="panel" style={{ padding: 0, overflow: "hidden", border: "1px solid var(--border)", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "32px 40px", borderBottom: "1px solid var(--border)", background: "rgba(255,255,255,0.01)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>{title}</h2>
            <div className="badge badge-soft" style={{ padding: "6px 12px", borderRadius: 10, fontWeight: 800, fontSize: 12 }}>{count} TỔNG CỘNG</div>
          </div>
          {action}
        </div>
        <div style={{ padding: "32px 40px" }}>{children}</div>
      </article>
    </section>
  ); 
}

function BulkBar({ selected, onSelectPage, children }: { selected: number; onSelectPage: () => void; children: React.ReactNode }) { 
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24, alignItems: "center", padding: "16px 24px", background: "rgba(139, 92, 246, 0.05)", borderRadius: 16, border: "1px solid var(--primary-glow)" }}>
      <button className="button button-soft" style={{ height: 36, fontSize: 12, fontWeight: 700 }} onClick={onSelectPage}>Chọn trang này</button>
      <div style={{ height: 20, width: 1, background: "var(--border)", margin: "0 8px" }}></div>
      <div style={{ display: "flex", gap: 10 }}>{children}</div>
      <div style={{ marginLeft: "auto", fontWeight: 800, color: "var(--primary)", fontSize: 13 }}>{selected} ĐÃ CHỌN</div>
    </div>
  ); 
}

function DashboardSection({ tools, plans, auditLogs, system, onSectionChange }: { tools: AdminTool[]; plans: AdminPlan[]; auditLogs: AdminAuditLog[]; system: AdminSystem | null; onSectionChange: (section: string) => void }) { 
  const cards: Array<{ section: AdminSection; label: string; icon: string; color: string }> = [
    { section: "insights", label: "Phân tích sâu", icon: "📈", color: "var(--primary)" },
    { section: "users", label: "Người dùng", icon: "👥", color: "var(--success)" },
    { section: "workspaces", label: "Workspace", icon: "🏢", color: "var(--accent)" },
    { section: "accounts", label: "Tài khoản", icon: "📱", color: "var(--warning)" },
    { section: "jobs", label: "Tác vụ", icon: "⚡", color: "var(--danger)" },
    { section: "tools", label: `Công cụ (${tools.length})`, icon: "🛠️", color: "var(--primary)" },
    { section: "plans", label: `Gói (${plans.length})`, icon: "💎", color: "var(--accent)" },
    { section: "audit-logs", label: `Audit Logs`, icon: "📋", color: "var(--text-dim)" },
    { section: "activity", label: "Job Logs", icon: "🔔", color: "var(--warning)" },
    { section: "data", label: "Dữ liệu", icon: "💾", color: "var(--success)" },
    { section: "system", label: `Hệ thống`, icon: "🖥️", color: "var(--danger)" }
  ]; 
  return (
    <TablePanel title="Trung tâm điều hành" count={cards.length}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
        {cards.map((c) => (
          <button key={c.section} className="button button-soft" style={{ height: 80, display: "flex", gap: 16, justifyContent: "flex-start", padding: "0 24px", border: "1px solid var(--border)" }} onClick={() => onSectionChange(c.section)}>
            <span style={{ fontSize: 24 }}>{c.icon}</span>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{c.label}</div>
              <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase" }}>Management</div>
            </div>
          </button>
        ))}
      </div>
    </TablePanel>
  ); 
}

function InsightsSection({ insights, onSectionChange }: { insights: AdminInsights | null; onSectionChange: (section: string) => void }) {
  if (!insights) return <TablePanel title="Phân tích sâu" count={0}><div style={{ color: "var(--text-dim)", textAlign: "center", padding: 60 }}>Đang phân tích dữ liệu thời gian thực...</div></TablePanel>;
  return (
    <div style={{ display: "grid", gap: 40 }}>
      <section className="content-grid" style={{ gridTemplateColumns: "1.5fr 1fr", gap: 32 }}>
        <TablePanel title="Workspace cần xử lý" count={insights.workspaces.length}>
          <table className="table">
            <thead><tr><th>Workspace</th><th>Gói</th><th>Lượt Fetch</th><th>Alerts</th><th>Health</th></tr></thead>
            <tbody>{insights.workspaces.map((item) => (<tr key={item.id}><td className="table-main"><div style={{ fontWeight: 800, fontSize: 15 }}>{item.name}</div><div style={{ fontSize: 11, color: "var(--text-dim)" }}>{item.owner.email}</div></td><td><span style={{ fontWeight: 700 }}>{item.plan?.name ?? "FREE"}</span></td><td><div style={{ fontSize: 13 }}>{item.fetchToday.toLocaleString()} / {item.usageLimit.toLocaleString()}</div></td><td>{item.unreadNotifications}</td><td><span className={`badge ${item.level === "CRITICAL" ? "badge-red" : item.level === "WARN" ? "badge-amber" : "badge-green"}`} style={{ fontWeight: 800 }}>{item.healthScore}%</span></td></tr>))}</tbody>
          </table>
        </TablePanel>
        <TablePanel title="Cảnh báo quan trọng" count={insights.alerts.length}>
          <div style={{ display: "grid", gap: 16 }}>
            {insights.alerts.length ? insights.alerts.map((alert, index) => (
              <div key={index} style={{ padding: 20, borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}><div style={{ fontWeight: 800, color: "#fff" }}>{alert.workspace.name}</div><span className={`badge ${alert.severity === "HIGH" ? "badge-red" : "badge-soft"}`} style={{ fontSize: 9 }}>{alert.severity}</span></div>
                <div style={{ color: "var(--text-dim)", fontSize: 13, lineHeight: 1.6 }}>{alert.message}</div>
              </div>
            )) : <div style={{ color: "var(--text-dim)", textAlign: "center", padding: 40 }}>Tất cả các hệ thống ổn định.</div>}
          </div>
        </TablePanel>
      </section>
    </div>
  );
}

function UsersSection(p: SectionProps<{ users: AdminUser[]; currentUserId: string | null }>) { const ids = p.users.map((x) => x.id).filter((id) => id !== p.currentUserId); return <TablePanel title="Người dùng" count={p.meta.total} action={<button className="button button-soft" onClick={() => exportToCsv(p.users, "users.csv")}>Xuất CSV</button>}><SearchBox value={p.query} onChange={(v) => { p.setQuery(v); p.setPage(1); }} label="Tìm kiếm người dùng" /><BulkBar selected={p.selected?.length ?? 0} onSelectPage={() => p.togglePage?.(ids, selectedOrEmpty(p.selected), p.setSelected ?? noop)}><button className="button button-soft" disabled={!p.selected?.length} onClick={() => p.request?.("/admin/users/bulk", "PATCH", { userIds: p.selected, status: "ACTIVE" }, () => p.setSelected?.([]))}>Kích hoạt</button><button className="button button-soft" disabled={!p.selected?.length} onClick={() => p.request?.("/admin/users/bulk", "PATCH", { userIds: p.selected, status: "DISABLED" }, () => p.setSelected?.([]))}>Khóa tài khoản</button></BulkBar><table className="table"><thead><tr><th></th><th>Người dùng</th><th>Quyền</th><th>Trạng thái</th><th>Workspaces</th></tr></thead><tbody>{p.users.map((u) => <tr key={u.id}><td><input type="checkbox" disabled={u.id === p.currentUserId} checked={p.selected?.includes(u.id) ?? false} onChange={() => p.toggle?.(u.id, selectedOrEmpty(p.selected), p.setSelected ?? noop)} /></td><td className="table-main"><div style={{ fontWeight: 800, color: "#fff", fontSize: 15 }}>{u.email}</div><div style={{ fontSize: 11, color: "var(--text-dim)" }}>ID: {u.id.slice(0, 8)}</div></td><td style={{ fontWeight: 700 }}>{u.role}</td><td><StatusBadge status={u.status} type="user" /></td><td>{u._count.workspaces + u._count.memberOf} workspace</td></tr>)}</tbody></table><Pager meta={p.meta} page={p.page} setPage={p.setPage} /></TablePanel>; }
function WorkspacesSection(p: SectionProps<{ workspaces: AdminWorkspace[]; plans: AdminPlan[] }>) { const ids = p.workspaces.map((x) => x.id); return <TablePanel title="Không gian làm việc" count={p.meta.total}><SearchBox value={p.query} onChange={(v) => { p.setQuery(v); p.setPage(1); }} label="Tìm kiếm workspace" /><BulkBar selected={p.selected?.length ?? 0} onSelectPage={() => p.togglePage?.(ids, selectedOrEmpty(p.selected), p.setSelected ?? noop)}><button className="button button-soft" disabled={!p.selected?.length} onClick={() => p.request?.("/admin/workspaces/bulk", "PATCH", { workspaceIds: p.selected, status: "ACTIVE" }, () => p.setSelected?.([]))}>Hoạt động</button><button className="button button-soft" disabled={!p.selected?.length} onClick={() => p.request?.("/admin/workspaces/bulk", "PATCH", { workspaceIds: p.selected, status: "SUSPENDED" }, () => p.setSelected?.([]))}>Tạm dừng</button></BulkBar><table className="table"><thead><tr><th></th><th>Workspace</th><th>Chủ sở hữu</th><th>Gói dịch vụ</th><th>Trạng thái</th><th>Tài nguyên</th></tr></thead><tbody>{p.workspaces.map((w) => <tr key={w.id}><td><input type="checkbox" checked={p.selected?.includes(w.id) ?? false} onChange={() => p.toggle?.(w.id, selectedOrEmpty(p.selected), p.setSelected ?? noop)} /></td><td className="table-main"><div style={{ fontWeight: 800, color: "#fff", fontSize: 15 }}>{w.name}</div><div style={{ fontSize: 11, color: "var(--text-dim)" }}>ID: {w.id.slice(0, 8)}</div></td><td style={{ fontSize: 13 }}>{w.owner.email}</td><td style={{ fontWeight: 700 }}>{w.subscriptions[0]?.plan.name ?? "-"}</td><td><StatusBadge status={w.status} type="workspace" /></td><td style={{ fontSize: 12, color: "var(--text-dim)" }}>{w._count.accounts} Acc / {w._count.jobs} Job</td></tr>)}</tbody></table><Pager meta={p.meta} page={p.page} setPage={p.setPage} /></TablePanel>; }
function AccountsSection(p: SectionProps<{ accounts: AdminAccount[] }>) { const ids = p.accounts.map((x) => x.id); return <TablePanel title="Quản lý Tài khoản" count={p.meta.total}><SearchBox value={p.query} onChange={(v) => { p.setQuery(v); p.setPage(1); }} label="Tìm kiếm tài khoản" /><BulkBar selected={p.selected?.length ?? 0} onSelectPage={() => p.togglePage?.(ids, selectedOrEmpty(p.selected), p.setSelected ?? noop)}><button className="button button-soft" disabled={!p.selected?.length} onClick={() => p.request?.("/admin/accounts/bulk", "PATCH", { accountIds: p.selected, status: "ALIVE" }, () => p.setSelected?.([]))}>Live</button><button className="button button-soft" disabled={!p.selected?.length} onClick={() => p.request?.("/admin/accounts/bulk", "PATCH", { accountIds: p.selected, status: "DEAD" }, () => p.setSelected?.([]))}>Dead</button></BulkBar><table className="table"><thead><tr><th></th><th>Tài khoản</th><th>Nền tảng</th><th>Trạng thái</th><th>Workspace</th></tr></thead><tbody>{p.accounts.map((a) => <tr key={a.id}><td><input type="checkbox" checked={p.selected?.includes(a.id) ?? false} onChange={() => p.toggle?.(a.id, selectedOrEmpty(p.selected), p.setSelected ?? noop)} /></td><td className="table-main"><div style={{ fontWeight: 800, color: "#fff", fontSize: 15 }}>{a.label}</div><div style={{ fontSize: 11, color: "var(--text-dim)" }}>ID: {a.id.slice(0, 8)}</div></td><td><div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ fontSize: 16 }}>{a.platform === "facebook" ? "📘" : a.platform === "tiktok" ? "🎵" : "🧡"}</span>{formatPlatform(a.platform)}</div></td><td><StatusBadge status={a.status} type="account" /></td><td style={{ fontSize: 13 }}>{a.workspace.name}</td></tr>)}</tbody></table><Pager meta={p.meta} page={p.page} setPage={p.setPage} /></TablePanel>; }
function JobsSection(p: SectionProps<{ jobs: AdminJob[] }>) { const ids = p.jobs.map((x) => x.id); return <TablePanel title="Tiến trình Automation" count={p.meta.total}><SearchBox value={p.query} onChange={(v) => { p.setQuery(v); p.setPage(1); }} label="Tìm kiếm tác vụ" /><BulkBar selected={p.selected?.length ?? 0} onSelectPage={() => p.togglePage?.(ids, selectedOrEmpty(p.selected), p.setSelected ?? noop)}><button className="button button-soft" disabled={!p.selected?.length} onClick={() => p.request?.("/admin/jobs/bulk", "PATCH", { jobIds: p.selected, status: "DONE" }, () => p.setSelected?.([]))}>Đánh dấu Hoàn tất</button></BulkBar><table className="table"><thead><tr><th></th><th>Mã tác vụ</th><th>Loại hình</th><th>Chế độ</th><th>Trạng thái</th><th>Workspace</th><th>Lượt chạy</th></tr></thead><tbody>{p.jobs.map((j) => <tr key={j.id}><td><input type="checkbox" checked={p.selected?.includes(j.id) ?? false} onChange={() => p.toggle?.(j.id, selectedOrEmpty(p.selected), p.setSelected ?? noop)} /></td><td className="table-main" style={{ fontFamily: "monospace", fontWeight: 800, color: "var(--primary)" }}>{j.id.slice(0, 8)}</td><td>{formatJobType(j.jobType)}</td><td>{formatJobMode(j.mode)}</td><td><StatusBadge status={j.status} type="job" /></td><td style={{ fontSize: 13 }}>{j.workspace.name}</td><td>{j._count.runs}</td></tr>)}</tbody></table><Pager meta={p.meta} page={p.page} setPage={p.setPage} /></TablePanel>; }

function ToolsSection(p: SectionProps<{ tools: AdminTool[] }>) { 
  const ids = p.tools.map((x) => x.id); 
  return (
    <TablePanel title="Công cụ hệ thống" count={p.meta.total}>
      <SearchBox value={p.query} onChange={(v) => { p.setQuery(v); p.setPage(1); }} label="Tìm kiếm module công cụ" />
      <BulkBar selected={p.selected?.length ?? 0} onSelectPage={() => p.togglePage?.(ids, selectedOrEmpty(p.selected), p.setSelected ?? noop)}>
        <button className="button button-primary" style={{ height: 36, borderRadius: 10, padding: "0 20px" }} disabled={!p.selected?.length} onClick={() => p.request?.("/admin/tools/bulk", "PATCH", { toolIds: p.selected, status: "ACTIVE" }, () => p.setSelected?.([]))}>Kích hoạt</button>
        <button className="button button-soft" style={{ height: 36, borderRadius: 10, padding: "0 20px" }} disabled={!p.selected?.length} onClick={() => p.request?.("/admin/tools/bulk", "PATCH", { toolIds: p.selected, status: "DISABLED" }, () => p.setSelected?.([]))}>Vô hiệu hóa</button>
      </BulkBar>
      <table className="table">
        <thead><tr><th></th><th>Module Code</th><th>Tên hiển thị</th><th>Phân loại</th><th>Trạng thái</th><th>Cài đặt</th><th>Thao tác</th></tr></thead>
        <tbody>
          {p.tools.map((t) => (
            <tr key={t.id}>
              <td><input type="checkbox" checked={p.selected?.includes(t.id) ?? false} onChange={() => p.toggle?.(t.id, selectedOrEmpty(p.selected), p.setSelected ?? noop)} /></td>
              <td className="table-main" style={{ fontFamily: "monospace", fontWeight: 800, color: "var(--primary)", fontSize: 13 }}>{t.code}</td>
              <td style={{ fontWeight: 700 }}>
                <div>{t.name}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                  <span className="badge badge-soft" style={{ fontSize: 10, fontWeight: 700 }}>{t.contract?.stage ?? "unknown"}</span>
                  <span className="badge badge-soft" style={{ fontSize: 10, fontWeight: 700 }}>{t.contract?.jobType ?? "n/a"}</span>
                </div>
              </td>
              <td><span className="badge badge-soft" style={{ fontSize: 10, fontWeight: 700 }}>{t.category}</span></td>
              <td><StatusBadge status={t.status} type="tool" /></td>
              <td style={{ fontSize: 12, color: "var(--text-dim)" }}>
                <div>{t._count.workspaceTools} workspace</div>
                <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(t.contract?.requiredRuntime ?? []).map((runtime) => <span key={runtime} className="badge badge-soft" style={{ fontSize: 9 }}>{runtime}</span>)}
                </div>
              </td>
              <td>
                <button 
                  className="button" 
                  style={{ height: 32, fontSize: 11, borderRadius: 8, background: t.status === "ACTIVE" ? "rgba(244, 63, 94, 0.1)" : "rgba(16, 185, 129, 0.1)", color: t.status === "ACTIVE" ? "var(--danger)" : "var(--success)", border: "none", fontWeight: 800, padding: "0 12px" }} 
                  onClick={() => p.request?.(`/admin/tools/${t.id}`, "PATCH", { status: t.status === "ACTIVE" ? "DISABLED" : "ACTIVE" })}
                >
                  {t.status === "ACTIVE" ? "TẮT" : "BẬT"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pager meta={p.meta} page={p.page} setPage={p.setPage} />
    </TablePanel>
  ); 
}

function PlansSection({ plans, request }: { plans: AdminPlan[]; request: RequestFn }) {
  const [selectedCode, setSelectedCode] = useState<AdminPlan["code"] | "">("");
  const [name, setName] = useState("");
  const [priceMonthly, setPriceMonthly] = useState("");
  const [maxAccounts, setMaxAccounts] = useState("0");
  const [maxRunningJobs, setMaxRunningJobs] = useState("0");
  const [maxWorkspaces, setMaxWorkspaces] = useState("0");
  const [maxDailyFetches, setMaxDailyFetches] = useState("0");
  const [featuresJson, setFeaturesJson] = useState("[]");

  useEffect(() => {
    const selected = plans.find((plan) => plan.code === selectedCode) ?? plans[0];
    if (!selected) return;
    setSelectedCode(selected.code);
    setName(selected.name);
    setPriceMonthly(selected.priceMonthly);
    setMaxAccounts(String(selected.maxAccounts));
    setMaxRunningJobs(String(selected.maxRunningJobs));
    setMaxWorkspaces(String(selected.maxWorkspaces));
    setMaxDailyFetches(String(selected.maxDailyFetches));
    setFeaturesJson(selected.featuresJson || "[]");
  }, [plans, selectedCode]);

  function savePlan() {
    const selected = plans.find((plan) => plan.code === selectedCode);
    if (!selected) return;
    request(`/admin/plans/${selected.id}`, "PATCH", {
      name, priceMonthly: Number(priceMonthly), maxAccounts: Number(maxAccounts), maxRunningJobs: Number(maxRunningJobs),
      maxWorkspaces: Number(maxWorkspaces), maxDailyFetches: Number(maxDailyFetches), featuresJson: featuresJson.trim() || "[]"
    });
  }

  return (
    <TablePanel title="Quản lý Gói dịch vụ" count={plans.length}>
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 40, alignItems: "start" }}>
        <div className="panel" style={{ padding: 0, overflow: "hidden", border: "1px solid var(--border)" }}>
           <table className="table">
            <thead><tr><th>Mã</th><th>Tên gói</th><th>Giá thuê</th><th>Hạn mức</th></tr></thead>
            <tbody>{plans.map((p) => (<tr key={p.id} style={{ background: p.code === selectedCode ? "rgba(139, 92, 246, 0.05)" : undefined, cursor: "pointer" }} onClick={() => setSelectedCode(p.code)}>
              <td className="table-main" style={{ fontWeight: 900, color: p.code === selectedCode ? "var(--primary)" : "#fff", letterSpacing: "0.05em" }}>{p.code}</td>
              <td style={{ fontWeight: 700 }}>{p.name}</td>
              <td style={{ color: "var(--success)", fontWeight: 800 }}>{Number(p.priceMonthly).toLocaleString("vi-VN")}đ</td>
              <td style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase" }}>{p.maxAccounts} ACC / {p.maxRunningJobs} JOB</td>
            </tr>))}</tbody>
          </table>
        </div>

        <div className="panel" style={{ padding: 40, border: "1px solid var(--primary-glow)", background: "rgba(139, 92, 246, 0.02)", boxShadow: "0 10px 30px rgba(139, 92, 246, 0.1)" }}>
           <h3 style={{ fontSize: "1.25rem", fontWeight: 900, marginBottom: 32, display: "flex", alignItems: "center", gap: 12 }}>
             <span style={{ width: 32, height: 32, borderRadius: 8, background: "var(--primary)", display: "grid", placeItems: "center", fontSize: 16 }}>✨</span>
             Cập nhật Gói: <span style={{ color: "var(--primary)" }}>{selectedCode}</span>
           </h3>
           <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div className="input-group">
                <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 10, color: "var(--text-dim)" }}>Tên gói hiển thị</label>
                <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", height: 48, padding: "0 16px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
              </div>
              <div className="input-group">
                <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 10, color: "var(--text-dim)" }}>Giá hàng tháng (VNĐ)</label>
                <input type="number" value={priceMonthly} onChange={(e) => setPriceMonthly(e.target.value)} style={{ width: "100%", height: 48, padding: "0 16px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                 <div className="input-group">
                    <label style={{ display: "block", fontSize: 10, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>Max Accounts</label>
                    <input type="number" value={maxAccounts} onChange={(e) => setMaxAccounts(e.target.value)} style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
                 </div>
                 <div className="input-group">
                    <label style={{ display: "block", fontSize: 10, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>Max Running Jobs</label>
                    <input type="number" value={maxRunningJobs} onChange={(e) => setMaxRunningJobs(e.target.value)} style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
                 </div>
                 <div className="input-group">
                    <label style={{ display: "block", fontSize: 10, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>Max Workspaces</label>
                    <input type="number" value={maxWorkspaces} onChange={(e) => setMaxWorkspaces(e.target.value)} style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
                 </div>
                 <div className="input-group">
                    <label style={{ display: "block", fontSize: 10, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>Lượt Fetch / ngày</label>
                    <input type="number" value={maxDailyFetches} onChange={(e) => setMaxDailyFetches(e.target.value)} style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
                 </div>
              </div>
              <div className="input-group">
                <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 10, color: "var(--text-dim)" }}>Cấu hình tính năng (JSON)</label>
                <textarea rows={5} value={featuresJson} onChange={(e) => setFeaturesJson(e.target.value)} style={{ width: "100%", padding: 16, borderRadius: 14, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none", fontSize: 12, fontFamily: "monospace", resize: "vertical" }} />
              </div>
              <button className="button button-primary" style={{ height: 56, borderRadius: 16, fontWeight: 900, fontSize: 16, marginTop: 10, boxShadow: "0 10px 20px rgba(139, 92, 246, 0.2)" }} onClick={savePlan}>CẬP NHẬT GÓI NGAY 🚀</button>
           </div>
        </div>
      </div>
    </TablePanel>
  );
}

function AuditSection({ logs, meta, query, page, setQuery, setPage }: SectionProps<{ logs: AdminAuditLog[] }>) { return <TablePanel title="Nhật ký Audit" count={meta.total}><SearchBox value={query} onChange={(v) => { setQuery(v); setPage(1); }} label="Tìm kiếm nhật ký" /><table className="table"><thead><tr><th>Thời gian</th><th>Hành động</th><th>Đối tượng</th><th>Workspace</th><th>Người dùng</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id}><td>{new Date(log.createdAt).toLocaleString("vi-VN")}</td><td className="table-main" style={{ fontWeight: 800 }}>{log.action}</td><td><span className="badge badge-soft" style={{ fontSize: 10 }}>{log.entityType}</span></td><td style={{ fontSize: 13 }}>{log.workspace.name}</td><td>{log.user?.email ?? "-"}</td></tr>)}</tbody></table><Pager meta={meta} page={page} setPage={setPage} /></TablePanel>; }
function ActivitySection({ logs, meta, query, page, setQuery, setPage }: SectionProps<{ logs: AdminJobLog[] }>) { return <TablePanel title="Hoạt động hệ thống" count={meta.total}><SearchBox value={query} onChange={(v) => { setQuery(v); setPage(1); }} label="Tìm kiếm lịch sử log" /><table className="table"><thead><tr><th>Thời gian</th><th>Tác vụ</th><th>Level</th><th>Nội dung</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id}><td>{new Date(log.createdAt).toLocaleString("vi-VN")}</td><td style={{ fontWeight: 700 }}>{formatJobType(log.jobRun.job.jobType)}</td><td><span className={`badge ${log.level === "error" ? "badge-red" : "badge-soft"}`} style={{ fontWeight: 900 }}>{log.level.toUpperCase()}</span></td><td className="table-main" style={{ fontSize: 13 }}>{log.message}</td></tr>)}</tbody></table><Pager meta={meta} page={page} setPage={setPage} /></TablePanel>; }
function SnapshotsSection({ snapshots, meta, query, page, setQuery, setPage }: SectionProps<{ snapshots: AdminSnapshot[] }>) { return <TablePanel title="Dữ liệu Snapshot" count={meta.total} action={<button className="button button-soft" onClick={() => exportToCsv(snapshots, "snapshots.csv")}>Xuất CSV</button>}><SearchBox value={query} onChange={(v) => { setQuery(v); setPage(1); }} label="Tìm kiếm kho dữ liệu" /><table className="table"><thead><tr><th>Thời gian</th><th>Platform</th><th>Loại dữ liệu</th><th>Workspace</th><th>Nội dung</th></tr></thead><tbody>{snapshots.map((s) => <tr key={s.id}><td>{new Date(s.fetchedAt).toLocaleString("vi-VN")}</td><td><div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ fontSize: 16 }}>{s.sourcePlatform === "facebook" ? "📘" : s.sourcePlatform === "tiktok" ? "🎵" : "🧡"}</span>{formatPlatform(s.sourcePlatform)}</div></td><td style={{ fontWeight: 700 }}>{formatJobType(s.dataType)}</td><td>{s.workspace.name}</td><td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, opacity: 0.6 }}>{s.payloadJson}</td></tr>)}</tbody></table><Pager meta={meta} page={page} setPage={setPage} /></TablePanel>; }
if (false) { // Legacy duplicate system components kept out of the build.
function SystemSection({ system, request }: { system: AdminSystem | null; request: RequestFn }) {
  const [bankName, setBankName] = useState(system?.payment.settings?.bankName ?? "");
  const [bankCode, setBankCode] = useState(system?.payment.settings?.bankCode ?? "");
  const [accountName, setAccountName] = useState(system?.payment.settings?.accountName ?? "");
  const [accountNumber, setAccountNumber] = useState(system?.payment.settings?.accountNumber ?? "");
  const [transferPrefix, setTransferPrefix] = useState(system?.payment.settings?.transferPrefix ?? "MMO");
  const [note, setNote] = useState(system?.payment.settings?.note ?? "");
  const [isActive, setIsActive] = useState(system?.payment.settings?.isActive ?? true);

  useEffect(() => {
    setBankName(system?.payment.settings?.bankName ?? "");
    setBankCode(system?.payment.settings?.bankCode ?? "");
    setAccountName(system?.payment.settings?.accountName ?? "");
    setAccountNumber(system?.payment.settings?.accountNumber ?? "");
    setTransferPrefix(system?.payment.settings?.transferPrefix ?? "MMO");
    setNote(system?.payment.settings?.note ?? "");
    setIsActive(system?.payment.settings?.isActive ?? true);
  }, [system]);

  const selectedBank = BANK_OPTIONS.find((bank) => bank.code === bankCode) ?? null;

  function savePaymentSettings() {
    request("/admin/system/payment", "PATCH", {
      bankName,
      bankCode,
      accountName,
      accountNumber,
      transferPrefix,
      note,
      isActive
    });
  }

  return (
    <TablePanel title="Trạng thái Backend" count={system ? 1 : 0}>
      <div className="metric-grid">
        <article className="metric-card">
          <div className="metric-label">Database Status</div>
          <div className="metric-value" style={{ color: "var(--success)" }}>
            {system?.database.status ?? "-"}
          </div>
        </article>
        <article className="metric-card">
          <div className="metric-label">BullMQ Queue</div>
          <div className="metric-value">{system?.queue.status ?? "-"}</div>
        </article>
        <article className="metric-card">
          <div className="metric-label">Pending Tasks</div>
          <div className="metric-value" style={{ color: "var(--warning)" }}>
            {system?.queue.counts.waiting ?? 0}
          </div>
        </article>
        <article className="metric-card">
          <div className="metric-label">API Latency</div>
          <div className="metric-value" style={{ color: "var(--accent)" }}>
            {system?.latencyMs ?? 0}ms
          </div>
        </article>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 28, alignItems: "start" }}>
        <div className="panel" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Thông tin tài khoản thanh toán</h3>
          <div style={{ display: "grid", gap: 16 }}>
            <div className="input-group">
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>Tên ngân hàng</label>
              <input value={bankName} onChange={(event) => setBankName(event.target.value)} style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
            </div>
            <div className="input-group">
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>Mã ngân hàng</label>
              <input value={bankCode} onChange={(event) => setBankCode(event.target.value)} placeholder="VCB, MBB, ACB..." style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
            </div>
            <div className="input-group">
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>Tên chủ tài khoản</label>
              <input value={accountName} onChange={(event) => setAccountName(event.target.value)} style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
            </div>
            <div className="input-group">
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>Số tài khoản</label>
              <input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
            </div>
            <div className="input-group">
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>Nội dung chuyển khoản</label>
              <input value={transferPrefix} onChange={(event) => setTransferPrefix(event.target.value)} placeholder="MMO" style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
            </div>
            <div className="input-group">
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>Ghi chú</label>
              <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} style={{ width: "100%", padding: 14, borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none", resize: "vertical" }} />
            </div>
            <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: "var(--text-muted)" }}>
              <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
              Kích hoạt cấu hình thanh toán này
            </label>
            <button className="button button-primary" style={{ height: 48, borderRadius: 12, fontWeight: 800 }} onClick={savePaymentSettings}>
              Lưu cấu hình thanh toán
            </button>
          </div>
        </div>

        <div className="panel" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Lịch sử giao dịch</h3>
          <div style={{ display: "grid", gap: 12 }}>
            {(system?.payment.transactions ?? []).length ? (
              system?.payment.transactions.map((transaction) => (
                <div key={transaction.id} style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 800, color: "#fff" }}>{transaction.planName}</div>
                      <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>{transaction.workspace.name} • {transaction.checkoutCode}</div>
                    </div>
                    <span className={`badge ${transaction.status === "PAID" ? "badge-green" : transaction.status === "CANCELED" ? "badge-red" : "badge-soft"}`} style={{ fontWeight: 800, fontSize: 10 }}>
                      {transaction.status}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginTop: 12, fontSize: 13 }}>
                    <div>Số tiền: <b style={{ color: "var(--primary)" }}>{transaction.amount.toLocaleString("vi-VN")}đ</b></div>
                    <div>Thời gian: <b>{new Date(transaction.createdAt).toLocaleString("vi-VN")}</b></div>
                    <div style={{ gridColumn: "1 / -1" }}>Nội dung: <b>{transaction.transferContent}</b></div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: "var(--text-dim)", fontSize: 14, lineHeight: 1.6 }}>
                Chưa có giao dịch nào. Khi người dùng bắt đầu thanh toán, lịch sử sẽ xuất hiện ở đây.
              </div>
            )}
          </div>
        </div>
      </div>
    </TablePanel>
  );
}

function SystemPaymentSection({ system, request }: { system: AdminSystem | null; request: RequestFn }) {
  const [bankName, setBankName] = useState(system?.payment.settings?.bankName ?? "");
  const [bankCode, setBankCode] = useState(system?.payment.settings?.bankCode ?? "");
  const [accountName, setAccountName] = useState(system?.payment.settings?.accountName ?? "");
  const [accountNumber, setAccountNumber] = useState(system?.payment.settings?.accountNumber ?? "");
  const [transferPrefix, setTransferPrefix] = useState(system?.payment.settings?.transferPrefix ?? "MMO");
  const [note, setNote] = useState(system?.payment.settings?.note ?? "");
  const [isActive, setIsActive] = useState(system?.payment.settings?.isActive ?? true);
  const [apiBaseUrl, setApiBaseUrl] = useState(system?.payment.integrations?.apiBaseUrl ?? "");
  const [apiKey, setApiKey] = useState(system?.payment.integrations?.apiKey ?? "");
  const [apiSecret, setApiSecret] = useState(system?.payment.integrations?.apiSecret ?? "");
  const [webhookUrl, setWebhookUrl] = useState(system?.payment.integrations?.webhookUrl ?? "");
  const [webhookSecret, setWebhookSecret] = useState(system?.payment.integrations?.webhookSecret ?? "");
  const [redisHost, setRedisHost] = useState(system?.payment.integrations?.redisHost ?? "127.0.0.1");
  const [redisPort, setRedisPort] = useState(String(system?.payment.integrations?.redisPort ?? 6379));
  const [workerConcurrency, setWorkerConcurrency] = useState(String(system?.payment.integrations?.workerConcurrency ?? 2));
  const [integrationNote, setIntegrationNote] = useState(system?.payment.integrations?.note ?? "");
  const [integrationActive, setIntegrationActive] = useState(system?.payment.integrations?.isActive ?? true);

  useEffect(() => {
    setBankName(system?.payment.settings?.bankName ?? "");
    setBankCode(system?.payment.settings?.bankCode ?? "");
    setAccountName(system?.payment.settings?.accountName ?? "");
    setAccountNumber(system?.payment.settings?.accountNumber ?? "");
    setTransferPrefix(system?.payment.settings?.transferPrefix ?? "MMO");
    setNote(system?.payment.settings?.note ?? "");
    setIsActive(system?.payment.settings?.isActive ?? true);
    setApiBaseUrl(system?.payment.integrations?.apiBaseUrl ?? "");
    setApiKey(system?.payment.integrations?.apiKey ?? "");
    setApiSecret(system?.payment.integrations?.apiSecret ?? "");
    setWebhookUrl(system?.payment.integrations?.webhookUrl ?? "");
    setWebhookSecret(system?.payment.integrations?.webhookSecret ?? "");
    setRedisHost(system?.payment.integrations?.redisHost ?? "127.0.0.1");
    setRedisPort(String(system?.payment.integrations?.redisPort ?? 6379));
    setWorkerConcurrency(String(system?.payment.integrations?.workerConcurrency ?? 2));
    setIntegrationNote(system?.payment.integrations?.note ?? "");
    setIntegrationActive(system?.payment.integrations?.isActive ?? true);
  }, [system]);

  const selectedBank = BANK_OPTIONS.find((bank) => bank.code === bankCode) ?? null;

  function savePaymentSettings() {
    request("/admin/system/payment", "PATCH", {
      bankName,
      bankCode,
      accountName,
      accountNumber,
      transferPrefix,
      note,
      isActive
    });
  }

  function saveIntegrationSettings() {
    request("/admin/system/integration", "PATCH", {
      apiBaseUrl,
      apiKey,
      apiSecret,
      webhookUrl,
      webhookSecret,
      redisHost,
      redisPort: Number(redisPort),
      workerConcurrency: Number(workerConcurrency),
      note: integrationNote,
      isActive: integrationActive
    });
  }

  return (
    <TablePanel title="Cài đặt thanh toán" count={system?.payment.settings ? 1 : 0}>
      <div className="metric-grid">
        <article className="metric-card">
          <div className="metric-label">Database Status</div>
          <div className="metric-value" style={{ color: "var(--success)" }}>
            {system?.database.status ?? "-"}
          </div>
        </article>
        <article className="metric-card">
          <div className="metric-label">BullMQ Queue</div>
          <div className="metric-value">{system?.queue.status ?? "-"}</div>
        </article>
        <article className="metric-card">
          <div className="metric-label">Pending Tasks</div>
          <div className="metric-value" style={{ color: "var(--warning)" }}>
            {system?.queue.counts.waiting ?? 0}
          </div>
        </article>
        <article className="metric-card">
          <div className="metric-label">API Latency</div>
          <div className="metric-value" style={{ color: "var(--accent)" }}>
            {system?.latencyMs ?? 0}ms
          </div>
        </article>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 28, alignItems: "start" }}>
        <div className="panel" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Thông tin tài khoản thanh toán</h3>
          <div style={{ display: "grid", gap: 16 }}>
            <div className="input-group">
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>
                Chọn ngân hàng
              </label>
              <select
                value={selectedBank?.code ?? ""}
                onChange={(event) => {
                  const nextBank = BANK_OPTIONS.find((bank) => bank.code === event.target.value) ?? null;
                  setBankName(nextBank?.label ?? "");
                  setBankCode(nextBank?.code ?? "");
                }}
                style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }}
              >
                <option value="">-- Chọn ngân hàng --</option>
                {BANK_OPTIONS.map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.label} ({bank.code})
                  </option>
                ))}
              </select>
              <div style={{ marginTop: 8, color: "var(--text-dim)", fontSize: 12, lineHeight: 1.5 }}>
                Mã ngân hàng sẽ tự động điền theo lựa chọn để tránh nhập sai.
              </div>
            </div>
            <div className="input-group">
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>
                Mã ngân hàng tự động
              </label>
              <input
                value={bankCode}
                readOnly
                placeholder="Tự đổ theo ngân hàng đã chọn"
                style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", color: "#fff", outline: "none", opacity: 0.9 }}
              />
            </div>
            <div className="input-group">
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>
                Tên chủ tài khoản
              </label>
              <input value={accountName} onChange={(event) => setAccountName(event.target.value)} style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
            </div>
            <div className="input-group">
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>
                Số tài khoản
              </label>
              <input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
            </div>
            <div className="input-group">
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>
                Nội dung chuyển khoản
              </label>
              <input value={transferPrefix} onChange={(event) => setTransferPrefix(event.target.value)} placeholder="MMO" style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
            </div>
            <div className="input-group">
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>
                Ghi chú
              </label>
              <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} style={{ width: "100%", padding: 14, borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none", resize: "vertical" }} />
            </div>
            <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: "var(--text-muted)" }}>
              <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
              Kích hoạt cấu hình thanh toán này
            </label>
            <button className="button button-primary" style={{ height: 48, borderRadius: 12, fontWeight: 800 }} onClick={savePaymentSettings}>
              Lưu cấu hình thanh toán
            </button>
        </div>
      </div>

      <div className="panel" style={{ padding: 24, marginTop: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>API & Tich hop</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div style={{ display: "grid", gap: 16 }}>
            <div className="input-group">
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>API Base URL</label>
              <input value={apiBaseUrl} onChange={(event) => setApiBaseUrl(event.target.value)} placeholder="https://api.example.com" style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
            </div>
            <div className="input-group">
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>API Key</label>
              <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
            </div>
            <div className="input-group">
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>API Secret</label>
              <input value={apiSecret} onChange={(event) => setApiSecret(event.target.value)} style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
            </div>
            <div className="input-group">
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>Webhook URL</label>
              <input value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} placeholder="https://..." style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
            </div>
          </div>
          <div style={{ display: "grid", gap: 16 }}>
            <div className="input-group">
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>Webhook Secret</label>
              <input value={webhookSecret} onChange={(event) => setWebhookSecret(event.target.value)} style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
            </div>
            <div className="input-group">
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>Redis Host</label>
              <input value={redisHost} onChange={(event) => setRedisHost(event.target.value)} style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div className="input-group">
                <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>Redis Port</label>
                <input type="number" value={redisPort} onChange={(event) => setRedisPort(event.target.value)} style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
              </div>
              <div className="input-group">
                <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>Worker concurrency</label>
                <input type="number" value={workerConcurrency} onChange={(event) => setWorkerConcurrency(event.target.value)} style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none" }} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
          <div className="input-group">
            <label style={{ display: "block", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8, color: "var(--text-dim)" }}>Ghi chú</label>
            <textarea value={integrationNote} onChange={(event) => setIntegrationNote(event.target.value)} rows={4} style={{ width: "100%", padding: 14, borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "#fff", outline: "none", resize: "vertical" }} />
          </div>
          <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: "var(--text-muted)" }}>
            <input type="checkbox" checked={integrationActive} onChange={(event) => setIntegrationActive(event.target.checked)} />
            Kích hoạt cau hinh API nay
          </label>
          <button className="button button-primary" style={{ height: 48, borderRadius: 12, fontWeight: 800 }} onClick={saveIntegrationSettings}>
            Luu cau hinh API & tich hop
          </button>
        </div>
      </div>

        <div className="panel" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Lịch sử giao dịch</h3>
          <div style={{ display: "grid", gap: 12 }}>
            {(system?.payment.transactions ?? []).length ? (
              system?.payment.transactions.map((transaction) => (
                <div key={transaction.id} style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontWeight: 800, color: "#fff" }}>{transaction.planName}</div>
                      <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>
                        {transaction.workspace.name} • {transaction.checkoutCode}
                      </div>
                    </div>
                    <span className={`badge ${transaction.status === "PAID" ? "badge-green" : transaction.status === "CANCELED" ? "badge-red" : "badge-soft"}`} style={{ fontWeight: 800, fontSize: 10 }}>
                      {transaction.status}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginTop: 12, fontSize: 13 }}>
                    <div>
                      Số tiền: <b style={{ color: "var(--primary)" }}>{transaction.amount.toLocaleString("vi-VN")}đ</b>
                    </div>
                    <div>
                      Thời gian: <b>{new Date(transaction.createdAt).toLocaleString("vi-VN")}</b>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      Nội dung: <b>{transaction.transferContent}</b>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: "var(--text-dim)", fontSize: 14, lineHeight: 1.6 }}>
                Chưa có giao dịch nào. Khi người dùng bắt đầu thanh toán, lịch sử sẽ xuất hiện ở đây.
              </div>
            )}
          </div>
        </div>
      </div>
    </TablePanel>
  );
}
}
