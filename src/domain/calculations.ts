import {
  compareAsc,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  isWithinInterval,
  parseISO,
  startOfMonth,
  subMonths,
} from "date-fns";

import type { Account, AppSettings, Budget, Category, Transaction } from "./types";

export interface AccountBalance {
  account: Account;
  balance: number;
}

export interface BudgetUsage {
  label: string;
  budgetAmount: number;
  actualAmount: number;
  usage: number;
  status: "under" | "near" | "at" | "over";
}

export type InsightData =
  | { type: "emptyTx" }
  | { type: "loadDemo" }
  | { type: "savingsRate"; month: string; rate: number }
  | { type: "topCategory"; name: string; amount: string }
  | { type: "overBudget"; label: string; amount: string }
  | { type: "remainingBudget"; amount: string }
  | { type: "expenseChange"; pct: number; direction: "higher" | "lower" };

export interface DashboardMetrics {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRate: number;
  remainingBudget: number | null;
  projectedSpending: number;
  dailyTrend: Array<{ date: string; income: number; expense: number }>;
  topCategories: Array<{ category: Category; amount: number; percentage: number }>;
  budgetUsage: BudgetUsage[];
  recentTransactions: Transaction[];
  monthOverMonthExpenseChange: number;
  accountBalances: AccountBalance[];
  netWorth: number;
  insights: InsightData[];
}

export interface CreditUsage {
  usedCredit: number;
  availableCredit?: number;
  utilization?: number;
  isOverLimit: boolean;
}

export function calculateCreditUsage(balance: number, creditLimit?: number): CreditUsage {
  const usedCredit = Math.max(0, -balance);
  if (creditLimit === undefined || creditLimit <= 0) {
    return { usedCredit, availableCredit: undefined, utilization: undefined, isOverLimit: false };
  }
  const availableCredit = creditLimit - usedCredit;
  return {
    usedCredit,
    availableCredit,
    utilization: Math.round((usedCredit / creditLimit) * 10000) / 100,
    isOverLimit: availableCredit < 0,
  };
}

export function getMonthInterval(month: string) {
  const start = startOfMonth(parseISO(`${month}-01`));
  const end = endOfMonth(start);
  return { start, end };
}

export function filterTransactionsByMonth(transactions: Transaction[], month: string) {
  const interval = getMonthInterval(month);
  return transactions.filter((transaction) =>
    isWithinInterval(parseISO(transaction.date), interval),
  );
}

export function calculateAccountBalance(
  account: Account,
  transactions: Transaction[],
) {
  return transactions.reduce((balance, transaction) => {
    if (transaction.type === "income" && transaction.accountId === account.id) {
      return balance + transaction.amount;
    }

    if (transaction.type === "expense" && transaction.accountId === account.id) {
      return balance - transaction.amount;
    }

    if (transaction.type === "transfer") {
      if (transaction.fromAccountId === account.id) {
        return balance - transaction.amount;
      }

      if (transaction.toAccountId === account.id) {
        return balance + transaction.amount;
      }
    }

    return balance;
  }, account.initialBalance);
}

export function calculateSavingsRate(totalIncome: number, netIncome: number) {
  if (totalIncome <= 0) {
    return 0;
  }

  return (netIncome / totalIncome) * 100;
}

export function calculateBudgetUsage(actualExpense: number, budgetAmount?: number) {
  if (!budgetAmount || budgetAmount <= 0) {
    return 0;
  }

  return (actualExpense / budgetAmount) * 100;
}

export function calculateProjectedSpending(
  currentSpending: number,
  month: string,
  now = new Date(),
) {
  const { start, end } = getMonthInterval(month);
  const selectedMonth = format(start, "yyyy-MM");
  const currentMonth = format(now, "yyyy-MM");
  const totalDays = differenceInCalendarDays(end, start) + 1;
  const daysPassed =
    selectedMonth === currentMonth
      ? Math.max(1, differenceInCalendarDays(now, start) + 1)
      : totalDays;

  return (currentSpending / daysPassed) * totalDays;
}

