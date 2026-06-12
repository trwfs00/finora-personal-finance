import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AppShell } from "./components/AppShell";
import { AccountsPage } from "./pages/AccountsPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { BudgetsPage } from "./pages/BudgetsPage";
import { CalendarPage } from "./pages/CalendarPage";
import { DashboardPage } from "./pages/DashboardPage";
import { GoalsPage } from "./pages/GoalsPage";
import { RecurringPage } from "./pages/RecurringPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { useFinanceStore } from "./store/finance-store";

export function App() {
  return (
    <BrowserRouter>
      <ThemeSync />
      <Routes>
        <Route element={<AppShell />} path="/">
          <Route index element={<DashboardPage />} />
          <Route element={<TransactionsPage />} path="transactions" />
          <Route element={<BudgetsPage />} path="budgets" />
          <Route element={<AnalyticsPage />} path="analytics" />
          <Route element={<AccountsPage />} path="accounts" />
          <Route element={<RecurringPage />} path="recurring" />
          <Route element={<GoalsPage />} path="goals" />
          <Route element={<CalendarPage />} path="calendar" />
          <Route element={<SettingsPage />} path="settings" />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function ThemeSync() {
  const theme = useFinanceStore((state) => state.settings.theme);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    function applyTheme() {
      const resolved = theme === "system" ? (media.matches ? "dark" : "light") : theme;
      document.documentElement.classList.toggle("dark", resolved === "dark");
    }

    applyTheme();
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [theme]);

  return null;
}
