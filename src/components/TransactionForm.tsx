import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { ScanLine } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import { findDuplicate } from "../domain/duplicate"
import type { AccountType, Transaction } from "../domain/types"
import { useFinanceStore } from "../store/finance-store"
import { SlipScanner, type SlipFillData } from "./SlipScanner"
import { Button } from "./ui/button"
import { DatePicker } from "./ui/date-picker"
import { Field, Input } from "./ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import { NoteInput, TagInput } from "./ui/tag-input"
import { TimePicker } from "./ui/time-picker"

const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
  cash: "oklch(0.60 0.14 145)",
  bank: "oklch(0.56 0.15 255)",
  credit_card: "oklch(0.60 0.13 55)",
  e_wallet: "oklch(0.55 0.16 305)",
  savings: "oklch(0.57 0.13 200)",
  investment: "oklch(0.52 0.15 255)",
  debt: "oklch(0.57 0.16 30)",
}

const PAYMENT_METHODS = [
  "cash",
  "card",
  "bank_transfer",
  "e_wallet",
  "qr_promptpay",
  "cheque",
] as const

type FormValues = {
  type: "income" | "expense" | "transfer"
  amount: number
  date: string
  time: string
  categoryId?: string
  accountId?: string
  fromAccountId?: string
  toAccountId?: string
  note?: string
  tagsText?: string
  paymentMethod?: string
  attachmentNote?: string
}

interface TransactionFormProps {
  transaction?: Transaction
  initialType?: "income" | "expense" | "transfer"
  initialScannerOpen?: boolean
  onSaved: () => void
}

