import type { Transaction, TransactionDraft } from "./types";

// Default time window (minutes) within which two otherwise-identical
// transactions are treated as the same. Slip scans fill a precise time, so a
// tight window keeps genuine same-amount/same-day purchases distinct while
// still catching a slip scanned twice.
const DEFAULT_WINDOW_MINUTES = 5;

function sameAccounts(draft: TransactionDraft, tx: Transaction): boolean {
  if (draft.type === "transfer") {
    return draft.fromAccountId === tx.fromAccountId && draft.toAccountId === tx.toAccountId;
  }
  return draft.accountId === tx.accountId;
}

function minutesOf(time: string | undefined): number | undefined {
  if (!time) return undefined;
  const m = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!m) return undefined;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

// A draft is a likely duplicate when an existing transaction shares its type,
// amount (within 0.01), date, and account(s). When both carry a time, they must
// also fall within `windowMinutes`; if either time is missing the match falls
// back to the amount+date+account signal. Reference numbers are intentionally
// NOT used — they are unreliable OCR output and only ever stored as a note.
export function findDuplicate(
  draft: TransactionDraft,
  existing: Transaction[],
  windowMinutes: number = DEFAULT_WINDOW_MINUTES,
): Transaction | undefined {
  const draftMins = minutesOf(draft.time);
  return existing.find((tx) => {
    if (tx.type !== draft.type) return false;
    if (Math.abs(tx.amount - draft.amount) >= 0.01) return false;
    if (tx.date !== draft.date) return false;
    if (!sameAccounts(draft, tx)) return false;
    const txMins = minutesOf(tx.time);
    if (draftMins !== undefined && txMins !== undefined) {
      return Math.abs(draftMins - txMins) <= windowMinutes;
    }
    return true;
  });
}
