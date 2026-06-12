import {
  ArrowUpRight,
  CreditCard,
  Percent,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { CashFlowChart, CategoryDonutChart, DONUT_COLORS, NetWorthSparkline } from "../components/Charts";
import { Button } from "../components/ui/button";
import { MonthPicker } from "../components/ui/date-picker";
import { EmptyState } from "../components/ui/empty-state";
import { Progress } from "../components/ui/progress";
import { calculateDashboardMetrics, calculateNetWorthHistory, type InsightData } from "../domain/calculations";
import type { Category } from "../domain/types";
import { currentMonthKey, formatCurrency, formatPercent } from "../lib/format";
import { cn } from "../lib/utils";
import { useFinanceStore } from "../store/finance-store";
import { Link } from "react-router-dom";

export function DashboardPage() {
  const { t } = useTranslation();
  const [month, setMonth] = useState(currentMonthKey());
  const [chartView, setChartView] = useState<"daily" | "monthly" | "yearly">("daily");

  const transactions = useFinanceStore((state) => state.transactions);
  const categories = useFinanceStore((state) => state.categories);
  const accounts = useFinanceStore((state) => state.accounts);
  const budgets = useFinanceStore((state) => state.budgets);
  const settings = useFinanceStore((state) => state.settings);
  const demoLoaded = useFinanceStore((state) => state.demoLoaded);
  const loadDemoData = useFinanceStore((state) => state.loadDemoData);
  const clearDemoData = useFinanceStore((state) => state.clearDemoData);

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

  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const accountMap = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );

  const categoryChartData = metrics.topCategories.map((item) => ({
    name: item.category.name,
    amount: item.amount,
    color: item.category.color,
  }));

  const donutTotal = categoryChartData.reduce((sum, d) => sum + d.amount, 0);
  const hasTransactions = transactions.length > 0;

  const netWorthHistory = useMemo(
    () => calculateNetWorthHistory(accounts, transactions, 12),
    [accounts, transactions],
  );

  const hasNetWorthAccounts = accounts.some((a) => a.includeInNetWorth);

  const netWorthMoM = useMemo(() => {
    if (netWorthHistory.length < 2) return null;
    const prev = netWorthHistory[netWorthHistory.length - 2].netWorth;
    const curr = netWorthHistory[netWorthHistory.length - 1].netWorth;
    return curr - prev;
  }, [netWorthHistory]);

  const monthlyData = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const tx of transactions) {
      if (tx.type !== "income" && tx.type !== "expense") continue;
      const key = tx.date.slice(0, 7);
      const entry = map.get(key) ?? { income: 0, expense: 0 };
      if (tx.type === "income") entry.income += tx.amount;
      else entry.expense += tx.amount;
      map.set(key, entry);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([date, v]) => ({ date, ...v }));
  }, [transactions]);

  const monthsAbbr = t("datePicker.monthsAbbr", { returnObjects: true }) as string[];

  function dailyTick(v: string) {
    const [, m, d] = v.split("-");
    return `${parseInt(d, 10)} ${monthsAbbr[parseInt(m, 10) - 1]}`;
  }
  function monthlyTick(v: string) {
    const [, m] = v.split("-");
    return monthsAbbr[parseInt(m, 10) - 1] ?? v;
  }
  function yearlyTick(v: string) {
    return v;
  }

  const yearlyData = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const tx of transactions) {
      if (tx.type !== "income" && tx.type !== "expense") continue;
      const key = tx.date.slice(0, 4);
      const entry = map.get(key) ?? { income: 0, expense: 0 };
      if (tx.type === "income") entry.income += tx.amount;
      else entry.expense += tx.amount;
      map.set(key, entry);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-5)
      .map(([date, v]) => ({ date, ...v }));
  }, [transactions]);

  const chartViewLabels = [
    { key: "daily" as const, label: t("dashboard.viewDaily") },
    { key: "monthly" as const, label: t("dashboard.viewMonthly") },
    { key: "yearly" as const, label: t("dashboard.viewYearly") },
  ];

  const monthLabel = useMemo(() => {
    const monthsFull = t("datePicker.monthsFull", { returnObjects: true }) as string[];
    const [year, mm] = month.split("-");
    return `${monthsFull[parseInt(mm, 10) - 1]} ${year}`;
  }, [month, t]);

  const username = (settings.username ?? "").trim();
  const greeting = useMemo(() => {
    if (!username) return null;
    const hour = new Date().getHours();
    const key =
      hour >= 5 && hour < 12
        ? "dashboard.greetingMorning"
        : hour >= 12 && hour < 17
          ? "dashboard.greetingAfternoon"
          : "dashboard.greetingEvening";
    return t(key, { name: username });
  }, [username, t]);

  return (
    <div className="section-shell px-4 py-6 lg:px-8 lg:py-8">
      {/* Page header */}
      <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">
            {greeting ?? t("dashboard.title")}
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {t("dashboard.subtitle", { month: monthLabel })}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <MonthPicker
            ariaLabel={t("dashboard.title")}
            className="w-40"
            onChange={setMonth}
            value={month}
          />
        </div>
      </div>

      {!hasTransactions ? (
        <div className="mt-8">
          <EmptyState
            action={
              <Button onClick={() => void loadDemoData()} variant="primary">
                {t("dashboard.loadDemoData")}
              </Button>
            }
            description={t("dashboard.emptyDesc")}
            title={t("dashboard.emptyTitle")}
          />
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {demoLoaded ? (
            <div className="flex flex-col gap-3 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-ink">{t("dashboard.demoLoaded")}</p>
                <p className="mt-0.5 text-sm text-muted">{t("dashboard.demoClearHint")}</p>
              </div>
              <Button onClick={() => void clearDemoData()} size="sm" variant="secondary">
                {t("dashboard.clearDemoData")}
              </Button>
            </div>
          ) : null}

          {/* Metric strip */}
          <section aria-label="Summary metrics">
            <div className="panel overflow-hidden">
              <div className="grid grid-cols-2 divide-y divide-line md:grid-cols-4 md:divide-x md:divide-y-0 md:divide-line">
                <MetricCell
                  icon={ArrowUpRight}
                  iconClass="bg-green-100 text-green-700"
                  label={t("common.income")}
                  sub={t("dashboard.totalEarned")}
                  value={formatCurrency(metrics.totalIncome, settings)}
                />
                <MetricCell
                  className="border-l border-line md:border-l-0"
                  icon={CreditCard}
                  iconClass="bg-orange-100 text-orange-600"
                  label={t("dashboard.totalSpent")}
                  sub={t("dashboard.ofPeriod")}
                  value={formatCurrency(metrics.totalExpense, settings)}
                />
                <MetricCell
                  icon={Wallet}
                  iconClass="bg-sky-100 text-sky-600"
                  label={t("dashboard.remaining")}
                  sub={
                    metrics.remainingBudget === null
                      ? t("dashboard.noBudgetSet")
                      : t("dashboard.stillAvailable")
                  }
                  tone={metrics.netSavings >= 0 ? "success" : "danger"}
                  value={
                    metrics.remainingBudget === null
                      ? formatCurrency(metrics.netSavings, settings)
                      : formatCurrency(metrics.remainingBudget, settings)
                  }
                />
                <MetricCell
                  className="border-l border-line md:border-l-0"
                  icon={Percent}
                  iconClass="bg-green-100 text-green-700"
                  label={t("dashboard.savingsRate")}
                  sub={t("dashboard.ofIncome")}
                  trend={
                    metrics.monthOverMonthExpenseChange !== 0
                      ? {
                          value: -Math.round(metrics.monthOverMonthExpenseChange),
                          label: t("dashboard.vsLastMonth"),
                        }
                      : undefined
                  }
                  value={formatPercent(metrics.savingsRate)}
                />
              </div>
            </div>
          </section>

          {/* Calm insights strip */}
          {metrics.insights.length > 0 && (
            <aside
              aria-label={t("dashboard.insightsAria")}
              className="flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3.5"
            >
              <Sparkles
                aria-hidden
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70"
              />
              <div className="space-y-1">
                {metrics.insights.slice(0, 2).map((insight, i) => (
                  <p key={i} className="text-sm leading-5 text-muted">
                    {renderInsight(insight, t)}
                  </p>
                ))}
              </div>
            </aside>
          )}

          {/* Net Worth sparkline */}
          {hasNetWorthAccounts && (
            <section aria-label={t("dashboard.netWorthTrend")}>
              <div className="panel p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted">{t("dashboard.netWorthTrend")}</p>
                    <p className="mt-1 text-2xl font-bold tabular text-ink">
                      {formatCurrency(metrics.netWorth, settings)}
                    </p>
                    {netWorthMoM !== null && (
                      <p className={cn("mt-0.5 text-sm tabular", netWorthMoM >= 0 ? "text-success" : "text-danger")}>
                        {netWorthMoM >= 0 ? "+" : ""}
                        {formatCurrency(netWorthMoM, settings)}
                        {" "}
                        {t("dashboard.vsLastMonth")}
                      </p>
                    )}
                  </div>
                  <Link
                    className="shrink-0 text-xs text-muted underline-offset-2 transition-colors hover:text-ink hover:underline"
                    to="/analytics"
                  >
                    {t("dashboard.viewHistory")} →
                  </Link>
                </div>
                <div className="mt-4">
                  <NetWorthSparkline data={netWorthHistory} settings={settings} />
                </div>
              </div>
            </section>
          )}

          {/* Main grid — flat 4-cell so rows align across columns */}
          <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
            {/* [0] cash flow chart */}
            <section aria-label={t("dashboard.txOverview")}>
              <div className="panel h-full p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-ink">
                      {t("dashboard.txOverview")}
                    </h2>
                    <p className="mt-0.5 text-sm text-muted">
                      {chartView === "daily"
                        ? t("dashboard.dailyView", { month })
                        : chartView === "monthly"
                          ? t("dashboard.monthlyView")
                          : t("dashboard.yearlyView")}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5">
                    {chartViewLabels.map(({ key, label }) => (
                      <button
                        key={key}
                        className={cn(
                          "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                          chartView === key
                            ? "bg-surface text-ink shadow-sm"
                            : "text-muted hover:text-ink",
                        )}
                        onClick={() => setChartView(key)}
                        type="button"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-4">
                  <CashFlowChart
                    data={
                      chartView === "daily"
                        ? metrics.dailyTrend
                        : chartView === "monthly"
                          ? monthlyData
                          : yearlyData
                    }
                    settings={settings}
                    tickFormatter={
                      chartView === "daily"
                        ? dailyTick
                        : chartView === "monthly"
                          ? monthlyTick
                          : yearlyTick
                    }
                  />
                </div>
              </div>
            </section>

            {/* [1] category donut */}
            <section aria-label={t("dashboard.spendingByCategory")}>
              <div className="panel h-full p-5">
                <h2 className="text-base font-semibold text-ink">
                  {t("dashboard.spendingByCategory")}
                </h2>

                {categoryChartData.length > 0 ? (
                  <>
                    <div className="relative mt-3">
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-lg font-semibold tabular text-ink">
                          {formatCurrency(donutTotal, settings)}
                        </p>
                        <p className="text-xs text-muted">{t("dashboard.totalSpentLabel")}</p>
                      </div>
                      <CategoryDonutChart data={categoryChartData} settings={settings} />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2.5">
                      {categoryChartData.slice(0, 6).map((item, index) => {
                        const pct =
                          donutTotal > 0
                            ? Math.round((item.amount / donutTotal) * 100)
                            : 0;
                        return (
                          <div key={item.name} className="flex items-center gap-2">
                            <div
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{
                                background:
                                  item.color ?? DONUT_COLORS[index % DONUT_COLORS.length],
                              }}
                            />
                            <span className="flex-1 truncate text-xs text-ink">
                              {item.name}
                            </span>
                            <span className="tabular text-xs text-muted">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="py-10 text-center text-sm text-muted">
                    {t("dashboard.noCategoryData")}
                  </p>
                )}
              </div>
            </section>

            {/* [2] recent transactions */}
            <section aria-label={t("dashboard.recentTxTitle")}>
              <div className="panel h-full">
                <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
                  <h2 className="text-base font-semibold text-ink">
                    {t("dashboard.recentTxTitle")}
                  </h2>
                  <span className="text-xs text-muted">
                    {t("dashboard.recent", { count: metrics.recentTransactions.length })}
                  </span>
                </div>

                <div className="hidden grid-cols-[1fr_120px_90px_100px] gap-3 px-5 py-2 sm:grid">
                  <span className="text-xs font-medium text-muted">
                    {t("dashboard.colReceiver")}
                  </span>
                  <span className="text-xs font-medium text-muted">
                    {t("dashboard.colCategory")}
                  </span>
                  <span className="text-xs font-medium text-muted">
                    {t("dashboard.colDate")}
                  </span>
                  <span className="text-right text-xs font-medium text-muted">
                    {t("dashboard.colAmount")}
                  </span>
                </div>

                <div className="divide-y divide-line">
                  {metrics.recentTransactions.length > 0 ? (
                    metrics.recentTransactions.map((tx) => {
                      const cat = tx.categoryId
                        ? categoryMap.get(tx.categoryId)
                        : undefined;
                      return (
                        <div
                          key={tx.id}
                          className="grid grid-cols-[1fr_auto] gap-3 px-5 py-3 sm:grid-cols-[1fr_120px_90px_100px] sm:items-center"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-ink">
                              {tx.note ||
                                (tx.type === "income"
                                  ? t("common.income")
                                  : tx.type === "transfer"
                                    ? t("common.transfer")
                                    : t("common.expense"))}
                              {tx.type === "transfer" && (
                                <span className="ml-1.5 font-normal text-muted">
                                  {accountMap.get(tx.fromAccountId ?? "")?.name ?? ""}
                                  {" → "}
                                  {accountMap.get(tx.toAccountId ?? "")?.name ?? ""}
                                </span>
                              )}
                            </p>
                            <p className="mt-0.5 text-xs text-muted sm:hidden">
                              {tx.date}
                            </p>
                          </div>
                          <div className="flex items-center justify-end sm:justify-start">
                            <CategoryBadge category={cat} txType={tx.type} />
                          </div>
                          <p className="hidden text-xs text-muted sm:block">{tx.date}</p>
                          <p
                            className={cn(
                              "col-span-2 text-right text-sm font-medium tabular sm:col-span-1",
                              tx.type === "income" ? "text-success" : "text-ink",
                            )}
                          >
                            {tx.type === "income" ? "+" : "−"}
                            {formatCurrency(tx.amount, settings)}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <p className="px-5 py-6 text-center text-sm text-muted">
                      {t("dashboard.noRecentTx")}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* [3] budget / position */}
            <section aria-label="Budget and position">
              <div className="panel h-full p-5">
                {metrics.budgetUsage.length > 0 ? (
                  <>
                    <h2 className="text-base font-semibold text-ink">
                      {t("dashboard.budgetUsage")}
                    </h2>
                    <div className="mt-4 space-y-4">
                      {metrics.budgetUsage.slice(0, 4).map((budget) => (
                        <div key={budget.label}>
                          <div className="mb-1.5 flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-ink">
                                {budget.label}
                              </p>
                              <p className="text-xs text-muted">
                                {budget.status === "over"
                                  ? t("dashboard.overBudget")
                                  : budget.status === "at"
                                    ? t("dashboard.atLimit")
                                    : budget.status === "near"
                                      ? t("dashboard.approaching")
                                      : t("dashboard.onTrack")}
                              </p>
                            </div>
                            <p className="shrink-0 tabular text-xs text-muted">
                              {formatCurrency(budget.actualAmount, settings)} /{" "}
                              {formatCurrency(budget.budgetAmount, settings)}
                            </p>
                          </div>
                          <Progress
                            tone={
                              budget.status === "over"
                                ? "danger"
                                : budget.status === "near"
                                  ? "warning"
                                  : "primary"
                            }
                            value={budget.usage}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-base font-semibold text-ink">
                      {t("dashboard.financialPosition")}
                    </h2>
                    <div className="mt-4">
                      <PositionRow
                        label={t("dashboard.netWorth")}
                        value={formatCurrency(metrics.netWorth, settings)}
                      />
                      <PositionRow
                        label={t("dashboard.projectedSpending")}
                        value={formatCurrency(metrics.projectedSpending, settings)}
                      />
                      <PositionRow
                        label={t("dashboard.monthOverMonth")}
                        tone={
                          metrics.monthOverMonthExpenseChange > 10
                            ? "danger"
                            : metrics.monthOverMonthExpenseChange < -5
                              ? "success"
                              : "default"
                        }
                        value={`${metrics.monthOverMonthExpenseChange > 0 ? "+" : ""}${Math.round(metrics.monthOverMonthExpenseChange)}% ${t("dashboard.expenses")}`}
                      />
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>
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

function CategoryBadge({
  category,
  txType,
}: {
  category?: Category;
  txType: string;
}) {
  const { t } = useTranslation();
  const name =
    category?.name ??
    (txType === "income"
      ? t("common.income")
      : txType === "transfer"
        ? t("common.transfer")
        : t("common.expense"));
  const dotColor =
    category?.color ??
    (txType === "income" ? "oklch(0.56 0.16 145)" : "oklch(var(--muted))");
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-2 py-0.5 text-xs font-medium text-ink">
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: dotColor }}
      />
      {name}
    </span>
  );
}

function MetricCell({
  label,
  value,
  sub,
  tone = "default",
  trend,
  icon: Icon,
  iconClass,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "success" | "danger";
  trend?: { value: number; label: string };
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
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        {sub ? <p className="text-xs text-muted">{sub}</p> : null}
        {trend ? (
          <span
            className={cn(
              "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium",
              trend.value > 0 ? "bg-green-100 text-green-900" : "bg-danger/10 text-danger",
            )}
          >
            {trend.value > 0 ? "+" : ""}
            {trend.value}%
          </span>
        ) : null}
      </div>
    </div>
  );
}

function PositionRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger";
}) {
  const valueClass =
    tone === "success"
      ? "text-success"
      : tone === "danger"
        ? "text-danger"
        : "text-ink";

  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className={cn("tabular text-sm font-medium", valueClass)}>{value}</span>
    </div>
  );
}
