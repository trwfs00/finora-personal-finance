import {
  ChevronDown,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { TransactionForm } from "../components/TransactionForm";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { DatePicker } from "../components/ui/date-picker";
import { Dialog } from "../components/ui/dialog";
import { EmptyState } from "../components/ui/empty-state";
import { Input } from "../components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { createTransactionCsv } from "../domain/backup";
import type { Transaction } from "../domain/types";
import { downloadFile, formatCurrency } from "../lib/format";
import { useFinanceStore } from "../store/finance-store";

export function TransactionsPage() {
  const { t } = useTranslation();
  const transactions = useFinanceStore((state) => state.transactions);
  const categories = useFinanceStore((state) => state.categories);
  const accounts = useFinanceStore((state) => state.accounts);
  const settings = useFinanceStore((state) => state.settings);
  const deleteTransaction = useFinanceStore((state) => state.deleteTransaction);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | undefined>();
  const [pendingDelete, setPendingDelete] = useState<Transaction | undefined>();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [categoryId, setCategoryId] = useState("all");
  const [accountId, setAccountId] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const accountMap = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  );

  const filtered = useMemo(() => {
    const searchValue = search.trim().toLowerCase();
    return [...transactions]
      .filter((transaction) => {
        if (type !== "all" && transaction.type !== type) {
          return false;
        }
        if (categoryId !== "all" && transaction.categoryId !== categoryId) {
          return false;
        }
        if (
          accountId !== "all" &&
          transaction.accountId !== accountId &&
          transaction.fromAccountId !== accountId &&
          transaction.toAccountId !== accountId
        ) {
          return false;
        }
        if (dateFrom && transaction.date < dateFrom) {
          return false;
        }
        if (dateTo && transaction.date > dateTo) {
          return false;
        }
        if (minAmount && transaction.amount < Number(minAmount)) {
          return false;
        }
        if (maxAmount && transaction.amount > Number(maxAmount)) {
          return false;
        }
        if (!searchValue) {
          return true;
        }
        const categoryName = transaction.categoryId
          ? categoryMap.get(transaction.categoryId)?.name
          : "";
        const accountName = transaction.accountId
          ? accountMap.get(transaction.accountId)?.name
          : "";
        return [transaction.note, categoryName, accountName, transaction.tags?.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(searchValue);
      })
      .sort((first, second) => second.date.localeCompare(first.date));
  }, [
    accountId,
    accountMap,
    categoryId,
    categoryMap,
    dateFrom,
    dateTo,
    maxAmount,
    minAmount,
    search,
    transactions,
    type,
  ]);

  function openNew() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function exportCsv() {
    downloadFile(
      "finora-transactions.csv",
      createTransactionCsv({ transactions: filtered, categories, accounts }),
      "text/csv;charset=utf-8",
    );
  }

  const advancedFilterCount = [
    categoryId !== "all",
    accountId !== "all",
    dateFrom !== "",
    dateTo !== "",
    minAmount !== "",
    maxAmount !== "",
  ].filter(Boolean).length;

  function clearAdvancedFilters() {
    setCategoryId("all");
    setAccountId("all");
    setDateFrom("");
    setDateTo("");
    setMinAmount("");
    setMaxAmount("");
  }

  async function handleDelete() {
    if (pendingDelete) {
      await deleteTransaction(pendingDelete.id);
      setPendingDelete(undefined);
    }
  }

  return (
    <div className="section-shell px-4 py-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">{t("transactions.title")}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            {t("transactions.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportCsv} variant="secondary">
            <Upload aria-hidden className="h-4 w-4" />
            {t("transactions.exportCsv")}
          </Button>
          <Button onClick={openNew} variant="primary">
            <Plus aria-hidden className="h-4 w-4" />
            {t("transactions.addTransaction")}
          </Button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="relative min-w-48 flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          />
          <Input
            aria-label={t("transactions.searchPlaceholder")}
            className="pl-9"
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("transactions.searchPlaceholder")}
            value={search}
          />
        </div>
        <Select onValueChange={setType} value={type}>
          <SelectTrigger aria-label={t("common.type")} className="w-36">
            <SelectValue placeholder={t("transactions.allTypes")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("transactions.allTypes")}</SelectItem>
            <SelectItem value="income">{t("common.income")}</SelectItem>
            <SelectItem value="expense">{t("common.expense")}</SelectItem>
            <SelectItem value="transfer">{t("common.transfer")}</SelectItem>
          </SelectContent>
        </Select>
        <Button
          aria-expanded={showAdvanced}
          onClick={() => setShowAdvanced((prev) => !prev)}
          variant="secondary"
        >
          <SlidersHorizontal aria-hidden className="h-4 w-4" />
          {t("transactions.filters")}
          {advancedFilterCount > 0 && (
            <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-medium text-white">
              {advancedFilterCount}
            </span>
          )}
          <ChevronDown
            aria-hidden
            className={[
              "h-3.5 w-3.5 transition-transform",
              showAdvanced ? "rotate-180" : "",
            ].join(" ")}
          />
        </Button>
        {(search || type !== "all" || advancedFilterCount > 0) && (
          <Button
            aria-label={t("common.clear")}
            onClick={() => {
              setSearch("");
              setType("all");
              clearAdvancedFilters();
            }}
            variant="ghost"
          >
            <X aria-hidden className="h-4 w-4" />
            {t("common.clear")}
          </Button>
        )}
      </div>
      {showAdvanced && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select onValueChange={setCategoryId} value={categoryId}>
            <SelectTrigger aria-label={t("transactions.allCategories")}>
              <SelectValue placeholder={t("transactions.allCategories")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("transactions.allCategories")}</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={setAccountId} value={accountId}>
            <SelectTrigger aria-label={t("transactions.allAccounts")}>
              <SelectValue placeholder={t("transactions.allAccounts")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("transactions.allAccounts")}</SelectItem>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DatePicker
            ariaLabel={t("transactions.dateFrom")}
            onChange={setDateFrom}
            placeholder={t("transactions.dateFrom")}
            value={dateFrom}
          />
          <DatePicker
            ariaLabel={t("transactions.dateTo")}
            onChange={setDateTo}
            placeholder={t("transactions.dateTo")}
            value={dateTo}
          />
          <Input
            aria-label={t("transactions.minAmount")}
            onChange={(event) => setMinAmount(event.target.value)}
            placeholder={t("transactions.minAmount")}
            type="number"
            value={minAmount}
          />
          <Input
            aria-label={t("transactions.maxAmount")}
            onChange={(event) => setMaxAmount(event.target.value)}
            placeholder={t("transactions.maxAmount")}
            type="number"
            value={maxAmount}
          />
        </div>
      )}

      <div className="mt-6">
        {filtered.length === 0 ? (
          <EmptyState
            action={
              <Button onClick={openNew} variant="primary">
                {t("transactions.addTransaction")}
              </Button>
            }
            description={t("transactions.emptyDesc")}
            title={t("transactions.emptyTitle")}
          />
        ) : (
          <div className="panel overflow-hidden">
            <div className="hidden grid-cols-[120px_100px_1fr_150px_150px_100px_80px] gap-4 border-b border-line px-4 py-3 text-xs font-medium text-muted lg:grid">
              <span>{t("transactions.colDate")}</span>
              <span>{t("transactions.colType")}</span>
              <span>{t("transactions.colDetails")}</span>
              <span>{t("transactions.colCategory")}</span>
              <span>{t("transactions.colAccount")}</span>
              <span className="text-right">{t("transactions.colAmount")}</span>
            </div>
            <div className="divide-y divide-line">
              {filtered.map((transaction) => (
                <div
                  className="grid gap-3 px-4 py-4 lg:grid-cols-[120px_100px_1fr_150px_150px_100px_80px] gap-4 lg:items-center"
                  key={transaction.id}
                >
                  <div className="text-sm text-muted">{transaction.date}</div>
                  <div>
                    <Badge
                      tone={
                        transaction.type === "income"
                          ? "success"
                          : transaction.type === "expense"
                            ? "danger"
                            : "neutral"
                      }
                    >
                      {transaction.type === "income"
                        ? t("common.income")
                        : transaction.type === "expense"
                          ? t("common.expense")
                          : t("common.transfer")}
                    </Badge>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {transaction.note || t("transactions.noNote")}
                    </p>
                    {transaction.tags?.length ? (
                      <p className="mt-1 truncate text-xs text-muted">
                        {transaction.tags.join(", ")}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-sm text-muted">
                    {transaction.categoryId
                      ? categoryMap.get(transaction.categoryId)?.name
                      : t("transactions.transferCategory")}
                  </div>
                  <div className="text-sm text-muted">
                    {transaction.accountId
                      ? accountMap.get(transaction.accountId)?.name
                      : `${accountMap.get(transaction.fromAccountId ?? "")?.name ?? ""} → ${accountMap.get(transaction.toAccountId ?? "")?.name ?? ""}`}
                  </div>
                  <div className="text-right text-sm font-medium tabular text-ink">
                    {formatCurrency(transaction.amount, settings)}
                  </div>
                  <div className="flex justify-end gap-1">
                    <Button
                      aria-label={t("transactions.editTx")}
                      onClick={() => {
                        setEditing(transaction);
                        setDialogOpen(true);
                      }}
                      size="icon"
                      variant="ghost"
                    >
                      <Pencil aria-hidden className="h-4 w-4" />
                    </Button>
                    <Button
                      aria-label={t("transactions.deleteTx")}
                      onClick={() => setPendingDelete(transaction)}
                      size="icon"
                      variant="ghost"
                    >
                      <Trash2 aria-hidden className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog
        description={t("transactions.dialogDesc")}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? t("transactions.editDialog") : t("transactions.addDialog")}
      >
        <TransactionForm onSaved={() => setDialogOpen(false)} transaction={editing} />
      </Dialog>

      <ConfirmDialog
        confirmLabel={t("transactions.deleteTx")}
        description={
          pendingDelete
            ? t("transactions.deleteDesc", {
                note: pendingDelete.note || pendingDelete.type,
                amount: formatCurrency(pendingDelete.amount, settings),
              })
            : ""
        }
        onConfirm={() => void handleDelete()}
        onOpenChange={(open) => !open && setPendingDelete(undefined)}
        open={!!pendingDelete}
        title={t("transactions.deleteTitle")}
      />
    </div>
  );
}
