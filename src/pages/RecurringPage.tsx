import { format } from "date-fns";
import { Pause, Pencil, Play, Plus, Repeat, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { HelpButton } from "../components/help/HelpButton";
import { Tooltip } from "../components/ui/tooltip";
import { RecurringForm } from "../components/RecurringForm";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { Dialog } from "../components/ui/dialog";
import { EmptyState } from "../components/ui/empty-state";
import { isOverdue } from "../domain/recurring";
import type { RecurringTransaction } from "../domain/types";
import { formatCurrency } from "../lib/format";
import { useFinanceStore } from "../store/finance-store";

const FREQ_BADGE: Record<RecurringTransaction["frequency"], "neutral" | "primary" | "success" | "warning" | "danger"> = {
  daily:   "danger",
  weekly:  "warning",
  monthly: "success",
  yearly:  "primary",
  custom:  "neutral",
};

export function RecurringPage() {
  const { t } = useTranslation();
  const recurringTransactions = useFinanceStore((state) => state.recurringTransactions);
  const categories = useFinanceStore((state) => state.categories);
  const accounts = useFinanceStore((state) => state.accounts);
  const settings = useFinanceStore((state) => state.settings);
  const updateRecurring = useFinanceStore((state) => state.updateRecurring);
  const deleteRecurring = useFinanceStore((state) => state.deleteRecurring);
  const confirmRecurringOccurrence = useFinanceStore((state) => state.confirmRecurringOccurrence);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringTransaction | undefined>();
  const [pendingDelete, setPendingDelete] = useState<RecurringTransaction | undefined>();

  const today = format(new Date(), "yyyy-MM-dd");

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );
  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );

  const pending = useMemo(
    () => recurringTransactions.filter((r) => isOverdue(r, today)),
    [recurringTransactions, today],
  );

  const all = useMemo(
    () => [...recurringTransactions].sort((a, b) => a.nextRunDate.localeCompare(b.nextRunDate)),
    [recurringTransactions],
  );

  function openNew() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(r: RecurringTransaction) {
    setEditing(r);
    setDialogOpen(true);
  }

  async function togglePause(r: RecurringTransaction) {
    await updateRecurring(r.id, { ...r, isActive: !r.isActive });
  }

  async function handleDelete() {
    if (pendingDelete) {
      await deleteRecurring(pendingDelete.id);
      setPendingDelete(undefined);
    }
  }

  function freqLabel(r: RecurringTransaction) {
    switch (r.frequency) {
      case "daily":   return t("recurring.freq_daily");
      case "weekly":  return t("recurring.freq_weekly");
      case "monthly": return t("recurring.freq_monthly");
      case "yearly":  return t("recurring.freq_yearly");
      case "custom":  return t("recurring.freq_custom_days_other", { count: r.interval ?? 1 });
    }
  }

  function accountLabel(r: RecurringTransaction) {
    const tmpl = r.transactionTemplate;
    if (tmpl.accountId) return accountMap.get(tmpl.accountId)?.name ?? "";
    if (tmpl.fromAccountId && tmpl.toAccountId) {
      return `${accountMap.get(tmpl.fromAccountId)?.name ?? ""} → ${accountMap.get(tmpl.toAccountId)?.name ?? ""}`;
    }
    return "";
  }

  return (
    <div className="section-shell px-4 py-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">{t("recurring.title")}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{t("recurring.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <HelpButton page="recurring" />
          <Button onClick={openNew} variant="primary">
            <Plus aria-hidden className="h-4 w-4" />
            {t("recurring.addRecurring")}
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-8">
        {/* Pending section */}
        {pending.length > 0 && (
          <section>
            <h2 className="mb-1 text-sm font-semibold text-ink">{t("recurring.pending")}</h2>
            <p className="mb-3 text-xs text-muted">{t("recurring.pendingDesc")}</p>
            <div className="panel divide-y divide-line overflow-hidden">
              {pending.map((r) => (
                <PendingCard
                  key={r.id}
                  recurring={r}
                  freqLabel={freqLabel(r)}
                  accountLabel={accountLabel(r)}
                  categoryMap={categoryMap}
                  settings={settings}
                  onConfirm={() => void confirmRecurringOccurrence(r.id)}
                  onEdit={() => openEdit(r)}
                />
              ))}
            </div>
          </section>
        )}

        {/* All recurring */}
        <section>
          {pending.length > 0 && (
            <h2 className="mb-3 text-sm font-semibold text-ink">{t("recurring.all")}</h2>
          )}
          {all.length === 0 ? (
            <EmptyState
              action={<Button onClick={openNew} variant="primary">{t("recurring.addRecurring")}</Button>}
              description={t("recurring.emptyDesc")}
              title={t("recurring.emptyTitle")}
            />
          ) : (
            <div className="panel divide-y divide-line overflow-hidden">
              {all.map((r) => (
                <RecurringCard
                  key={r.id}
                  recurring={r}
                  freqLabel={freqLabel(r)}
                  accountLabel={accountLabel(r)}
                  categoryMap={categoryMap}
                  settings={settings}
                  today={today}
                  onEdit={() => openEdit(r)}
                  onTogglePause={() => void togglePause(r)}
                  onDelete={() => setPendingDelete(r)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <Dialog
        description={t("recurring.dialogDesc")}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? t("recurring.editDialog") : t("recurring.addDialog")}
      >
        <RecurringForm recurring={editing} onSaved={() => setDialogOpen(false)} />
      </Dialog>

      <ConfirmDialog
        confirmLabel={t("recurring.deleteLabel")}
        description={
          pendingDelete
            ? t("recurring.deleteDesc", { note: pendingDelete.transactionTemplate.note || freqLabel(pendingDelete) })
            : ""
        }
        onConfirm={() => void handleDelete()}
        onOpenChange={(open) => !open && setPendingDelete(undefined)}
        open={!!pendingDelete}
        title={t("recurring.deleteTitle")}
      />
    </div>
  );
}

function PendingCard({
  recurring,
  freqLabel,
  accountLabel,
  categoryMap,
  settings,
  onConfirm,
  onEdit,
}: {
  recurring: RecurringTransaction;
  freqLabel: string;
  accountLabel: string;
  categoryMap: Map<string, { name: string; color?: string }>;
  settings: { currency: string; locale: string };
  onConfirm: () => void;
  onEdit: () => void;
}) {
  const { t } = useTranslation();
  const tmpl = recurring.transactionTemplate;
  const category = tmpl.categoryId ? categoryMap.get(tmpl.categoryId) : undefined;

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
        <Repeat aria-hidden className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">
          {tmpl.note || freqLabel}
        </p>
        <p className="mt-0.5 text-xs text-muted">
          {category?.name ?? accountLabel} · {recurring.nextRunDate}
        </p>
      </div>
      <div className="shrink-0 text-sm font-semibold tabular-nums text-ink">
        {formatCurrency(tmpl.amount, settings)}
      </div>
      <div className="flex shrink-0 gap-1">
        <Button size="sm" variant="secondary" onClick={onEdit}>
          <Pencil aria-hidden className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="primary" onClick={onConfirm}>
          {t("recurring.confirmNow")}
        </Button>
      </div>
    </div>
  );
}

function RecurringCard({
  recurring,
  freqLabel,
  accountLabel,
  categoryMap,
  settings,
  today,
  onEdit,
  onTogglePause,
  onDelete,
}: {
  recurring: RecurringTransaction;
  freqLabel: string;
  accountLabel: string;
  categoryMap: Map<string, { name: string; color?: string }>;
  settings: { currency: string; locale: string };
  today: string;
  onEdit: () => void;
  onTogglePause: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const tmpl = recurring.transactionTemplate;
  const category = tmpl.categoryId ? categoryMap.get(tmpl.categoryId) : undefined;
  const isActive = recurring.isActive;
  const overdue = isOverdue(recurring, today);

  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isActive ? "bg-primary/10 text-primary" : "bg-surface-2 text-muted"
        }`}
      >
        <Repeat aria-hidden className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-ink">
            {tmpl.note || freqLabel}
          </p>
          <Badge tone={FREQ_BADGE[recurring.frequency]}>{freqLabel}</Badge>
          {!isActive && <Badge tone="neutral">{t("recurring.paused")}</Badge>}
          {overdue && isActive && <Badge tone="warning">{t("recurring.nextDue")}: {recurring.nextRunDate}</Badge>}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted">
          {category?.name ?? accountLabel}
          {recurring.endDate ? ` · ${t("recurring.ends")} ${recurring.endDate}` : ""}
        </p>
      </div>

      <div className="hidden shrink-0 flex-col items-end sm:flex">
        <span className="text-sm font-semibold tabular-nums text-ink">
          {formatCurrency(tmpl.amount, settings)}
        </span>
        <span className="mt-0.5 text-xs text-muted">
          {!overdue && isActive ? `${t("recurring.nextDue")} ${recurring.nextRunDate}` : ""}
        </span>
      </div>

      <div className="flex shrink-0 gap-1">
        <Tooltip label={t("common.edit")}>
          <Button aria-label={t("common.edit")} onClick={onEdit} size="icon" variant="ghost">
            <Pencil aria-hidden className="h-4 w-4" />
          </Button>
        </Tooltip>
        <Tooltip label={isActive ? t("recurring.pauseLabel") : t("recurring.resumeLabel")}>
          <Button
            aria-label={isActive ? t("recurring.pauseLabel") : t("recurring.resumeLabel")}
            onClick={onTogglePause}
            size="icon"
            variant="ghost"
          >
            {isActive ? <Pause aria-hidden className="h-4 w-4" /> : <Play aria-hidden className="h-4 w-4" />}
          </Button>
        </Tooltip>
        <Tooltip label={t("common.delete")}>
          <Button aria-label={t("common.delete")} onClick={onDelete} size="icon" variant="ghost">
            <Trash2 aria-hidden className="h-4 w-4" />
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
