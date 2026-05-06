import { Suspense } from "react";
import { AdminPage } from "../_components/admin-page-client";

export default function AdminUsersPage() {
  return (
    <Suspense fallback={null}>
      <AdminPage sectionOverride="users" />
    </Suspense>
  );
}
