import { createBackup } from "../domain/backup";
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES, DEFAULT_SETTINGS, SCHEMA_VERSION } from "../domain/defaults";
import {
  accountSchema,
  budgetSchema,
  categorySchema,
  recurringTransactionSchema,
  savingsGoalSchema,
  settingsSchema,
  transactionSchema,
  validateUniqueAccountNames,
  validateUniqueCategoryNames,
} from "../domain/schemas";
import type {
  AccountDraft,
  AppSettings,
  BudgetDraft,
  CategoryDraft,
  FinanceData,
  RecurringTransaction,
  SavingsGoal,
  SavingsGoalDraft,
  StoredData,
  SyncMetadata,
  Transaction,
  TransactionDraft,
} from "../domain/types";
import { createId } from "../lib/id";
import { db } from "./db";

const APP_SETTINGS_ID = "app";
const DEMO_LOADED_KEY = "demoLoaded";
const INITIALIZED_KEY = "initialized";
const SCHEMA_VERSION_KEY = "schemaVersion";
const SYNC_METADATA_KEY = "googleDriveSync";
export const SYNC_METADATA_CHANGED_EVENT = "finora:sync-metadata-changed";

function notifySyncMetadataChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SYNC_METADATA_CHANGED_EVENT));
  }
}

function createDefaultSyncMetadata(): SyncMetadata {
  return {
    provider: "google-drive",
    enabled: false,
    localRevision: 0,
    deviceId: getOrCreateDeviceId(),
    status: "idle",
    hasPendingLocalChanges: false,
  };
}

function getOrCreateDeviceId() {
  try {
    const key = "finora-device-id";
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const next = crypto.randomUUID();
    localStorage.setItem(key, next);
    return next;
  } catch {
    return "test-device";
  }
}

export async function initializeStorage() {
  await db.transaction(
    "rw",
    [
      db.categories,
      db.accounts,
      db.settings,
      db.metadata,
    ],
    async () => {
      const initialized = await db.metadata.get(INITIALIZED_KEY);

      if (!initialized && (await db.categories.count()) === 0) {
        await db.categories.bulkAdd(DEFAULT_CATEGORIES);
      }

      if (!initialized && (await db.accounts.count()) === 0) {
        await db.accounts.bulkAdd(DEFAULT_ACCOUNTS);
      }

      if (!initialized && !(await db.settings.get(APP_SETTINGS_ID))) {
        await db.settings.add({ id: APP_SETTINGS_ID, value: DEFAULT_SETTINGS });
      }

      await db.metadata.put({ key: INITIALIZED_KEY, value: true });
      await db.metadata.put({ key: SCHEMA_VERSION_KEY, value: SCHEMA_VERSION });
      if (!(await db.metadata.get(DEMO_LOADED_KEY))) {
        await db.metadata.add({ key: DEMO_LOADED_KEY, value: false });
      }
    },
  );
}

export async function getFinanceData(): Promise<FinanceData> {
  await initializeStorage();
  const [
    transactions,
    categories,
    accounts,
    budgets,
    recurringTransactions,
    savingsGoals,
    settingsRecord,
    demoRecord,
  ] = await Promise.all([
    db.transactions.toArray(),
    db.categories.orderBy("sortOrder").toArray(),
    db.accounts.toArray(),
    db.budgets.toArray(),
    db.recurringTransactions.toArray(),
    db.savingsGoals.toArray(),
    db.settings.get(APP_SETTINGS_ID),
    db.metadata.get(DEMO_LOADED_KEY),
  ]);

  return {
    transactions,
    categories,
    accounts,
    budgets,
    recurringTransactions,
    savingsGoals,
    settings: settingsRecord?.value ?? DEFAULT_SETTINGS,
    demoLoaded: Boolean(demoRecord?.value),
  };
}

export async function getBackupData() {
  const data = await getFinanceData();
  return createBackup({
    transactions: data.transactions,
    categories: data.categories,
    accounts: data.accounts,
    budgets: data.budgets,
    recurringTransactions: data.recurringTransactions,
    savingsGoals: data.savingsGoals,
    settings: data.settings,
  });
}

