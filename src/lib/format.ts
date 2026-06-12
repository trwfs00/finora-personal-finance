import { format, parseISO } from "date-fns";

import type { AppSettings } from "../domain/types";

export function formatCurrency(
  value: number,
  settings: Pick<AppSettings, "currency" | "locale"> = {
    currency: "THB",
    locale: "en-TH",
  },
) {
  return new Intl.NumberFormat(settings.locale, {
    style: "currency",
    currency: settings.currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number, locale = "en-TH") {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercent(value: number) {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  return `${Math.round(value)}%`;
}

export function formatDate(value: string, pattern = "dd MMM yyyy") {
  return format(parseISO(value), pattern);
}

export function formatTime(isoString: string) {
  return format(parseISO(isoString), "HH:mm");
}

export function currentMonthKey(date = new Date()) {
  return format(date, "yyyy-MM");
}

export function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
