import { connection } from "next/server";
import Tabs from "@/components/Tabs";
import { getClinic } from "@/lib/server/core";

export default async function ClinicLayout({ children, params }: LayoutProps<"/c/[id]">) {
  await connection();
  const { id } = await params;
  const c = getClinic(id);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">{c.label}</h1>
        <p className="mute text-sm">projects/{c.id}</p>
      </div>
      <Tabs clinic={c.id} />
      {children}
    </div>
  );
}
