import { LaunchpoolDetailPage } from "@/components/launchpool/launchpool-detail-page";

export default async function LaunchpoolDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <LaunchpoolDetailPage poolId={id} />
    </div>
  );
}
