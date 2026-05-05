import AdminJobDetailClient from "./job-detail-client";

export default async function Page({
  params
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  return <AdminJobDetailClient jobId={jobId} />;
}
