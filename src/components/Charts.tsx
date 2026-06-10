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
import { useTranslation } from "react-i18next";

import { formatCurrency } from "../lib/format";
import type { AppSettings } from "../domain/types";

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
  return (
    <ResponsiveContainer height={300} width="100%">
      <LineChart data={data}>
        <CartesianGrid stroke="oklch(var(--line))" vertical={false} />
        <XAxis
          dataKey="month"
          stroke="oklch(var(--muted))"
          tick={{ fill: "oklch(var(--muted))", fontSize: 12 }}
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

function compactCurrency(value: number, settings: AppSettings) {
  return new Intl.NumberFormat(settings.locale, {
    notation: "compact",
    style: "currency",
    currency: settings.currency,
    maximumFractionDigits: 1,
  }).format(value);
}
