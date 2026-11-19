import PricesPanel from "@/components/PricesPanel";

export default async function Page({ params }: PageProps<"/c/[id]/prices">) {
  const { id } = await params;
  return <PricesPanel clinic={id} />;
}
