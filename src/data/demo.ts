import { addDays, format, startOfMonth, subMonths } from "date-fns";

import { DEFAULT_CATEGORIES } from "../domain/defaults";
import type { Account, Budget, RecurringTransaction, Transaction } from "../domain/types";

const demoNow = "2026-06-01T00:00:00.000Z";

export function buildDemoData(today = new Date()) {
  const currentMonth = format(today, "yyyy-MM");
  const monthStart = startOfMonth(today);
  const previousStart = startOfMonth(subMonths(today, 1));

  const accounts: Account[] = [
    {
      id: "demo-acct-payroll",
      name: "Payroll Bank",
      type: "bank",
      initialBalance: 42000,
      currency: "THB",
      color: "oklch(0.47 0.18 268)",
      includeInNetWorth: true,
      createdAt: demoNow,
      updatedAt: demoNow,
    },
    {
      id: "demo-acct-wallet",
      name: "Daily Wallet",
      type: "e_wallet",
      initialBalance: 6800,
      currency: "THB",
      color: "oklch(0.52 0.12 186)",
      includeInNetWorth: true,
      createdAt: demoNow,
      updatedAt: demoNow,
    },
    {
      id: "demo-acct-savings",
      name: "Reserve",
      type: "savings",
      initialBalance: 128000,
      currency: "THB",
      color: "oklch(0.56 0.13 145)",
      includeInNetWorth: true,
      createdAt: demoNow,
      updatedAt: demoNow,
    },
    {
      id: "demo-acct-spaylater",
      name: "SPayLater",
      type: "debt",
      initialBalance: -3200,
      creditLimit: 20000,
      currency: "THB",
      color: "oklch(0.63 0.19 25)",
      includeInNetWorth: true,
      createdAt: demoNow,
      updatedAt: demoNow,
    },
  ];

  const transactions: Transaction[] = [
    txn("salary", "income", 92000, monthStart, 0, "cat-income-salary", "demo-acct-payroll", "Monthly salary"),
    txn("freelance", "income", 18000, monthStart, 2, "cat-income-freelance", "demo-acct-payroll", "Brand sprint deposit"),
    txn("rent", "expense", 26000, monthStart, 1, "cat-expense-housing", "demo-acct-payroll", "Condo rent"),
    txn("groceries", "expense", 3850, monthStart, 3, "cat-expense-food", "demo-acct-wallet", "Groceries and coffee"),
    txn("transport", "expense", 1450, monthStart, 4, "cat-expense-transport", "demo-acct-wallet", "BTS and rides"),
    txn("utilities", "expense", 3120, monthStart, 5, "cat-expense-utilities", "demo-acct-payroll", "Electric and internet"),
    txn("fitness", "expense", 2200, monthStart, 6, "cat-expense-fitness", "demo-acct-payroll", "Gym membership"),
    txn("dinner", "expense", 2650, monthStart, 8, "cat-expense-entertainment", "demo-acct-wallet", "Dinner with friends"),
    txn("savings-transfer", "transfer", 20000, monthStart, 2, undefined, undefined, "Move to reserve", "demo-acct-payroll", "demo-acct-savings"),
    txn("prev-salary", "income", 92000, previousStart, 0, "cat-income-salary", "demo-acct-payroll", "Monthly salary"),
    txn("prev-rent", "expense", 26000, previousStart, 1, "cat-expense-housing", "demo-acct-payroll", "Condo rent"),
    txn("prev-food", "expense", 12100, previousStart, 7, "cat-expense-food", "demo-acct-wallet", "Food and groceries"),
    txn("prev-shopping", "expense", 8800, previousStart, 12, "cat-expense-shopping", "demo-acct-payroll", "Clothes and home items"),
  ];

  const budgets: Budget[] = [
    {
      id: "demo-budget-current",
      month: currentMonth,
      totalBudget: 56000,
      categoryBudgets: [
        { categoryId: "cat-expense-food", amount: 14000 },
        { categoryId: "cat-expense-transport", amount: 5500 },
        { categoryId: "cat-expense-entertainment", amount: 6500 },
        { categoryId: "cat-expense-shopping", amount: 9000 },
      ],
      rollover: false,
      createdAt: demoNow,
      updatedAt: demoNow,
    },
  ];

  const recurringTransactions: RecurringTransaction[] = [
    {
      id: "demo-recurring-rent",
      transactionTemplate: {
        type: "expense",
        amount: 26000,
        date: `${currentMonth}-01`,
        categoryId: "cat-expense-housing",
        accountId: "demo-acct-payroll",
        note: "Rent template",
        tags: ["home"],
      },
      frequency: "monthly",
      startDate: `${currentMonth}-01`,
      nextRunDate: `${currentMonth}-01`,
      autoGenerate: false,
      isActive: true,
    },
  ];

  return {
    transactions,
    categories: DEFAULT_CATEGORIES,
    accounts,
    budgets,
    recurringTransactions,
  };
}

function txn(
  id: string,
  type: Transaction["type"],
  amount: number,
  monthStart: Date,
  dayOffset: number,
  categoryId?: string,
  accountId?: string,
  note?: string,
  fromAccountId?: string,
  toAccountId?: string,
): Transaction {
  const date = format(addDays(monthStart, dayOffset), "yyyy-MM-dd");
  return {
    id: `demo-txn-${id}`,
    type,
    amount,
    date,
    categoryId,
    accountId,
    fromAccountId,
    toAccountId,
    note,
    tags: type === "expense" ? ["demo"] : [],
    paymentMethod: type === "transfer" ? "internal" : "manual",
    createdAt: `${date}T08:00:00.000Z`,
    updatedAt: `${date}T08:00:00.000Z`,
  };
}
