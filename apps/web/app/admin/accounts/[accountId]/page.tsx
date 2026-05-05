import AdminAccountDetailClient from "./account-detail-client";

export default async function AdminAccountDetailPage({
  params
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  return <AdminAccountDetailClient accountId={accountId} />;
}
