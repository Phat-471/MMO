import { Suspense } from "react";
import { AdminPage } from "../_components/admin-page-client";

export default function AdminSystemPage() {
  return (
    <Suspense fallback={null}>
      <AdminPage sectionOverride="system" />
    </Suspense>
  );
}
