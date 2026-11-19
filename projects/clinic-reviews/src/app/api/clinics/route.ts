import { handle, listClinics } from "@/lib/server/core";

export const GET = handle(async () => Response.json(listClinics().map((c) => ({ id: c.id, label: c.label }))));
