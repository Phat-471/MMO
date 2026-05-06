import { Suspense } from "react";
import { AdminPage } from "./_components/admin-page-client";

export default function AdminRoutePage() {
  return (
    <Suspense fallback={null}>
      <AdminPage />
    </Suspense>
  );
}
