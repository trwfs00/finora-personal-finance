import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { AccountForm } from "../components/AccountForm";
import { HelpButton } from "../components/help/HelpButton";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { Dialog } from "../components/ui/dialog";
import { EmptyState } from "../components/ui/empty-state";
import { Tooltip } from "../components/ui/tooltip";
import { calculateAccountBalance, calculateCreditUsage } from "../domain/calculations";
import type { Account, AppSettings } from "../domain/types";
import { formatCurrency } from "../lib/format";
import { cn } from "../lib/utils";
import { useFinanceStore } from "../store/finance-store";

function accountTypeLabel(type: Account["type"], t: ReturnType<typeof useTranslation>["t"]): string {
  const map: Record<Account["type"], string> = {
    cash: t("accounts.typeCash"),
    bank: t("accounts.typeBank"),
    credit_card: t("accounts.typeCreditCard"),
    e_wallet: t("accounts.typeEWallet"),
    savings: t("accounts.typeSavings"),
    investment: t("accounts.typeInvestment"),
    debt: t("accounts.typeDebt"),
  };
  return map[type] ?? type;
}

function CreditPanel({
  balance,
  creditLimit,
  account,
  settings,
  t,
}: {
  balance: number;
  creditLimit: number;
  account: Account;
  settings: AppSettings;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const credit = calculateCreditUsage(balance, creditLimit);
  const fmt = (n: number) => formatCurrency(n, { ...settings, currency: account.currency }, 2);
  return (
    <div className="mt-4 rounded-xl border border-line bg-surface-2 p-3">
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-muted">{t("accounts.creditUsed")}</p>
          <p className="mt-0.5 font-medium text-ink">{fmt(credit.usedCredit)}</p>
        </div>
        <div>
          <p className="text-muted">{t("accounts.creditLimit")}</p>
          <p className="mt-0.5 font-medium text-ink">{fmt(creditLimit)}</p>
        </div>
        <div>
          <p className="text-muted">{t("accounts.creditAvailable")}</p>
          <p className={cn("mt-0.5 font-medium", credit.isOverLimit ? "text-danger" : "text-ink")}>
            {fmt(credit.availableCredit ?? 0)}
          </p>
        </div>
      </div>
      {credit.utilization !== undefined ? (
        <>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
            <div
              className={cn("h-full rounded-full transition-all", credit.isOverLimit ? "bg-danger" : "bg-primary")}
              style={{ width: `${Math.min(100, credit.utilization)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted">
            {t("accounts.creditUtilization", { percent: Math.round(credit.utilization) })}
          </p>
        </>
      ) : null}
    </div>
  );
}

function SortableAccountCard({
  account,
  balance,
  settings,
  t,
  draggable = true,
  onEdit,
  onDelete,
}: {
  account: Account;
  balance: number;
  settings: AppSettings;
  t: ReturnType<typeof useTranslation>["t"];
  draggable?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: account.id, disabled: !draggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "panel p-4",
        isDragging && "opacity-50 shadow-xl ring-2 ring-primary/40",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-2">
          {draggable && (
            <Tooltip label={t("accounts.dragHandle")}>
              <button
                {...attributes}
                {...listeners}
                aria-label={t("accounts.dragHandle")}
                className="mt-1 cursor-grab touch-none text-muted/50 hover:text-muted active:cursor-grabbing"
                type="button"
              >
                <GripVertical className="h-4 w-4" aria-hidden />
              </button>
            </Tooltip>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-ink">{account.name}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge>{accountTypeLabel(account.type, t)}</Badge>
              {account.includeInNetWorth ? (
                <Badge tone="success">{t("accounts.netWorth")}</Badge>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Tooltip label={t("common.edit")}>
            <Button aria-label={`${t("common.edit")} ${account.name}`} onClick={onEdit} size="icon" variant="ghost">
              <Pencil aria-hidden className="h-4 w-4" />
            </Button>
          </Tooltip>
          <Tooltip label={t("common.delete")}>
            <Button aria-label={`${t("common.delete")} ${account.name}`} onClick={onDelete} size="icon" variant="ghost">
              <Trash2 aria-hidden className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>
      </div>
      <p className="mt-6 text-2xl font-semibold tabular text-ink">
        {formatCurrency(balance, { ...settings, currency: account.currency }, 2)}
      </p>
      <p className="mt-1 text-sm text-muted">
        {t("accounts.initialBalance", {
          amount: formatCurrency(account.initialBalance, { ...settings, currency: account.currency }, 2),
        })}
      </p>
      {(account.type === "credit_card" || account.type === "debt") && account.creditLimit ? (
        <CreditPanel account={account} balance={balance} creditLimit={account.creditLimit} settings={settings} t={t} />
      ) : null}
    </div>
  );
}

export function AccountsPage() {
  const { t } = useTranslation();
  const accounts = useFinanceStore((state) => state.accounts);
  const transactions = useFinanceStore((state) => state.transactions);
  const settings = useFinanceStore((state) => state.settings);
  const deleteAccount = useFinanceStore((state) => state.deleteAccount);
  const updateSettings = useFinanceStore((state) => state.updateSettings);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Account | undefined>();
  const [pendingDelete, setPendingDelete] = useState<Account | undefined>();
  const [filterType, setFilterType] = useState<Account["type"] | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Apply stored order, append any new accounts at end
  const orderedAccounts = useMemo(() => {
    const order = settings.accountOrder ?? [];
    const byId = new Map(accounts.map((a) => [a.id, a]));
    const sorted = order.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
    const inOrder = new Set(order);
    for (const a of accounts) if (!inOrder.has(a.id)) sorted.push(a);
    return sorted;
  }, [accounts, settings.accountOrder]);

  // Types that actually exist, in a stable display order
  const TYPE_ORDER: Account["type"][] = ["cash", "bank", "savings", "e_wallet", "investment", "credit_card", "debt"];
  const activeTypes = useMemo(
    () => TYPE_ORDER.filter((type) => orderedAccounts.some((a) => a.type === type)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orderedAccounts],
  );

  const displayedAccounts = useMemo(
    () => filterType ? orderedAccounts.filter((a) => a.type === filterType) : orderedAccounts,
    [orderedAccounts, filterType],
  );

  const balanceMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const account of accounts) {
      map.set(account.id, calculateAccountBalance(account, transactions));
    }
    return map;
  }, [accounts, transactions]);

  function openNew() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  async function handleDelete() {
    if (pendingDelete) {
      await deleteAccount(pendingDelete.id);
      setPendingDelete(undefined);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedAccounts.findIndex((a) => a.id === active.id);
    const newIndex = orderedAccounts.findIndex((a) => a.id === over.id);
    const newOrder = arrayMove(orderedAccounts, oldIndex, newIndex).map((a) => a.id);
    await updateSettings({ ...settings, accountOrder: newOrder });
  }

  return (
    <div className="section-shell px-4 py-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">{t("accounts.title")}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{t("accounts.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <HelpButton page="accounts" />
          <Button onClick={openNew} variant="primary">
            <Plus aria-hidden className="h-4 w-4" />
            {t("accounts.addAccount")}
          </Button>
        </div>
      </div>

      <div className="mt-6">
        {accounts.length === 0 ? (
          <EmptyState
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={openNew} variant="primary">{t("accounts.addAccount")}</Button>
                <HelpButton page="accounts" />
              </div>
            }
            description={t("accounts.emptyDesc")}
            title={t("accounts.emptyTitle")}
          />
        ) : (
          <>
            {/* Type filter chips */}
            {activeTypes.length > 1 && (
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFilterType(null)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                    filterType === null
                      ? "border-primary bg-primary text-white"
                      : "border-line bg-surface text-muted hover:text-ink",
                  )}
                >
                  {t("common.all")}
                </button>
                {activeTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFilterType(filterType === type ? null : type)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                      filterType === type
                        ? "border-primary bg-primary text-white"
                        : "border-line bg-surface text-muted hover:text-ink",
                    )}
                  >
                    {accountTypeLabel(type, t)}
                  </button>
                ))}
              </div>
            )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => void handleDragEnd(e)}
          >
            <SortableContext
              items={displayedAccounts.map((a) => a.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {displayedAccounts.map((account) => (
                  <SortableAccountCard
                    key={account.id}
                    account={account}
                    balance={balanceMap.get(account.id) ?? 0}
                    settings={settings}
                    t={t}
                    draggable={filterType === null}
                    onEdit={() => { setEditing(account); setDialogOpen(true); }}
                    onDelete={() => setPendingDelete(account)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          </>
        )}
      </div>

      <Dialog
        description={t("accounts.dialogDesc")}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? t("accounts.editDialog") : t("accounts.addDialog")}
      >
        <AccountForm account={editing} onSaved={() => setDialogOpen(false)} />
      </Dialog>

      <ConfirmDialog
        confirmLabel={t("accounts.deleteLabel")}
        description={t("accounts.deleteDesc")}
        onConfirm={() => void handleDelete()}
        onOpenChange={(open) => !open && setPendingDelete(undefined)}
        open={!!pendingDelete}
        title={t("accounts.deleteTitle", { name: pendingDelete?.name ?? t("common.account") })}
      />
    </div>
  );
}
