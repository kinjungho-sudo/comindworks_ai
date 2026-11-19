export function bad(msg: string, status = 400) {
  return Response.json({ error: msg }, { status });
}
export async function readJSON<T>(req: Request): Promise<T | null> {
  try { return (await req.json()) as T; } catch { return null; }
}
