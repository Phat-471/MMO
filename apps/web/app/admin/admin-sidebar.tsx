"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { MouseEvent } from "react";

export type AdminSection =
  | "dashboard"
  | "users"
  | "workspaces"
  | "accounts"
  | "jobs"
  | "tools"
  | "plans"
  | "audit-logs"
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
  users: "/admin/users",
  workspaces: "/admin/workspaces",
  accounts: "/admin/accounts",
  jobs: "/admin/jobs",
  tools: "/admin/tools",
  plans: "/admin/plans",
  "audit-logs": "/admin/audit-logs",
  system: "/admin/system"
};

const NAV_ITEMS: AdminNavItem[] = [
  { label: "Bảng điều khiển", href: ADMIN_SECTION_PATHS.dashboard, match: ["/admin"], section: "dashboard" },
  { label: "Người dùng", href: ADMIN_SECTION_PATHS.users, match: ["/admin/users"], section: "users" },
  { label: "Workspace", href: ADMIN_SECTION_PATHS.workspaces, match: ["/admin/workspaces"], section: "workspaces" },
  { label: "Tài khoản", href: ADMIN_SECTION_PATHS.accounts, match: ["/admin/accounts"], section: "accounts" },
  { label: "Tác vụ", href: ADMIN_SECTION_PATHS.jobs, match: ["/admin/jobs", "/admin/job-runs"], section: "jobs" },
  { label: "Công cụ", href: ADMIN_SECTION_PATHS.tools, match: ["/admin/tools"], section: "tools" },
  { label: "Gói dịch vụ", href: ADMIN_SECTION_PATHS.plans, match: ["/admin/plans"], section: "plans" },
  { label: "Nhật ký", href: ADMIN_SECTION_PATHS["audit-logs"], match: ["/admin/audit-logs"], section: "audit-logs" },
  { label: "Hệ thống", href: ADMIN_SECTION_PATHS.system, match: ["/admin/system"], section: "system" }
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
      <Link className="brand" href={ADMIN_SECTION_PATHS.dashboard} aria-label="Quay về bảng điều khiển admin" onClick={(event) => handleSectionClick(event, "dashboard")}>
        <div className="brand-mark">MMO</div>
        <div>
          <div className="brand-title">{title}</div>
          <div className="brand-sub">{subtitle}</div>
        </div>
      </Link>

      <nav className="nav" aria-label="Điều hướng admin">
        {NAV_ITEMS.map((item) => {
          const active =
            section === item.section ||
            (item.section === "dashboard"
              ? pathname === "/admin" && section === "dashboard"
              : pathname === item.href || pathname.startsWith(`${item.href}/`) || item.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)));

          return (
            <Link
              key={item.href}
              className={`nav-item${active ? " active" : ""}`}
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={(event) => handleSectionClick(event, item.section)}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
