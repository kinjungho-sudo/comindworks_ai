import ReviewsBoard from "@/components/ReviewsBoard";

export default async function Page({ params }: PageProps<"/c/[id]/reviews">) {
  const { id } = await params;
  return <ReviewsBoard clinic={id} />;
}
