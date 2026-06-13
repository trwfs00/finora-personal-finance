import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useMemo } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import type { AccountType, RecurringTransaction } from "../domain/types";
import { calculateNextRunDate } from "../domain/recurring";
import { useFinanceStore } from "../store/finance-store";
import { Button } from "./ui/button";
import { DatePicker } from "./ui/date-picker";
import { Field, Input } from "./ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { TimePicker } from "./ui/time-picker";

const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
  cash:        "oklch(0.60 0.14 145)",
  bank:        "oklch(0.56 0.15 255)",
  credit_card: "oklch(0.60 0.13 55)",
  e_wallet:    "oklch(0.55 0.16 305)",
  savings:     "oklch(0.57 0.13 200)",
  investment:  "oklch(0.52 0.15 255)",
  debt:        "oklch(0.57 0.16 30)",
};

const PAYMENT_METHODS = [
  "cash", "card", "bank_transfer", "e_wallet", "qr_promptpay", "cheque",
] as const;

const FREQUENCIES = ["daily", "weekly", "monthly", "yearly", "custom"] as const;

type FormValues = {
  type: "income" | "expense" | "transfer";
  amount: number;
  time: string;
  categoryId?: string;
  accountId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  note?: string;
  paymentMethod?: string;
  frequency: "daily" | "weekly" | "monthly" | "yearly" | "custom";
  interval: number;
  startDate: string;
  endDate?: string;
  autoGenerate: boolean;
};

interface RecurringFormProps {
  recurring?: RecurringTransaction;
  onSaved: () => void;
}

