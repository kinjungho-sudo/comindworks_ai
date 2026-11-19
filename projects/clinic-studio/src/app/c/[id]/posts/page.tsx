import PostsBoard from "@/components/PostsBoard";

export default async function Page({ params }: PageProps<"/c/[id]/posts">) {
  const { id } = await params;
  return <PostsBoard clinic={id} />;
}
