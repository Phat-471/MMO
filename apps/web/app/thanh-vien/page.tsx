"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, syncSessionProfile } from "../../lib/api";

type WorkspaceMember = {
  id: string;
  role: "ADMIN" | "USER" | "VIEWER" | "AFFILIATE";
  createdAt: string;
  user: {
    id: string;
    email: string;
    role: "USER" | "ADMIN";
    status: "ACTIVE" | "DISABLED";
  };
};

type MemberForm = {
  email: string;
  role: WorkspaceMember["role"];
};

const emptyForm: MemberForm = {
  email: "",
  role: "USER"
};

export default function ThanhVienPage() {
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [message, setMessage] = useState("Dang tai danh sach thanh vien...");
  const [form, setForm] = useState<MemberForm>(emptyForm);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const session = await syncSessionProfile();
      if (!mounted) {
        return;
      }

      if (!session) {
        router.push("/dang-nhap");
        return;
      }

      setWorkspaceId(session.workspaceId);
      loadMembers(session.workspaceId);
    };

    void run();
    return () => {
      mounted = false;
    };
  }, [router]);

  function loadMembers(currentWorkspaceId: string) {
    apiRequest<WorkspaceMember[]>(`/workspaces/${currentWorkspaceId}/members`)
      .then((res) => {
        setMembers(res.data);
        setMessage("Da tai danh sach thanh vien.");
      })
      .catch((error: Error) => setMessage(error.message));
  }

  function updateForm<K extends keyof MemberForm>(key: K, value: MemberForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspaceId) {
      setMessage("Khong co workspace de quan ly thanh vien.");
      return;
    }

    try {
      const res = await apiRequest<WorkspaceMember>(`/workspaces/${workspaceId}/members`, {
        method: "POST",
        body: JSON.stringify(form)
      });
      setMessage(res.message);
      setForm(emptyForm);
      loadMembers(workspaceId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Them thanh vien that bai.");
    }
  }

  async function saveRole(member: WorkspaceMember, role: WorkspaceMember["role"]) {
    if (!workspaceId) {
      return;
    }

    const res = await apiRequest<WorkspaceMember>(`/workspaces/${workspaceId}/members/${member.id}`, {
      method: "PATCH",
      body: JSON.stringify({ role })
    });
    setMessage(res.message);
    loadMembers(workspaceId);
  }

  async function removeMember(member: WorkspaceMember) {
    if (!workspaceId) {
      return;
    }

    if (!confirm("Xoa thanh vien nay khoi workspace?")) {
      return;
    }

    const res = await apiRequest<{ id: string }>(`/workspaces/${workspaceId}/members/${member.id}`, {
      method: "DELETE"
    });
    setMessage(res.message);
    loadMembers(workspaceId);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">MMO</div>
          <div>
            <div className="brand-title">Workspace</div>
            <div className="brand-sub">Quan ly thanh vien</div>
          </div>
        </div>

        <nav className="nav">
          <Link className="nav-item" href="/">Bang dieu khien</Link>
          <Link className="nav-item" href="/tai-khoan">Tai khoan</Link>
          <Link className="nav-item" href="/cong-cu">Cong cu</Link>
          <Link className="nav-item" href="/tao-tac-vu">Tao tac vu</Link>
          <Link className="nav-item active" href="/thanh-vien">Thanh vien</Link>
          <Link className="nav-item" href="/thanh-toan">Thanh toan</Link>
          <Link className="nav-item" href="/cai-dat">Cai dat</Link>
          <Link className="nav-item" href="/admin">Admin</Link>
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>Quan ly thanh vien workspace</h1>
            <p>Moi, cap quyen, va xoa thanh vien trong workspace hien tai.</p>
          </div>
          <div className="topbar-actions">
            <button className="button button-ghost" type="button" onClick={() => workspaceId && loadMembers(workspaceId)}>
              Tai lai
            </button>
          </div>
        </header>

        <div className="auth-note" style={{ color: "var(--muted)", marginBottom: 16 }}>
          {message}
        </div>

        <section className="content-grid">
          <article className="panel">
            <div className="panel-head">
              <h2>Them thanh vien</h2>
            </div>
            <form className="auth-form" onSubmit={handleSubmit}>
              <label>
                Email
                <input value={form.email} onChange={(event) => updateForm("email", event.target.value)} type="email" placeholder="user@example.com" />
              </label>
              <label>
                Vai tro
                <select value={form.role} onChange={(event) => updateForm("role", event.target.value as MemberForm["role"])}>
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="VIEWER">VIEWER</option>
                  <option value="AFFILIATE">AFFILIATE</option>
                </select>
              </label>
              <button className="button button-primary" type="submit">
                Them vao workspace
              </button>
            </form>
          </article>

          <article className="panel table-panel">
            <div className="panel-head">
              <h2>Danh sach thanh vien</h2>
              <span className="badge badge-green">{members.length} muc</span>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Trang thai</th>
                  <th>Vai tro</th>
                  <th>Ngay tham gia</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {members.length ? (
                  members.map((member) => (
                    <tr key={member.id}>
                      <td className="table-main">{member.user.email}</td>
                      <td>{member.user.status}</td>
                      <td>
                        <select value={member.role} onChange={(event) => saveRole(member, event.target.value as WorkspaceMember["role"])}>
                          <option value="ADMIN">ADMIN</option>
                          <option value="USER">USER</option>
                          <option value="VIEWER">VIEWER</option>
                          <option value="AFFILIATE">AFFILIATE</option>
                        </select>
                      </td>
                      <td>{new Date(member.createdAt).toLocaleDateString("vi-VN")}</td>
                      <td>
                        <button className="button button-soft" type="button" onClick={() => removeMember(member)}>
                          Xoa
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>Chua co thanh vien nao.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </article>
        </section>
      </main>
    </div>
  );
}
