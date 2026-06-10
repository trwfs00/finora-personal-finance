import type { Account, AppSettings, Category } from "./types";

const now = "2026-01-01T00:00:00.000Z";

export const DEFAULT_SETTINGS: AppSettings = {
  username: "",
  currency: "THB",
  locale: "en-TH",
  theme: "system",
  firstDayOfWeek: "monday",
  dateFormat: "dd MMM yyyy",
  numberFormat: "en-TH",
  backupReminder: true,
  backupReminderFrequency: "monthly",
};

const incomeNames = ["Salary", "Freelance", "Bonus", "Investment", "Gift", "Other Income"];
const expenseNames = [
  "Food",
  "Transport",
  "Housing",
  "Utilities",
  "Shopping",
  "Health",
  "Fitness",
  "Entertainment",
  "Education",
  "Insurance",
  "Debt Payment",
  "Family Support",
  "Other Expense",
];

const categoryColors = [
  "oklch(0.58 0.16 268)",
  "oklch(0.54 0.13 186)",
  "oklch(0.58 0.13 35)",
  "oklch(0.56 0.13 145)",
  "oklch(0.56 0.16 330)",
  "oklch(0.52 0.12 245)",
  "oklch(0.58 0.12 78)",
  "oklch(0.55 0.14 305)",
];

export const DEFAULT_CATEGORIES: Category[] = [
  ...incomeNames.map((name, index) => ({
    id: `cat-income-${name.toLowerCase().replace(/\s+/g, "-")}`,
    name,
    type: "income" as const,
    icon: "circle-dot",
    color: categoryColors[index % categoryColors.length],
    isDefault: true,
    isActive: true,
    sortOrder: index,
  })),
  ...expenseNames.map((name, index) => ({
    id: `cat-expense-${name.toLowerCase().replace(/\s+/g, "-")}`,
    name,
    type: "expense" as const,
    icon: "circle-dot",
    color: categoryColors[(index + 2) % categoryColors.length],
    isDefault: true,
    isActive: true,
    sortOrder: index,
  })),
];

export const DEFAULT_ACCOUNTS: Account[] = [
  {
    id: "acct-cash",
    name: "Cash",
    type: "cash",
    initialBalance: 0,
    currency: "THB",
    color: "oklch(0.47 0.18 268)",
    includeInNetWorth: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "acct-bank",
    name: "Main Bank",
    type: "bank",
    initialBalance: 0,
    currency: "THB",
    color: "oklch(0.52 0.12 186)",
    includeInNetWorth: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "acct-savings",
    name: "Savings",
    type: "savings",
    initialBalance: 0,
    currency: "THB",
    color: "oklch(0.56 0.13 145)",
    includeInNetWorth: true,
    createdAt: now,
    updatedAt: now,
  },
];

export const SCHEMA_VERSION = 1;
