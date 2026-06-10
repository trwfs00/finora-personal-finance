import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { AccountForm } from "../components/AccountForm";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { Dialog } from "../components/ui/dialog";
import { EmptyState } from "../components/ui/empty-state";
import { calculateAccountBalance } from "../domain/calculations";
import type { Account } from "../domain/types";
import { formatCurrency } from "../lib/format";
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

export function AccountsPage() {
  const { t } = useTranslation();
  const accounts = useFinanceStore((state) => state.accounts);
  const transactions = useFinanceStore((state) => state.transactions);
  const settings = useFinanceStore((state) => state.settings);
  const deleteAccount = useFinanceStore((state) => state.deleteAccount);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Account | undefined>();
  const [pendingDelete, setPendingDelete] = useState<Account | undefined>();
  const balances = useMemo(
    () =>
      accounts.map((account) => ({
        account,
        balance: calculateAccountBalance(account, transactions),
      })),
    [accounts, transactions],
  );

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

  return (
    <div className="section-shell px-4 py-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">{t("accounts.title")}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            {t("accounts.subtitle")}
          </p>
        </div>
        <Button onClick={openNew} variant="primary">
          <Plus aria-hidden className="h-4 w-4" />
          {t("accounts.addAccount")}
        </Button>
      </div>

      <div className="mt-6">
        {accounts.length === 0 ? (
          <EmptyState
            action={
              <Button onClick={openNew} variant="primary">
                {t("accounts.addAccount")}
              </Button>
            }
            description={t("accounts.emptyDesc")}
            title={t("accounts.emptyTitle")}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {balances.map(({ account, balance }) => (
              <div className="panel p-4" key={account.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-ink">
                      {account.name}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge>{accountTypeLabel(account.type, t)}</Badge>
                      {account.includeInNetWorth ? (
                        <Badge tone="success">{t("accounts.netWorth")}</Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      aria-label={`${t("common.edit")} ${account.name}`}
                      onClick={() => {
                        setEditing(account);
                        setDialogOpen(true);
                      }}
                      size="icon"
                      variant="ghost"
                    >
                      <Pencil aria-hidden className="h-4 w-4" />
                    </Button>
                    <Button
                      aria-label={`${t("common.delete")} ${account.name}`}
                      onClick={() => setPendingDelete(account)}
                      size="icon"
                      variant="ghost"
                    >
                      <Trash2 aria-hidden className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="mt-6 text-2xl font-semibold tabular text-ink">
                  {formatCurrency(balance, {
                    ...settings,
                    currency: account.currency,
                  })}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {t("accounts.initialBalance", {
                    amount: formatCurrency(account.initialBalance, {
                      ...settings,
                      currency: account.currency,
                    }),
                  })}
                </p>
              </div>
            ))}
          </div>
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
        title={t("accounts.deleteTitle", {
          name: pendingDelete?.name ?? t("common.account"),
        })}
      />
    </div>
  );
}
