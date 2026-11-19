import BadgeEditor from "@/components/BadgeEditor";

export default async function Page({ params }: PageProps<"/c/[id]/badge">) {
  const { id } = await params;
  return <BadgeEditor clinic={id} />;
}