export function RecurringForm({ recurring, onSaved }: RecurringFormProps) {
  const { t } = useTranslation();
  const categories = useFinanceStore((state) => state.categories);
  const accounts = useFinanceStore((state) => state.accounts);
  const addRecurring = useFinanceStore((state) => state.addRecurring);
  const updateRecurring = useFinanceStore((state) => state.updateRecurring);
  const loading = useFinanceStore((state) => state.loading);

  const tmpl = recurring?.transactionTemplate;

  const schema = useMemo(
    () =>
      z
        .object({
          type: z.enum(["income", "expense", "transfer"]),
          amount: z.coerce.number().positive(t("form.amountError")),
          time: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
          categoryId: z.string().optional(),
          accountId: z.string().optional(),
          fromAccountId: z.string().optional(),
          toAccountId: z.string().optional(),
          note: z.string().optional(),
          paymentMethod: z.string().optional(),
          frequency: z.enum(["daily", "weekly", "monthly", "yearly", "custom"]),
          interval: z.coerce.number().int().positive().default(7),
          startDate: z.string().min(1, t("form.dateError")),
          endDate: z.string().optional(),
          autoGenerate: z.boolean(),
        })
        .superRefine((val, ctx) => {
          if (val.type === "income" || val.type === "expense") {
            if (!val.categoryId)
              ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["categoryId"], message: t("form.categoryError") });
            if (!val.accountId)
              ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["accountId"], message: t("form.accountError") });
          }
          if (val.type === "transfer") {
            if (!val.fromAccountId)
              ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["fromAccountId"], message: t("form.fromAccountError") });
            if (!val.toAccountId)
              ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["toAccountId"], message: t("form.toAccountError") });
            if (val.fromAccountId && val.toAccountId && val.fromAccountId === val.toAccountId)
              ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["toAccountId"], message: t("form.transferDiffError") });
          }
          if (val.endDate && val.endDate < val.startDate)
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "End date must be after start date" });
        }),
    [t],
  );

  const today = format(new Date(), "yyyy-MM-dd");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      type: tmpl?.type ?? "expense",
      amount: tmpl?.amount ?? 0,
      time: tmpl?.time ?? "",
      categoryId: tmpl?.categoryId ?? "",
      accountId: tmpl?.accountId ?? "",
      fromAccountId: tmpl?.fromAccountId ?? "",
      toAccountId: tmpl?.toAccountId ?? "",
      note: tmpl?.note ?? "",
      paymentMethod: tmpl?.paymentMethod ?? "",
      frequency: recurring?.frequency ?? "monthly",
      interval: recurring?.interval ?? 7,
      startDate: recurring?.startDate ?? today,
      endDate: recurring?.endDate ?? "",
      autoGenerate: recurring?.autoGenerate ?? true,
    },
  });

  const type = form.watch("type");
  const frequency = form.watch("frequency");
  const selectedDate = form.watch("startDate");
  const selectedEndDate = form.watch("endDate");
  const selectedTime = form.watch("time");
  const selectedPaymentMethod = form.watch("paymentMethod");
  const selectedCategoryId = form.watch("categoryId");
  const selectedAccountId = form.watch("accountId");
  const selectedFromAccountId = form.watch("fromAccountId");
  const selectedToAccountId = form.watch("toAccountId");
  const autoGenerate = form.watch("autoGenerate");

  const categoryOptions = useMemo(
    () => categories.filter((c) => c.isActive && c.type === (type === "income" ? "income" : "expense")),
    [categories, type],
  );

  async function onSubmit(values: FormValues) {
    const template = {
      type: values.type,
      amount: values.amount,
      date: values.startDate,
      time: values.time || undefined,
      categoryId: values.type !== "transfer" ? emptyToUndefined(values.categoryId) : undefined,
      accountId: values.type !== "transfer" ? emptyToUndefined(values.accountId) : undefined,
      fromAccountId: values.type === "transfer" ? emptyToUndefined(values.fromAccountId) : undefined,
      toAccountId: values.type === "transfer" ? emptyToUndefined(values.toAccountId) : undefined,
      note: emptyToUndefined(values.note?.trim()),
      tags: undefined,
      paymentMethod: emptyToUndefined(values.paymentMethod),
      attachmentNote: undefined,
      recurringId: undefined,
    };

    const draft: Omit<RecurringTransaction, "id"> = {
      transactionTemplate: template,
      frequency: values.frequency,
      interval: values.frequency === "custom" ? values.interval : undefined,
      startDate: values.startDate,
      endDate: emptyToUndefined(values.endDate),
      nextRunDate: recurring?.nextRunDate ?? values.startDate,
      autoGenerate: values.autoGenerate,
      isActive: recurring?.isActive ?? true,
    };

    if (recurring) {
      await updateRecurring(recurring.id, draft);
    } else {
      await addRecurring(draft);
    }
    onSaved();
  }

  const nextPreview = useMemo(() => {
    const start = form.getValues("startDate");
    const freq = form.getValues("frequency");
    const interval = form.getValues("interval");
    if (!start) return null;
    try {
      return calculateNextRunDate(freq, interval, start);
    } catch {
      return null;
    }
  }, [form, selectedDate, frequency]);

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
      {/* Transaction template fields */}
      <div className="grid gap-4 grid-cols-2">
        <Field label={t("form.type")} htmlFor="r-type" error={form.formState.errors.type?.message}>
          <Select
            onValueChange={(v) => form.setValue("type", v as FormValues["type"], { shouldValidate: true })}
            value={type}
          >
            <SelectTrigger id="r-type"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">{t("common.expense")}</SelectItem>
              <SelectItem value="income">{t("common.income")}</SelectItem>
              <SelectItem value="transfer">{t("common.transfer")}</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label={t("form.amount")} htmlFor="r-amount" error={form.formState.errors.amount?.message}>
          <Input id="r-amount" min="0" step="0.01" type="number" {...form.register("amount")} />
        </Field>
      </div>

      {type === "transfer" ? (
        // Distinct key from the expense branch: both render the same
        // <div><Field><Select/>×2> shape, so React would reconcile the Category
        // select into the From select (different item sets) and Radix fires
        // onValueChange("") during the swap, clearing fromAccountId. See
        // TransactionForm for the full write-up.
        <div key="transfer-accounts" className="grid gap-4 sm:grid-cols-2">
          <Field label={t("form.fromAccount")} htmlFor="r-from" error={form.formState.errors.fromAccountId?.message}>
            <Select onValueChange={(v) => form.setValue("fromAccountId", v, { shouldValidate: true })} value={selectedFromAccountId}>
              <SelectTrigger id="r-from"><SelectValue placeholder={t("form.selectAccount")} /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id} textValue={a.name}>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: a.color ?? ACCOUNT_TYPE_COLORS[a.type] }} />
                      {a.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("form.toAccount")} htmlFor="r-to" error={form.formState.errors.toAccountId?.message}>
            <Select onValueChange={(v) => form.setValue("toAccountId", v, { shouldValidate: true })} value={selectedToAccountId}>
              <SelectTrigger id="r-to"><SelectValue placeholder={t("form.selectAccount")} /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id} textValue={a.name}>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: a.color ?? ACCOUNT_TYPE_COLORS[a.type] }} />
                      {a.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      ) : (
        <div key="entry-category-account" className="grid gap-4 sm:grid-cols-2">
          <Field label={t("form.category")} htmlFor="r-cat" error={form.formState.errors.categoryId?.message}>
            <Select onValueChange={(v) => form.setValue("categoryId", v, { shouldValidate: true })} value={selectedCategoryId}>
              <SelectTrigger id="r-cat"><SelectValue placeholder={t("form.category")} /></SelectTrigger>
              <SelectContent>
                {categoryOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id} textValue={c.name}>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.color ?? "oklch(var(--muted))" }} />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("form.account")} htmlFor="r-acct" error={form.formState.errors.accountId?.message}>
            <Select onValueChange={(v) => form.setValue("accountId", v, { shouldValidate: true })} value={selectedAccountId}>
              <SelectTrigger id="r-acct"><SelectValue placeholder={t("form.selectAccount")} /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id} textValue={a.name}>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: a.color ?? ACCOUNT_TYPE_COLORS[a.type] }} />
                      {a.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("form.paymentMethod")} htmlFor="r-pm">
          <Select
            onValueChange={(v) => form.setValue("paymentMethod", v === "__none__" ? "" : v)}
            value={selectedPaymentMethod || "__none__"}
          >
            <SelectTrigger id="r-pm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__"><span className="text-muted">{t("form.paymentMethodPlaceholder")}</span></SelectItem>
              {PAYMENT_METHODS.map((pm) => (
                <SelectItem key={pm} value={pm}>{t(`form.pm_${pm}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label={t("form.note")} htmlFor="r-note">
          <Input id="r-note" placeholder={t("form.notePlaceholder")} {...form.register("note")} />
        </Field>
      </div>

      {/* Recurrence fields */}
      <div className="rounded-xl border border-line bg-surface-2 p-4 space-y-4">
        <p className="text-xs font-semibold text-muted uppercase tracking-wide">{t("recurring.frequency")}</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("recurring.frequency")} htmlFor="r-freq">
            <Select onValueChange={(v) => form.setValue("frequency", v as FormValues["frequency"])} value={frequency}>
              <SelectTrigger id="r-freq"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map((f) => (
                  <SelectItem key={f} value={f}>{t(`recurring.freq_${f}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {frequency === "custom" && (
            <Field
              label={t("recurring.interval")}
              htmlFor="r-interval"
              hint={t("recurring.intervalHint")}
              error={form.formState.errors.interval?.message}
            >
              <Input id="r-interval" min="1" type="number" {...form.register("interval")} />
            </Field>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("recurring.startDate")} htmlFor="r-start" error={form.formState.errors.startDate?.message}>
            <DatePicker
              ariaLabel={t("recurring.startDate")}
              id="r-start"
              onChange={(v) => form.setValue("startDate", v, { shouldValidate: true })}
              value={selectedDate}
            />
          </Field>
          <Field label={t("form.time")} htmlFor="r-time">
            <TimePicker
              ariaLabel={t("form.time")}
              id="r-time"
              onChange={(v) => form.setValue("time", v)}
              value={selectedTime || undefined}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t("recurring.endDate")}
            htmlFor="r-end"
            hint={t("recurring.endDateHint")}
            error={form.formState.errors.endDate?.message}
          >
            <DatePicker
              ariaLabel={t("recurring.endDate")}
              id="r-end"
              onChange={(v) => form.setValue("endDate", v)}
              value={selectedEndDate}
            />
          </Field>

          {nextPreview && (
            <div className="flex flex-col justify-end pb-0.5">
              <p className="text-xs text-muted">{t("recurring.nextDue")}</p>
              <p className="mt-1 text-sm font-medium text-ink tabular-nums">{nextPreview}</p>
            </div>
          )}
        </div>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-0.5 rounded border-line text-primary"
            checked={autoGenerate}
            onChange={(e) => form.setValue("autoGenerate", e.target.checked)}
          />
          <span className="space-y-0.5">
            <span className="block text-sm font-medium text-ink">{t("recurring.autoGenerate")}</span>
            <span className="block text-xs text-muted">{t("recurring.autoGenerateHint")}</span>
          </span>
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <Button disabled={loading} type="submit" variant="primary">
          {recurring ? t("recurring.formSave") : t("recurring.formAdd")}
        </Button>
      </div>
    </form>
  );
}

function emptyToUndefined(value?: string) {
  return value && value.length > 0 ? value : undefined;
}
