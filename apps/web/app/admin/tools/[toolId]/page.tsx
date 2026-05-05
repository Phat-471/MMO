import AdminToolDetailClient from "./tool-detail-client";

export default async function AdminToolDetailPage({
  params
}: {
  params: Promise<{ toolId: string }>;
}) {
  const { toolId } = await params;
  return <AdminToolDetailClient toolId={toolId} />;
}
