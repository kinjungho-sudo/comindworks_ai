import { crud } from "@/lib/crud";

export const dynamic = "force-dynamic";
export const { GET, POST, DELETE } = crud("medi_phrases", "phrase", ["sort"], () => {});
