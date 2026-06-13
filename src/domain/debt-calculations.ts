import { addMonths, format } from "date-fns";
import { enUS, th as thLocale } from "date-fns/locale";

import type { Debt } from "./types";

export interface DebtSnapshot {
  remainingBalance: number;
  monthlyPayment: number;
  monthsToPayoff: number;
  payoffDate: Date | null;
  totalInterestRemaining: number;
}

export interface WhatIfResult {
  baseline: DebtSnapshot;
  withExtra: DebtSnapshot;
  monthsSaved: number;
  interestSaved: number;
}

export interface PayoffOrder {
  debt: Debt;
  balance: number;
  payoffDate: Date | null;
  totalInterest: number;
}

export interface PayoffPlan {
  strategy: "avalanche" | "snowball";
  order: PayoffOrder[];
  totalInterest: number;
  debtFreeDate: Date | null;
}

// Standard amortization: n = -ln(1 - P·r/M) / ln(1+r)
// For zero interest: n = P / M
// Returns Infinity if payment doesn't cover interest
export function calcPayoffMonths(balance: number, apr: number, monthly: number): number {
  if (balance <= 0) return 0;
  if (monthly <= 0) return Infinity;

  if (apr === 0) {
    return Math.ceil(balance / monthly);
  }

  const r = apr / 100 / 12;
  const interest = balance * r;
  if (monthly <= interest) return Infinity;

  return Math.ceil(-Math.log(1 - (balance * r) / monthly) / Math.log(1 + r));
}

function calcTotalInterest(balance: number, apr: number, monthly: number, months: number): number {
  if (apr === 0 || months === Infinity) return 0;
  return Math.max(0, monthly * months - balance);
}

function makeSnapshot(balance: number, debt: Debt, extraMonthly: number): DebtSnapshot {
  const monthly = debt.minimumPayment + extraMonthly;
  const months = calcPayoffMonths(balance, debt.interestRate, monthly);
  const totalInterest = months === Infinity ? 0 : calcTotalInterest(balance, debt.interestRate, monthly, months);
  const payoffDate = months === Infinity ? null : addMonths(new Date(), months);

  return {
    remainingBalance: balance,
    monthlyPayment: monthly,
    monthsToPayoff: months,
    payoffDate,
    totalInterestRemaining: totalInterest,
  };
}

export function calcWhatIf(
  debt: Debt,
  currentBalance: number,
  extraMonthly: number,
): WhatIfResult {
  const baseline = makeSnapshot(currentBalance, debt, 0);
  const withExtra = makeSnapshot(currentBalance, debt, extraMonthly);

  const monthsSaved =
    baseline.monthsToPayoff === Infinity || withExtra.monthsToPayoff === Infinity
      ? 0
      : Math.max(0, baseline.monthsToPayoff - withExtra.monthsToPayoff);

  const interestSaved = Math.max(
    0,
    baseline.totalInterestRemaining - withExtra.totalInterestRemaining,
  );

  return { baseline, withExtra, monthsSaved, interestSaved };
}

export function calcPayoffPlan(
  debts: Debt[],
  balances: Record<string, number>,
): { avalanche: PayoffPlan; snowball: PayoffPlan } {
  const active = debts.filter((d) => !d.isArchived && (balances[d.id] ?? d.principal) > 0);

  function buildPlan(strategy: "avalanche" | "snowball"): PayoffPlan {
    const sorted = [...active].sort((a, b) => {
      const balA = balances[a.id] ?? a.principal;
      const balB = balances[b.id] ?? b.principal;
      if (strategy === "avalanche") return b.interestRate - a.interestRate;
      return balA - balB;
    });

    const order: PayoffOrder[] = sorted.map((debt) => {
      const balance = balances[debt.id] ?? debt.principal;
      const months = calcPayoffMonths(balance, debt.interestRate, debt.minimumPayment);
      const totalInterest = months === Infinity ? 0 : calcTotalInterest(balance, debt.interestRate, debt.minimumPayment, months);
      const payoffDate = months === Infinity ? null : addMonths(new Date(), months);
      return { debt, balance, payoffDate, totalInterest };
    });

    const totalInterest = order.reduce((sum, o) => sum + o.totalInterest, 0);
    const validDates = order.map((o) => o.payoffDate).filter((d): d is Date => d !== null);
    const debtFreeDate = validDates.length > 0
      ? new Date(Math.max(...validDates.map((d) => d.getTime())))
      : null;

    return { strategy, order, totalInterest, debtFreeDate };
  }

  return {
    avalanche: buildPlan("avalanche"),
    snowball: buildPlan("snowball"),
  };
}

export function formatPayoffDate(date: Date | null, locale?: string): string {
  if (!date) return "—";
  return format(date, "MMM yyyy", { locale: locale === "th-TH" ? thLocale : enUS });
}
