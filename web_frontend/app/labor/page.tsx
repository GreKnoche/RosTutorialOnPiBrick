import { CityLab } from "@/components/city-lab";

export default async function LaborPage({
  searchParams,
}: {
  searchParams: Promise<{ kapitel?: string }>;
}) {
  const { kapitel } = await searchParams;
  return <CityLab kapitel={kapitel ?? null} />;
}
