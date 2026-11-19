import { redirect } from "next/navigation";

export default async function ClinicHome({ params }: PageProps<"/c/[id]">) {
  const { id } = await params;
  redirect(`/c/${id}/posts`);
}
