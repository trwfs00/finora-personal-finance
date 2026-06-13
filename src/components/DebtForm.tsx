import { zodResolver } from "@hookform/resolvers/zod"
import { Check, ChevronLeft } from "lucide-react"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod"

import type {
  Account,
  Debt,
  DebtType,
  InterestRateType,
  PaymentStructure,
} from "../domain/types"
import { DEBT_PRESETS, MRR_RATES } from "../lib/debt-presets"
import { cn } from "../lib/utils"
import { useFinanceStore } from "../store/finance-store"
import { CATEGORY_SWATCHES } from "./CategoryManager"
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

type FormValues = {
  name: string
  creditor: string
  type: DebtType
  principal: number
  interestRate: number
  interestRateType: InterestRateType
  paymentStructure: PaymentStructure
  minimumPayment: number
  extraPayment: number
  paymentDueDay?: number
  startDate: string
  linkedAccountId?: string
  rateBenchmark?: string
  rateSpread?: number
  color?: string
  note?: string
}

interface DebtFormProps {
  debt?: Debt
  onSaved: () => void
}

const PRESET_ITEMS: { type: DebtType; icon: string; labelKey: string }[] = [
  { type: "credit_card", icon: "💳", labelKey: "debts.typeCredit" },
  { type: "personal_loan", icon: "💸", labelKey: "debts.typePersonal" },
  { type: "cash_advance", icon: "💰", labelKey: "debts.typeCash" },
  { type: "bnpl", icon: "🛍️", labelKey: "debts.typeBnpl" },
  { type: "car_loan", icon: "🚗", labelKey: "debts.typeCar" },
  { type: "mortgage", icon: "🏠", labelKey: "debts.typeMortgage" },
  { type: "student_loan", icon: "🎓", labelKey: "debts.typeStudent" },
  { type: "informal", icon: "🤝", labelKey: "debts.typeInformal" },
  { type: "other", icon: "⚙️", labelKey: "debts.typeOther" },
]

