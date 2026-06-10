import {
  BarChart2,
  CalendarClock,
  Info,
  Percent,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { CategoryChart, MonthlyTrendChart } from "../components/Charts";
import { Badge } from "../components/ui/badge";
import { MonthPicker } from "../components/ui/date-picker";
import { EmptyState } from "../components/ui/empty-state";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import {
  calculateDashboardMetrics,
  getMonthlyTrend,
  type InsightData,
} from "../domain/calculations";
import { currentMonthKey, formatCurrency, formatPercent } from "../lib/format";
import { cn } from "../lib/utils";
import { useFinanceStore } from "../store/finance-store";

export function AnalyticsPage() {
  const { t } = useTranslation();
  const [month, setMonth] = useState(currentMonthKey());
  const transactions = useFinanceStore((state) => state.transactions);
  const categories = useFinanceStore((state) => state.categories);
  const accounts = useFinanceStore((state) => state.accounts);
  const budgets = useFinanceStore((state) => state.budgets);
  const settings = useFinanceStore((state) => state.settings);

  const metrics = useMemo(
    () =>
      calculateDashboardMetrics(
        transactions,
        categories,
        accounts,
        budgets,
        month,
        settings,
      ),
    [accounts, budgets, categories, month, settings, transactions],
  );

  const daysInScope = useMemo(() => {
    const [year, monthNumber] = month.split("-").map(Number);
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    return month === currentMonthKey()
      ? Math.max(1, new Date().getDate())
      : daysInMonth;
  }, [month]);

  const monthlyTrend = useMemo(() => getMonthlyTrend(transactions), [transactions]);

  const largestExpenses = useMemo(
    () =>
      transactions
        .filter((tx) => tx.type === "expense")
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10),
    [transactions],
  );

  const categoryChartData = metrics.topCategories.map((item) => ({
    name: item.category.name,
    amount: item.amount,
  }));

  const expenseChangePct = Math.round(metrics.monthOverMonthExpenseChange);
  const expenseTone: "default" | "success" | "danger" =
    expenseChangePct > 5 ? "danger" : expenseChangePct < -5 ? "success" : "default";
  const expenseIconClass =
    expenseChangePct > 5
      ? "bg-rose-100 text-rose-600"
      : expenseChangePct < -5
        ? "bg-green-100 text-green-700"
        : "bg-surface-2 text-muted";

  return (
    <div className="section-shell px-4 py-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">{t("analytics.title")}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            {t("analytics.subtitle")}
          </p>
        </div>
        <MonthPicker
          ariaLabel={t("analytics.title")}
          className="w-40"
          onChange={setMonth}
          value={month}
        />
      </div>

      {transactions.length === 0 ? (
        <div className="pt-6">
          <EmptyState
            description={t("analytics.emptyDesc")}
            title={t("analytics.emptyTitle")}
          />
        </div>
      ) : (
        <div className="space-y-6 pt-6">
          {/* KPI strip — unified panel matching Dashboard MetricCell style */}
          <section aria-label="KPI metrics">
            <div className="panel overflow-hidden">
              <div className="grid grid-cols-2 divide-y divide-line md:grid-cols-4 md:divide-x md:divide-y-0 md:divide-line">
                <MetricCell
                  icon={Percent}
                  iconClass="bg-green-100 text-green-700"
                  label={t("analytics.savingsRate")}
                  sub={t("analytics.ofIncome")}
                  value={formatPercent(metrics.savingsRate)}
                />
                <MetricCell
                  className="border-l border-line md:border-l-0"
                  icon={Receipt}
                  iconClass="bg-orange-100 text-orange-600"
                  label={t("analytics.avgDailySpend")}
                  sub={t("analytics.perDay")}
                  value={formatCurrency(metrics.totalExpense / daysInScope, settings)}
                />
                <MetricCell
                  icon={CalendarClock}
                  iconClass="bg-sky-100 text-sky-600"
                  label={t("analytics.projectedSpend")}
                  sub={t("analytics.byMonthEnd")}
                  value={formatCurrency(metrics.projectedSpending, settings)}
                />
                <MetricCell
                  className="border-l border-line md:border-l-0"
                  icon={BarChart2}
                  iconClass={expenseIconClass}
                  label={t("analytics.expenseChange")}
                  sub={t("analytics.vsLastMonth")}
                  tone={expenseTone}
                  value={`${expenseChangePct > 0 ? "+" : ""}${expenseChangePct}%`}
                />
              </div>
            </div>
          </section>

          {/* Monthly trend — Dashboard-style panel header */}
          <section className="panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-base font-semibold text-ink">
                    {t("analytics.monthlyTrend")}
                  </h2>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        aria-label="Monthly trend info"
                        className="flex items-center rounded text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        type="button"
                      >
                        <Info aria-hidden className="h-3.5 w-3.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 space-y-3 p-4" side="bottom">
                      <p className="text-xs leading-5 text-muted">
                        {t("analytics.trendInfoDesc")}
                      </p>
                      <div className="space-y-2">
                        <LegendRow
                          color="oklch(var(--primary))"
                          label={t("common.income")}
                          desc={t("analytics.trendInfoIncome")}
                        />
                        <LegendRow
                          color="oklch(var(--danger))"
                          label={t("common.expense")}
                          desc={t("analytics.trendInfoExpense")}
                        />
                        <LegendRow
                          color="oklch(var(--ink))"
                          label={t("common.net")}
                          desc={t("analytics.trendInfoNet")}
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <p className="mt-0.5 text-sm text-muted">
                  {t("analytics.last12months")}
                </p>
              </div>
              <Badge>{t("analytics.allRecords")}</Badge>
            </div>
            <div className="mt-4">
              <MonthlyTrendChart data={monthlyTrend} settings={settings} />
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <div className="panel p-5">
              <h2 className="text-lg font-semibold text-ink">
                {t("analytics.categoryConcentration")}
              </h2>
              <div className="mt-5">
                {categoryChartData.length ? (
                  <CategoryChart data={categoryChartData} settings={settings} />
                ) : (
                  <p className="text-sm text-muted">
                    {t("analytics.noCategoryData")}
                  </p>
                )}
              </div>
            </div>
            <div className="panel p-5">
              <h2 className="text-lg font-semibold text-ink">
                {t("analytics.largestExpenses")}
              </h2>
              <div className="mt-4 divide-y divide-line">
                {largestExpenses.map((tx) => (
                  <div
                    className="flex items-center justify-between gap-4 py-3"
                    key={tx.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {tx.note || t("common.expense")}
                      </p>
                      <p className="mt-1 text-xs text-muted">{tx.date}</p>
                    </div>
                    <span className="text-sm font-medium tabular text-ink">
                      {formatCurrency(tx.amount, settings)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="panel p-5">
            <h2 className="text-lg font-semibold text-ink">
              {t("analytics.insights")}
            </h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {metrics.insights.map((insight, i) => (
                <p
                  className="rounded-lg bg-surface-2 p-3 text-sm leading-6 text-ink"
                  key={i}
                >
                  {renderInsight(insight, t)}
                </p>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function renderInsight(insight: InsightData, t: ReturnType<typeof useTranslation>["t"]): string {
  switch (insight.type) {
    case "emptyTx": return t("dashboard.insightEmptyTx");
    case "loadDemo": return t("dashboard.insightLoadDemo");
    case "savingsRate": {
      const monthsFull = t("datePicker.monthsFull", { returnObjects: true }) as string[];
      const [year, mm] = insight.month.split("-");
      const monthLabel = `${monthsFull[parseInt(mm, 10) - 1]} ${year}`;
      return t("dashboard.insightSavingsRate", { month: monthLabel, rate: insight.rate });
    }
    case "topCategory": return t("dashboard.insightTopCategory", { name: insight.name, amount: insight.amount });
    case "overBudget": return t("dashboard.insightOverBudget", { label: insight.label, amount: insight.amount });
    case "remainingBudget": return t("dashboard.insightRemainingBudget", { amount: insight.amount });
    case "expenseChange":
      return insight.direction === "higher"
        ? t("dashboard.insightExpenseHigher", { pct: insight.pct })
        : t("dashboard.insightExpenseLower", { pct: insight.pct });
  }
}

function LegendRow({ color, label, desc }: { color: string; label: string; desc: string }) {
  return (
    <div className="flex gap-2">
      <span
        className="mt-1 h-2 w-2 shrink-0 rounded-full"
        style={{ background: color }}
      />
      <div>
        <span className="text-xs font-medium text-ink">{label}</span>
        <span className="text-xs text-muted"> — {desc}</span>
      </div>
    </div>
  );
}

function MetricCell({
  label,
  value,
  sub,
  tone = "default",
  icon: Icon,
  iconClass,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "success" | "danger";
  icon?: LucideIcon;
  iconClass?: string;
  className?: string;
}) {
  const valueClass =
    tone === "success"
      ? "text-success"
      : tone === "danger"
        ? "text-danger"
        : "text-ink";

  return (
    <div className={cn("px-5 py-5", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted">{label}</p>
        {Icon && (
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              iconClass ?? "bg-surface-2 text-muted",
            )}
          >
            <Icon aria-hidden className="h-4 w-4" />
          </div>
        )}
      </div>
      <p className={cn("mt-2 text-2xl font-semibold tabular", valueClass)}>{value}</p>
      {sub ? <p className="mt-1.5 text-xs text-muted">{sub}</p> : null}
    </div>
  );
}