export async function getSyncMetadata(): Promise<SyncMetadata> {
  await initializeStorage();
  const record = await db.metadata.get(SYNC_METADATA_KEY);
  return {
    ...createDefaultSyncMetadata(),
    ...(record?.value && typeof record.value === "object" ? (record.value as Partial<SyncMetadata>) : {}),
  };
}

export async function updateSyncMetadata(partial: Partial<SyncMetadata>) {
  const current = await getSyncMetadata();
  const next: SyncMetadata = { ...current, ...partial, provider: "google-drive" };
  await db.metadata.put({ key: SYNC_METADATA_KEY, value: next });
  notifySyncMetadataChanged();
  return next;
}

export async function clearSyncMetadata() {
  await db.metadata.delete(SYNC_METADATA_KEY);
  notifySyncMetadataChanged();
}

async function bumpLocalRevision() {
  const current = await getSyncMetadata();
  if (!current.enabled && current.localRevision === 0) {
    await updateSyncMetadata({ localRevision: 1, hasPendingLocalChanges: true });
    return;
  }
  await updateSyncMetadata({
    localRevision: current.localRevision + 1,
    hasPendingLocalChanges: true,
    status: current.status === "synced" ? "idle" : current.status,
  });
}

export async function addTransaction(draft: TransactionDraft) {
  const now = new Date().toISOString();
  const transaction: Transaction = transactionSchema.parse({
    ...draft,
    id: createId("txn"),
    createdAt: now,
    updatedAt: now,
  });
  await db.transactions.add(transaction);
  await bumpLocalRevision();
  return transaction;
}

export async function updateTransaction(id: string, draft: TransactionDraft) {
  const existing = await db.transactions.get(id);
  if (!existing) {
    throw new Error("Transaction not found");
  }
  const transaction = transactionSchema.parse({
    ...draft,
    id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  });
  await db.transactions.put(transaction);
  await bumpLocalRevision();
  return transaction;
}

export async function deleteTransaction(id: string) {
  await db.transactions.delete(id);
  await bumpLocalRevision();
}

export async function addAccount(draft: AccountDraft) {
  const accounts = await db.accounts.toArray();
  if (!validateUniqueAccountNames([...accounts.map((account) => account.name), draft.name])) {
    throw new Error("Account names must be unique");
  }
  const now = new Date().toISOString();
  const account = accountSchema.parse({
    ...draft,
    id: createId("acct"),
    createdAt: now,
    updatedAt: now,
  });
  await db.accounts.add(account);
  await bumpLocalRevision();
  return account;
}

export async function updateAccount(id: string, draft: AccountDraft) {
  const existing = await db.accounts.get(id);
  if (!existing) {
    throw new Error("Account not found");
  }
  const accounts = (await db.accounts.toArray()).filter((account) => account.id !== id);
  if (!validateUniqueAccountNames([...accounts.map((account) => account.name), draft.name])) {
    throw new Error("Account names must be unique");
  }
  const account = accountSchema.parse({
    ...draft,
    id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  });
  await db.accounts.put(account);
  await bumpLocalRevision();
  return account;
}

export async function deleteAccount(id: string) {
  const relatedTransactions = await db.transactions
    .filter(
      (transaction) =>
        transaction.accountId === id ||
        transaction.fromAccountId === id ||
        transaction.toAccountId === id,
    )
    .count();
  if (relatedTransactions > 0) {
    throw new Error("Delete transactions connected to this account first");
  }
  await db.accounts.delete(id);
  await bumpLocalRevision();
}

export async function addCategory(draft: CategoryDraft) {
  const categories = await db.categories.toArray();
  const category = categorySchema.parse({
    ...draft,
    id: createId("cat"),
    isDefault: false,
    sortOrder: draft.sortOrder ?? categories.length,
  });
  if (!validateUniqueCategoryNames([...categories, category])) {
    throw new Error("Category names must be unique within each type");
  }
  await db.categories.add(category);
  await bumpLocalRevision();
  return category;
}

