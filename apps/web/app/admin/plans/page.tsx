import { Suspense } from "react";
import { AdminPage } from "../_components/admin-page-client";

export default function AdminPlansPage() {
  return (
    <Suspense fallback={null}>
      <AdminPage sectionOverride="plans" />
    </Suspense>
  );
}