export function TransactionForm({
  transaction,
  initialType = "expense",
  initialScannerOpen = false,
  onSaved,
}: TransactionFormProps) {
  const { t } = useTranslation()
  const [scannerOpen, setScannerOpen] = useState(initialScannerOpen)
  const [pendingDuplicate, setPendingDuplicate] = useState<Transaction | null>(
    null,
  )
  const categories = useFinanceStore(state => state.categories)
  const accounts = useFinanceStore(state => state.accounts)
  const transactions = useFinanceStore(state => state.transactions)
  const addTransaction = useFinanceStore(state => state.addTransaction)
  const updateTransaction = useFinanceStore(state => state.updateTransaction)
  const loading = useFinanceStore(state => state.loading)

  const formSchema = useMemo(
    () =>
      z
        .object({
          type: z.enum(["income", "expense", "transfer"]),
          amount: z.coerce.number().positive(t("form.amountError")),
          date: z.string().min(1, t("form.dateError")),
          time: z.string().regex(/^\d{2}:\d{2}$/, t("form.timeError")),
          categoryId: z.string().optional(),
          accountId: z.string().optional(),
          fromAccountId: z.string().optional(),
          toAccountId: z.string().optional(),
          note: z.string().optional(),
          tagsText: z.string().optional(),
          paymentMethod: z.string().optional(),
          attachmentNote: z.string().optional(),
        })
        .superRefine((value, context) => {
          if (value.type === "income" || value.type === "expense") {
            if (!value.categoryId) {
              context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["categoryId"],
                message: t("form.categoryError"),
              })
            }
            if (!value.accountId) {
              context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["accountId"],
                message: t("form.accountError"),
              })
            }
          }

          if (value.type === "transfer") {
            if (!value.fromAccountId) {
              context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["fromAccountId"],
                message: t("form.fromAccountError"),
              })
            }
            if (!value.toAccountId) {
              context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["toAccountId"],
                message: t("form.toAccountError"),
              })
            }
            if (
              value.fromAccountId &&
              value.toAccountId &&
              value.fromAccountId === value.toAccountId
            ) {
              context.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["toAccountId"],
                message: t("form.transferDiffError"),
              })
            }
          }
        }),
    [t],
  )

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: transaction?.type ?? initialType,
      amount: transaction?.amount ?? 0,
      date: transaction?.date ?? format(new Date(), "yyyy-MM-dd"),
      time: transaction?.time ?? format(new Date(), "HH:mm"),
      categoryId: transaction?.categoryId ?? "",
      accountId: transaction?.accountId ?? "",
      fromAccountId: transaction?.fromAccountId ?? "",
      toAccountId: transaction?.toAccountId ?? "",
      note: transaction?.note ?? "",
      tagsText: transaction?.tags?.join(", ") ?? "",
      paymentMethod: transaction?.paymentMethod ?? "",
      attachmentNote: transaction?.attachmentNote ?? "",
    },
  })

  const type = form.watch("type")
  const selectedCategoryId = form.watch("categoryId")
  const selectedAccountId = form.watch("accountId")
  const selectedFromAccountId = form.watch("fromAccountId")
  const selectedToAccountId = form.watch("toAccountId")
  const selectedDate = form.watch("date")
  const selectedTime = form.watch("time")
  const selectedTagsText = form.watch("tagsText") ?? ""

  const allTags = useMemo(() => {
    const set = new Set<string>()
    transactions.forEach(tx => tx.tags?.forEach(tag => set.add(tag)))
    return Array.from(set).sort()
  }, [transactions])

  const noteSuggestions = useMemo(() => {
    if (!selectedCategoryId) return []
    const seen = new Set<string>()
    return transactions
      .filter(
        tx =>
          tx.categoryId === selectedCategoryId &&
          tx.note &&
          tx.id !== transaction?.id,
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(tx => tx.note!)
      .filter(note => !seen.has(note) && !!seen.add(note))
      .slice(0, 20)
  }, [transactions, selectedCategoryId, transaction?.id])

  const selectedPaymentMethod = form.watch("paymentMethod")

  const categoryOptions = useMemo(
    () =>
      categories.filter(
        category =>
          category.isActive &&
          category.type === (type === "income" ? "income" : "expense"),
      ),
    [categories, type],
  )

  function handleSlipFill(data: SlipFillData) {
    // Apply the whole slip in ONE atomic reset rather than a sequence of
    // setValue calls. A transfer flips type expense→transfer, which mounts the
    // From/To selects; setting type and the two accounts as separate updates
    // let the first account get dropped while that subtree mounts (and fired
    // racing async validations). reset() writes the complete state at once, so
    // the transfer fields are already present when they render.
    const current = form.getValues()
    const isTransfer = data.type === "transfer"

    form.reset({
      ...current,
      type:
        (data.fromAccountId && data.toAccountId ? "transfer" : data.type) ||
        (current.type === "transfer" ? "expense" : current.type),
      amount: data.amount ?? current.amount,
      date: data.date ?? current.date,
      time: data.time ?? current.time,
      fromAccountId:
        (isTransfer
          ? (data.fromAccountId ?? data.fromAccountId)
          : current.fromAccountId) || data.accountId, // A slip might not label the from/to sides, but if it's a transfer the one account is probably the from side.
      toAccountId: isTransfer
        ? (data.toAccountId ?? current.toAccountId)
        : current.toAccountId,
      categoryId: isTransfer
        ? current.categoryId
        : (data.categoryId ?? current.categoryId),
      accountId: isTransfer
        ? current.accountId
        : (data.accountId ?? current.accountId),
      attachmentNote: data.refNumber ?? current.attachmentNote,
      paymentMethod: "bank_transfer",
    })
    // // Validate the final state once so a genuinely unmatched account still
    // // surfaces its error, without the per-setValue validation race.
    // void form.trigger()
  }

  // A stale "save anyway" ack would let an edited transaction skip the check.
  // Clear it whenever a field that affects duplicate matching changes.
  useEffect(() => {
    const sub = form.watch((_, { name }) => {
      if (
        name &&
        [
          "type",
          "amount",
          "date",
          "time",
          "accountId",
          "fromAccountId",
          "toAccountId",
        ].includes(name)
      ) {
        setPendingDuplicate(null)
      }
    })
    return () => sub.unsubscribe()
  }, [form])

  async function onSubmit(values: FormValues) {
    const normalized = {
      type: values.type,
      amount: values.amount,
      date: values.date,
      time: values.time || undefined,
      categoryId:
        values.type === "transfer"
          ? undefined
          : emptyToUndefined(values.categoryId),
      accountId:
        values.type === "transfer"
          ? undefined
          : emptyToUndefined(values.accountId),
      fromAccountId:
        values.type === "transfer"
          ? emptyToUndefined(values.fromAccountId)
          : undefined,
      toAccountId:
        values.type === "transfer"
          ? emptyToUndefined(values.toAccountId)
          : undefined,
      note: emptyToUndefined(values.note?.trim()),
      tags: values.tagsText
        ?.split(",")
        .map(tag => tag.trim())
        .filter(Boolean),
      paymentMethod: emptyToUndefined(values.paymentMethod?.trim()),
      attachmentNote: emptyToUndefined(values.attachmentNote?.trim()),
    }

    if (transaction) {
      await updateTransaction(transaction.id, normalized)
    } else {
      // First save attempt: warn if this looks like an already-recorded slip.
      // A second submit (pendingDuplicate set) commits anyway.
      if (!pendingDuplicate) {
        const dup = findDuplicate(normalized, transactions)
        if (dup) {
          setPendingDuplicate(dup)
          return
        }
      }
      await addTransaction(normalized)
      setPendingDuplicate(null)
    }
    onSaved()
  }

  return (
    <form className='space-y-5' onSubmit={form.handleSubmit(onSubmit)}>
      {!transaction && (
        <div>
          {scannerOpen ? (
            <SlipScanner
              accounts={accounts}
              autoOpenFilePicker={initialScannerOpen}
              categories={categories}
              onClose={() => setScannerOpen(false)}
              onFill={handleSlipFill}
            />
          ) : (
            <button
              type='button'
              className='flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80'
              onClick={() => setScannerOpen(true)}
            >
              <ScanLine className='h-3.5 w-3.5' />
              {t("slip.scanButton")}
            </button>
          )}
        </div>
      )}

      <div className='grid gap-4 grid-cols-2 lg:grid-cols-4'>
        <Field
          label={t("form.type")}
          htmlFor='type'
          error={form.formState.errors.type?.message}
        >
          <Select
            onValueChange={value =>
              form.setValue("type", value as FormValues["type"], {
                shouldValidate: true,
              })
            }
            value={type}
          >
            <SelectTrigger id='type'>
              <SelectValue placeholder={t("form.selectType")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='expense'>{t("common.expense")}</SelectItem>
              <SelectItem value='income'>{t("common.income")}</SelectItem>
              <SelectItem value='transfer'>{t("common.transfer")}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field
          label={t("form.amount")}
          htmlFor='amount'
          error={form.formState.errors.amount?.message}
        >
          <Input
            id='amount'
            min='0'
            step='0.01'
            type='number'
            {...form.register("amount")}
          />
        </Field>
        <Field
          label={t("form.date")}
          htmlFor='date'
          error={form.formState.errors.date?.message}
        >
          <DatePicker
            ariaLabel={t("form.date")}
            id='date'
            onChange={value =>
              form.setValue("date", value, { shouldValidate: true })
            }
            value={selectedDate}
          />
        </Field>
        <Field
          label={t("form.time")}
          htmlFor='time'
          error={form.formState.errors.time?.message}
        >
          <TimePicker
            ariaLabel={t("form.time")}
            id='time'
            onChange={value =>
              form.setValue("time", value, { shouldValidate: true })
            }
            value={selectedTime}
          />
        </Field>
      </div>

      {type === "transfer" ? (
        // Distinct key from the expense branch below: both render the same
        // <div><Field><Select/>×2> shape, so without it React reconciles the
        // Category select into the From select (different item sets), and Radix
        // fires onValueChange("") during the swap — silently clearing a freshly
        // filled fromAccountId. A unique key forces a clean remount.
        <div key='transfer-accounts' className='grid gap-4 sm:grid-cols-2'>
          <Field
            label={t("form.fromAccount")}
            htmlFor='fromAccountId'
            error={form.formState.errors.fromAccountId?.message}
          >
            <Select
              onValueChange={value =>
                form.setValue("fromAccountId", value, { shouldValidate: true })
              }
              value={selectedFromAccountId}
            >
              <SelectTrigger id='fromAccountId'>
                <SelectValue placeholder={t("form.selectAccount")} />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(account => (
                  <SelectItem
                    key={account.id}
                    value={account.id}
                    textValue={account.name}
                  >
                    <span className='flex items-center gap-2'>
                      <span
                        className='h-2 w-2 shrink-0 rounded-full'
                        style={{
                          background:
                            account.color ?? ACCOUNT_TYPE_COLORS[account.type],
                        }}
                      />
                      {account.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field
            label={t("form.toAccount")}
            htmlFor='toAccountId'
            error={form.formState.errors.toAccountId?.message}
          >
            <Select
              onValueChange={value =>
                form.setValue("toAccountId", value, { shouldValidate: true })
              }
              value={selectedToAccountId}
            >
              <SelectTrigger id='toAccountId'>
                <SelectValue placeholder={t("form.selectAccount")} />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(account => (
                  <SelectItem
                    key={account.id}
                    value={account.id}
                    textValue={account.name}
                  >
                    <span className='flex items-center gap-2'>
                      <span
                        className='h-2 w-2 shrink-0 rounded-full'
                        style={{
                          background:
                            account.color ?? ACCOUNT_TYPE_COLORS[account.type],
                        }}
                      />
                      {account.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      ) : (
        <div key='entry-category-account' className='grid gap-4 sm:grid-cols-2'>
          <Field
            label={t("form.account")}
            htmlFor='accountId'
            error={form.formState.errors.accountId?.message}
          >
            <Select
              onValueChange={value =>
                form.setValue("accountId", value, { shouldValidate: true })
              }
              value={selectedAccountId}
            >
              <SelectTrigger id='accountId'>
                <SelectValue placeholder={t("form.selectAccount")} />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(account => (
                  <SelectItem
                    key={account.id}
                    value={account.id}
                    textValue={account.name}
                  >
                    <span className='flex items-center gap-2'>
                      <span
                        className='h-2 w-2 shrink-0 rounded-full'
                        style={{
                          background:
                            account.color ?? ACCOUNT_TYPE_COLORS[account.type],
                        }}
                      />
                      {account.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("form.paymentMethod")} htmlFor='paymentMethod'>
            <Select
              onValueChange={value =>
                form.setValue(
                  "paymentMethod",
                  value === "__none__" ? "" : value,
                )
              }
              value={selectedPaymentMethod || "__none__"}
            >
              <SelectTrigger id='paymentMethod'>
                <SelectValue placeholder={t("form.paymentMethodPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='__none__'>
                  <span className='text-muted'>
                    {t("form.paymentMethodPlaceholder")}
                  </span>
                </SelectItem>
                {PAYMENT_METHODS.map(pm => (
                  <SelectItem key={pm} value={pm}>
                    {t(`form.pm_${pm}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      )}

      <div className='grid gap-4 sm:grid-cols-2'>
        <Field
          label={t("form.category")}
          htmlFor='categoryId'
          error={form.formState.errors.categoryId?.message}
        >
          <Select
            onValueChange={value =>
              form.setValue("categoryId", value, { shouldValidate: true })
            }
            value={selectedCategoryId}
          >
            <SelectTrigger id='categoryId'>
              <SelectValue placeholder={t("form.category")} />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map(category => (
                <SelectItem
                  key={category.id}
                  value={category.id}
                  textValue={category.name}
                >
                  <span className='flex items-center gap-2'>
                    <span
                      className='h-2 w-2 shrink-0 rounded-full'
                      style={{
                        background: category.color ?? "oklch(var(--muted))",
                      }}
                    />
                    {category.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field
          label={t("form.tags")}
          htmlFor='tagsText'
          hint={t("form.tagsHint")}
        >
          <TagInput
            id='tagsText'
            onChange={v => form.setValue("tagsText", v)}
            placeholder={t("form.tagsPlaceholder")}
            suggestions={allTags}
            value={selectedTagsText}
          />
        </Field>
      </div>

      <Field label={t("form.note")} htmlFor='note'>
        <NoteInput
          id='note'
          onChange={v => form.setValue("note", v)}
          placeholder={t("form.notePlaceholder")}
          suggestions={noteSuggestions}
          value={form.watch("note") ?? ""}
        />
      </Field>

      <Field
        label={t("form.receiptRef")}
        htmlFor='attachmentNote'
        hint={t("form.receiptRefHint")}
      >
        <Input
          id='attachmentNote'
          placeholder={t("form.receiptRefPlaceholder")}
          {...form.register("attachmentNote")}
        />
      </Field>

      {pendingDuplicate && (
        <div
          role='alert'
          className='rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200'
        >
          {t("form.duplicateWarning", {
            date: pendingDuplicate.date,
            time: pendingDuplicate.time ?? "",
          })}
        </div>
      )}

      <div className='flex justify-end gap-2'>
        <Button disabled={loading} type='submit' variant='primary'>
          {pendingDuplicate
            ? t("form.saveAnyway")
            : transaction
              ? t("form.saveTx")
              : t("form.addTx")}
        </Button>
      </div>
    </form>
  )
}

function emptyToUndefined(value?: string) {
  return value && value.length > 0 ? value : undefined
}
