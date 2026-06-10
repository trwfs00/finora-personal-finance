import { useState } from "react";
import { useTranslation } from "react-i18next";

import i18n from "../i18n";
import { useFinanceStore } from "../store/finance-store";
import { Button } from "./ui/button";
import { Field, Input } from "./ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import * as DialogPrimitive from "@radix-ui/react-dialog";

const LANG_TO_LOCALE: Record<string, string> = {
  en: "en-US",
  th: "th-TH",
};

const CURRENCY_OPTIONS = [
  { code: "THB", name: "Thai Baht", symbol: "฿" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "KRW", name: "Korean Won", symbol: "₩" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
] as const;

interface OnboardingModalProps {
  open: boolean;
  onDone: () => void;
}

export function OnboardingModal({ open, onDone }: OnboardingModalProps) {
  const { t } = useTranslation();
  const settings = useFinanceStore((state) => state.settings);
  const updateSettings = useFinanceStore((state) => state.updateSettings);

  const [username, setUsername] = useState("");
  const [lang, setLang] = useState(i18n.language ?? "en");
  const [currency, setCurrency] = useState(settings.currency ?? "THB");
  const [theme, setTheme] = useState(settings.theme ?? "system");

  async function handleGetStarted() {
    const locale = LANG_TO_LOCALE[lang] ?? "en-US";
    if (lang !== (i18n.language ?? "en")) {
      await i18n.changeLanguage(lang);
      try {
        localStorage.setItem("finora-lang", lang);
      } catch {
        // ignore
      }
    }
    await updateSettings({ ...settings, username, currency, theme, locale });
    onDone();
  }

  function handleSkip() {
    onDone();
  }

  return (
    <DialogPrimitive.Root open={open}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onEscapeKeyDown={handleSkip}
          onInteractOutside={(e) => e.preventDefault()}
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-surface p-6 shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
        >
          {/* Header */}
          <div className="mb-6">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-primary">
              {t("onboarding.step")}
            </p>
            <DialogPrimitive.Title className="text-xl font-semibold text-ink">
              {t("onboarding.title")}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-2 text-sm leading-6 text-muted">
              {t("onboarding.desc")}
            </DialogPrimitive.Description>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <Field label={t("settings.username")} htmlFor="ob-username">
              <Input
                autoFocus
                id="ob-username"
                maxLength={40}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("settings.usernamePlaceholder")}
                value={username}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label={t("settings.language")} htmlFor="ob-lang">
                <Select onValueChange={setLang} value={lang}>
                  <SelectTrigger id="ob-lang">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">{t("settings.langEn")}</SelectItem>
                    <SelectItem value="th">{t("settings.langTh")}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label={t("settings.theme")} htmlFor="ob-theme">
                <Select onValueChange={(v) => setTheme(v as typeof theme)} value={theme}>
                  <SelectTrigger id="ob-theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">{t("settings.themeSystem")}</SelectItem>
                    <SelectItem value="light">{t("settings.themeLight")}</SelectItem>
                    <SelectItem value="dark">{t("settings.themeDark")}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label={t("settings.currency")} htmlFor="ob-currency">
              <Select onValueChange={setCurrency} value={currency}>
                <SelectTrigger id="ob-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map(({ code, name, symbol }) => (
                    <SelectItem key={code} value={code} textValue={code}>
                      <span className="flex items-center gap-2">
                        <span className="w-8 font-mono text-xs font-medium">{code}</span>
                        <span className="text-muted">{symbol} · {name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              className="text-sm text-muted transition-colors hover:text-ink"
              onClick={handleSkip}
              type="button"
            >
              {t("onboarding.skip")}
            </button>
            <Button onClick={() => void handleGetStarted()} variant="primary">
              {t("onboarding.getStarted")}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
