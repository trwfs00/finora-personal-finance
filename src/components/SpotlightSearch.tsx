import {
  ArrowRight,
  BarChart3,
  CircleDollarSign,
  LayoutDashboard,
  ReceiptText,
  Search,
  Settings,
  WalletCards,
} from "lucide-react";
import { useMemo, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { formatCurrency } from "../lib/format";
import { cn } from "../lib/utils";
import { useFinanceStore } from "../store/finance-store";

interface SpotlightSearchProps {
  open: boolean;
  onClose: () => void;
}

export function SpotlightSearch({ open, onClose }: SpotlightSearchProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const transactions = useFinanceStore((s) => s.transactions);
  const categories = useFinanceStore((s) => s.categories);
  const settings = useFinanceStore((s) => s.settings);

  const NAV_ITEMS = useMemo(() => [
    { href: "/", label: t("nav.overview"), icon: LayoutDashboard },
    { href: "/transactions", label: t("nav.transactions"), icon: ReceiptText },
    { href: "/budgets", label: t("nav.budgets"), icon: CircleDollarSign },
    { href: "/analytics", label: t("nav.analytics"), icon: BarChart3 },
    { href: "/accounts", label: t("nav.accounts"), icon: WalletCards },
    { href: "/settings", label: t("nav.settings"), icon: Settings },
  ], [t]);

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const filteredNav = useMemo(() => {
    if (!query.trim()) return NAV_ITEMS;
    const q = query.toLowerCase();
    return NAV_ITEMS.filter((item) => item.label.toLowerCase().includes(q));
  }, [query, NAV_ITEMS]);

  const filteredTransactions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return transactions
      .filter(
        (tx) =>
          tx.note?.toLowerCase().includes(q) ||
          categoryMap.get(tx.categoryId ?? "")?.name.toLowerCase().includes(q),
      )
      .slice(0, 5);
  }, [query, transactions, categoryMap]);

  const allResults = [
    ...filteredNav.map((item) => ({ kind: "nav" as const, ...item })),
    ...filteredTransactions.map((tx) => ({ kind: "tx" as const, tx })),
  ];

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      const t = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, allResults.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        const item = allResults[activeIndex];
        if (!item) return;
        if (item.kind === "nav") {
          navigate(item.href);
        } else {
          navigate("/transactions");
        }
        onClose();
      } else if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-auto mt-[14vh] w-full max-w-lg px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel overflow-hidden shadow-xl">
          {/* Input */}
          <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
            <Search aria-hidden className="h-4 w-4 shrink-0 text-muted" />
            <input
              ref={inputRef}
              className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("spotlight.placeholder")}
              value={query}
            />
            <kbd className="hidden rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-muted sm:inline">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto py-1.5">
            {/* Nav section */}
            {filteredNav.length > 0 && (
              <div>
                {!query.trim() && (
                  <p className="px-4 pb-1 pt-1.5 text-[11px] font-medium text-muted">
                    {t("spotlight.navigation")}
                  </p>
                )}
                {filteredNav.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                        activeIndex === i
                          ? "bg-primary/8 text-primary"
                          : "text-ink hover:bg-ink/5",
                      )}
                      onClick={() => {
                        navigate(item.href);
                        onClose();
                      }}
                      onMouseEnter={() => setActiveIndex(i)}
                      type="button"
                    >
                      <Icon aria-hidden className="h-4 w-4 shrink-0 text-muted" />
                      {item.label}
                      <ArrowRight
                        aria-hidden
                        className="ml-auto h-3 w-3 shrink-0 text-muted"
                      />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Transaction section */}
            {filteredTransactions.length > 0 && (
              <div>
                <p className="px-4 pb-1 pt-2 text-[11px] font-medium text-muted">
                  {t("spotlight.transactions")}
                </p>
                {filteredTransactions.map((tx, i) => {
                  const globalIdx = filteredNav.length + i;
                  const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : undefined;
                  return (
                    <button
                      key={tx.id}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                        activeIndex === globalIdx
                          ? "bg-primary/8 text-primary"
                          : "text-ink hover:bg-ink/5",
                      )}
                      onClick={() => {
                        navigate("/transactions");
                        onClose();
                      }}
                      onMouseEnter={() => setActiveIndex(globalIdx)}
                      type="button"
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: cat?.color ?? "oklch(var(--muted))" }}
                      />
                      <span className="flex-1 truncate">
                        {tx.note || (tx.type === "income" ? t("common.income") : t("common.expense"))}
                      </span>
                      <span
                        className={cn(
                          "tabular text-xs",
                          tx.type === "income" ? "text-success" : "text-muted",
                        )}
                      >
                        {tx.type === "income" ? "+" : "−"}
                        {formatCurrency(tx.amount, settings)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Empty */}
            {query.trim() && allResults.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-muted">
                {t("spotlight.noResults", { query })}
              </p>
            )}
          </div>

          {/* Footer hint */}
          <div className="border-t border-line px-4 py-2">
            <div className="flex items-center gap-3 text-[11px] text-muted">
              <span>
                <kbd className="rounded border border-line bg-surface-2 px-1 font-mono">↑↓</kbd>
                {" "}{t("spotlight.navigate")}
              </span>
              <span>
                <kbd className="rounded border border-line bg-surface-2 px-1 font-mono">↵</kbd>
                {" "}{t("spotlight.open")}
              </span>
              <span>
                <kbd className="rounded border border-line bg-surface-2 px-1 font-mono">ESC</kbd>
                {" "}{t("spotlight.close")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
