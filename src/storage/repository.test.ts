import { beforeEach, describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS } from "../domain/defaults";
import { createBackup } from "../domain/backup";
import {
  addTransaction,
  clearAllData,
  getFinanceData,
  loadDemoDataset,
  replaceAllData,
} from "./repository";
import { buildDemoData } from "../data/demo";

describe("IndexedDB repository", () => {
  beforeEach(async () => {
    await clearAllData();
  });

  it("initializes default local data without real transactions", async () => {
    const data = await getFinanceData();
    expect(data.transactions).toHaveLength(0);
    expect(data.categories.length).toBeGreaterThan(0);
    expect(data.accounts.length).toBeGreaterThan(0);
    expect(data.settings.currency).toBe("THB");
  });

  it("persists transaction CRUD data", async () => {
    await addTransaction({
      type: "expense",
      amount: 250,
      date: "2026-06-01",
      categoryId: "cat-expense-food",
      accountId: "acct-cash",
      note: "Coffee",
    });
    const data = await getFinanceData();
    expect(data.transactions).toHaveLength(1);
    expect(data.transactions[0]?.note).toBe("Coffee");
  });

  it("replaces data from a backup shape", async () => {
    const backup = createBackup({
      transactions: [],
      categories: [],
      accounts: [],
      budgets: [],
      recurringTransactions: [],
      settings: { ...DEFAULT_SETTINGS, theme: "dark" },
    });
    await replaceAllData(backup);
    const data = await getFinanceData();
    expect(data.settings.theme).toBe("dark");
    expect(data.categories).toHaveLength(0);
  });

  it("loads demo data only into an empty transaction workspace", async () => {
    await loadDemoDataset(buildDemoData(new Date("2026-06-10")));
    const demo = await getFinanceData();
    expect(demo.demoLoaded).toBe(true);
    expect(demo.transactions.length).toBeGreaterThan(0);
    await expect(loadDemoDataset(buildDemoData(new Date("2026-06-10")))).resolves.toBeUndefined();

    await addTransaction({
      type: "expense",
      amount: 100,
      date: "2026-06-10",
      categoryId: "cat-expense-food",
      accountId: "acct-cash",
    });
    await expect(loadDemoDataset(buildDemoData(new Date("2026-06-10")))).rejects.toThrow(
      "empty workspace",
    );
  });
});
