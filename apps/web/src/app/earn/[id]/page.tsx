import { QuestDetailPage } from "@/components/bounties/quest-detail-page";

export default async function EarnQuestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <QuestDetailPage questId={id} />;
}
