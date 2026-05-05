import AdminWorkspaceDetailClient from "./workspace-detail-client";

export default async function Page({
  params
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  return <AdminWorkspaceDetailClient workspaceId={workspaceId} />;
}
