export function won(n: number | null | undefined) {
  if (n == null) return "–";
  if (n >= 10000) {
    const man = n / 10000;
    return `${man >= 100 ? Math.round(man).toLocaleString("ko-KR") : (Math.round(man * 10) / 10).toLocaleString("ko-KR")}만`;
  }
  return `${n.toLocaleString("ko-KR")}원`;
}
export function wonFull(n: number | null | undefined) {
  return n == null ? "–" : `${n.toLocaleString("ko-KR")}원`;
}
export function qtyLabel(q: number | null | undefined, unit: string) {
  if (q == null) return "";
  return `${Number.isInteger(q) ? q : q.toFixed(1)}${unit}`;
}
export function pct(a: number | null, b: number | null) {
  if (a == null || b == null || b === 0) return null;
  return Math.round(((a - b) / b) * 100);
}
