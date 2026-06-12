import { differenceInCalendarDays, parseISO } from "date-fns";
import { Archive, ArchiveX, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { HelpButton } from "../components/help/HelpButton";
import { GoalForm } from "../components/GoalForm";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { Dialog } from "../components/ui/dialog";
import { EmptyState } from "../components/ui/empty-state";
import { Field, Input } from "../components/ui/field";
import { calculateGoalProgress } from "../domain/calculations";
import type { SavingsGoal } from "../domain/types";
import { formatCurrency } from "../lib/format";
import { cn } from "../lib/utils";
import { useFinanceStore } from "../store/finance-store";

export function GoalsPage() {
  const { t } = useTranslation();
  const savingsGoals = useFinanceStore((state) => state.savingsGoals);
  const accounts = useFinanceStore((state) => state.accounts);
  const transactions = useFinanceStore((state) => state.transactions);
  const settings = useFinanceStore((state) => state.settings);
  const updateGoal = useFinanceStore((state) => state.updateGoal);
  const deleteGoal = useFinanceStore((state) => state.deleteGoal);
  const addContribution = useFinanceStore((state) => state.addContribution);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | undefined>();
  const [pendingDelete, setPendingDelete] = useState<SavingsGoal | undefined>();
  const [contributingTo, setContributingTo] = useState<SavingsGoal | undefined>();
  const [contributionAmount, setContributionAmount] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );

  const today = new Date();

  const active = savingsGoals.filter((g) => !g.isArchived);
  const archived = savingsGoals.filter((g) => g.isArchived);

  function progress(goal: SavingsGoal) {
    return calculateGoalProgress(goal, accounts, transactions);
  }

  function isCompleted(goal: SavingsGoal) {
    return progress(goal) >= goal.targetAmount;
  }

  async function toggleArchive(goal: SavingsGoal) {
    await updateGoal(goal.id, { ...goal, isArchived: !goal.isArchived });
  }

  async function handleContribute() {
    if (!contributingTo) return;
    const amount = parseFloat(contributionAmount);
    if (!isNaN(amount) && amount > 0) {
      await addContribution(contributingTo.id, amount);
    }
    setContributingTo(undefined);
    setContributionAmount("");
  }

  async function handleDelete() {
    if (pendingDelete) {
      await deleteGoal(pendingDelete.id);
      setPendingDelete(undefined);
    }
  }

  const goalList = showArchived ? [...active, ...archived] : active;

  return (
    <div className="section-shell px-4 py-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">{t("goals.title")}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{t("goals.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HelpButton page="goals" />
          {archived.length > 0 && (
            <Button onClick={() => setShowArchived((v) => !v)} variant="secondary">
              {showArchived ? t("goals.hideArchived") : t("goals.showArchived")}
              {!showArchived && archived.length > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-surface-2 px-1 text-[11px] font-medium text-muted">
                  {archived.length}
                </span>
              )}
            </Button>
          )}
          <Button
            onClick={() => { setEditing(undefined); setDialogOpen(true); }}
            variant="primary"
          >
            <Plus aria-hidden className="h-4 w-4" />
            {t("goals.addGoal")}
          </Button>
        </div>
      </div>

      <div className="mt-6">
        {goalList.length === 0 ? (
          <EmptyState
            action={
              <Button onClick={() => { setEditing(undefined); setDialogOpen(true); }} variant="primary">
                {t("goals.addGoal")}
              </Button>
            }
            description={t("goals.emptyDesc")}
            title={t("goals.emptyTitle")}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {goalList.map((goal) => {
              const current = progress(goal);
              const pct = Math.min(100, goal.targetAmount > 0 ? (current / goal.targetAmount) * 100 : 0);
              const done = isCompleted(goal);
              const daysLeft = goal.deadline
                ? differenceInCalendarDays(parseISO(goal.deadline), today)
                : null;
              const linkedAccount = goal.linkedAccountId
                ? accountMap.get(goal.linkedAccountId)
                : undefined;

              return (
                <div
                  key={goal.id}
                  className={cn(
                    "panel flex flex-col gap-4 p-5",
                    goal.isArchived && "opacity-60",
                  )}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <ProgressRing pct={pct} color={goal.color} size={48} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{goal.name}</p>
                        {goal.note && (
                          <p className="mt-0.5 truncate text-xs text-muted">{goal.note}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {done && !goal.isArchived && (
                        <Badge tone="success">{t("goals.completed")}</Badge>
                      )}
                      {goal.isArchived && (
                        <Badge tone="neutral">{t("goals.archived")}</Badge>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full transition-[width] duration-500"
                        style={{
                          width: `${pct}%`,
                          background: goal.color ?? "oklch(var(--primary))",
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span className="tabular-nums font-medium text-ink">
                        {formatCurrency(current, settings)}
                      </span>
                      <span className="tabular-nums">
                        {Math.round(pct)}% · {formatCurrency(goal.targetAmount, settings)}
                      </span>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    {linkedAccount ? (
                      <span>{t("goals.trackedVia", { account: linkedAccount.name })}</span>
                    ) : null}
                    {daysLeft !== null && (
                      <span className={daysLeft < 0 ? "text-danger" : daysLeft <= 7 ? "text-warning" : ""}>
                        {daysLeft < 0
                          ? t("goals.overdue")
                          : t("goals.daysLeft_other", { count: daysLeft })}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 border-t border-line pt-3">
                    {!goal.isArchived && !linkedAccount && (
                      <Button
                        className="flex-1"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setContributingTo(goal);
                          setContributionAmount("");
                        }}
                      >
                        <Plus aria-hidden className="h-3.5 w-3.5" />
                        {t("goals.addContribution")}
                      </Button>
                    )}
                    <Button
                      aria-label={t("common.edit")}
                      size="icon"
                      variant="ghost"
                      onClick={() => { setEditing(goal); setDialogOpen(true); }}
                    >
                      <Pencil aria-hidden className="h-4 w-4" />
                    </Button>
                    <Button
                      aria-label={goal.isArchived ? t("goals.unarchiveGoal") : t("goals.archiveGoal")}
                      size="icon"
                      variant="ghost"
                      onClick={() => void toggleArchive(goal)}
                    >
                      {goal.isArchived
                        ? <ArchiveX aria-hidden className="h-4 w-4" />
                        : <Archive aria-hidden className="h-4 w-4" />}
                    </Button>
                    <Button
                      aria-label={t("common.delete")}
                      size="icon"
                      variant="ghost"
                      onClick={() => setPendingDelete(goal)}
                    >
                      <Trash2 aria-hidden className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit dialog */}
      <Dialog
        description={t("goals.dialogDesc")}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? t("goals.editDialog") : t("goals.addDialog")}
      >
        <GoalForm goal={editing} onSaved={() => setDialogOpen(false)} />
      </Dialog>

      {/* Contribution dialog */}
      <Dialog
        description=""
        open={!!contributingTo}
        onOpenChange={(open) => !open && setContributingTo(undefined)}
        title={t("goals.addContribution")}
      >
        <div className="space-y-4">
          <Field label={t("goals.contributionAmount")} htmlFor="contrib-amount">
            <Input
              id="contrib-amount"
              min="0"
              step="0.01"
              type="number"
              value={contributionAmount}
              onChange={(e) => setContributionAmount(e.target.value)}
              autoFocus
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setContributingTo(undefined)}>
              {t("common.cancel")}
            </Button>
            <Button variant="primary" onClick={() => void handleContribute()}>
              {t("goals.confirmContribution")}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        confirmLabel={t("goals.deleteLabel")}
        description={pendingDelete ? t("goals.deleteDesc", { name: pendingDelete.name }) : ""}
        onConfirm={() => void handleDelete()}
        onOpenChange={(open) => !open && setPendingDelete(undefined)}
        open={!!pendingDelete}
        title={t("goals.deleteTitle")}
      />
    </div>
  );
}

function ProgressRing({
  pct,
  color,
  size = 48,
}: {
  pct: number;
  color?: string;
  size?: number;
}) {
  const strokeWidth = 5;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = (Math.min(100, pct) / 100) * circumference;
  const done = pct >= 100;

  return (
    <svg width={size} height={size} className="-rotate-90 shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={strokeWidth}
        className="stroke-surface-2"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={strokeWidth}
        stroke={done ? "oklch(0.60 0.14 145)" : (color ?? "oklch(var(--primary))")}
        strokeDasharray={`${filled} ${circumference}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.5s ease" }}
      />
    </svg>
  );
}
