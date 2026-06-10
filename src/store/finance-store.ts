import { create } from "zustand";

import { buildDemoData } from "../data/demo";
import type {
  Account,
  AccountDraft,
  AppSettings,
  Budget,
  BudgetDraft,
  Category,
  CategoryDraft,
  FinanceData,
  RecurringTransaction,
  StoredData,
  Transaction,
  TransactionDraft,
} from "../domain/types";
import * as repository from "../storage/repository";

interface FinanceState extends FinanceData {
  initialized: boolean;
  loading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  addTransaction: (draft: TransactionDraft) => Promise<void>;
  updateTransaction: (id: string, draft: TransactionDraft) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addAccount: (draft: AccountDraft) => Promise<void>;
  updateAccount: (id: string, draft: AccountDraft) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  addCategory: (draft: CategoryDraft) => Promise<void>;
  updateCategory: (id: string, draft: CategoryDraft) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  upsertBudget: (draft: BudgetDraft) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  updateSettings: (settings: AppSettings) => Promise<void>;
  restoreData: (data: StoredData) => Promise<void>;
  clearAllData: () => Promise<void>;
  loadDemoData: () => Promise<void>;
  clearDemoData: () => Promise<void>;
}

const emptyData: FinanceData = {
  transactions: [],
  categories: [],
  accounts: [],
  budgets: [],
  recurringTransactions: [],
  settings: {
    username: "",
    currency: "THB",
    locale: "en-TH",
    theme: "system",
    firstDayOfWeek: "monday",
    dateFormat: "dd MMM yyyy",
    numberFormat: "en-TH",
    backupReminder: true,
    backupReminderFrequency: "monthly",
  },
  demoLoaded: false,
};

export const useFinanceStore = create<FinanceState>((set, get) => ({
  ...emptyData,
  initialized: false,
  loading: false,
  error: null,
  initialize: async () => {
    if (get().initialized) {
      return;
    }
    await run(set, async () => {
      const data = await repository.getFinanceData();
      set({ ...data, initialized: true });
    });
  },
  refresh: async () => {
    await run(set, async () => {
      const data = await repository.getFinanceData();
      set(data);
    });
  },
  addTransaction: async (draft) => {
    await mutate(set, () => repository.addTransaction(draft));
  },
  updateTransaction: async (id, draft) => {
    await mutate(set, () => repository.updateTransaction(id, draft));
  },
  deleteTransaction: async (id) => {
    await mutate(set, () => repository.deleteTransaction(id));
  },
  addAccount: async (draft) => {
    await mutate(set, () => repository.addAccount(draft));
  },
  updateAccount: async (id, draft) => {
    await mutate(set, () => repository.updateAccount(id, draft));
  },
  deleteAccount: async (id) => {
    await mutate(set, () => repository.deleteAccount(id));
  },
  addCategory: async (draft) => {
    await mutate(set, () => repository.addCategory(draft));
  },
  updateCategory: async (id, draft) => {
    await mutate(set, () => repository.updateCategory(id, draft));
  },
  deleteCategory: async (id) => {
    await mutate(set, () => repository.deleteCategory(id));
  },
  upsertBudget: async (draft) => {
    await mutate(set, () => repository.upsertBudget(draft));
  },
  deleteBudget: async (id) => {
    await mutate(set, () => repository.deleteBudget(id));
  },
  updateSettings: async (settings) => {
    await mutate(set, () => repository.updateSettings(settings));
  },
  restoreData: async (data) => {
    await mutate(set, () => repository.replaceAllData(data));
  },
  clearAllData: async () => {
    await mutate(set, () => repository.clearAllData());
  },
  loadDemoData: async () => {
    await mutate(set, () => repository.loadDemoDataset(buildDemoData()));
  },
  clearDemoData: async () => {
    await mutate(set, () => repository.removeDemoRecords());
  },
}));

async function run(
  set: (partial: Partial<FinanceState>) => void,
  operation: () => Promise<void>,
) {
  set({ loading: true, error: null });
  try {
    await operation();
  } catch (error) {
    set({ error: error instanceof Error ? error.message : "Something went wrong" });
    throw error;
  } finally {
    set({ loading: false });
  }
}

async function mutate(
  set: (partial: Partial<FinanceState>) => void,
  operation: () => Promise<unknown>,
) {
  await run(set, async () => {
    await operation();
    const data = await repository.getFinanceData();
    set(data);
  });
}

export type StoreTransaction = Transaction;
export type StoreCategory = Category;
export type StoreAccount = Account;
export type StoreBudget = Budget;
export type StoreRecurringTransaction = RecurringTransaction;
