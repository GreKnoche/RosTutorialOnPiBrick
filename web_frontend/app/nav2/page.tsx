import { Nav2Lab } from "@/components/nav2-lab";

export default async function Nav2Page({
  searchParams,
}: {
  searchParams: Promise<{ kapitel?: string }>;
}) {
  const { kapitel } = await searchParams;
  return (
    <div className="-mt-5">
      <Nav2Lab kapitel={kapitel ?? null} />
    </div>
  );
}