export async function updateCategory(id: string, draft: CategoryDraft) {
  const existing = await db.categories.get(id);
  if (!existing) {
    throw new Error("Category not found");
  }
  const category = categorySchema.parse({
    ...draft,
    id,
    isDefault: existing.isDefault,
    sortOrder: draft.sortOrder ?? existing.sortOrder,
  });
  const categories = (await db.categories.toArray()).filter((item) => item.id !== id);
  if (!validateUniqueCategoryNames([...categories, category])) {
    throw new Error("Category names must be unique within each type");
  }
  await db.categories.put(category);
  await bumpLocalRevision();
  return category;
}

export async function deleteCategory(id: string) {
  const category = await db.categories.get(id);
  if (category?.isDefault) {
    await db.categories.update(id, { isActive: false });
    await bumpLocalRevision();
    return;
  }
  const relatedTransactions = await db.transactions
    .filter((transaction) => transaction.categoryId === id)
    .count();
  if (relatedTransactions > 0) {
    throw new Error("Delete transactions connected to this category first");
  }
  await db.categories.delete(id);
  await bumpLocalRevision();
}

export async function upsertBudget(draft: BudgetDraft) {
  const existing = await db.budgets.where("month").equals(draft.month).first();
  const now = new Date().toISOString();
  const budget = budgetSchema.parse({
    ...draft,
    id: existing?.id ?? createId("budget"),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });
  await db.budgets.put(budget);
  await bumpLocalRevision();
  return budget;
}

export async function deleteBudget(id: string) {
  await db.budgets.delete(id);
  await bumpLocalRevision();
}

export async function addRecurring(draft: Omit<RecurringTransaction, "id">) {
  const recurring = recurringTransactionSchema.parse({
    ...draft,
    id: createId("rec"),
  });
  await db.recurringTransactions.add(recurring);
  await bumpLocalRevision();
  return recurring;
}

export async function updateRecurring(id: string, draft: Omit<RecurringTransaction, "id">) {
  const existing = await db.recurringTransactions.get(id);
  if (!existing) throw new Error("Recurring transaction not found");
  const recurring = recurringTransactionSchema.parse({ ...draft, id });
  await db.recurringTransactions.put(recurring);
  await bumpLocalRevision();
  return recurring;
}

export async function deleteRecurring(id: string) {
  await db.recurringTransactions.delete(id);
  await bumpLocalRevision();
}

export async function addGoal(draft: SavingsGoalDraft): Promise<SavingsGoal> {
  const now = new Date().toISOString();
  const goal = savingsGoalSchema.parse({ ...draft, id: createId("goal"), createdAt: now, updatedAt: now });
  await db.savingsGoals.add(goal);
  await bumpLocalRevision();
  return goal;
}

export async function updateGoal(id: string, draft: SavingsGoalDraft): Promise<SavingsGoal> {
  const existing = await db.savingsGoals.get(id);
  if (!existing) throw new Error("Goal not found");
  const goal = savingsGoalSchema.parse({ ...draft, id, createdAt: existing.createdAt, updatedAt: new Date().toISOString() });
  await db.savingsGoals.put(goal);
  await bumpLocalRevision();
  return goal;
}

export async function deleteGoal(id: string) {
  await db.savingsGoals.delete(id);
  await bumpLocalRevision();
}

export async function addContribution(id: string, amount: number) {
  const goal = await db.savingsGoals.get(id);
  if (!goal) throw new Error("Goal not found");
  const updated = savingsGoalSchema.parse({ ...goal, savedAmount: goal.savedAmount + amount, updatedAt: new Date().toISOString() });
  await db.savingsGoals.put(updated);
  await bumpLocalRevision();
}

export async function updateSettings(settings: AppSettings) {
  const value = settingsSchema.parse(settings);
  await db.settings.put({ id: APP_SETTINGS_ID, value });
  await bumpLocalRevision();
  return value;
}

