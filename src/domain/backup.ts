import Papa from "papaparse";

import { SCHEMA_VERSION } from "./defaults";
import { backupSchema } from "./schemas";
import type {
  Account,
  AppSettings,
  BackupData,
  Budget,
  Category,
  RecurringTransaction,
  StoredData,
  Transaction,
} from "./types";

export function createBackup(input: {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  budgets: Budget[];
  recurringTransactions: RecurringTransaction[];
  settings: AppSettings;
}): BackupData {
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appName: "Finora",
    transactions: input.transactions,
    categories: input.categories,
    accounts: input.accounts,
    budgets: input.budgets,
    recurringTransactions: input.recurringTransactions,
    settings: input.settings,
  };
}

export function parseBackup(json: string): StoredData {
  const parsed = JSON.parse(json) as unknown;
  const result = backupSchema.safeParse(parsed);

  if (!result.success) {
    throw new Error(result.error.issues.map((issue) => issue.message).join("; "));
  }

  return {
    schemaVersion: result.data.schemaVersion,
    transactions: result.data.transactions,
    categories: result.data.categories,
    accounts: result.data.accounts,
    budgets: result.data.budgets,
    recurringTransactions: result.data.recurringTransactions,
    settings: result.data.settings,
  };
}

export function createTransactionCsv(input: {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
}) {
  const categoryMap = new Map(input.categories.map((category) => [category.id, category]));
  const accountMap = new Map(input.accounts.map((account) => [account.id, account]));

  return Papa.unparse(
    input.transactions.map((transaction) => ({
      id: transaction.id,
      type: transaction.type,
      date: transaction.date,
      amount: transaction.amount,
      categoryId: transaction.categoryId ?? "",
      categoryName: transaction.categoryId
        ? categoryMap.get(transaction.categoryId)?.name ?? ""
        : "",
      accountId: transaction.accountId ?? "",
      accountName: transaction.accountId
        ? accountMap.get(transaction.accountId)?.name ?? ""
        : "",
      fromAccountId: transaction.fromAccountId ?? "",
      fromAccountName: transaction.fromAccountId
        ? accountMap.get(transaction.fromAccountId)?.name ?? ""
        : "",
      toAccountId: transaction.toAccountId ?? "",
      toAccountName: transaction.toAccountId
        ? accountMap.get(transaction.toAccountId)?.name ?? ""
        : "",
      note: transaction.note ?? "",
      tags: transaction.tags?.join("|") ?? "",
      paymentMethod: transaction.paymentMethod ?? "",
      attachmentNote: transaction.attachmentNote ?? "",
      recurringId: transaction.recurringId ?? "",
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    })),
  );
}
