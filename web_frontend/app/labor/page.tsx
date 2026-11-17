import { redirect } from "next/navigation";

export default async function LaborPage({
  searchParams,
}: {
  searchParams: Promise<{ kapitel?: string }>;
}) {
  const { kapitel } = await searchParams;
  redirect(kapitel ? `/nav2?kapitel=${encodeURIComponent(kapitel)}` : "/freedrive");
}
