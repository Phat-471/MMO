import { Suspense } from "react";
import { AdminPage } from "../_components/admin-page-client";

export default function AdminAccountsPage() {
  return (
    <Suspense fallback={null}>
      <AdminPage sectionOverride="accounts" />
    </Suspense>
  );
}