export function getTopExpenseCategories(
  transactions: Transaction[],
  categories: Category[],
  limit = 5,
) {
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const totals = transactions
    .filter((transaction) => transaction.type === "expense" && transaction.categoryId)
    .reduce<Map<string, number>>((accumulator, transaction) => {
      const categoryId = transaction.categoryId;
      if (!categoryId) {
        return accumulator;
      }
      accumulator.set(categoryId, (accumulator.get(categoryId) ?? 0) + transaction.amount);
      return accumulator;
    }, new Map());

  const totalExpense = Array.from(totals.values()).reduce((sum, amount) => sum + amount, 0);

  return Array.from(totals.entries())
    .map(([categoryId, amount]) => {
      const category = categoryMap.get(categoryId);
      if (!category) {
        return null;
      }
      return {
        category,
        amount,
        percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
      };
    })
    .filter((item): item is { category: Category; amount: number; percentage: number } =>
      Boolean(item),
    )
    .sort((first, second) => second.amount - first.amount)
    .slice(0, limit);
}

export function getDailyTrend(transactions: Transaction[], month: string) {
  const { start, end } = getMonthInterval(month);
  const days = eachDayOfInterval({ start, end });

  return days.map((day) => {
    const key = format(day, "yyyy-MM-dd");
    const dayTransactions = transactions.filter((transaction) => transaction.date === key);
    return {
      date: key,
      income: sumTransactions(dayTransactions, "income"),
      expense: sumTransactions(dayTransactions, "expense"),
    };
  });
}

export function getMonthlyTrend(transactions: Transaction[]) {
  const totals = transactions.reduce<Map<string, { income: number; expense: number }>>(
    (accumulator, transaction) => {
      const month = transaction.date.slice(0, 7);
      const current = accumulator.get(month) ?? { income: 0, expense: 0 };
      if (transaction.type === "income") {
        current.income += transaction.amount;
      }
      if (transaction.type === "expense") {
        current.expense += transaction.amount;
      }
      accumulator.set(month, current);
      return accumulator;
    },
    new Map(),
  );

  return Array.from(totals.entries())
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([month, value]) => ({
      month,
      income: value.income,
      expense: value.expense,
      net: value.income - value.expense,
      savingsRate: calculateSavingsRate(value.income, value.income - value.expense),
    }));
}

export function sumTransactions(
  transactions: Transaction[],
  type: "income" | "expense",
) {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((sum, transaction) => sum + transaction.amount, 0);
}

export function calculateBudgetUsages(
  monthTransactions: Transaction[],
  budget: Budget | undefined,
  categories: Category[],
) {
  if (!budget) {
    return [];
  }

  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const result: BudgetUsage[] = [];

  if (budget.totalBudget !== undefined) {
    const totalExpense = sumTransactions(monthTransactions, "expense");
    result.push({
      label: "Monthly expense budget",
      budgetAmount: budget.totalBudget,
      actualAmount: totalExpense,
      usage: calculateBudgetUsage(totalExpense, budget.totalBudget),
      status: budgetStatus(totalExpense, budget.totalBudget),
    });
  }

  for (const categoryBudget of budget.categoryBudgets) {
    const category = categoryMap.get(categoryBudget.categoryId);
    if (!category) {
      continue;
    }

    const actualAmount = monthTransactions
      .filter(
        (transaction) =>
          transaction.type === "expense" &&
          transaction.categoryId === categoryBudget.categoryId,
      )
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    result.push({
      label: category.name,
      budgetAmount: categoryBudget.amount,
      actualAmount,
      usage: calculateBudgetUsage(actualAmount, categoryBudget.amount),
      status: budgetStatus(actualAmount, categoryBudget.amount),
    });
  }

  return result;
}

