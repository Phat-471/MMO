import AdminUserDetailClient from "./user-detail-client";

export default async function Page({
  params
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return <AdminUserDetailClient userId={userId} />;
}
