import { Suspense } from "react";
import { AdminPage } from "../_components/admin-page-client";

export default function AdminToolsPage() {
  return (
    <Suspense fallback={null}>
      <AdminPage sectionOverride="tools" />
    </Suspense>
  );
}
