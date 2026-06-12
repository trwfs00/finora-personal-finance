import Dexie, { type EntityTable } from "dexie";

import type {
  Account,
  AppSettings,
  Budget,
  Category,
  RecurringTransaction,
  SavingsGoal,
  Transaction,
} from "../domain/types";

export interface SettingsRecord {
  id: "app";
  value: AppSettings;
}

export interface MetadataRecord {
  key: string;
  value: unknown;
}

export class FinanceDatabase extends Dexie {
  transactions!: EntityTable<Transaction, "id">;
  categories!: EntityTable<Category, "id">;
  accounts!: EntityTable<Account, "id">;
  budgets!: EntityTable<Budget, "id">;
  recurringTransactions!: EntityTable<RecurringTransaction, "id">;
  savingsGoals!: EntityTable<SavingsGoal, "id">;
  settings!: EntityTable<SettingsRecord, "id">;
  metadata!: EntityTable<MetadataRecord, "key">;

  constructor(name = "finos-local") {
    super(name);

    this.version(1).stores({
      transactions:
        "&id, date, type, categoryId, accountId, fromAccountId, toAccountId, recurringId",
      categories: "&id, [type+name], isActive, sortOrder",
      accounts: "&id, name, type",
      budgets: "&id, month",
      recurringTransactions: "&id, nextRunDate, isActive",
      settings: "&id",
      metadata: "&key",
    });

    this.version(2).stores({
      savingsGoals: "&id, isArchived",
    });
  }
}

export const db = new FinanceDatabase();
