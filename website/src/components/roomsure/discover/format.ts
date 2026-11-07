export const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

export function shortDate(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export const FACTOR_LABEL = { price: "Price", commute: "Commute", dates: "Dates", facilities: "Facilities" } as const;
