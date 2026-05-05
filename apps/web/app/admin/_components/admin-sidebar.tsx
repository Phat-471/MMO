"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { MouseEvent } from "react";

export type AdminSection =
  | "dashboard"
  | "insights"
  | "users"
  | "workspaces"
  | "accounts"
  | "jobs"
  | "tools"
  | "plans"
  | "audit-logs"
  | "activity"
  | "data"
  | "system";

type AdminSidebarProps = {
  title: string;
  subtitle: string;
  activeSection?: AdminSection;
  onSectionChange?: (section: AdminSection) => void;
};

type AdminNavItem = {
  label: string;
  href: string;
  match: string[];
  section: AdminSection;
};

export const ADMIN_SECTION_PATHS: Record<AdminSection, string> = {
  dashboard: "/admin",
  insights: "/admin?section=insights",
  users: "/admin/users",
  workspaces: "/admin/workspaces",
  accounts: "/admin/accounts",
  jobs: "/admin/jobs",
  tools: "/admin/tools",
  plans: "/admin/plans",
  "audit-logs": "/admin/audit-logs",
  activity: "/admin/activity",
  data: "/admin/data",
  system: "/admin/system"
};

const NAV_ITEMS: (AdminNavItem & { icon: string })[] = [
  { label: "Bảng điều khiển", icon: "📊", href: ADMIN_SECTION_PATHS.dashboard, match: ["/admin"], section: "dashboard" },
  { label: "Phân tích sâu", icon: "📈", href: ADMIN_SECTION_PATHS.insights, match: ["/admin"], section: "insights" },
  { label: "Người dùng", icon: "👥", href: ADMIN_SECTION_PATHS.users, match: ["/admin/users"], section: "users" },
  { label: "Workspace", icon: "🏢", href: ADMIN_SECTION_PATHS.workspaces, match: ["/admin/workspaces"], section: "workspaces" },
  { label: "Tài khoản", icon: "📱", href: ADMIN_SECTION_PATHS.accounts, match: ["/admin/accounts"], section: "accounts" },
  { label: "Tác vụ", icon: "⚡", href: ADMIN_SECTION_PATHS.jobs, match: ["/admin/jobs", "/admin/job-runs"], section: "jobs" },
  { label: "Công cụ", icon: "🛠️", href: ADMIN_SECTION_PATHS.tools, match: ["/admin/tools"], section: "tools" },
  { label: "Gói dịch vụ", icon: "💎", href: ADMIN_SECTION_PATHS.plans, match: ["/admin/plans"], section: "plans" },
  { label: "Nhật ký Audit", icon: "📋", href: ADMIN_SECTION_PATHS["audit-logs"], match: ["/admin/audit-logs"], section: "audit-logs" },
  { label: "Hoạt động", icon: "🔔", href: ADMIN_SECTION_PATHS.activity, match: ["/admin/activity"], section: "activity" },
  { label: "Dữ liệu", icon: "💾", href: ADMIN_SECTION_PATHS.data, match: ["/admin/data"], section: "data" },
  { label: "Hệ thống", icon: "🖥️", href: ADMIN_SECTION_PATHS.system, match: ["/admin/system"], section: "system" }
];

export default function AdminSidebar({ title, subtitle, activeSection, onSectionChange }: AdminSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const section = activeSection ?? searchParams.get("section") ?? "dashboard";

  function handleSectionClick(event: MouseEvent<HTMLAnchorElement>, nextSection: AdminSection) {
    if (!onSectionChange) {
      return;
    }

    event.preventDefault();
    onSectionChange(nextSection);
  }

  return (
    <aside className="sidebar">
      <Link
        className="brand"
        href={ADMIN_SECTION_PATHS.dashboard}
        aria-label="Quay về bảng điều khiển admin"
        onClick={(event) => handleSectionClick(event, "dashboard")}
      >
        <div className="brand-mark">MMO</div>
        <div>
          <div className="brand-title">{title}</div>
          <div className="brand-sub">{subtitle}</div>
        </div>
      </Link>

      <nav className="nav" aria-label="Hướng dẫn admin">
        {NAV_ITEMS.map((item) => {
          const active = onSectionChange
            ? section === item.section
            : pathname === item.href || pathname.startsWith(`${item.href}/`) || item.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

          return (
            <Link
              key={item.href}
              className={`nav-item${active ? " active" : ""}`}
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={(event) => handleSectionClick(event, item.section)}
            >
              <span style={{ marginRight: 12, fontSize: 18 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
