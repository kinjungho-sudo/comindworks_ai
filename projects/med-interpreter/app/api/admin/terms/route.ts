import { crud } from "@/lib/crud";
import { clearTermsCache } from "@/lib/glossary";

export const dynamic = "force-dynamic";
export const { GET, POST, DELETE } = crud("medi_terms", "term", ["note"], clearTermsCache);
