import Fuse from "fuse.js";

import type { Account, Category } from "../../domain/types";
import type { SlipData } from "./parse";

export interface SlipMatch {
  type?: "transfer";
  categoryId?: string;
  accountId?: string;
  fromAccountId?: string;
  toAccountId?: string;
}

function matchAccountBySuffix(
  suffix: string,
  accounts: Account[],
): Account | undefined {
  const runs = suffix.match(/\d{3,}/g) ?? [];
  if (runs.length === 0) return undefined;
  return accounts.find((acc) => {
    if (!acc.accountNumber) return false;
    const stored = acc.accountNumber.replace(/\D/g, "");
    return runs.some((run) => stored.includes(run));
  });
}

export function matchSlip(
  slip: SlipData,
  categories: Category[],
  accounts: Account[],
): SlipMatch {
  const result: SlipMatch = {};

  // Category by recipient name (expense only)
  if (slip.recipientName) {
    const expenseCategories = categories.filter(
      (c) => c.isActive && c.type === "expense",
    );
    const fuse = new Fuse(expenseCategories, { keys: ["name"], threshold: 0.45 });
    const matches = fuse.search(slip.recipientName);
    if (matches.length > 0) result.categoryId = matches[0].item.id;
  }

  // Account matching — use first two suffixes (sender, receiver)
  const suffixes = slip.accountSuffixes ?? (slip.accountSuffix ? [slip.accountSuffix] : []);

  if (suffixes.length >= 2) {
    const sender = matchAccountBySuffix(suffixes[0], accounts);
    const receiver = matchAccountBySuffix(suffixes[1], accounts);
    // Two suffixes → structural transfer, regardless of whether accounts are stored.
    result.type = "transfer";
    result.fromAccountId = sender?.id;
    result.toAccountId = receiver?.id;
    // If both sides match the same account, clear the ambiguous side.
    if (result.fromAccountId && result.fromAccountId === result.toAccountId) {
      result.toAccountId = undefined;
    }
    return result;
  } else if (suffixes.length === 1) {
    const matched = matchAccountBySuffix(suffixes[0], accounts);
    if (matched) result.accountId = matched.id;
  }

  // Fuzzy fallback if no accountNumber match
  if (!result.accountId && (slip.bankName || slip.accountSuffix)) {
    const query = [slip.bankName, slip.accountSuffix].filter(Boolean).join(" ");
    const fuseAccounts = new Fuse(accounts, { keys: ["name"], threshold: 0.45 });
    const matches = fuseAccounts.search(query);
    if (matches.length > 0) result.accountId = matches[0].item.id;
  }

  return result;
}
