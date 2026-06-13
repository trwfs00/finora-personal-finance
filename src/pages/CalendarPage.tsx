import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { enUS, th as thLocale } from "date-fns/locale";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { MonthPicker } from "../components/ui/date-picker";
import type { AppSettings, Category, Transaction } from "../domain/types";
import { currentMonthKey, formatCurrency } from "../lib/format";
import { cn } from "../lib/utils";
import { useFinanceStore } from "../store/finance-store";

function dateFnsLocale(settings: AppSettings) {
  return settings.locale === "th-TH" ? thLocale : enUS;
}

function compactAmount(value: number, settings: AppSettings): string {
  return new Intl.NumberFormat(settings.locale, {
    notation: "compact",
    style: "currency",
    currency: settings.currency,
    maximumFractionDigits: 0,
  }).format(value);
}

const INTENSITY_BG = [
  "",
  "bg-danger/10",
  "bg-danger/25",
  "bg-danger/50",
  "bg-danger/80",
] as const;

export function CalendarPage() {
  const { t } = useTranslation();
  const [monthKey, setMonthKey] = useState(currentMonthKey);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const transactions = useFinanceStore((state) => state.transactions);
  const categories = useFinanceStore((state) => state.categories);
  const settings = useFinanceStore((state) => state.settings);

  const [yearStr, monthStr] = monthKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);

  const monthTransactions = useMemo(
    () => transactions.filter((tx) => tx.date.startsWith(monthKey)),
    [transactions, monthKey],
  );

  const monthIncome = useMemo(
    () =>
      monthTransactions
        .filter((tx) => tx.type === "income")
        .reduce((s, tx) => s + tx.amount, 0),
    [monthTransactions],
  );

  const monthExpense = useMemo(
    () =>
      monthTransactions
        .filter((tx) => tx.type === "expense")
        .reduce((s, tx) => s + tx.amount, 0),
    [monthTransactions],
  );

  const selectedDayTransactions = useMemo(
    () =>
      selectedDate
        ? transactions
            .filter((tx) => tx.date === selectedDate)
            .sort((a, b) => (b.time ?? "").localeCompare(a.time ?? ""))
        : [],
    [transactions, selectedDate],
  );

  function handleSelectDate(date: string | null) {
    setSelectedDate(date);
    setPanelOpen(!!date);
  }

  const net = monthIncome - monthExpense;

  return (
    <div className="section-shell px-4 py-6 lg:px-8 lg:py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">{t("calendar.title")}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            {t("calendar.subtitle")}
          </p>
        </div>
        <MonthPicker
          ariaLabel={t("calendar.title")}
          className="w-40"
          onChange={(v) => {
            setMonthKey(v);
            setSelectedDate(null);
            setPanelOpen(false);
          }}
          value={monthKey}
        />
      </div>

      {/* Monthly summary bar */}
      <div className="panel mt-6 overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-line">
          <div className="px-5 py-5">
            <p className="text-sm text-muted">{t("common.income")}</p>
            <p className="mt-2 text-2xl font-semibold tabular text-primary">
              {formatCurrency(monthIncome, settings)}
            </p>
          </div>
          <div className="px-5 py-5">
            <p className="text-sm text-muted">{t("common.expense")}</p>
            <p className="mt-2 text-2xl font-semibold tabular text-danger">
              {formatCurrency(monthExpense, settings)}
            </p>
          </div>
          <div className="px-5 py-5">
            <p className="text-sm text-muted">{t("common.net")}</p>
            <p className={cn("mt-2 text-2xl font-semibold tabular", net >= 0 ? "text-primary" : "text-danger")}>
              {formatCurrency(net, settings)}
            </p>
          </div>
        </div>
      </div>

      {/* Calendar + desktop side panel */}
      <div className="mt-6 lg:grid lg:grid-cols-[1fr_300px] lg:gap-6">
        <SpendingCalendar
          month={month}
          selectedDate={selectedDate}
          settings={settings}
          transactions={transactions}
          year={year}
          onSelectDate={handleSelectDate}
        />

        <div className="hidden lg:block">
          <DayDetail
            categories={categories}
            date={selectedDate}
            settings={settings}
            transactions={selectedDayTransactions}
          />
        </div>
      </div>

      {/* Mobile: backdrop */}
      <div
        aria-hidden
        className={cn(
          "fixed inset-0 z-40 bg-ink/20 transition-opacity duration-200 lg:hidden",
          panelOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => handleSelectDate(null)}
      />

      {/* Mobile: bottom sheet */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 max-h-[65vh] overflow-y-auto rounded-t-2xl border-t border-line bg-surface shadow-2xl transition-transform duration-200 ease-out lg:hidden",
          panelOpen ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="flex justify-center pb-1 pt-3">
          <div className="h-1 w-10 rounded-full bg-ink/20" />
        </div>
        <div className="px-4 pb-8 pt-2">
          <DayDetail
            categories={categories}
            date={selectedDate}
            settings={settings}
            transactions={selectedDayTransactions}
          />
        </div>
      </div>
    </div>
  );
}

function SpendingCalendar({
  year,
  month,
  transactions,
  selectedDate,
  settings,
  onSelectDate,
}: {
  year: number;
  month: number;
  transactions: Transaction[];
  selectedDate: string | null;
  settings: AppSettings;
  onSelectDate: (date: string | null) => void;
}) {
  const { t } = useTranslation();

  const monthStart = useMemo(() => startOfMonth(new Date(year, month - 1, 1)), [year, month]);
  const gridStart = useMemo(
    () => startOfWeek(monthStart, { weekStartsOn: 1 }),
    [monthStart],
  );
  const gridEnd = useMemo(
    () => endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 }),
    [monthStart],
  );
  const allDays = useMemo(
    () => eachDayOfInterval({ start: gridStart, end: gridEnd }),
    [gridStart, gridEnd],
  );

  const txByDate = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const tx of transactions) {
      const list = map.get(tx.date) ?? [];
      list.push(tx);
      map.set(tx.date, list);
    }
    return map;
  }, [transactions]);

  const dayData = useMemo(
    () =>
      allDays.map((date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        const dayTx = txByDate.get(dateStr) ?? [];
        const expense = dayTx
          .filter((tx) => tx.type === "expense")
          .reduce((s, tx) => s + tx.amount, 0);
        const income = dayTx
          .filter((tx) => tx.type === "income")
          .reduce((s, tx) => s + tx.amount, 0);
        return {
          date,
          dateStr,
          isCurrentMonth: isSameMonth(date, monthStart),
          isToday: isToday(date),
          expense,
          income,
        };
      }),
    [allDays, txByDate, monthStart],
  );

  // Quartile thresholds for heatmap — current month expense days only
  const { q25, q50, q75 } = useMemo(() => {
    const expenses = dayData
      .filter((d) => d.isCurrentMonth && d.expense > 0)
      .map((d) => d.expense)
      .sort((a, b) => a - b);
    if (expenses.length === 0) return { q25: 0, q50: 0, q75: 0 };
    const at = (p: number) => expenses[Math.min(expenses.length - 1, Math.floor(expenses.length * p))];
    return { q25: at(0.25), q50: at(0.5), q75: at(0.75) };
  }, [dayData]);

  function getIntensity(expense: number, isCurrentMonth: boolean): 0 | 1 | 2 | 3 | 4 {
    if (!isCurrentMonth || expense === 0) return 0;
    if (expense <= q25) return 1;
    if (expense <= q50) return 2;
    if (expense <= q75) return 3;
    return 4;
  }

  const weekdays = t("calendar.weekdays", { returnObjects: true }) as string[];

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-line">
        {weekdays.map((d, i) => (
          <div
            key={i}
            className="py-2 text-center text-xs font-medium text-muted"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 divide-x divide-y divide-line">
        {dayData.map((day) => {
          const intensity = getIntensity(day.expense, day.isCurrentMonth);
          const isSelected = selectedDate === day.dateStr;

          return (
            <button
              key={day.dateStr}
              type="button"
              onClick={() => onSelectDate(isSelected ? null : day.dateStr)}
              className={cn(
                "relative flex min-h-[64px] flex-col gap-0.5 p-2 text-left transition-colors hover:bg-ink/5",
                !day.isCurrentMonth && "opacity-35",
                isSelected && "bg-primary/8 ring-1 ring-inset ring-primary",
                !isSelected && intensity > 0 && INTENSITY_BG[intensity],
              )}
            >
              <span
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium leading-none",
                  day.isToday && "bg-primary text-white",
                  !day.isToday && "text-ink",
                )}
              >
                {day.date.getDate()}
              </span>
              {day.expense > 0 && day.isCurrentMonth && (
                <span className="truncate text-xs leading-none text-danger/80">
                  {compactAmount(day.expense, settings)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Heatmap legend */}
      <div className="flex items-center justify-end gap-1.5 border-t border-line px-3 py-2">
        <span className="text-xs text-muted">{t("calendar.less")}</span>
        {([0, 1, 2, 3, 4] as const).map((i) => (
          <div
            key={i}
            className={cn(
              "h-3 w-3 rounded-sm border border-line/50",
              INTENSITY_BG[i] || "bg-surface-2",
            )}
          />
        ))}
        <span className="text-xs text-muted">{t("calendar.more")}</span>
      </div>
    </div>
  );
}

function DayDetail({
  date,
  transactions,
  categories,
  settings,
}: {
  date: string | null;
  transactions: Transaction[];
  categories: Category[];
  settings: AppSettings;
}) {
  const { t } = useTranslation();

  if (!date) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-line p-6 text-center">
        <p className="text-sm text-muted">{t("calendar.selectDay")}</p>
      </div>
    );
  }

  const locale = dateFnsLocale(settings);
  const parsedDate = parseISO(date);
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const totalExpense = transactions
    .filter((tx) => tx.type === "expense")
    .reduce((s, tx) => s + tx.amount, 0);
  const totalIncome = transactions
    .filter((tx) => tx.type === "income")
    .reduce((s, tx) => s + tx.amount, 0);

  return (
    <div className="rounded-xl border border-line bg-surface">
      {/* Date header */}
      <div className="border-b border-line px-4 py-3">
        <h3 className="text-base font-semibold text-ink">
          {format(parsedDate, "EEEE, d MMMM yyyy", { locale })}
        </h3>
        {(totalIncome > 0 || totalExpense > 0) && (
          <div className="mt-1.5 flex gap-3 text-sm">
            {totalIncome > 0 && (
              <span className="font-medium tabular-nums text-primary">
                +{formatCurrency(totalIncome, settings)}
              </span>
            )}
            {totalExpense > 0 && (
              <span className="font-medium tabular-nums text-danger">
                -{formatCurrency(totalExpense, settings)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Transaction list */}
      <div className="divide-y divide-line">
        {transactions.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted">
            {t("calendar.noTransactions")}
          </p>
        ) : (
          transactions.map((tx) => {
            const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : undefined;
            return (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div
                    className="h-6 w-6 shrink-0 rounded-full"
                    style={{
                      background: cat?.color ?? "oklch(var(--surface-2))",
                    }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {tx.note || cat?.name || t(`common.${tx.type}`)}
                    </p>
                    {cat && tx.note && (
                      <p className="truncate text-xs text-muted">{cat.name}</p>
                    )}
                    {tx.time && (
                      <p className="text-xs text-muted">{tx.time.slice(0, 5)}</p>
                    )}
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-sm font-medium tabular-nums",
                    tx.type === "income"
                      ? "text-primary"
                      : tx.type === "expense"
                        ? "text-danger"
                        : "text-muted",
                  )}
                >
                  {tx.type === "expense" ? "-" : tx.type === "income" ? "+" : ""}
                  {formatCurrency(tx.amount, settings)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
