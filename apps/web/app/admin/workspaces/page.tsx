import { Suspense } from "react";
import { AdminPage } from "../_components/admin-page-client";

export default function AdminWorkspacesPage() {
  return (
    <Suspense fallback={null}>
      <AdminPage sectionOverride="workspaces" />
    </Suspense>
  );
}