export function DebtForm({ debt, onSaved }: DebtFormProps) {
  const { t, i18n } = useTranslation()
  const hint = (p: { hintEn: string; hintTh: string }) =>
    i18n.language === "th" ? p.hintTh : p.hintEn
  const accounts = useFinanceStore(state => state.accounts)
  const addDebt = useFinanceStore(state => state.addDebt)
  const updateDebt = useFinanceStore(state => state.updateDebt)
  const loading = useFinanceStore(state => state.loading)
  const mrrOverrides = useFinanceStore(state => state.settings.mrrRates) ?? {}

  const [pickerVisible, setPickerVisible] = useState(!debt)
  const [selectedType, setSelectedType] = useState<DebtType>(
    debt?.type ?? "credit_card",
  )

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().trim().min(1, t("debts.addDebt")),
        creditor: z.string().trim().min(1, t("debts.creditor")),
        type: z.enum([
          "credit_card",
          "personal_loan",
          "cash_advance",
          "bnpl",
          "car_loan",
          "mortgage",
          "student_loan",
          "informal",
          "other",
        ]),
        principal: z.coerce.number().positive(t("form.amountError")),
        interestRate: z.coerce.number().min(0),
        interestRateType: z.enum(["fixed", "floating", "none"]),
        paymentStructure: z.enum(["fixed_installment", "revolving", "manual"]),
        minimumPayment: z.coerce.number().nonnegative(),
        extraPayment: z.coerce.number().min(0),
        paymentDueDay: z.coerce.number().int().min(1).max(31).optional(),
        startDate: z.string().min(1, t("debts.startDate")),
        linkedAccountId: z.string().optional(),
        rateBenchmark: z.string().optional(),
        rateSpread: z.coerce.number().optional(),
        color: z.string().optional(),
        note: z.string().optional(),
      }),
    [t],
  )

  const preset = DEBT_PRESETS[selectedType]

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: debt?.name ?? "",
      creditor: debt?.creditor ?? "",
      type: debt?.type ?? selectedType,
      principal: debt?.principal ?? 0,
      interestRate: debt?.interestRate ?? preset.defaultRate,
      interestRateType: debt?.interestRateType ?? preset.interestRateType,
      paymentStructure: debt?.paymentStructure ?? preset.paymentStructure,
      minimumPayment: debt?.minimumPayment ?? 0,
      extraPayment: debt?.extraPayment ?? 0,
      paymentDueDay: debt?.paymentDueDay,
      startDate: debt?.startDate ?? "",
      linkedAccountId: debt?.linkedAccountId ?? "",
      rateBenchmark: debt?.rateBenchmark ?? "",
      rateSpread: debt?.rateSpread ?? 0,
      color: debt?.color ?? CATEGORY_SWATCHES[5],
      note: debt?.note ?? "",
    },
  })

  const interestRateType = form.watch("interestRateType")
  const rateBenchmark = form.watch("rateBenchmark")
  const rateSpread = Number(form.watch("rateSpread") ?? 0)
  const selectedColor = form.watch("color") ?? CATEGORY_SWATCHES[5]
  const selectedLinkedAccount = form.watch("linkedAccountId")
  const selectedStartDate = form.watch("startDate")

  const mrrEntry = rateBenchmark ? MRR_RATES[rateBenchmark] : undefined
  const effectiveMrr = mrrEntry
    ? (mrrOverrides[rateBenchmark!] ?? mrrEntry.mrr)
    : null
  const computedFloatingRate = effectiveMrr !== null
    ? +(effectiveMrr + rateSpread).toFixed(3)
    : null

  function applyPreset(type: DebtType) {
    const p = DEBT_PRESETS[type]
    setSelectedType(type)
    form.setValue("type", type)
    form.setValue("interestRateType", p.interestRateType)
    form.setValue("interestRate", p.defaultRate)
    form.setValue("paymentStructure", p.paymentStructure)
    setPickerVisible(false)
  }

  const debtAccounts = accounts.filter(
    a => a.type === "debt" || a.type === "credit_card",
  )

  async function onSubmit(values: FormValues) {
    const effectiveRate =
      values.interestRateType === "floating" && computedFloatingRate !== null
        ? computedFloatingRate
        : values.interestRate

    const draft = {
      name: values.name,
      type: values.type,
      creditor: values.creditor,
      principal: values.principal,
      interestRate: effectiveRate,
      interestRateType: values.interestRateType,
      paymentStructure: values.paymentStructure,
      minimumPayment: values.minimumPayment,
      extraPayment: values.extraPayment,
      paymentDueDay: values.paymentDueDay || undefined,
      startDate: values.startDate,
      linkedAccountId: values.linkedAccountId || undefined,
      rateBenchmark:
        values.interestRateType === "floating"
          ? values.rateBenchmark || undefined
          : undefined,
      rateSpread:
        values.interestRateType === "floating"
          ? (values.rateSpread ?? 0)
          : undefined,
      color: values.color,
      note: values.note || undefined,
      isArchived: debt?.isArchived ?? false,
    }

    if (debt) {
      await updateDebt(debt.id, draft)
    } else {
      await addDebt(draft)
    }
    onSaved()
  }

  if (pickerVisible) {
    return (
      <div className='space-y-4'>
        <p className='text-sm text-muted'>{t("debts.presetPickerSub")}</p>
        <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
          {PRESET_ITEMS.map(({ type, icon, labelKey }) => (
            <button
              key={type}
              className='flex flex-col items-center gap-2 rounded-lg border border-line bg-surface p-4 text-center transition-colors hover:border-ink/30 hover:bg-surface-alt'
              type='button'
              onClick={() => applyPreset(type)}
            >
              <span className='text-3xl'>{icon}</span>
              <span className='text-sm font-medium leading-tight'>
                {t(labelKey)}
              </span>
              <span className='text-xs text-muted'>
                {DEBT_PRESETS[type].defaultRate > 0
                  ? `${DEBT_PRESETS[type].defaultRate}% APR`
                  : t("debts.rateNone")}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <form className='space-y-5' onSubmit={form.handleSubmit(onSubmit)}>
      {!debt && (
        <button
          className='flex items-center gap-1 text-xs text-primary hover:text-ink'
          type='button'
          onClick={() => setPickerVisible(true)}
        >
          <ChevronLeft className='h-3 w-3' />
          {t("debts.backToPresets")}
        </button>
      )}

      <div className='grid gap-4 sm:grid-cols-2'>
        <Field
          error={form.formState.errors.name?.message}
          htmlFor='d-name'
          label={t("form.note")}
        >
          <Input
            id='d-name'
            placeholder={t("debts.typeCredit")}
            {...form.register("name")}
          />
        </Field>
        <Field
          error={form.formState.errors.creditor?.message}
          htmlFor='d-creditor'
          label={t("debts.creditor")}
        >
          <Input
            id='d-creditor'
            placeholder='KBank, SCB, ...'
            {...form.register("creditor")}
          />
        </Field>
      </div>

      <div className='grid gap-4 sm:grid-cols-2'>
        <Field
          error={form.formState.errors.principal?.message}
          htmlFor='d-principal'
          label={t("debts.principal")}
        >
          <Input
            id='d-principal'
            min='0'
            step='0.01'
            type='number'
            {...form.register("principal")}
          />
        </Field>
        <Field htmlFor='d-start' label={t("debts.startDate")}>
          <DatePicker
            ariaLabel={t("debts.startDate")}
            id='d-start'
            onChange={v => form.setValue("startDate", v)}
            value={selectedStartDate}
          />
        </Field>
      </div>

      {/* Interest rate */}
      <div className='grid gap-4 sm:grid-cols-2'>
        <Field htmlFor='d-rate-type' label={t("debts.interestRateType")}>
          <Select
            onValueChange={v =>
              form.setValue("interestRateType", v as InterestRateType)
            }
            value={interestRateType}
          >
            <SelectTrigger id='d-rate-type'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='fixed'>{t("debts.rateFixed")}</SelectItem>
              <SelectItem value='floating'>
                {t("debts.rateFloating")}
              </SelectItem>
              <SelectItem value='none'>{t("debts.rateNone")}</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        {interestRateType === "fixed" && (
          <Field
            error={form.formState.errors.interestRate?.message}
            hint={hint(DEBT_PRESETS[selectedType])}
            htmlFor='d-rate'
            label={t("debts.interestRate")}
          >
            <Input
              id='d-rate'
              min='0'
              step='0.01'
              type='number'
              {...form.register("interestRate")}
            />
          </Field>
        )}

        {interestRateType === "none" && (
          <div className='flex items-end pb-1'>
            <p className='text-sm text-muted'>
              {hint(DEBT_PRESETS["informal"])}
            </p>
          </div>
        )}
      </div>

      {/* Floating rate inputs */}
      {interestRateType === "floating" && (
        <div className='rounded-lg border border-line bg-surface-alt p-4 space-y-3'>
          <div className='grid gap-4 sm:grid-cols-2'>
            <Field htmlFor='d-benchmark' label={t("debts.rateBenchmark")}>
              <Select
                onValueChange={v => form.setValue("rateBenchmark", v)}
                value={rateBenchmark || "__none__"}
              >
                <SelectTrigger id='d-benchmark'>
                  <SelectValue placeholder={t("debts.selectBank")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='__none__'>
                    <span className='text-muted'>{t("debts.selectBank")}</span>
                  </SelectItem>
                  {Object.entries(MRR_RATES).map(([key, entry]) => (
                    <SelectItem key={key} value={key}>
                      {entry.name} — {entry.mrr}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              hint={`MRR + (−) spread`}
              htmlFor='d-spread'
              label={t("debts.rateSpread")}
            >
              <Input
                id='d-spread'
                step='0.01'
                type='number'
                {...form.register("rateSpread")}
              />
            </Field>
          </div>
          {computedFloatingRate !== null && (
            <p className='text-sm'>
              <span className='text-muted'>{t("debts.currentRate")}: </span>
              <span className='font-semibold'>{computedFloatingRate}% APR</span>
              {mrrEntry && (
                <span className='ml-2 text-xs text-muted'>
                  ({t("debts.mrrUpdated", { date: mrrEntry.updatedAt })})
                </span>
              )}
            </p>
          )}
          <p className='text-xs text-muted'>{t("debts.floatingNote")}</p>
        </div>
      )}

      {/* Payment */}
      <div className='grid gap-4 sm:grid-cols-2'>
        <Field htmlFor='d-pay-structure' label={t("debts.paymentStructure")}>
          <Select
            onValueChange={v =>
              form.setValue("paymentStructure", v as PaymentStructure)
            }
            value={form.watch("paymentStructure")}
          >
            <SelectTrigger id='d-pay-structure'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='fixed_installment'>
                {t("debts.paymentFixed")}
              </SelectItem>
              <SelectItem value='revolving'>
                {t("debts.paymentRevolving")}
              </SelectItem>
              <SelectItem value='manual'>{t("debts.paymentManual")}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field
          error={form.formState.errors.minimumPayment?.message}
          htmlFor='d-payment'
          label={t("debts.minimumPayment")}
        >
          <Input
            id='d-payment'
            min='0'
            step='0.01'
            type='number'
            {...form.register("minimumPayment")}
          />
        </Field>
      </div>

      <div className='grid gap-4 sm:grid-cols-2'>
        <Field htmlFor='d-due-day' label={t("debts.paymentDueDay")}>
          <Input
            id='d-due-day'
            max='31'
            min='1'
            placeholder='25'
            step='1'
            type='number'
            {...form.register("paymentDueDay")}
          />
        </Field>
        <Field
          hint={t("debts.linkedAccountHint")}
          htmlFor='d-account'
          label={t("debts.linkedAccount")}
        >
          <Select
            onValueChange={v =>
              form.setValue("linkedAccountId", v === "__none__" ? "" : v)
            }
            value={selectedLinkedAccount || "__none__"}
          >
            <SelectTrigger id='d-account'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='__none__'>
                <span className='text-muted'>—</span>
              </SelectItem>
              {debtAccounts.map(a => (
                <SelectItem key={a.id} value={a.id}>
                  <AccountOption account={a} />
                </SelectItem>
              ))}
              {accounts
                .filter(a => a.type !== "debt" && a.type !== "credit_card")
                .map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    <AccountOption account={a} />
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field htmlFor='d-note' label={t("debts.note")}>
        <Input id='d-note' placeholder='Optional' {...form.register("note")} />
      </Field>

      <div>
        <p className='mb-2 text-xs font-medium text-muted'>
          {t("debts.color")}
        </p>
        <div className='flex flex-wrap gap-2'>
          {CATEGORY_SWATCHES.map(swatch => {
            const isSelected = selectedColor === swatch
            return (
              <button
                key={swatch}
                aria-label={swatch}
                aria-pressed={isSelected}
                className={cn(
                  "relative flex h-6 w-6 items-center justify-center rounded-full transition-transform",
                  isSelected
                    ? "scale-110 ring-2 ring-offset-1 ring-ink/40"
                    : "hover:scale-110",
                )}
                onClick={() => form.setValue("color", swatch)}
                style={{ background: swatch }}
                type='button'
              >
                {isSelected && (
                  <Check
                    aria-hidden
                    className='h-3 w-3 text-white drop-shadow-sm'
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className='flex justify-end'>
        <Button disabled={loading} type='submit' variant='primary'>
          {debt ? t("debts.formSave") : t("debts.formAdd")}
        </Button>
      </div>
    </form>
  )
}

function AccountOption({ account }: { account: Account }) {
  return (
    <span className='flex items-center gap-2'>
      <span
        className='inline-block h-2 w-2 shrink-0 rounded-full'
        style={{ background: account.color ?? "oklch(0.6 0.1 250)" }}
      />
      {account.name}
    </span>
  )
}
