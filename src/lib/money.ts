import { Decimal } from "@prisma/client/runtime/library";

export type Money = Decimal | number | string | null | undefined;

export function n(v: Money): number {
  if (v === null || v === undefined) return 0;
  return typeof v === "number" ? v : Number(v.toString());
}

/** Indian numbering, no decimals: 1234567 -> "12,34,567" */
export function inr(v: Money): string {
  const num = Math.round(n(v));
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(num);
}

export function rs(v: Money): string {
  return "₹" + inr(v);
}

/** Indian fiscal year starting April. 2026-09-02 -> { start: 2026-04-01, end: 2027-03-31, label: "FY26-27" } */
export function fiscalYear(d: Date = new Date()) {
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return {
    startYear: y,
    start: new Date(Date.UTC(y, 3, 1)),
    end: new Date(Date.UTC(y + 1, 2, 31)),
    label: `FY${String(y).slice(2)}-${String(y + 1).slice(2)}`,
  };
}

/** List of month buckets in a fiscal year, up to and including `upto`. */
export function fyMonths(startYear: number, upto: Date = new Date()) {
  const out: { key: string; label: string; start: Date; end: Date }[] = [];
  for (let i = 0; i < 12; i++) {
    const m = (3 + i) % 12;
    const y = startYear + (3 + i >= 12 ? 1 : 0);
    const start = new Date(Date.UTC(y, m, 1));
    if (start > upto) break;
    out.push({
      key: `${y}-${String(m + 1).padStart(2, "0")}`,
      label: start.toLocaleString("en-IN", { month: "short", timeZone: "UTC" }) + "'" + String(y).slice(2),
      start,
      end: new Date(Date.UTC(y, m + 1, 0)),
    });
  }
  return out;
}

export function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthBounds(key: string) {
  const [y, m] = key.split("-").map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 0)) };
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
