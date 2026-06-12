import Fuse from "fuse.js";

import type { Account, Category } from "../../domain/types";
import type { SlipData } from "./parse";

export interface SlipMatch {
  categoryId?: string;
  accountId?: string;
}

export function matchSlip(
  slip: SlipData,
  categories: Category[],
  accounts: Account[],
): SlipMatch {
  const result: SlipMatch = {};

  if (slip.recipientName) {
    const expenseCategories = categories.filter(
      (c) => c.isActive && c.type === "expense",
    );
    const fuse = new Fuse(expenseCategories, { keys: ["name"], threshold: 0.45 });
    const matches = fuse.search(slip.recipientName);
    if (matches.length > 0) result.categoryId = matches[0].item.id;
  }

  // Digit-substring match first: extract ≥3-digit runs from slip suffix, check stored accountNumber
  if (slip.accountSuffix) {
    const slipRuns = slip.accountSuffix.match(/\d{3,}/g) ?? [];
    if (slipRuns.length > 0) {
      const matched = accounts.find((acc) => {
        if (!acc.accountNumber) return false;
        const stored = acc.accountNumber.replace(/\D/g, "");
        return slipRuns.some((run) => stored.includes(run));
      });
      if (matched) result.accountId = matched.id;
    }
  }
  // Fallback: fuzzy match against account name
  if (!result.accountId && (slip.bankName || slip.accountSuffix)) {
    const query = [slip.bankName, slip.accountSuffix].filter(Boolean).join(" ");
    const fuseAccounts = new Fuse(accounts, { keys: ["name"], threshold: 0.45 });
    const matches = fuseAccounts.search(query);
    if (matches.length > 0) result.accountId = matches[0].item.id;
  }

  return result;
}
