import { format } from "date-fns";
import { create } from "zustand";

import { buildDemoData } from "../data/demo";
import { advanceNextRunDate, generateDueOccurrences } from "../domain/recurring";
import type {
  Account,
  AccountDraft,
  AppSettings,
  Budget,
  BudgetDraft,
  Category,
  CategoryDraft,
  Debt,
  DebtDraft,
  FinanceData,
  RecurringTransaction,
  SavingsGoal,
  SavingsGoalDraft,
  StoredData,
  Transaction,
  TransactionDraft,
} from "../domain/types";
import { DEFAULT_MOBILE_NAV_ITEMS } from "../domain/navigation";
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
  addRecurring: (draft: Omit<RecurringTransaction, "id">) => Promise<void>;
  updateRecurring: (id: string, draft: Omit<RecurringTransaction, "id">) => Promise<void>;
  deleteRecurring: (id: string) => Promise<void>;
  confirmRecurringOccurrence: (id: string) => Promise<void>;
  generateDueRecurring: () => Promise<void>;
  addGoal: (draft: SavingsGoalDraft) => Promise<void>;
  updateGoal: (id: string, draft: SavingsGoalDraft) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addContribution: (id: string, amount: number) => Promise<void>;
  addDebt: (draft: DebtDraft) => Promise<void>;
  updateDebt: (id: string, draft: DebtDraft) => Promise<void>;
  deleteDebt: (id: string) => Promise<void>;
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
  savingsGoals: [],
  debts: [],
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
    mobileNavItems: DEFAULT_MOBILE_NAV_ITEMS,
  },
  demoLoaded: false,
};

export const useFinanceStore = create<FinanceState>((set, get) => ({
  ...emptyData,
  initialized: false,
  loading: false,
  error: null,
  initialize: async () => {
    if (get().initialized) return;
    await run(set, async () => {
      const data = await repository.getFinanceData();
      set({ ...data, initialized: true });
    });
    await get().generateDueRecurring();
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
  addRecurring: async (draft) => {
    await mutate(set, () => repository.addRecurring(draft));
  },
  updateRecurring: async (id, draft) => {
    await mutate(set, () => repository.updateRecurring(id, draft));
  },
  deleteRecurring: async (id) => {
    await mutate(set, () => repository.deleteRecurring(id));
  },
  confirmRecurringOccurrence: async (id) => {
    await mutate(set, async () => {
      const recurring = get().recurringTransactions.find((r) => r.id === id);
      if (!recurring) return;
      const today = format(new Date(), "yyyy-MM-dd");
      const draft = {
        ...recurring.transactionTemplate,
        date: recurring.nextRunDate,
        recurringId: recurring.id,
      };
      await repository.addTransaction(draft);
      const newNextRunDate = advanceNextRunDate(recurring, today);
      await repository.updateRecurring(id, { ...recurring, nextRunDate: newNextRunDate });
    });
  },
  addGoal: async (draft) => {
    await mutate(set, () => repository.addGoal(draft));
  },
  updateGoal: async (id, draft) => {
    await mutate(set, () => repository.updateGoal(id, draft));
  },
  deleteGoal: async (id) => {
    await mutate(set, () => repository.deleteGoal(id));
  },
  addContribution: async (id, amount) => {
    await mutate(set, () => repository.addContribution(id, amount));
  },
  addDebt: async (draft) => {
    await mutate(set, () => repository.addDebt(draft));
  },
  updateDebt: async (id, draft) => {
    await mutate(set, () => repository.updateDebt(id, draft));
  },
  deleteDebt: async (id) => {
    await mutate(set, () => repository.deleteDebt(id));
  },
  generateDueRecurring: async () => {
    try {
      const { recurringTransactions } = get();
      const today = format(new Date(), "yyyy-MM-dd");
      let changed = false;

      for (const recurring of recurringTransactions) {
        if (!recurring.isActive || !recurring.autoGenerate) continue;
        if (recurring.nextRunDate > today) continue;

        const drafts = generateDueOccurrences(recurring, today);
        if (drafts.length === 0) continue;

        for (const draft of drafts) {
          await repository.addTransaction(draft);
        }
        const newNextRunDate = advanceNextRunDate(recurring, today);
        await repository.updateRecurring(recurring.id, { ...recurring, nextRunDate: newNextRunDate });
        changed = true;
      }

      if (changed) {
        const data = await repository.getFinanceData();
        set(data);
      }
    } catch (e) {
      set({
        error:
          e instanceof Error
            ? e.message
            : "Failed to generate due recurring transactions",
      });
    }
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
export type StoreSavingsGoal = SavingsGoal;
export type StoreDebt = Debt;
