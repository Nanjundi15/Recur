export const pct = (v: number | null | undefined) => (v == null ? "n/a" : `${Math.round(v * 100)}%`);

export function shortDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
