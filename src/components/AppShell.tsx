import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  CircleDollarSign,
  LayoutDashboard,
  Monitor,
  Moon,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Repeat,
  Search,
  Settings,
  Sun,
  Target,
  WalletCards,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import logoUrl from "../assets/logo.svg";
import { useShortcutKey } from "../hooks/useShortcutKey";
import i18n from "../i18n";
import { cn } from "../lib/utils";
import { useFinanceStore } from "../store/finance-store";
import { GoogleDriveSyncShortcut } from "./GoogleDriveSyncShortcut";
import { OnboardingModal } from "./OnboardingModal";
import { SpotlightSearch } from "./SpotlightSearch";
import { TransactionForm } from "./TransactionForm";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const THEME_CYCLE = ["system", "light", "dark"] as const;
type AppTheme = (typeof THEME_CYCLE)[number];

const LANG_TO_LOCALE: Record<string, string> = {
  en: "en-US",
  th: "th-TH",
};

const QUICK_CURRENCIES = ["THB", "USD", "EUR", "GBP", "JPY", "SGD", "CNY", "KRW"] as const;

export function AppShell() {
  const { t } = useTranslation();
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const [onboardingOpen, setOnboardingOpen] = useState(() => {
    try {
      return !localStorage.getItem("finora-onboarded");
    } catch {
      return false;
    }
  });
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });

  const initialize = useFinanceStore((state) => state.initialize);
  const initialized = useFinanceStore((state) => state.initialized);
  const error = useFinanceStore((state) => state.error);
  const settings = useFinanceStore((state) => state.settings);
  const updateSettings = useFinanceStore((state) => state.updateSettings);

  function toggleCollapsed() {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sidebar-collapsed", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  function cycleTheme() {
    const idx = THEME_CYCLE.indexOf(settings.theme as AppTheme);
    const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
    void updateSettings({ ...settings, theme: next });
  }

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useShortcutKey({ key: "k", mod: true }, () => setSpotlightOpen(true));
  useShortcutKey({ key: "n" }, () => setQuickAddOpen(true));
  useShortcutKey({ key: "b", mod: true }, toggleCollapsed);
  useShortcutKey({ key: "j", mod: true }, cycleTheme);

  const mainNavItems = [
    { href: "/", label: t("nav.overview"), icon: LayoutDashboard },
    { href: "/transactions", label: t("nav.transactions"), icon: ReceiptText },
    { href: "/budgets", label: t("nav.budgets"), icon: CircleDollarSign },
    { href: "/analytics", label: t("nav.analytics"), icon: BarChart3 },
    { href: "/accounts", label: t("nav.accounts"), icon: WalletCards },
    { href: "/recurring", label: t("nav.recurring"), icon: Repeat },
    { href: "/goals", label: t("nav.goals"), icon: Target },
    { href: "/calendar", label: t("nav.calendar"), icon: CalendarDays },
  ];

  const bottomNavItems = [
    { href: "/settings", label: t("nav.settings"), icon: Settings },
  ];

  // Mobile nav: 4 primary tabs + "More" drawer for the rest
  const primaryNavItems = [
    { href: "/", label: t("nav.overview"), icon: LayoutDashboard },
    { href: "/transactions", label: t("nav.transactions"), icon: ReceiptText },
    { href: "/accounts", label: t("nav.accounts"), icon: WalletCards },
    { href: "/budgets", label: t("nav.budgets"), icon: CircleDollarSign },
  ];

  const secondaryNavItems = [
    { href: "/analytics", label: t("nav.analytics"), icon: BarChart3 },
    { href: "/recurring", label: t("nav.recurring"), icon: Repeat },
    { href: "/goals", label: t("nav.goals"), icon: Target },
    { href: "/calendar", label: t("nav.calendar"), icon: CalendarDays },
    { href: "/settings", label: t("nav.settings"), icon: Settings },
  ];

  const isSecondaryActive = secondaryNavItems.some(
    ({ href }) => href === location.pathname || location.pathname.startsWith(href + "/"),
  );

  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg p-6">
        <div className="panel w-full max-w-sm p-6">
          <div className="h-3 w-16 rounded-full bg-surface-2" />
          <div className="mt-6 h-8 rounded-lg bg-surface-2" />
          <div className="mt-3 h-3 w-3/4 rounded-full bg-surface-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 hidden border-r border-line bg-surface py-4 transition-[width] duration-200 ease-out lg:flex lg:flex-col",
          isCollapsed ? "w-14 px-1.5" : "w-56 px-2",
        )}
      >
        {/* Collapse toggle */}
        <button
          aria-label={isCollapsed ? t("shell.expandSidebar") : t("shell.collapseSidebar")}
          className="absolute -right-3 top-[3.75rem] z-20 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface shadow-sm text-muted transition-colors hover:text-ink"
          onClick={toggleCollapsed}
          type="button"
        >
          <ChevronLeft
            aria-hidden
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200",
              isCollapsed && "rotate-180",
            )}
          />
        </button>

        {/* Logo */}
        <NavLink
          className={cn(
            "mb-4 flex items-center rounded-xl px-2 py-2 transition-colors hover:bg-ink/5",
            isCollapsed ? "justify-center" : "gap-2.5",
          )}
          title={isCollapsed ? "Finora" : undefined}
          to="/"
        >
          <img alt="" aria-hidden className="h-8 w-8 shrink-0 rounded-lg" src={logoUrl} />
          {!isCollapsed && (
            <span className="text-sm font-semibold text-ink">Finora</span>
          )}
        </NavLink>

        {/* Main nav */}
        <nav aria-label={t("nav.menu")} className="flex-1 space-y-0.5">
          {!isCollapsed && (
            <p className="mb-1 px-3 text-[11px] font-medium text-muted">{t("nav.menu")}</p>
          )}
          {mainNavItems.map((item) => (
            <NavItem key={item.href} isCollapsed={isCollapsed} {...item} />
          ))}
        </nav>

        {/* Bottom nav + footer */}
        <div className={cn(isCollapsed ? "space-y-1" : "space-y-3")}>
          <div className="space-y-0.5 border-t border-line pt-3">
            {!isCollapsed && (
              <p className="mb-1 px-3 text-[11px] font-medium text-muted">
                {t("nav.settings")}
              </p>
            )}
            {bottomNavItems.map((item) => (
              <NavItem key={item.href} isCollapsed={isCollapsed} {...item} />
            ))}
          </div>

          {!isCollapsed && (
            <div className="space-y-2 px-1">
              <div className="flex items-center gap-2 px-2 py-1">
                <kbd className="inline-flex h-5 items-center rounded border border-line bg-bg px-1.5 font-mono text-[10px] text-muted">
                  N
                </kbd>
                <span className="text-xs text-muted">{t("shell.quickAdd")}</span>
              </div>
              <div className="rounded-xl border border-line bg-bg px-3 py-2.5">
                <p className="text-xs font-medium text-ink">{t("shell.localWorkspace")}</p>
                <p className="mt-0.5 text-xs leading-4 text-muted">
                  {t("shell.noCloudSync")}
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-2">
          <NavLink
            className="flex shrink-0 items-center gap-2 text-sm font-semibold text-ink"
            to="/"
          >
            <img alt="" aria-hidden className="h-7 w-7 rounded-md" src={logoUrl} />
            Finora
          </NavLink>
          <div className="flex items-center gap-1">
            <GoogleDriveSyncShortcut compact />
            <QuickSettings />
            <button
              aria-label={t("common.search")}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:text-ink"
              onClick={() => setSpotlightOpen(true)}
              type="button"
            >
              <Search aria-hidden className="h-4 w-4" />
            </button>
            <Button onClick={() => setQuickAddOpen(true)} size="sm" variant="primary">
              <Plus aria-hidden className="h-4 w-4" />
              {t("common.add")}
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main
        className={cn(
          "pb-24 transition-[margin] duration-200 ease-out lg:pb-0",
          isCollapsed ? "lg:ml-14" : "lg:ml-56",
        )}
      >
        {/* Desktop top bar */}
        <div className="sticky top-0 z-20 hidden h-14 items-center justify-between gap-2 border-b border-line bg-surface px-6 lg:flex">
          <button
            className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-muted transition-colors hover:text-ink"
            onClick={() => setSpotlightOpen(true)}
            type="button"
          >
            <Search aria-hidden className="h-3.5 w-3.5" />
            <span className="text-xs">{t("shell.searchPlaceholder")}</span>
            <kbd className="ml-1 rounded border border-line bg-surface-2 px-1 font-mono text-[10px]">
              ⌘K
            </kbd>
          </button>

          <div className="flex items-center gap-1">
            <GoogleDriveSyncShortcut />
            <QuickSettings />
            <UserAvatar />
          </div>
        </div>

        {error ? (
          <div className="mx-auto max-w-5xl px-4 pt-4">
            <div className="rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          </div>
        ) : null}
        <Outlet />
      </main>

      {/* FAB */}
      <button
        aria-label={t("shell.quickAddFab")}
        className="fixed bottom-20 right-4 z-30 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all hover:bg-primary/90 hover:shadow-xl active:scale-95 lg:bottom-6"
        onClick={() => setQuickAddOpen(true)}
        type="button"
      >
        <Plus aria-hidden className="h-5 w-5" />
      </button>

      {/* More drawer backdrop */}
      <div
        aria-hidden
        className={cn(
          "fixed inset-0 z-40 bg-ink/20 transition-opacity duration-200 lg:hidden",
          moreOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setMoreOpen(false)}
      />

      {/* More drawer panel */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 rounded-t-2xl border-t border-line bg-surface shadow-2xl transition-transform duration-200 ease-out lg:hidden",
          moreOpen ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="flex justify-center pb-1 pt-3">
          <div className="h-1 w-10 rounded-full bg-ink/20" />
        </div>
        <div className="grid grid-cols-5 gap-1 px-4 pb-6 pt-3">
          {secondaryNavItems.map(({ href, label, icon: Icon }) => (
            <NavLink
              key={href}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-[11px] font-medium transition-colors",
                  isActive ? "bg-primary/8 text-primary" : "text-muted hover:bg-ink/5 hover:text-ink",
                )
              }
              end={href === "/"}
              to={href}
            >
              <Icon aria-hidden className="h-5 w-5" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </div>

      {/* Mobile nav */}
      <nav
        aria-label={t("shell.mobileNav")}
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-bg px-1 py-1 lg:hidden"
      >
        {primaryNavItems.map((item) => (
          <MobileNavItem key={item.href} {...item} />
        ))}
        <button
          aria-label={t("shell.menus")}
          className={cn(
            "flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[11px] font-medium transition-colors",
            isSecondaryActive || moreOpen ? "text-primary" : "text-muted",
          )}
          onClick={() => setMoreOpen((v) => !v)}
          type="button"
        >
          <MoreHorizontal aria-hidden className="h-4 w-4" />
          <span className="w-full truncate text-center">{t("shell.menus")}</span>
        </button>
      </nav>

      <Dialog
        description={t("shell.quickAddDesc")}
        onOpenChange={setQuickAddOpen}
        open={quickAddOpen}
        title={t("shell.quickAddTitle")}
      >
        <TransactionForm onSaved={() => setQuickAddOpen(false)} />
      </Dialog>

      <SpotlightSearch onClose={() => setSpotlightOpen(false)} open={spotlightOpen} />

      <OnboardingModal
        open={initialized && onboardingOpen}
        onDone={() => {
          try {
            localStorage.setItem("finora-onboarded", "1");
          } catch {
            // ignore
          }
          setOnboardingOpen(false);
        }}
      />
    </div>
  );
}

function QuickSettings() {
  const { t } = useTranslation();
  const settings = useFinanceStore((state) => state.settings);
  const updateSettings = useFinanceStore((state) => state.updateSettings);
  const currentLang = i18n.language ?? "en";

  const ThemeIcon =
    settings.theme === "light" ? Sun : settings.theme === "dark" ? Moon : Monitor;

  function cycleTheme() {
    const idx = THEME_CYCLE.indexOf(settings.theme as AppTheme);
    const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
    void updateSettings({ ...settings, theme: next });
  }

  async function toggleLang() {
    const next = currentLang === "en" ? "th" : "en";
    await i18n.changeLanguage(next);
    try {
      localStorage.setItem("finora-lang", next);
    } catch {
      // ignore
    }
    const locale = LANG_TO_LOCALE[next] ?? "en-US";
    void updateSettings({ ...settings, locale });
  }

  return (
    <div aria-label={t("shell.quickSettings")} className="flex items-center gap-0.5" role="group">
      {/* Theme cycle */}
      <button
        aria-label={t("shell.themeToggle")}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-ink/5 hover:text-ink"
        onClick={cycleTheme}
        type="button"
      >
        <ThemeIcon aria-hidden className="h-4 w-4" />
      </button>

      {/* Language toggle */}
      <button
        aria-label={t("shell.switchLang")}
        className="flex h-8 items-center rounded-lg px-2 font-mono text-xs font-medium text-muted transition-colors hover:bg-ink/5 hover:text-ink"
        onClick={() => void toggleLang()}
        type="button"
      >
        {currentLang === "th" ? "TH" : "EN"}
      </button>

      {/* Currency select */}
      <Select
        onValueChange={(value) => void updateSettings({ ...settings, currency: value })}
        value={settings.currency}
      >
        <SelectTrigger className="h-8 w-auto gap-1 border-transparent bg-transparent px-2 shadow-none text-xs font-medium text-muted hover:bg-ink/5 hover:text-ink focus:ring-0 focus:ring-offset-0 [&>svg]:h-3 [&>svg]:w-3">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {QUICK_CURRENCIES.map((code) => (
            <SelectItem key={code} value={code}>
              {code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function UserAvatar() {
  const { t } = useTranslation();
  const username = useFinanceStore((state) => state.settings.username ?? "");

  const initials = username.trim()
    ? username
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("")
    : t("shell.lw");

  return (
    <div
      className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary"
      title={username.trim() || t("shell.localWorkspace")}
    >
      {initials}
    </div>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  isCollapsed,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  isCollapsed: boolean;
}) {
  return (
    <NavLink
      className={({ isActive }) =>
        cn(
          "flex items-center rounded-xl py-2.5 text-sm transition-colors",
          isCollapsed ? "justify-center px-2" : "gap-2.5 px-3",
          isActive
            ? "bg-primary/8 font-medium text-primary"
            : "font-normal text-muted hover:bg-ink/5 hover:text-ink",
        )
      }
      end={href === "/"}
      title={isCollapsed ? label : undefined}
      to={href}
    >
      <Icon aria-hidden className="h-4 w-4 shrink-0" />
      {!isCollapsed && label}
    </NavLink>
  );
}

function MobileNavItem({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}) {
  return (
    <NavLink
      className={({ isActive }) =>
        cn(
          "flex min-w-0 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[11px] font-medium transition-colors",
          isActive ? "text-primary" : "text-muted",
        )
      }
      end={href === "/"}
      to={href}
    >
      <Icon aria-hidden className="h-4 w-4" />
      <span className="w-full truncate text-center">{label}</span>
    </NavLink>
  );
}
