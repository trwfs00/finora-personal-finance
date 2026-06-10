import { describe, expect, it } from "vitest";

import { createBackup, parseBackup } from "./backup";
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from "./defaults";
import { transactionSchema, validateUniqueAccountNames, validateUniqueCategoryNames } from "./schemas";

describe("validation schemas", () => {
  it("rejects nonpositive transaction amounts", () => {
    const result = transactionSchema.safeParse({
      id: "txn-1",
      type: "expense",
      amount: 0,
      date: "2026-06-01",
      categoryId: "cat-expense-food",
      accountId: "acct-cash",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });

  it("rejects transfers with identical accounts", () => {
    const result = transactionSchema.safeParse({
      id: "txn-1",
      type: "transfer",
      amount: 100,
      date: "2026-06-01",
      fromAccountId: "acct-cash",
      toAccountId: "acct-cash",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });

  it("validates unique account and category names", () => {
    expect(validateUniqueAccountNames(["Cash", "cash"])).toBe(false);
    expect(
      validateUniqueCategoryNames([
        { name: "Food", type: "expense" },
        { name: "Food", type: "income" },
      ]),
    ).toBe(true);
  });

  it("parses a valid backup and rejects malformed JSON shape", () => {
    const backup = createBackup({
      transactions: [],
      categories: DEFAULT_CATEGORIES,
      accounts: DEFAULT_ACCOUNTS,
      budgets: [],
      recurringTransactions: [],
      settings: DEFAULT_SETTINGS,
    });

    expect(parseBackup(JSON.stringify(backup)).settings.currency).toBe("THB");
    expect(() => parseBackup(JSON.stringify({ appName: "OtherApp" }))).toThrow();
  });
});
