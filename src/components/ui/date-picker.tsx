import { parseISO } from "date-fns";
import { CalendarIcon, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { enUS, th } from "react-day-picker/locale";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "../../lib/utils";
import { useFinanceStore } from "../../store/finance-store";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

interface DatePickerProps {
  id?: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
}

const YEAR_RANGE_PAST = 30;
const YEAR_RANGE_FUTURE = 30;

function useDayPickerLocale() {
  const settingsLocale = useFinanceStore((state) => state.settings.locale);
  return settingsLocale === "th-TH" ? th : enUS;
}

export function DatePicker({
  id,
  value,
  onChange,
  placeholder,
  ariaLabel,
  className,
  disabled,
}: DatePickerProps) {
  const { t } = useTranslation();
  const dayPickerLocale = useDayPickerLocale();
  const monthsAbbr = t("datePicker.monthsAbbr", { returnObjects: true }) as string[];
  const selected = parseDateValue(value);
  const label = placeholder ?? t("datePicker.pickDate");

  const displayValue = selected
    ? `${selected.getDate()} ${monthsAbbr[selected.getMonth()]} ${selected.getFullYear()}`
    : undefined;

  const now = new Date();
  const startMonth = new Date(now.getFullYear() - YEAR_RANGE_PAST, 0);
  const endMonth = new Date(now.getFullYear() + YEAR_RANGE_FUTURE, 11);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label={ariaLabel}
          className={cn(
            "w-full justify-start text-left font-normal data-[empty=true]:text-muted",
            className,
          )}
          data-empty={!selected}
          disabled={disabled}
          id={id}
          type="button"
          variant="secondary"
        >
          <CalendarIcon aria-hidden className="h-4 w-4" />
          {displayValue ?? <span>{label}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3">
        <Calendar
          captionLayout="dropdown"
          defaultMonth={selected ?? now}
          locale={dayPickerLocale}
          mode="single"
          startMonth={startMonth}
          endMonth={endMonth}
          onSelect={(date) => {
            if (date) {
              const y = date.getFullYear();
              const m = String(date.getMonth() + 1).padStart(2, "0");
              const d = String(date.getDate()).padStart(2, "0");
              onChange(`${y}-${m}-${d}`);
            }
          }}
          selected={selected}
        />
      </PopoverContent>
    </Popover>
  );
}

export function MonthPicker({
  id,
  value,
  onChange,
  placeholder,
  ariaLabel,
  className,
  disabled,
}: DatePickerProps) {
  const { t } = useTranslation();
  const monthsFull = t("datePicker.monthsFull", { returnObjects: true }) as string[];
  const label = placeholder ?? t("datePicker.pickMonth");

  const displayDate = value ? parseDateValue(`${value}-01`) : undefined;
  const displayValue = displayDate
    ? `${monthsFull[displayDate.getMonth()]} ${displayDate.getFullYear()}`
    : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label={ariaLabel}
          className={cn(
            "w-full justify-start text-left font-normal data-[empty=true]:text-muted",
            className,
          )}
          data-empty={!displayDate}
          disabled={disabled}
          id={id}
          type="button"
          variant="secondary"
        >
          <CalendarIcon aria-hidden className="h-4 w-4" />
          {displayValue ?? <span>{label}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3">
        <MonthGrid onChange={onChange} value={value} />
      </PopoverContent>
    </Popover>
  );
}

function MonthGrid({
  value,
  onChange,
}: {
  value?: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  const monthsAbbr = t("datePicker.monthsAbbr", { returnObjects: true }) as string[];

  const now = new Date();
  const selectedYear = value ? parseInt(value.slice(0, 4), 10) : now.getFullYear();
  const selectedMonthIdx = value ? parseInt(value.slice(5, 7), 10) - 1 : -1;
  const startYear = now.getFullYear() - YEAR_RANGE_PAST;
  const endYear = now.getFullYear() + YEAR_RANGE_FUTURE;

  const [year, setYear] = useState(selectedYear);

  return (
    <div className="w-52 select-none">
      {/* Year navigation */}
      <div className="mb-2 flex items-center justify-between px-1">
        <button
          aria-label={t("datePicker.prevYear")}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-ink/5 hover:text-ink"
          onClick={() => setYear((y) => Math.max(startYear, y - 1))}
          type="button"
        >
          <ChevronLeft aria-hidden className="h-4 w-4" />
        </button>
        <MonthPickerYearDropdown
          endYear={endYear}
          onChange={setYear}
          startYear={startYear}
          value={year}
        />
        <button
          aria-label={t("datePicker.nextYear")}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-ink/5 hover:text-ink"
          onClick={() => setYear((y) => Math.min(endYear, y + 1))}
          type="button"
        >
          <ChevronRight aria-hidden className="h-4 w-4" />
        </button>
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-3 gap-1">
        {monthsAbbr.map((name, i) => {
          const isSelected = year === selectedYear && i === selectedMonthIdx;
          const monthKey = `${year}-${String(i + 1).padStart(2, "0")}`;
          return (
            <button
              key={monthKey}
              className={cn(
                "rounded-lg py-2 text-sm font-medium transition-colors",
                isSelected ? "bg-primary text-white" : "text-ink hover:bg-ink/8",
              )}
              onClick={() => onChange(monthKey)}
              type="button"
            >
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MonthPickerYearDropdown({
  value,
  onChange,
  startYear,
  endYear,
}: {
  value: number;
  onChange: (value: number) => void;
  startYear: number;
  endYear: number;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const years = Array.from({ length: endYear - startYear + 1 }, (_, index) => startYear + index);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    window.requestAnimationFrame(() => {
      const selectedElement = listRef.current?.querySelector<HTMLElement>("[data-selected='true']");
      selectedElement?.scrollIntoView({ block: "center" });
    });
  }, [open, value]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        aria-expanded={open}
        className="inline-flex h-7 min-w-20 items-center justify-between gap-2 rounded-md border border-line bg-surface px-2 text-sm font-medium text-ink shadow-sm transition-colors hover:bg-surface-2"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>{value}</span>
        <ChevronDown aria-hidden className="ml-auto h-3 w-3 shrink-0 text-muted" />
      </button>
      {open ? (
        <div
          className="absolute left-1/2 top-full z-50 mt-1 max-h-48 min-w-[5.75rem] -translate-x-1/2 overscroll-contain overflow-x-hidden overflow-y-auto rounded-lg border border-line bg-surface p-1 shadow-lg [scrollbar-color:oklch(var(--muted)/0.45)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted/40 [&::-webkit-scrollbar-thumb:hover]:bg-muted/60"
          onWheel={(event) => {
            event.stopPropagation();
            event.currentTarget.scrollTop += event.deltaY;
          }}
          ref={listRef}
        >
          {years.map((year) => {
            const isSelected = year === value;

            return (
              <button
                aria-selected={isSelected}
                className={cn(
                  "flex w-full items-center justify-center whitespace-nowrap rounded-md px-2 py-1.5 text-sm transition-colors",
                  isSelected ? "bg-primary text-white" : "text-ink hover:bg-surface-2",
                )}
                data-selected={isSelected}
                key={year}
                onClick={() => {
                  onChange(year);
                  setOpen(false);
                }}
                role="option"
                type="button"
              >
                {year}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function parseDateValue(value?: string) {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
