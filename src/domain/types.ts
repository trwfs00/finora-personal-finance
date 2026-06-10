export type TransactionType = "income" | "expense" | "transfer";

export type CategoryType = "income" | "expense";

export type AccountType =
  | "cash"
  | "bank"
  | "credit_card"
  | "e_wallet"
  | "savings"
  | "investment"
  | "debt";

export type ThemePreference = "light" | "dark" | "system";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  categoryId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  accountId?: string;
  note?: string;
  tags?: string[];
  paymentMethod?: string;
  attachmentNote?: string;
  recurringId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon?: string;
  color?: string;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  currency: string;
  color?: string;
  includeInNetWorth: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetCategoryAmount {
  categoryId: string;
  amount: number;
}

export interface Budget {
  id: string;
  month: string;
  totalBudget?: number;
  categoryBudgets: BudgetCategoryAmount[];
  rollover: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringTransaction {
  id: string;
  transactionTemplate: Omit<Transaction, "id" | "createdAt" | "updatedAt">;
  frequency: "daily" | "weekly" | "monthly" | "yearly" | "custom";
  interval?: number;
  startDate: string;
  endDate?: string;
  nextRunDate: string;
  autoGenerate: boolean;
  isActive: boolean;
}

export interface AppSettings {
  username: string;
  currency: string;
  locale: string;
  theme: ThemePreference;
  firstDayOfWeek: "monday" | "sunday";
  dateFormat: string;
  numberFormat: string;
  backupReminder: boolean;
  backupReminderFrequency: "weekly" | "monthly";
}

export interface StoredData {
  schemaVersion: number;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  budgets: Budget[];
  recurringTransactions: RecurringTransaction[];
  settings: AppSettings;
}

export interface BackupData extends StoredData {
  appName: "Finora";
  exportedAt: string;
}

export interface FinanceData {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  budgets: Budget[];
  recurringTransactions: RecurringTransaction[];
  settings: AppSettings;
  demoLoaded: boolean;
}

export type TransactionDraft = Omit<Transaction, "id" | "createdAt" | "updatedAt">;
export type AccountDraft = Omit<Account, "id" | "createdAt" | "updatedAt">;
export type CategoryDraft = Omit<Category, "id" | "isDefault" | "sortOrder"> & {
  sortOrder?: number;
};
export type BudgetDraft = Omit<Budget, "id" | "createdAt" | "updatedAt">;
