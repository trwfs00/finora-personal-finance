import { describe, expect, it } from "vitest";

import { createBackup, hashBackup, parseBackup } from "./backup";
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from "./defaults";

const baseInput = {
  transactions: [],
  categories: DEFAULT_CATEGORIES,
  accounts: DEFAULT_ACCOUNTS,
  budgets: [],
  recurringTransactions: [],
  settings: DEFAULT_SETTINGS,
};

describe("backup helpers", () => {
  it("preserves account credit limit through backup round-trip", () => {
    const backup = createBackup({
      ...baseInput,
      accounts: [
        {
          id: "acct-spaylater",
          name: "SPayLater",
          type: "debt",
          initialBalance: -8000,
          creditLimit: 20000,
          currency: "THB",
          includeInNetWorth: true,
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
      ],
    });
    expect(parseBackup(JSON.stringify(backup)).accounts[0]?.creditLimit).toBe(20000);
  });

  it("hashes equivalent backup content deterministically", async () => {
    const first = createBackup(baseInput);
    const second = { ...createBackup(baseInput), exportedAt: first.exportedAt };

    await expect(hashBackup(second)).resolves.toBe(await hashBackup(first));
  });

  it("changes backup hash when finance data changes", async () => {
    const first = createBackup(baseInput);
    const second = createBackup({
      ...baseInput,
      transactions: [
        {
          id: "txn-test",
          type: "expense",
          amount: 10,
          date: "2026-06-10",
          categoryId: "cat-expense-food",
          accountId: "acct-cash",
          createdAt: "2026-06-10T00:00:00.000Z",
          updatedAt: "2026-06-10T00:00:00.000Z",
        },
      ],
    });

    await expect(hashBackup(second)).resolves.not.toBe(await hashBackup(first));
  });

  it("creates backups that still parse through the restore validator", () => {
    const backup = createBackup(baseInput);

    expect(parseBackup(JSON.stringify(backup)).settings.currency).toBe("THB");
  });
});
