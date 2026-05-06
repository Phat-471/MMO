import { Suspense } from "react";
import { AdminPage } from "../_components/admin-page-client";

export default function AdminAuditLogsPage() {
  return (
    <Suspense fallback={null}>
      <AdminPage sectionOverride="audit-logs" />
    </Suspense>
  );
}
