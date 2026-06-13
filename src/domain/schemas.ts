import { z } from "zod";

export const transactionTypeSchema = z.enum(["income", "expense", "transfer"]);
export const categoryTypeSchema = z.enum(["income", "expense"]);
export const accountTypeSchema = z.enum([
  "cash",
  "bank",
  "credit_card",
  "e_wallet",
  "savings",
  "investment",
  "debt",
]);

const isoDateSchema = z
  .string()
  .min(1, "Date is required")
  .refine((value) => !Number.isNaN(Date.parse(value)), "Use a valid date");

const transactionBaseSchema = z.object({
    id: z.string().min(1),
    type: transactionTypeSchema,
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    date: isoDateSchema,
    time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    categoryId: z.string().optional(),
    fromAccountId: z.string().optional(),
    toAccountId: z.string().optional(),
    accountId: z.string().optional(),
    note: z.string().optional(),
    tags: z.array(z.string()).optional(),
    paymentMethod: z.string().optional(),
    attachmentNote: z.string().optional(),
    recurringId: z.string().optional(),
    createdAt: isoDateSchema,
    updatedAt: isoDateSchema,
});

type TransactionValidationShape = {
  type: "income" | "expense" | "transfer";
  categoryId?: string;
  accountId?: string;
  fromAccountId?: string;
  toAccountId?: string;
};

function validateTransactionShape(value: TransactionValidationShape, context: z.RefinementCtx) {
  if (value.type === "income" || value.type === "expense") {
    if (!value.categoryId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["categoryId"],
        message: "Category is required",
      });
    }
    if (!value.accountId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["accountId"],
        message: "Account is required",
      });
    }
  }

  if (value.type === "transfer") {
    if (!value.fromAccountId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fromAccountId"],
        message: "From account is required",
      });
    }
    if (!value.toAccountId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["toAccountId"],
        message: "To account is required",
      });
    }
    if (
      value.fromAccountId &&
      value.toAccountId &&
      value.fromAccountId === value.toAccountId
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["toAccountId"],
        message: "Transfer accounts must differ",
      });
    }
  }
}

export const transactionSchema = transactionBaseSchema.superRefine(validateTransactionShape);

export const transactionDraftSchema = transactionBaseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).superRefine(validateTransactionShape);

export const categorySchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Category name is required"),
  type: categoryTypeSchema,
  icon: z.string().optional(),
  color: z.string().optional(),
  isDefault: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.number().int().nonnegative(),
});

export const accountSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Account name is required"),
  type: accountTypeSchema,
  initialBalance: z.coerce.number(),
  creditLimit: z.coerce.number().nonnegative().optional(),
  currency: z.string().min(1),
  color: z.string().optional(),
  accountNumber: z.string().optional(),
  includeInNetWorth: z.boolean(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const budgetSchema = z.object({
  id: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Use YYYY-MM month format"),
  totalBudget: z.coerce.number().nonnegative().optional(),
  categoryBudgets: z.array(
    z.object({
      categoryId: z.string().min(1),
      amount: z.coerce.number().nonnegative("Budget must be nonnegative"),
    }),
  ),
  rollover: z.boolean(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const recurringTransactionSchema = z.object({
  id: z.string().min(1),
  transactionTemplate: transactionDraftSchema,
  frequency: z.enum(["daily", "weekly", "monthly", "yearly", "custom"]),
  interval: z.number().int().positive().optional(),
  startDate: isoDateSchema,
  endDate: isoDateSchema.optional(),
  nextRunDate: isoDateSchema,
  autoGenerate: z.boolean(),
  isActive: z.boolean(),
});

export const debtTypeSchema = z.enum([
  "credit_card",
  "personal_loan",
  "cash_advance",
  "bnpl",
  "car_loan",
  "mortgage",
  "student_loan",
  "informal",
  "other",
]);

export const interestRateTypeSchema = z.enum(["fixed", "floating", "none"]);
export const paymentStructureSchema = z.enum(["fixed_installment", "revolving", "manual"]);

export const debtSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Debt name is required"),
  type: debtTypeSchema,
  creditor: z.string().trim().min(1, "Creditor is required"),
  principal: z.coerce.number().positive("Principal must be greater than 0"),
  interestRate: z.coerce.number().min(0).default(0),
  interestRateType: interestRateTypeSchema,
  paymentStructure: paymentStructureSchema,
  minimumPayment: z.coerce.number().nonnegative().default(0),
  extraPayment: z.coerce.number().min(0).default(0),
  paymentDueDay: z.number().int().min(1).max(31).optional(),
  startDate: isoDateSchema,
  linkedAccountId: z.string().optional(),
  rateBenchmark: z.string().optional(),
  rateSpread: z.number().optional(),
  color: z.string().optional(),
  note: z.string().optional(),
  isArchived: z.boolean().default(false),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const savingsGoalSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Goal name is required"),
  targetAmount: z.coerce.number().positive("Target must be greater than 0"),
  savedAmount: z.coerce.number().min(0).default(0),
  linkedAccountId: z.string().optional(),
  currency: z.string().min(1),
  deadline: isoDateSchema.optional(),
  color: z.string().optional(),
  note: z.string().optional(),
  isArchived: z.boolean().default(false),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});

export const settingsSchema = z.object({
  username: z.string().default(""),
  currency: z.string().min(1),
  locale: z.string().min(1),
  theme: z.enum(["light", "dark", "system"]),
  firstDayOfWeek: z.enum(["monday", "sunday"]),
  dateFormat: z.string().min(1),
  numberFormat: z.string().min(1),
  backupReminder: z.boolean(),
  backupReminderFrequency: z.enum(["weekly", "monthly"]),
  mrrRates: z.record(z.number()).optional(),
  accountOrder: z.array(z.string()).optional(),
});

export const backupSchema = z.object({
  schemaVersion: z.number().int().positive(),
  exportedAt: isoDateSchema,
  appName: z.union([z.literal("Finora"), z.literal("FinOS")]),
  transactions: z.array(transactionSchema),
  categories: z.array(categorySchema),
  accounts: z.array(accountSchema),
  budgets: z.array(budgetSchema),
  recurringTransactions: z.array(recurringTransactionSchema),
  savingsGoals: z.array(savingsGoalSchema).optional().default([]),
  debts: z.array(debtSchema).optional().default([]),
  settings: settingsSchema,
});

export function validateUniqueAccountNames(names: string[]) {
  const normalized = names.map((name) => name.trim().toLowerCase());
  return new Set(normalized).size === normalized.length;
}

export function validateUniqueCategoryNames(
  categories: Array<{ name: string; type: string }>,
) {
  const normalized = categories.map(
    (category) => `${category.type}:${category.name.trim().toLowerCase()}`,
  );
  return new Set(normalized).size === normalized.length;
}