export async function replaceAllData(data: StoredData) {
  await db.transaction(
    "rw",
    [
      db.transactions,
      db.categories,
      db.accounts,
      db.budgets,
      db.recurringTransactions,
      db.savingsGoals,
      db.settings,
      db.metadata,
    ],
    async () => {
      await Promise.all([
        db.transactions.clear(),
        db.categories.clear(),
        db.accounts.clear(),
        db.budgets.clear(),
        db.recurringTransactions.clear(),
        db.savingsGoals.clear(),
      ]);
      await db.transactions.bulkAdd(data.transactions);
      await db.categories.bulkAdd(data.categories);
      await db.accounts.bulkAdd(data.accounts);
      await db.budgets.bulkAdd(data.budgets);
      await db.recurringTransactions.bulkAdd(data.recurringTransactions);
      await db.savingsGoals.bulkAdd(data.savingsGoals ?? []);
      await db.settings.put({ id: APP_SETTINGS_ID, value: data.settings });
      await db.metadata.put({ key: INITIALIZED_KEY, value: true });
      await db.metadata.put({ key: SCHEMA_VERSION_KEY, value: data.schemaVersion });
      await db.metadata.put({ key: DEMO_LOADED_KEY, value: false });
    },
  );
  await bumpLocalRevision();
}

export async function clearAllData() {
  await db.transaction(
    "rw",
    [
      db.transactions,
      db.categories,
      db.accounts,
      db.budgets,
      db.recurringTransactions,
      db.savingsGoals,
      db.settings,
      db.metadata,
    ],
    async () => {
      await Promise.all([
        db.transactions.clear(),
        db.categories.clear(),
        db.accounts.clear(),
        db.budgets.clear(),
        db.recurringTransactions.clear(),
        db.savingsGoals.clear(),
        db.settings.clear(),
        db.metadata.clear(),
      ]);
    },
  );
  await initializeStorage();
}

export async function setDemoLoaded(value: boolean) {
  await db.metadata.put({ key: DEMO_LOADED_KEY, value });
}

export async function hasNonDemoRecords() {
  const [transactions, budgets] = await Promise.all([
    db.transactions.toArray(),
    db.budgets.toArray(),
  ]);
  return [...transactions, ...budgets].some((record) => !record.id.startsWith("demo-"));
}

export async function removeDemoRecords() {
  await db.transaction(
    "rw",
    [db.transactions, db.accounts, db.categories, db.budgets, db.recurringTransactions, db.savingsGoals, db.metadata],
    async () => {
      await db.transactions.filter((item) => item.id.startsWith("demo-")).delete();
      await db.accounts.filter((item) => item.id.startsWith("demo-")).delete();
      await db.categories.filter((item) => item.id.startsWith("demo-")).delete();
      await db.budgets.filter((item) => item.id.startsWith("demo-")).delete();
      await db.recurringTransactions.filter((item) => item.id.startsWith("demo-")).delete();
      await db.savingsGoals.filter((item) => item.id.startsWith("demo-")).delete();
      await db.metadata.put({ key: DEMO_LOADED_KEY, value: false });
    },
  );
  await bumpLocalRevision();
}

export async function loadDemoDataset(data: Omit<StoredData, "schemaVersion" | "settings">) {
  if (await hasNonDemoRecords()) {
    throw new Error("Demo data can only be loaded into an empty workspace");
  }
  await removeDemoRecords();
  await db.transaction(
    "rw",
    [db.transactions, db.categories, db.accounts, db.budgets, db.recurringTransactions, db.savingsGoals, db.metadata],
    async () => {
      await db.categories.bulkPut(data.categories);
      await db.accounts.bulkPut(data.accounts);
      await db.transactions.bulkPut(data.transactions);
      await db.budgets.bulkPut(data.budgets);
      await db.recurringTransactions.bulkPut(data.recurringTransactions);
      await db.savingsGoals.bulkPut(data.savingsGoals ?? []);
      await db.metadata.put({ key: DEMO_LOADED_KEY, value: true });
    },
  );
}
