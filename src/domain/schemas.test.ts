import { describe, expect, it } from "vitest";

import { createBackup, parseBackup } from "./backup";
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from "./defaults";
import { accountSchema, transactionSchema, validateUniqueAccountNames, validateUniqueCategoryNames } from "./schemas";

const baseAccount = {
  id: "acct-1",
  name: "Bank",
  type: "bank" as const,
  initialBalance: 1000,
  currency: "THB",
  includeInNetWorth: true,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

describe("validation schemas", () => {
  describe("account credit limit", () => {
    it("accepts accounts without credit limit for backward compatibility", () => {
      const parsed = accountSchema.parse(baseAccount);
      expect(parsed.creditLimit).toBeUndefined();
    });

    it("accepts optional nonnegative credit limit", () => {
      const parsed = accountSchema.parse({ ...baseAccount, type: "debt", initialBalance: -8000, creditLimit: 20000 });
      expect(parsed.creditLimit).toBe(20000);
    });

    it("rejects negative credit limit", () => {
      expect(() => accountSchema.parse({ ...baseAccount, creditLimit: -1 })).toThrow();
    });
  });

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
      savingsGoals: [],
      settings: DEFAULT_SETTINGS,
    });

    expect(parseBackup(JSON.stringify(backup)).settings.currency).toBe("THB");
    expect(() => parseBackup(JSON.stringify({ appName: "OtherApp" }))).toThrow();
  });
});
