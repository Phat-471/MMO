import AdminJobRunDetailClient from "./job-run-detail-client";

export default async function AdminJobRunDetailPage({
  params
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  return <AdminJobRunDetailClient runId={runId} />;
}
