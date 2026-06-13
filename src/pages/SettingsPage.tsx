import {
  Download,
  FileJson,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { CategoryManager } from "../components/CategoryManager"
import { GoogleDriveSyncPanel } from "../components/GoogleDriveSyncPanel"
import { GuideCenter } from "../components/help/GuideCenter"
import { HelpButton } from "../components/help/HelpButton"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { ConfirmDialog } from "../components/ui/confirm-dialog"
import { Field, Input } from "../components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"
import {
  createBackup,
  createTransactionCsv,
  parseBackup,
} from "../domain/backup"
import { MRR_RATES } from "../lib/debt-presets"
import { downloadFile } from "../lib/format"
import i18n from "../i18n"
import { useFinanceStore } from "../store/finance-store"

const LANG_TO_LOCALE: Record<string, string> = {
  en: "en-US",
  th: "th-TH",
}

const CURRENCY_OPTIONS = [
  { code: "THB", name: "Thai Baht", symbol: "฿" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "KRW", name: "Korean Won", symbol: "₩" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
] as const

const DATE_FORMAT_OPTIONS = [
  { pattern: "dd/MM/yyyy", example: "31/12/2024" },
  { pattern: "MM/dd/yyyy", example: "12/31/2024" },
  { pattern: "yyyy-MM-dd", example: "2024-12-31" },
  { pattern: "dd MMM yyyy", example: "31 Dec 2024" },
  { pattern: "d MMMM yyyy", example: "31 December 2024" },
] as const

export function SettingsPage() {
  const { t } = useTranslation()
  const transactions = useFinanceStore(state => state.transactions)
  const categories = useFinanceStore(state => state.categories)
  const accounts = useFinanceStore(state => state.accounts)
  const budgets = useFinanceStore(state => state.budgets)
  const savingsGoals = useFinanceStore(state => state.savingsGoals)
  const debts = useFinanceStore(state => state.debts)
  const recurringTransactions = useFinanceStore(
    state => state.recurringTransactions,
  )
  const settings = useFinanceStore(state => state.settings)
  const updateSettings = useFinanceStore(state => state.updateSettings)
  const restoreData = useFinanceStore(state => state.restoreData)
  const clearAllData = useFinanceStore(state => state.clearAllData)
  const demoLoaded = useFinanceStore(state => state.demoLoaded)
  const clearDemoData = useFinanceStore(state => state.clearDemoData)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [restoreError, setRestoreError] = useState<string | null>(null)
  const [pendingRestore, setPendingRestore] = useState<ReturnType<
    typeof parseBackup
  > | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [draft, setDraft] = useState(() => ({ ...settings }))
  const [draftLang, setDraftLang] = useState(i18n.language ?? "en")

  const isDirty = useMemo(() => {
    if (draftLang !== (i18n.language ?? "en")) return true
    return (Object.keys(draft) as Array<keyof typeof draft>).some(
      k => draft[k] !== settings[k],
    )
  }, [draft, draftLang, settings])

  useEffect(() => {
    if (window.location.hash !== "#google-drive-sync") return
    requestAnimationFrame(() => {
      document.getElementById("google-drive-sync")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    })
  }, [])

  function exportJson() {
    const backup = createBackup({
      transactions,
      categories,
      accounts,
      budgets,
      recurringTransactions,
      savingsGoals,
      debts,
      settings,
    })
    downloadFile(
      `finora-backup-${backup.exportedAt.slice(0, 10)}.json`,
      JSON.stringify(backup, null, 2),
      "application/json;charset=utf-8",
    )
  }

  function exportCsv() {
    downloadFile(
      "finora-transactions.csv",
      createTransactionCsv({ transactions, categories, accounts }),
      "text/csv;charset=utf-8",
    )
  }

  async function restoreFromFile(file: File) {
    setRestoreError(null)
    try {
      const json = await file.text()
      const data = parseBackup(json)
      setPendingRestore(data)
    } catch (error) {
      setRestoreError(
        error instanceof Error ? error.message : "Could not restore backup",
      )
    } finally {
      if (fileRef.current) {
        fileRef.current.value = ""
      }
    }
  }

  async function executeRestore() {
    if (pendingRestore) {
      await restoreData(pendingRestore)
      setPendingRestore(null)
    }
  }

  async function executeClearAll() {
    await clearAllData()
    setConfirmClear(false)
  }

  async function applyPreferences() {
    const next = { ...draft }
    if (draftLang !== (i18n.language ?? "en")) {
      await i18n.changeLanguage(draftLang)
      try {
        localStorage.setItem("finora-lang", draftLang)
      } catch {
        // ignore
      }
      next.locale = LANG_TO_LOCALE[draftLang] ?? "en-US"
    }
    await updateSettings(next)
    setDraft({ ...next })
  }

  function resetDraft() {
    setDraft({ ...settings })
    setDraftLang(i18n.language ?? "en")
  }

  return (
    <div className='section-shell px-4 py-6 lg:px-8 lg:py-8'>
      <div className='flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <h1 className='page-title'>{t("settings.title")}</h1>
          <p className='mt-2 max-w-2xl text-sm leading-6 text-muted'>
            {t("settings.subtitle")}
          </p>
        </div>
        <HelpButton page="settings" />
      </div>

      <div className='grid gap-6 pt-6 xl:grid-cols-[0.8fr_1.2fr]'>
        <section className='space-y-6'>
          <div className='panel p-5'>
            <h2 className='text-lg font-semibold text-ink'>
              {t("settings.preferences")}
            </h2>
            <div className='mt-5 space-y-4'>
              <Field label={t("settings.username")} htmlFor='username'>
                <Input
                  id='username'
                  maxLength={40}
                  onChange={e =>
                    setDraft(d => ({ ...d, username: e.target.value }))
                  }
                  placeholder={t("settings.usernamePlaceholder")}
                  value={draft.username ?? ""}
                />
              </Field>

              <Field label={t("settings.theme")} htmlFor='theme'>
                <Select
                  onValueChange={value =>
                    setDraft(d => ({ ...d, theme: value as typeof d.theme }))
                  }
                  value={draft.theme}
                >
                  <SelectTrigger id='theme'>
                    <SelectValue placeholder={t("settings.theme")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='system'>
                      {t("settings.themeSystem")}
                    </SelectItem>
                    <SelectItem value='light'>
                      {t("settings.themeLight")}
                    </SelectItem>
                    <SelectItem value='dark'>
                      {t("settings.themeDark")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label={t("settings.language")} htmlFor='language'>
                <Select onValueChange={setDraftLang} value={draftLang}>
                  <SelectTrigger id='language'>
                    <SelectValue placeholder={t("settings.language")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='en'>{t("settings.langEn")}</SelectItem>
                    <SelectItem value='th'>{t("settings.langTh")}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <div className='grid gap-4 sm:grid-cols-2'>
                <Field label={t("settings.currency")} htmlFor='currency'>
                  <Select
                    onValueChange={value =>
                      setDraft(d => ({ ...d, currency: value }))
                    }
                    value={draft.currency}
                  >
                    <SelectTrigger id='currency'>
                      <SelectValue placeholder={t("settings.currency")} />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map(({ code, name, symbol }) => (
                        <SelectItem key={code} value={code} textValue={code}>
                          <span className='flex items-center gap-2'>
                            <span className='w-8 font-mono text-xs font-medium'>
                              {code}
                            </span>
                            <span className='text-muted'>
                              {symbol} · {name}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={t("settings.firstDayOfWeek")} htmlFor='first-day'>
                  <Select
                    onValueChange={value =>
                      setDraft(d => ({
                        ...d,
                        firstDayOfWeek: value as typeof d.firstDayOfWeek,
                      }))
                    }
                    value={draft.firstDayOfWeek}
                  >
                    <SelectTrigger id='first-day'>
                      <SelectValue placeholder={t("settings.firstDayOfWeek")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='monday'>
                        {t("settings.monday")}
                      </SelectItem>
                      <SelectItem value='sunday'>
                        {t("settings.sunday")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field label={t("settings.dateFormat")} htmlFor='date-format'>
                <Select
                  onValueChange={value =>
                    setDraft(d => ({ ...d, dateFormat: value }))
                  }
                  value={draft.dateFormat}
                >
                  <SelectTrigger id='date-format'>
                    <SelectValue placeholder={t("settings.dateFormat")} />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_FORMAT_OPTIONS.map(({ pattern, example }) => (
                      <SelectItem
                        key={pattern}
                        value={pattern}
                        textValue={pattern}
                      >
                        <span className='flex items-center gap-2'>
                          <span className='font-mono text-xs'>{pattern}</span>
                          <span className='text-muted'>{example}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <label className='flex items-center gap-2 text-sm text-ink'>
                <input
                  checked={draft.backupReminder}
                  className='rounded border-line text-primary'
                  onChange={e =>
                    setDraft(d => ({ ...d, backupReminder: e.target.checked }))
                  }
                  type='checkbox'
                />
                {t("settings.backupReminders")}
              </label>
            </div>

            <div className='mt-6 flex items-center justify-end gap-2 border-t border-line pt-4'>
              <Button
                disabled={!isDirty}
                onClick={resetDraft}
                type='button'
                variant='ghost'
              >
                {t("common.cancel")}
              </Button>
              <Button
                disabled={!isDirty}
                onClick={() => void applyPreferences()}
                type='button'
                variant='primary'
              >
                {t("settings.apply")}
              </Button>
            </div>
          </div>

          <div className='panel p-5'>
            <div className='flex items-start gap-3'>
              <span>
                <ShieldCheck
                  aria-hidden
                  className='mt-0.5 h-5 w-5 text-primary'
                />
              </span>
              <div>
                <h2 className='text-lg font-semibold text-ink'>
                  {t("settings.privacy")}
                </h2>
                <p className='mt-2 text-sm leading-6 text-muted'>
                  {t("settings.privacyText")}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className='space-y-6'>
          <div id='google-drive-sync' className='scroll-mt-20'>
            <GoogleDriveSyncPanel />
          </div>

          <div className='panel p-5'>
            <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
              <div>
                <h2 className='text-lg font-semibold text-ink'>
                  {t("settings.backupRestore")}
                </h2>
                <p className='mt-1 text-sm text-muted'>
                  {t("settings.backupRestoreDesc")}
                </p>
              </div>
              <Badge className='shrink-0'>
                {t("settings.txCount", { count: transactions.length })}
              </Badge>
            </div>
            <div className='mt-5 flex flex-wrap gap-2'>
              <Button onClick={exportJson} variant='primary'>
                <Download aria-hidden className='h-4 w-4' />
                {t("settings.exportJson")}
              </Button>
              <Button onClick={exportCsv} variant='secondary'>
                <Download aria-hidden className='h-4 w-4' />
                {t("settings.exportCsv")}
              </Button>
              <Button
                onClick={() => fileRef.current?.click()}
                variant='secondary'
              >
                <Upload aria-hidden className='h-4 w-4' />
                {t("settings.restoreJson")}
              </Button>
              <input
                accept='application/json'
                className='hidden'
                onChange={event => {
                  const file = event.target.files?.[0]
                  if (file) {
                    void restoreFromFile(file)
                  }
                }}
                ref={fileRef}
                type='file'
              />
            </div>
            {restoreError ? (
              <p className='mt-4 rounded-lg border border-danger/25 bg-danger/10 p-3 text-sm text-danger'>
                {restoreError}
              </p>
            ) : null}
          </div>

          <div className='panel p-5'>
            <h2 className='text-lg font-semibold text-ink'>
              {t("settings.dataControls")}
            </h2>
            <div className='mt-5 flex flex-wrap gap-2'>
              {demoLoaded ? (
                <Button
                  onClick={() => void clearDemoData()}
                  variant='secondary'
                >
                  <FileJson aria-hidden className='h-4 w-4' />
                  {t("settings.clearDemoData")}
                </Button>
              ) : null}
              <Button onClick={() => setConfirmClear(true)} variant='danger'>
                <Trash2 aria-hidden className='h-4 w-4' />
                {t("settings.clearAllData")}
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant='secondary'
              >
                <RotateCcw aria-hidden className='h-4 w-4' />
                {t("settings.reloadApp")}
              </Button>
            </div>
          </div>

          <div className='panel p-5'>
            <h2 className='text-lg font-semibold text-ink'>
              {t("settings.categories")}
            </h2>
            <p className='mt-1 text-sm text-muted'>
              {t("settings.categoriesDesc")}
            </p>
            <div className='mt-5'>
              <CategoryManager />
            </div>
          </div>

          <MrrRatesPanel />

          <GuideCenter />
        </section>
      </div>

      <ConfirmDialog
        confirmLabel={t("settings.restoreLabel")}
        description={t("settings.restoreDesc")}
        onConfirm={() => void executeRestore()}
        onOpenChange={open => !open && setPendingRestore(null)}
        open={!!pendingRestore}
        title={t("settings.restoreTitle")}
        variant='primary'
      />

      <ConfirmDialog
        confirmLabel={t("settings.clearLabel")}
        description={t("settings.clearDesc")}
        onConfirm={() => void executeClearAll()}
        onOpenChange={setConfirmClear}
        open={confirmClear}
        title={t("settings.clearTitle")}
      />
    </div>
  )
}

function MrrRatesPanel() {
  const { t } = useTranslation()
  const settings = useFinanceStore(state => state.settings)
  const updateSettings = useFinanceStore(state => state.updateSettings)
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(MRR_RATES).map(([k, v]) => [
        k,
        String(settings.mrrRates?.[k] ?? v.mrr),
      ]),
    ),
  )

  const isDirty = Object.entries(MRR_RATES).some(
    ([k, v]) => Number(draft[k]) !== (settings.mrrRates?.[k] ?? v.mrr),
  )

  async function save() {
    const overrides: Record<string, number> = {}
    for (const [k, v] of Object.entries(draft)) {
      const n = Number(v)
      if (!isNaN(n)) overrides[k] = n
    }
    await updateSettings({ ...settings, mrrRates: overrides })
  }

  function reset() {
    setDraft(
      Object.fromEntries(Object.entries(MRR_RATES).map(([k, v]) => [k, String(v.mrr)])),
    )
  }

  return (
    <div className='panel p-5'>
      <h2 className='text-lg font-semibold text-ink'>{t("settings.mrrRates")}</h2>
      <p className='mt-1 text-sm text-muted'>{t("settings.mrrRatesDesc")}</p>
      <div className='mt-4 space-y-2'>
        {Object.entries(MRR_RATES).map(([key]) => (
          <div key={key} className='flex items-center gap-3'>
            <span className='flex-1 text-sm text-ink'>{t(`settings.mrrBank.${key}`)}</span>
            <div className='flex items-center gap-1'>
              <input
                className='w-20 rounded-md border border-line bg-surface px-2 py-1 text-right text-sm tabular text-ink focus:outline-none focus:ring-2 focus:ring-primary'
                inputMode='decimal'
                step='0.001'
                type='number'
                value={draft[key]}
                onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
              />
              <span className='text-sm text-muted'>%</span>
            </div>
          </div>
        ))}
      </div>
      <div className='mt-4 flex items-center justify-end gap-2 border-t border-line pt-4'>
        <Button disabled={!isDirty} onClick={reset} type='button' variant='ghost'>
          {t("settings.mrrRatesReset")}
        </Button>
        <Button disabled={!isDirty} onClick={() => void save()} type='button' variant='primary'>
          {t("settings.apply")}
        </Button>
      </div>
    </div>
  )
}
