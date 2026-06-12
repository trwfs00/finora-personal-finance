import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { enUS, th as thLocale } from "date-fns/locale";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { formatCurrency } from "../lib/format";
import { cn } from "../lib/utils";
import type { NetWorthPoint } from "../domain/calculations";
import type { Account, AppSettings } from "../domain/types";

interface ChartProps {
  settings: AppSettings;
}

export const DONUT_COLORS = [
  "#4f7f26",
  "#6ca53c",
  "#88c058",
  "#97c86d",
  "#afd58e",
  "#cbe4b5",
];

export function CashFlowChart({
  data,
  settings,
  tickFormatter,
}: ChartProps & {
  data: Array<{ date: string; income: number; expense: number }>;
  tickFormatter?: (value: string) => string;
}) {
  const { t } = useTranslation();
  const formatTick = tickFormatter ?? ((v: string) => v.slice(-2));
  return (
    <ResponsiveContainer height={260} width="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="incomeGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor="oklch(var(--primary))" stopOpacity={0.22} />
            <stop offset="95%" stopColor="oklch(var(--primary))" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="expenseGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor="oklch(var(--danger))" stopOpacity={0.18} />
            <stop offset="95%" stopColor="oklch(var(--danger))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="oklch(var(--line))" vertical={false} />
        <XAxis
          dataKey="date"
          minTickGap={28}
          stroke="oklch(var(--muted))"
          tick={{ fill: "oklch(var(--muted))", fontSize: 12 }}
          tickFormatter={formatTick}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          stroke="oklch(var(--muted))"
          tick={{ fill: "oklch(var(--muted))", fontSize: 12 }}
          tickFormatter={(value: number) => compactCurrency(value, settings)}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "oklch(var(--surface))",
            border: "1px solid oklch(var(--line))",
            borderRadius: "0.5rem",
            fontSize: "13px",
            color: "oklch(var(--ink))",
          }}
          formatter={(value: number) => formatCurrency(value, settings)}
        />
        <Legend
          wrapperStyle={{ fontSize: "12px", color: "oklch(var(--muted))", paddingTop: "12px" }}
        />
        <Area
          dataKey="income"
          fill="url(#incomeGrad)"
          name={t("common.income")}
          stroke="oklch(var(--primary))"
          strokeWidth={2}
          type="monotone"
        />
        <Area
          dataKey="expense"
          fill="url(#expenseGrad)"
          name={t("common.expense")}
          stroke="oklch(var(--danger))"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          type="monotone"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CategoryDonutChart({
  data,
  settings,
}: ChartProps & {
  data: Array<{ name: string; amount: number; color?: string }>;
}) {
  return (
    <ResponsiveContainer height={180} width="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={52}
          outerRadius={76}
          paddingAngle={2}
          dataKey="amount"
          stroke="none"
        >
          {data.map((item, index) => (
            <Cell key={`cell-${index}`} fill={item.color ?? DONUT_COLORS[index % DONUT_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: "oklch(var(--surface))",
            border: "1px solid oklch(var(--line))",
            borderRadius: "0.5rem",
            fontSize: "13px",
            color: "oklch(var(--ink))",
          }}
          formatter={(value: number) => formatCurrency(value, settings)}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function CategoryChart({
  data,
  settings,
}: ChartProps & {
  data: Array<{ name: string; amount: number }>;
}) {
  const { t } = useTranslation();
  return (
    <ResponsiveContainer height={260} width="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
        <CartesianGrid stroke="oklch(var(--line))" horizontal={false} />
        <XAxis
          stroke="oklch(var(--muted))"
          tick={{ fill: "oklch(var(--muted))", fontSize: 12 }}
          tickFormatter={(value: number) => compactCurrency(value, settings)}
          type="number"
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          dataKey="name"
          stroke="oklch(var(--muted))"
          tick={{ fill: "oklch(var(--ink))", fontSize: 12 }}
          type="category"
          width={92}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "oklch(var(--surface))",
            border: "1px solid oklch(var(--line))",
            borderRadius: "0.5rem",
            fontSize: "13px",
            color: "oklch(var(--ink))",
          }}
          formatter={(value: number) => formatCurrency(value, settings)}
        />
        <Bar dataKey="amount" fill="oklch(var(--primary))" name={t("common.spending")} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MonthlyTrendChart({
  data,
  settings,
}: ChartProps & {
  data: Array<{ month: string; income: number; expense: number; net: number }>;
}) {
  const { t } = useTranslation();
  const locale = dateFnsLocale(settings);
  const formatMonthTick = (v: string) =>
    /^\d{4}-\d{2}$/.test(v) ? format(parseISO(v + "-01"), "MMM yy", { locale }) : v;
  return (
    <ResponsiveContainer height={300} width="100%">
      <LineChart data={data}>
        <CartesianGrid stroke="oklch(var(--line))" vertical={false} />
        <XAxis
          dataKey="month"
          stroke="oklch(var(--muted))"
          tick={{ fill: "oklch(var(--muted))", fontSize: 12 }}
          tickFormatter={formatMonthTick}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          stroke="oklch(var(--muted))"
          tick={{ fill: "oklch(var(--muted))", fontSize: 12 }}
          tickFormatter={(value: number) => compactCurrency(value, settings)}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "oklch(var(--surface))",
            border: "1px solid oklch(var(--line))",
            borderRadius: "0.5rem",
            fontSize: "13px",
            color: "oklch(var(--ink))",
          }}
          formatter={(value: number) => formatCurrency(value, settings)}
          labelFormatter={(label: string) =>
            /^\d{4}-\d{2}$/.test(label) ? format(parseISO(label + "-01"), "MMMM yyyy", { locale }) : label
          }
        />
        <Legend
          wrapperStyle={{ fontSize: "12px", color: "oklch(var(--muted))", paddingTop: "12px" }}
        />
        <Line
          dataKey="income"
          dot={false}
          name={t("common.income")}
          stroke="oklch(var(--primary))"
          strokeWidth={2}
          type="monotone"
        />
        <Line
          dataKey="expense"
          dot={false}
          name={t("common.expense")}
          stroke="oklch(var(--danger))"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          type="monotone"
        />
        <Line
          dataKey="net"
          dot={false}
          name={t("common.net")}
          stroke="oklch(var(--ink))"
          strokeWidth={2}
          type="monotone"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

const ACCOUNT_LINE_COLORS = [
  "#4f7f26", "#6ca53c", "#88c058", "#97c86d",
  "#2563eb", "#7c3aed", "#db2777", "#ea580c",
];

export function NetWorthTrendChart({
  data,
  accounts,
  settings,
}: ChartProps & {
  data: NetWorthPoint[];
  accounts: Account[];
}) {
  const { t } = useTranslation();
  const [range, setRange] = useState<"6M" | "12M" | "24M">("12M");
  const [mode, setMode] = useState<"summary" | "byAccount">("summary");

  const rangeN = range === "6M" ? 6 : range === "12M" ? 12 : 24;
  const sliced = data.slice(-rangeN);

  const netWorthAccounts = accounts.filter((a) => a.includeInNetWorth);

  const tooltipStyle = {
    background: "oklch(var(--surface))",
    border: "1px solid oklch(var(--line))",
    borderRadius: "0.5rem",
    fontSize: "13px",
    color: "oklch(var(--ink))",
  };

  if (netWorthAccounts.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted">
        {t("analytics.noNetWorthAccounts")}
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg bg-surface-2 p-0.5">
          {(["6M", "12M", "24M"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                range === r ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg bg-surface-2 p-0.5">
          {(["summary", "byAccount"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                mode === m ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
              )}
            >
              {m === "summary" ? t("analytics.viewSummary") : t("analytics.viewByAccount")}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer height={300} width="100%">
        <LineChart data={sliced}>
          <CartesianGrid stroke="oklch(var(--line))" vertical={false} />
          <XAxis
            dataKey="month"
            stroke="oklch(var(--muted))"
            tick={{ fill: "oklch(var(--muted))", fontSize: 12 }}
            tickFormatter={(v: string) =>
              /^\d{4}-\d{2}$/.test(v) ? format(parseISO(v + "-01"), "MMM yy", { locale: dateFnsLocale(settings) }) : v
            }
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            stroke="oklch(var(--muted))"
            tick={{ fill: "oklch(var(--muted))", fontSize: 12 }}
            tickFormatter={(v: number) => compactCurrency(v, settings)}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: number, name: string) => [formatCurrency(value, settings), name]}
            labelFormatter={(label: string) =>
              /^\d{4}-\d{2}$/.test(label) ? format(parseISO(label + "-01"), "MMMM yyyy", { locale: dateFnsLocale(settings) }) : label
            }
          />
          <Legend wrapperStyle={{ fontSize: "12px", color: "oklch(var(--muted))", paddingTop: "12px" }} />
          {mode === "summary" ? [
            <Line key="assets" dataKey="assets" dot={false} name={t("analytics.assets")} stroke="oklch(var(--primary))" strokeWidth={2} type="monotone" />,
            <Line key="liabilities" dataKey="liabilities" dot={false} name={t("analytics.liabilities")} stroke="oklch(var(--danger))" strokeWidth={1.5} strokeDasharray="4 2" type="monotone" />,
            <Line key="netWorth" dataKey="netWorth" dot={false} name={t("analytics.netWorth")} stroke="oklch(var(--ink))" strokeWidth={2.5} type="monotone" />,
          ] : netWorthAccounts.map((account, i) => (
            <Line
              key={account.id}
              dataKey={`byAccount.${account.id}`}
              dot={false}
              name={account.name}
              stroke={account.color ?? ACCOUNT_LINE_COLORS[i % ACCOUNT_LINE_COLORS.length]}
              strokeWidth={1.5}
              type="monotone"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function NetWorthSparkline({
  data,
  settings,
}: ChartProps & { data: NetWorthPoint[] }) {
  return (
    <ResponsiveContainer height={64} width="100%">
      <AreaChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
        <XAxis dataKey="month" hide />
        <defs>
          <linearGradient id="nwSparkGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="5%" stopColor="oklch(var(--primary))" stopOpacity={0.25} />
            <stop offset="95%" stopColor="oklch(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip
          contentStyle={{
            background: "oklch(var(--surface))",
            border: "1px solid oklch(var(--line))",
            borderRadius: "0.5rem",
            fontSize: "12px",
            color: "oklch(var(--ink))",
          }}
          formatter={(v: number) => [formatCurrency(v, settings), ""]}
          labelFormatter={(l: string) =>
            /^\d{4}-\d{2}$/.test(l) ? format(parseISO(l + "-01"), "MMM yyyy", { locale: dateFnsLocale(settings) }) : l
          }
        />
        <Area
          dataKey="netWorth"
          dot={false}
          fill="url(#nwSparkGrad)"
          isAnimationActive={false}
          stroke="oklch(var(--primary))"
          strokeWidth={1.5}
          type="monotone"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function dateFnsLocale(settings: AppSettings) {
  return settings.locale === "th-TH" ? thLocale : enUS;
}

function compactCurrency(value: number, settings: AppSettings) {
  return new Intl.NumberFormat(settings.locale, {
    notation: "compact",
    style: "currency",
    currency: settings.currency,
    maximumFractionDigits: 1,
  }).format(value);
}
