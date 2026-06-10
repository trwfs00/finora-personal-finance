import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS } from "./defaults";
import {
  calculateAccountBalance,
  calculateBudgetUsage,
  calculateCreditUsage,
  calculateDashboardMetrics,
  calculateProjectedSpending,
  calculateSavingsRate,
  getTopExpenseCategories,
} from "./calculations";
import type { Account, Budget, Category, Transaction } from "./types";

const accounts: Account[] = [
  {
    id: "acct-main",
    name: "Main",
    type: "bank",
    initialBalance: 1000,
    currency: "THB",
    includeInNetWorth: true,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "acct-savings",
    name: "Savings",
    type: "savings",
    initialBalance: 500,
    currency: "THB",
    includeInNetWorth: true,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  },
];

const categories: Category[] = [
  {
    id: "cat-salary",
    name: "Salary",
    type: "income",
    isDefault: true,
    isActive: true,
    sortOrder: 0,
  },
  {
    id: "cat-food",
    name: "Food",
    type: "expense",
    isDefault: true,
    isActive: true,
    sortOrder: 0,
  },
  {
    id: "cat-housing",
    name: "Housing",
    type: "expense",
    isDefault: true,
    isActive: true,
    sortOrder: 1,
  },
];

const transactions: Transaction[] = [
  tx("income", "income", 50000, "2026-06-01", "cat-salary", "acct-main"),
  tx("food", "expense", 3000, "2026-06-02", "cat-food", "acct-main"),
  tx("rent", "expense", 12000, "2026-06-03", "cat-housing", "acct-main"),
  tx("transfer", "transfer", 10000, "2026-06-04", undefined, undefined, "acct-main", "acct-savings"),
  tx("prev-rent", "expense", 10000, "2026-05-03", "cat-housing", "acct-main"),
];

const budgets: Budget[] = [
  {
    id: "budget-june",
    month: "2026-06",
    totalBudget: 20000,
    categoryBudgets: [{ categoryId: "cat-food", amount: 5000 }],
    rollover: false,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  },
];

describe("credit usage", () => {
  it("derives credit usage from a negative account balance", () => {
    expect(calculateCreditUsage(-8000, 20000)).toEqual({
      usedCredit: 8000,
      availableCredit: 12000,
      utilization: 40,
      isOverLimit: false,
    });
  });

  it("marks accounts as over limit when used credit exceeds limit", () => {
    expect(calculateCreditUsage(-22000, 20000)).toEqual({
      usedCredit: 22000,
      availableCredit: -2000,
      utilization: 110,
      isOverLimit: true,
    });
  });

  it("returns zero utilization when no limit is set", () => {
    expect(calculateCreditUsage(-8000, undefined)).toEqual({
      usedCredit: 8000,
      availableCredit: undefined,
      utilization: undefined,
      isOverLimit: false,
    });
  });
});

describe("finance calculations", () => {
  it("calculates account balances with income, expenses, and transfers", () => {
    expect(calculateAccountBalance(accounts[0], transactions)).toBe(16000);
    expect(calculateAccountBalance(accounts[1], transactions)).toBe(10500);
  });

  it("calculates savings rate and budget usage", () => {
    expect(calculateSavingsRate(50000, 35000)).toBe(70);
    expect(calculateBudgetUsage(15000, 20000)).toBe(75);
  });

  it("projects spending for a selected month", () => {
    expect(calculateProjectedSpending(15000, "2026-06", new Date("2026-06-10"))).toBe(45000);
  });

  it("returns top categories sorted by amount", () => {
    const top = getTopExpenseCategories(transactions, categories);
    expect(top[0]?.category.name).toBe("Housing");
    expect(top[0]?.amount).toBe(22000);
  });

  it("builds dashboard metrics including budget and month-over-month change", () => {
    const metrics = calculateDashboardMetrics(
      transactions,
      categories,
      accounts,
      budgets,
      "2026-06",
      DEFAULT_SETTINGS,
      new Date("2026-06-10"),
    );
    expect(metrics.totalIncome).toBe(50000);
    expect(metrics.totalExpense).toBe(15000);
    expect(metrics.remainingBudget).toBe(5000);
    expect(metrics.monthOverMonthExpenseChange).toBe(50);
    expect(metrics.budgetUsage[0]?.status).toBe("under");
  });
});

function tx(
  id: string,
  type: Transaction["type"],
  amount: number,
  date: string,
  categoryId?: string,
  accountId?: string,
  fromAccountId?: string,
  toAccountId?: string,
): Transaction {
  return {
    id,
    type,
    amount,
    date,
    categoryId,
    accountId,
    fromAccountId,
    toAccountId,
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T00:00:00.000Z`,
  };
}
