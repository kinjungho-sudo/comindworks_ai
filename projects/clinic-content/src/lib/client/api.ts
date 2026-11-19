// 화면 → API 호출 도우미. 오류는 서버가 준 한국어 메시지로 던진다.
export async function api<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `요청 실패 (${res.status})`);
  return data as T;
}

export function fileUrl(clinic: string, rel: string) {
  return `/api/clinics/${clinic}/file/${rel.split("/").map(encodeURIComponent).join("/")}`;
}

export function fmtTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
