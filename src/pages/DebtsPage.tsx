import {
  Archive,
  ArchiveX,
  Pencil,
  Plus,
  Trash2,
  TrendingDown,
} from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { DebtForm } from "../components/DebtForm"
import { HelpButton } from "../components/help/HelpButton"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { ConfirmDialog } from "../components/ui/confirm-dialog"
import { Dialog } from "../components/ui/dialog"
import { EmptyState } from "../components/ui/empty-state"
import { Field, Input } from "../components/ui/field"
import { Tooltip } from "../components/ui/tooltip"
import { calculateAccountBalance } from "../domain/calculations"
import {
  calcPayoffPlan,
  calcWhatIf,
  formatPayoffDate,
} from "../domain/debt-calculations"
import type { Debt } from "../domain/types"
import { formatCurrency } from "../lib/format"
import { cn } from "../lib/utils"
import { useFinanceStore } from "../store/finance-store"

export function DebtsPage() {
  const { t } = useTranslation()
  const debts = useFinanceStore(state => state.debts)
  const accounts = useFinanceStore(state => state.accounts)
  const transactions = useFinanceStore(state => state.transactions)
  const settings = useFinanceStore(state => state.settings)
  const updateDebt = useFinanceStore(state => state.updateDebt)
  const deleteDebt = useFinanceStore(state => state.deleteDebt)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Debt | undefined>()
  const [pendingDelete, setPendingDelete] = useState<Debt | undefined>()
  const [detailDebt, setDetailDebt] = useState<Debt | undefined>()
  const [globalExtra, setGlobalExtra] = useState(0)
  const [perDebtExtra, setPerDebtExtra] = useState(0)
  const [showArchived, setShowArchived] = useState(false)

  const active = debts.filter(d => !d.isArchived)
  const archived = debts.filter(d => d.isArchived)

  // Compute live balance for each debt (linked account or principal)
  const balances = useMemo(() => {
    const map: Record<string, number> = {}
    for (const debt of debts) {
      if (debt.linkedAccountId) {
        const acct = accounts.find(a => a.id === debt.linkedAccountId)
        if (acct) {
          // Debt account balance is negative; remaining = absolute value
          const bal = calculateAccountBalance(acct, transactions)
          map[debt.id] = Math.abs(Math.min(0, bal))
          continue
        }
      }
      map[debt.id] = debt.principal
    }
    return map
  }, [debts, accounts, transactions])

  // Summary metrics
  const totalOwed = active.reduce(
    (sum, d) => sum + (balances[d.id] ?? d.principal),
    0,
  )
  const totalMonthly = active.reduce(
    (sum, d) => sum + d.minimumPayment + d.extraPayment,
    0,
  )

  const plan = useMemo(
    () => calcPayoffPlan(active, balances),
    [active, balances],
  )
  const avalanche = plan.avalanche
  const snowball = plan.snowball

  const totalInterest = avalanche.totalInterest
  const debtFreeDate = avalanche.debtFreeDate

  async function toggleArchive(debt: Debt) {
    await updateDebt(debt.id, { ...debt, isArchived: !debt.isArchived })
  }

  async function handleDelete() {
    if (!pendingDelete) return
    await deleteDebt(pendingDelete.id)
    setPendingDelete(undefined)
  }

  function openAdd() {
    setEditing(undefined)
    setDialogOpen(true)
  }

  function openEdit(debt: Debt) {
    setEditing(debt)
    setDialogOpen(true)
  }

  return (
      <div className='section-shell px-4 py-6 lg:px-8 lg:py-8'>
        {/* Header */}
        <div className='flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between'>
          <div>
            <h1 className='page-title'>{t("debts.title")}</h1>
            <p className='mt-2 max-w-2xl text-sm leading-6 text-muted'>
              {t("debts.subtitle")}
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <HelpButton page='debts' />
            <Button onClick={openAdd} variant='primary'>
              <Plus className='mr-1.5 h-4 w-4' aria-hidden />
              {t("debts.addDebt")}
            </Button>
          </div>
        </div>

        <div className='mt-6 space-y-8'>
          {/* Active debts or empty state */}
          {active.length === 0 ? (
            <EmptyState
              action={
                <Button onClick={openAdd} variant='primary'>
                  <Plus className='mr-1.5 h-4 w-4' aria-hidden />
                  {t("debts.addDebt")}
                </Button>
              }
              description={t("debts.emptyDesc")}
              title={t("debts.emptyTitle")}
            />
          ) : (
            <>
              {/* Summary strip */}
              <div className='panel overflow-hidden'>
                <div className='grid grid-cols-2 divide-y divide-line sm:grid-cols-4 sm:divide-x sm:divide-y-0'>
                  <SummaryCard
                    label={t("debts.totalOwed")}
                    value={formatCurrency(totalOwed, settings)}
                    tone='danger'
                  />
                  <SummaryCard
                    label={t("debts.monthlyPayments")}
                    value={formatCurrency(totalMonthly, settings)}
                  />
                  <SummaryCard
                    label={t("debts.debtFreeDate")}
                    value={
                      debtFreeDate
                        ? formatPayoffDate(debtFreeDate, settings.locale)
                        : t("debts.noPayoffDate")
                    }
                  />
                  <SummaryCard
                    label={t("debts.totalInterest")}
                    value={
                      totalInterest > 0
                        ? formatCurrency(totalInterest, settings)
                        : "—"
                    }
                    tone='warning'
                  />
                </div>
              </div>

              {/* Global what-if */}
              <GlobalWhatIf
                active={active}
                balances={balances}
                extra={globalExtra}
                locale={settings.locale}
                onExtraChange={setGlobalExtra}
                settings={settings}
                t={t}
              />

              {/* Strategy comparison */}
              {active.length > 1 && (
                <StrategyComparison
                  avalanche={avalanche}
                  locale={settings.locale}
                  settings={settings}
                  snowball={snowball}
                  t={t}
                />
              )}

              {/* Active debt cards */}
              <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                {active.map(debt => (
                  <DebtCard
                    key={debt.id}
                    balances={balances}
                    debt={debt}
                    locale={settings.locale}
                    settings={settings}
                    t={t}
                    onArchive={() => void toggleArchive(debt)}
                    onDelete={() => setPendingDelete(debt)}
                    onEdit={() => openEdit(debt)}
                    onViewDetail={() => {
                      setDetailDebt(debt)
                      setPerDebtExtra(0)
                    }}
                  />
                ))}
              </div>
            </>
          )}

          {/* Archived — always visible when archived debts exist */}
          {archived.length > 0 && (
            <div>
              <button
                className='mb-3 flex items-center gap-1.5 text-sm text-muted hover:text-ink'
                type='button'
                onClick={() => setShowArchived(!showArchived)}
              >
                {showArchived
                  ? t("debts.hideArchived")
                  : t("debts.showArchived")}
                <span className='text-xs'>({archived.length})</span>
              </button>
              {showArchived && (
                <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3 opacity-70'>
                  {archived.map(debt => (
                    <DebtCard
                      key={debt.id}
                      balances={balances}
                      debt={debt}
                      locale={settings.locale}
                      settings={settings}
                      t={t}
                      onArchive={() => void toggleArchive(debt)}
                      onDelete={() => setPendingDelete(debt)}
                      onEdit={() => openEdit(debt)}
                      onViewDetail={() => {
                        setDetailDebt(debt)
                        setPerDebtExtra(0)
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Add / Edit dialog */}
        <Dialog
          closeOnOutsideClick={false}
          description={t("debts.dialogDesc")}
          onOpenChange={setDialogOpen}
          open={dialogOpen}
          title={editing ? t("debts.editDialog") : t("debts.addDialog")}
        >
          <DebtForm debt={editing} onSaved={() => setDialogOpen(false)} />
        </Dialog>

        {/* Delete confirm */}
        <ConfirmDialog
          confirmLabel={t("debts.deleteLabel")}
          description={
            pendingDelete
              ? t("debts.deleteDesc", { name: pendingDelete.name })
              : ""
          }
          onConfirm={() => void handleDelete()}
          onOpenChange={open => !open && setPendingDelete(undefined)}
          open={!!pendingDelete}
          title={t("debts.deleteTitle")}
        />

        {/* Per-debt what-if dialog */}
        {detailDebt && (
          <Dialog
            description={detailDebt.creditor}
            onOpenChange={open => !open && setDetailDebt(undefined)}
            open={!!detailDebt}
            title={detailDebt.name}
          >
            <PerDebtWhatIf
              balances={balances}
              debt={detailDebt}
              extra={perDebtExtra}
              onExtraChange={setPerDebtExtra}
              settings={settings}
              t={t}
            />
          </Dialog>
        )}
      </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "danger" | "warning"
}) {
  return (
    <div className='px-5 py-5'>
      <p className='text-sm text-muted'>{label}</p>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tabular",
          tone === "danger"
            ? "text-danger"
            : tone === "warning"
              ? "text-warning"
              : "text-ink",
        )}
      >
        {value}
      </p>
    </div>
  )
}

function DebtCard({
  debt,
  balances,
  settings,
  locale,
  t,
  onEdit,
  onArchive,
  onDelete,
  onViewDetail,
}: {
  debt: Debt
  balances: Record<string, number>
  settings: { currency: string; locale: string }
  locale: string
  t: (key: string, opts?: Record<string, unknown>) => string
  onEdit: () => void
  onArchive: () => void
  onDelete: () => void
  onViewDetail: () => void
}) {
  const balance = balances[debt.id] ?? debt.principal
  const paid = Math.max(0, debt.principal - balance)
  const pct =
    debt.principal > 0 ? Math.min(100, (paid / debt.principal) * 100) : 0

  const monthsToPayoff =
    debt.minimumPayment > 0
      ? (() => {
          const r = debt.interestRate / 100 / 12
          if (r === 0) return Math.ceil(balance / debt.minimumPayment)
          const interest = balance * r
          if (debt.minimumPayment <= interest) return Infinity
          return Math.ceil(
            -Math.log(1 - (balance * r) / debt.minimumPayment) /
              Math.log(1 + r),
          )
        })()
      : Infinity

  const payoffDate =
    monthsToPayoff === Infinity
      ? null
      : (() => {
          const d = new Date()
          d.setMonth(d.getMonth() + monthsToPayoff)
          return d
        })()

  const typeLabel: Record<string, string> = {
    credit_card: "💳",
    personal_loan: "💸",
    cash_advance: "💰",
    bnpl: "🛍️",
    car_loan: "🚗",
    mortgage: "🏠",
    student_loan: "🎓",
    informal: "🤝",
    other: "⚙️",
  }

  return (
    <div className='panel flex flex-col gap-4 p-5'>
      {/* Header */}
      <div className='flex items-start justify-between gap-2'>
        <div className='flex items-center gap-2 min-w-0'>
          <span className='text-xl shrink-0'>
            {typeLabel[debt.type] ?? "💳"}
          </span>
          <div className='min-w-0'>
            <p className='truncate font-semibold text-ink'>{debt.name}</p>
            <p className='truncate text-xs text-muted'>{debt.creditor}</p>
          </div>
        </div>
        {debt.interestRate > 0 && (
          <Badge tone='neutral'>{debt.interestRate}%</Badge>
        )}
      </div>

      {/* Progress */}
      <div>
        <div className='mb-1 flex justify-between text-xs text-muted'>
          <span>
            {t("debts.remaining")}: {formatCurrency(balance, settings)}
          </span>
          <span>{Math.round(pct)}%</span>
        </div>
        <div className='h-2 w-full overflow-hidden rounded-full bg-bg border border-line/30'>
          <div
            className='h-full rounded-full transition-all'
            style={{
              width: `${pct}%`,
              background: debt.color ?? "oklch(0.56 0.16 330)",
            }}
          />
        </div>
        <p className='mt-1 text-xs text-muted'>
          {t("debts.payoffDate")}:{" "}
          {payoffDate
            ? formatPayoffDate(payoffDate, locale)
            : t("debts.noPayoffDate")}
        </p>
      </div>

      {/* Actions */}
      <div className='flex items-center gap-1'>
        <Button size='sm' variant='secondary' onClick={onViewDetail}>
          <TrendingDown className='mr-1 h-3.5 w-3.5' aria-hidden />
          {t("debts.whatIfTitle")}
        </Button>
        <div className='ml-auto flex gap-1'>
          <Tooltip label={t("debts.editDialog")}>
            <Button
              aria-label={t("debts.editDialog")}
              size='icon'
              variant='ghost'
              onClick={onEdit}
            >
              <Pencil className='h-4 w-4' aria-hidden />
            </Button>
          </Tooltip>
          <Tooltip
            label={
              debt.isArchived
                ? t("debts.unarchiveDebt")
                : t("debts.archiveDebt")
            }
          >
            <Button
              aria-label={
                debt.isArchived
                  ? t("debts.unarchiveDebt")
                  : t("debts.archiveDebt")
              }
              size='icon'
              variant='ghost'
              onClick={onArchive}
            >
              {debt.isArchived ? (
                <ArchiveX className='h-4 w-4' aria-hidden />
              ) : (
                <Archive className='h-4 w-4' aria-hidden />
              )}
            </Button>
          </Tooltip>
          <Tooltip label={t("debts.deleteLabel")}>
            <Button
              aria-label={t("debts.deleteLabel")}
              size='icon'
              variant='ghost'
              onClick={onDelete}
            >
              <Trash2 className='h-4 w-4' aria-hidden />
            </Button>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}

function GlobalWhatIf({
  active,
  balances,
  extra,
  locale,
  settings,
  t,
  onExtraChange,
}: {
  active: Debt[]
  balances: Record<string, number>
  extra: number
  locale: string
  settings: { currency: string; locale: string }
  t: (key: string, opts?: Record<string, unknown>) => string
  onExtraChange: (v: number) => void
}) {
  const baseline = useMemo(
    () => calcPayoffPlan(active, balances),
    [active, balances],
  )
  const withExtra = useMemo(() => {
    if (extra <= 0) return null
    const boosted = active.map(d => ({
      ...d,
      minimumPayment: d.minimumPayment + extra,
    }))
    return calcPayoffPlan(boosted, balances)
  }, [active, balances, extra])

  const baseDate = baseline.avalanche.debtFreeDate
  const newDate = withExtra?.avalanche.debtFreeDate ?? null
  const interestSaved = withExtra
    ? Math.max(
        0,
        baseline.avalanche.totalInterest - withExtra.avalanche.totalInterest,
      )
    : 0

  const baseMonths = baseDate
    ? Math.round((baseDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))
    : null
  const newMonths = newDate
    ? Math.round((newDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))
    : null
  const monthsSaved =
    baseMonths !== null && newMonths !== null
      ? Math.max(0, baseMonths - newMonths)
      : 0

  return (
    <div className='panel p-5 space-y-4'>
      <h2 className='font-semibold text-ink'>{t("debts.whatIfTitle")}</h2>
      <div className='flex items-end gap-3'>
        <div className='w-48'>
          <Field htmlFor='g-extra' label={t("debts.extraPerMonth")}>
            <Input
              id='g-extra'
              min='0'
              step='100'
              type='number'
              value={extra || ""}
              placeholder={t("debts.whatIfPlaceholder")}
              onChange={e => onExtraChange(Number(e.target.value))}
            />
          </Field>
        </div>
        {extra > 0 && newDate && (
          <div className='flex flex-wrap gap-4 pb-1 text-sm'>
            <span>
              <span className='text-muted'>{t("debts.debtFreeDate")}: </span>
              <span className='line-through text-muted'>
                {baseDate ? formatPayoffDate(baseDate, locale) : "—"}
              </span>
              <span className='ml-1 font-semibold text-green-600 dark:text-green-400'>
                {" "}
                → {formatPayoffDate(newDate, locale)}
              </span>
            </span>
            {monthsSaved > 0 && (
              <Badge tone='success'>
                {t("debts.monthsSaved_other", { count: monthsSaved })}
              </Badge>
            )}
            {interestSaved > 0 && (
              <span className='text-green-600 dark:text-green-400 text-xs'>
                {formatCurrency(interestSaved, settings)}{" "}
                {t("debts.interestSaved")}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function StrategyComparison({
  avalanche,
  snowball,
  locale,
  settings,
  t,
}: {
  avalanche: ReturnType<typeof calcPayoffPlan>["avalanche"]
  snowball: ReturnType<typeof calcPayoffPlan>["snowball"]
  locale: string
  settings: { currency: string; locale: string }
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  const interestDiff = snowball.totalInterest - avalanche.totalInterest

  return (
    <div className='panel p-5 space-y-3'>
      <h2 className='font-semibold text-ink'>{t("debts.strategyTitle")}</h2>
      <div className='grid gap-3 sm:grid-cols-2'>
        <div className='rounded-lg border border-line p-4 space-y-1'>
          <p className='text-sm font-medium'>{t("debts.avalanche")}</p>
          <p className='text-xs text-muted'>{t("debts.avalancheDesc")}</p>
          <p className='text-sm'>
            <span className='text-muted'>{t("debts.debtFree")}: </span>
            <span className='font-semibold'>
              {formatPayoffDate(avalanche.debtFreeDate, locale)}
            </span>
          </p>
          <p className='text-sm'>
            <span className='text-muted'>
              {t("debts.totalInterestLabel")}:{" "}
            </span>
            <span>{formatCurrency(avalanche.totalInterest, settings)}</span>
          </p>
        </div>
        <div className='rounded-lg border border-line p-4 space-y-1'>
          <p className='text-sm font-medium'>{t("debts.snowball")}</p>
          <p className='text-xs text-muted'>{t("debts.snowballDesc")}</p>
          <p className='text-sm'>
            <span className='text-muted'>{t("debts.debtFree")}: </span>
            <span className='font-semibold'>
              {formatPayoffDate(snowball.debtFreeDate, locale)}
            </span>
          </p>
          <p className='text-sm'>
            <span className='text-muted'>
              {t("debts.totalInterestLabel")}:{" "}
            </span>
            <span>
              {formatCurrency(snowball.totalInterest, settings)}
              {interestDiff > 0 && (
                <span className='ml-1 text-xs text-amber-600 dark:text-amber-400'>
                  (+{formatCurrency(interestDiff, settings)})
                </span>
              )}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

function PerDebtWhatIf({
  debt,
  balances,
  extra,
  settings,
  t,
  onExtraChange,
}: {
  debt: Debt
  balances: Record<string, number>
  extra: number
  settings: { currency: string; locale: string }
  t: (key: string, opts?: Record<string, unknown>) => string
  onExtraChange: (v: number) => void
}) {
  const balance = balances[debt.id] ?? debt.principal
  const result = useMemo(
    () => calcWhatIf(debt, balance, extra),
    [debt, balance, extra],
  )
  const { baseline, withExtra, monthsSaved, interestSaved } = result

  return (
    <div className='space-y-4'>
      <div className='grid grid-cols-2 gap-3'>
        <div className='rounded-lg bg-surface-alt p-3'>
          <p className='text-xs text-muted'>{t("debts.remaining")}</p>
          <p className='font-semibold'>{formatCurrency(balance, settings)}</p>
        </div>
        <div className='rounded-lg bg-surface-alt p-3'>
          <p className='text-xs text-muted'>{t("debts.monthlyPayments")}</p>
          <p className='font-semibold'>
            {formatCurrency(baseline.monthlyPayment, settings)}
          </p>
        </div>
      </div>

      <div className='grid grid-cols-2 gap-3'>
        <div className='rounded-lg bg-surface-alt p-3'>
          <p className='text-xs text-muted'>{t("debts.payoffDate")} (now)</p>
          <p className='font-semibold'>
            {baseline.monthsToPayoff === Infinity
              ? t("debts.paymentTooLow")
              : formatPayoffDate(baseline.payoffDate, settings.locale)}
          </p>
        </div>
        <div className='rounded-lg bg-surface-alt p-3'>
          <p className='text-xs text-muted'>{t("debts.totalInterest")}</p>
          <p className='font-semibold'>
            {formatCurrency(baseline.totalInterestRemaining, settings)}
          </p>
        </div>
      </div>

      <Field htmlFor='pd-extra' label={t("debts.extraPerMonth")}>
        <Input
          id='pd-extra'
          min='0'
          step='100'
          type='number'
          value={extra || ""}
          onChange={e => onExtraChange(Number(e.target.value))}
        />
      </Field>

      {extra > 0 && (
        <div className='rounded-lg border border-green-200 bg-green-50 p-4 space-y-2 dark:border-green-900 dark:bg-green-950/40'>
          <div className='flex items-center justify-between'>
            <span className='text-sm text-muted'>{t("debts.payoffDate")}</span>
            <span className='font-semibold'>
              <span className='line-through text-muted mr-2'>
                {formatPayoffDate(baseline.payoffDate, settings.locale)}
              </span>
              {formatPayoffDate(withExtra.payoffDate, settings.locale)}
            </span>
          </div>
          {monthsSaved > 0 && (
            <div className='flex items-center justify-between'>
              <span className='text-sm text-muted'>
                {t("debts.monthsSaved_other", { count: monthsSaved })}
              </span>
              <Badge tone='success'>{monthsSaved}mo</Badge>
            </div>
          )}
          {interestSaved > 0 && (
            <div className='flex items-center justify-between'>
              <span className='text-sm text-muted'>
                {t("debts.interestSaved")}
              </span>
              <span className='font-semibold text-green-600 dark:text-green-400'>
                {formatCurrency(interestSaved, settings)}
              </span>
            </div>
          )}
        </div>
      )}

      {debt.paymentStructure === "revolving" && (
        <p className='text-xs text-muted'>{t("debts.revolvingNote")}</p>
      )}
      {debt.interestRateType === "floating" && (
        <p className='text-xs text-muted'>{t("debts.floatingNote")}</p>
      )}
    </div>
  )
}
