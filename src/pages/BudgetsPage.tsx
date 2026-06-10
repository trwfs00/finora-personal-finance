import { Info } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { BudgetEditor } from "../components/BudgetEditor";
import { Badge } from "../components/ui/badge";
import { MonthPicker } from "../components/ui/date-picker";
import { EmptyState } from "../components/ui/empty-state";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Progress } from "../components/ui/progress";
import { calculateDashboardMetrics } from "../domain/calculations";
import { currentMonthKey, formatCurrency } from "../lib/format";
import { useFinanceStore } from "../store/finance-store";

export function BudgetsPage() {
  const { t } = useTranslation();
  const [month, setMonth] = useState(currentMonthKey());
  const transactions = useFinanceStore((state) => state.transactions);
  const categories = useFinanceStore((state) => state.categories);
  const accounts = useFinanceStore((state) => state.accounts);
  const budgets = useFinanceStore((state) => state.budgets);
  const settings = useFinanceStore((state) => state.settings);
  const budget = budgets.find((item) => item.month === month);
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

  return (
    <div className="section-shell px-4 py-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="page-title">{t("budgets.title")}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            {t("budgets.subtitle")}
          </p>
        </div>
        <MonthPicker
          ariaLabel={t("budgets.title")}
          className="w-40"
          onChange={setMonth}
          value={month}
        />
      </div>

      <div className="grid gap-6 pt-6 xl:grid-cols-[1fr_0.9fr]">
        <div className="panel p-5">
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-semibold text-ink">{t("budgets.monthlySetup")}</h2>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  aria-label="Monthly setup info"
                  className="flex items-center rounded text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  type="button"
                >
                  <Info aria-hidden className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 space-y-3 p-4" side="bottom">
                <p className="text-xs leading-5 text-muted">
                  {t("budgets.setupInfoDesc")}
                </p>
                <div className="rounded-lg bg-surface-2 p-3 space-y-1">
                  <p className="text-xs font-medium text-ink">
                    {t("budgets.setupInfoRolloverTitle")}
                  </p>
                  <p className="text-xs leading-5 text-muted">
                    {t("budgets.setupInfoRolloverDesc")}
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <p className="mt-1 text-sm text-muted">{t("budgets.monthlySetupDesc")}</p>
          <div className="mt-5">
            <BudgetEditor budget={budget} month={month} />
          </div>
        </div>

        <div className="panel p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">{t("budgets.budgetVsActual")}</h2>
              <p className="mt-1 text-sm text-muted">{t("budgets.budgetVsActualDesc")}</p>
            </div>
            <Badge>{month}</Badge>
          </div>
          <div className="mt-5 space-y-4">
            {metrics.budgetUsage.length > 0 ? (
              metrics.budgetUsage.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-ink">{item.label}</p>
                      <p className="mt-1 text-xs text-muted">
                        {item.status === "over"
                          ? t("budgets.overBudget")
                          : item.status === "at"
                            ? t("budgets.atBudget")
                            : item.status === "near"
                              ? t("budgets.approachingBudget")
                              : t("budgets.onTrack")}
                      </p>
                    </div>
                    <p className="text-right text-sm tabular text-muted">
                      {formatCurrency(item.actualAmount, settings)} /{" "}
                      {formatCurrency(item.budgetAmount, settings)}
                    </p>
                  </div>
                  <Progress
                    tone={
                      item.status === "over"
                        ? "danger"
                        : item.status === "near"
                          ? "warning"
                          : "primary"
                    }
                    value={item.usage}
                  />
                </div>
              ))
            ) : (
              <EmptyState
                description={t("budgets.emptyDesc")}
                title={t("budgets.emptyTitle")}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
