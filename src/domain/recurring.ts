import { addDays, addMonths, addWeeks, addYears, format, parseISO } from "date-fns";

import type { RecurringTransaction, TransactionDraft } from "./types";

const MAX_CATCH_UP = 24;

export function calculateNextRunDate(
  frequency: RecurringTransaction["frequency"],
  interval: number | undefined,
  fromDate: string,
): string {
  const date = parseISO(fromDate);
  switch (frequency) {
    case "daily":   return format(addDays(date, 1), "yyyy-MM-dd");
    case "weekly":  return format(addWeeks(date, 1), "yyyy-MM-dd");
    case "monthly": return format(addMonths(date, 1), "yyyy-MM-dd");
    case "yearly":  return format(addYears(date, 1), "yyyy-MM-dd");
    case "custom":  return format(addDays(date, Math.max(1, interval ?? 1)), "yyyy-MM-dd");
  }
}

export function generateDueOccurrences(
  recurring: RecurringTransaction,
  today: string,
): TransactionDraft[] {
  if (!recurring.isActive) return [];

  const drafts: TransactionDraft[] = [];
  let nextRun = recurring.nextRunDate;
  let count = 0;

  while (nextRun <= today && count < MAX_CATCH_UP) {
    if (recurring.endDate && nextRun > recurring.endDate) break;
    drafts.push({
      ...recurring.transactionTemplate,
      date: nextRun,
      recurringId: recurring.id,
    });
    nextRun = calculateNextRunDate(recurring.frequency, recurring.interval, nextRun);
    count++;
  }

  return drafts;
}

export function advanceNextRunDate(
  recurring: RecurringTransaction,
  today: string,
): string {
  let nextRun = recurring.nextRunDate;
  let count = 0;
  while (nextRun <= today && count < MAX_CATCH_UP) {
    if (recurring.endDate && nextRun > recurring.endDate) break;
    nextRun = calculateNextRunDate(recurring.frequency, recurring.interval, nextRun);
    count++;
  }
  return nextRun;
}

export function isOverdue(recurring: RecurringTransaction, today: string): boolean {
  return (
    recurring.isActive &&
    !recurring.autoGenerate &&
    recurring.nextRunDate <= today &&
    (!recurring.endDate || recurring.nextRunDate <= recurring.endDate)
  );
}
