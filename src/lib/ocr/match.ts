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

  if (slip.bankName || slip.accountSuffix) {
    const query = [slip.bankName, slip.accountSuffix].filter(Boolean).join(" ");
    const fuseAccounts = new Fuse(accounts, { keys: ["name"], threshold: 0.45 });
    const matches = fuseAccounts.search(query);
    if (matches.length > 0) result.accountId = matches[0].item.id;
  }

  return result;
}