export function calculateDashboardMetrics(
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[],
  budgets: Budget[],
  month: string,
  settings: AppSettings,
  now = new Date(),
): DashboardMetrics {
  const monthTransactions = filterTransactionsByMonth(transactions, month);
  const totalIncome = sumTransactions(monthTransactions, "income");
  const totalExpense = sumTransactions(monthTransactions, "expense");
  const netSavings = totalIncome - totalExpense;
  const currentBudget = budgets.find((budget) => budget.month === month);
  const budgetUsage = calculateBudgetUsages(monthTransactions, currentBudget, categories);
  const remainingBudget =
    currentBudget?.totalBudget === undefined
      ? null
      : currentBudget.totalBudget - totalExpense;
  const previousMonth = format(subMonths(parseISO(`${month}-01`), 1), "yyyy-MM");
  const previousExpense = sumTransactions(
    filterTransactionsByMonth(transactions, previousMonth),
    "expense",
  );
  const monthOverMonthExpenseChange =
    previousExpense > 0 ? ((totalExpense - previousExpense) / previousExpense) * 100 : 0;
  const accountBalances = accounts.map((account) => ({
    account,
    balance: calculateAccountBalance(account, transactions),
  }));
  const netWorth = accountBalances
    .filter(({ account }) => account.includeInNetWorth)
    .reduce((sum, item) => sum + item.balance, 0);

  return {
    totalIncome,
    totalExpense,
    netSavings,
    savingsRate: calculateSavingsRate(totalIncome, netSavings),
    remainingBudget,
    projectedSpending: calculateProjectedSpending(totalExpense, month, now),
    dailyTrend: getDailyTrend(monthTransactions, month),
    topCategories: getTopExpenseCategories(monthTransactions, categories),
    budgetUsage,
    recentTransactions: [...transactions]
      .sort((first, second) => compareAsc(parseISO(second.date), parseISO(first.date)))
      .slice(0, 6),
    monthOverMonthExpenseChange,
    accountBalances,
    netWorth,
    insights: buildInsights({
      month,
      totalIncome,
      totalExpense,
      netSavings,
      savingsRate: calculateSavingsRate(totalIncome, netSavings),
      topCategory: getTopExpenseCategories(monthTransactions, categories, 1)[0],
      budgetUsage,
      remainingBudget,
      projectedSpending: calculateProjectedSpending(totalExpense, month, now),
      settings,
      monthOverMonthExpenseChange,
    }),
  };
}

function budgetStatus(actual: number, budget: number): BudgetUsage["status"] {
  if (budget <= 0) {
    return "under";
  }
  const usage = (actual / budget) * 100;
  if (usage >= 100) {
    return actual > budget ? "over" : "at";
  }
  if (usage >= 80) {
    return "near";
  }
  return "under";
}

function buildInsights(input: {
  month: string;
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRate: number;
  topCategory?: { category: Category; amount: number };
  budgetUsage: BudgetUsage[];
  remainingBudget: number | null;
  projectedSpending: number;
  settings: AppSettings;
  monthOverMonthExpenseChange: number;
}): InsightData[] {
  const formatter = new Intl.NumberFormat(input.settings.locale, {
    style: "currency",
    currency: input.settings.currency,
    maximumFractionDigits: 0,
  });

  if (input.totalIncome === 0 && input.totalExpense === 0) {
    return [{ type: "emptyTx" }, { type: "loadDemo" }];
  }

  const insights: InsightData[] = [];

  insights.push({
    type: "savingsRate",
    month: input.month,
    rate: Math.round(input.savingsRate),
  });

  if (input.topCategory) {
    insights.push({
      type: "topCategory",
      name: input.topCategory.category.name,
      amount: formatter.format(input.topCategory.amount),
    });
  }

  const overBudget = input.budgetUsage.find((b) => b.status === "over");
  if (overBudget) {
    insights.push({
      type: "overBudget",
      label: overBudget.label,
      amount: formatter.format(overBudget.actualAmount - overBudget.budgetAmount),
    });
  } else if (input.remainingBudget !== null) {
    insights.push({
      type: "remainingBudget",
      amount: formatter.format(Math.max(0, input.remainingBudget)),
    });
  }

  if (Math.abs(input.monthOverMonthExpenseChange) >= 5) {
    insights.push({
      type: "expenseChange",
      pct: Math.abs(Math.round(input.monthOverMonthExpenseChange)),
      direction: input.monthOverMonthExpenseChange > 0 ? "higher" : "lower",
    });
  }

  return insights.slice(0, 4);
}
