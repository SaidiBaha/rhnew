import type { HistoryFilter } from "../types";

const TZ = "Africa/Tunis";

/** Retourne la date courante en Africa/Tunis au format "YYYY-MM-DD". */
function todayTunis(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

/** Soustrait N jours à une date "YYYY-MM-DD" et retourne "YYYY-MM-DD". */
function subtractDays(isoDate: string, days: number): string {
  // On construit une Date à midi UTC pour éviter les bascules DST
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() - days);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(dt);
}

/** Premier jour du mois courant en Africa/Tunis, format "YYYY-MM-DD". */
function firstDayOfMonthTunis(): string {
  const today = todayTunis();
  return today.slice(0, 7) + "-01";
}

/**
 * Converts a filter preset + optional custom dates into ISO dateFrom/dateTo strings.
 * All dates are relative to Africa/Tunis timezone.
 * Returns undefined for the dates when filter is "all".
 */
export function buildDateRange(
  filter: HistoryFilter,
  customFrom: string,
  customTo: string
): { dateFrom?: string; dateTo?: string } {
  const today = todayTunis();

  switch (filter) {
    case "today":
      return { dateFrom: today, dateTo: today };

    case "week":
      return { dateFrom: subtractDays(today, 6), dateTo: today };

    case "month":
      return { dateFrom: firstDayOfMonthTunis(), dateTo: today };

    case "custom":
      return {
        dateFrom: customFrom || undefined,
        dateTo:   customTo   || undefined,
      };

    case "all":
    default:
      return {};
  }
}
