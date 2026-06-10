import { parseISO } from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "../../lib/utils";
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
  const monthsAbbr = t("datePicker.monthsAbbr", { returnObjects: true }) as string[];
  const selected = parseDateValue(value);
  const label = placeholder ?? t("datePicker.pickDate");

  const displayValue = selected
    ? `${selected.getDate()} ${monthsAbbr[selected.getMonth()]} ${selected.getFullYear()}`
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
          mode="single"
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

  const [year, setYear] = useState(selectedYear);

  return (
    <div className="w-52 select-none">
      {/* Year navigation */}
      <div className="mb-2 flex items-center justify-between px-1">
        <button
          aria-label={t("datePicker.prevYear")}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-ink/5 hover:text-ink"
          onClick={() => setYear((y) => y - 1)}
          type="button"
        >
          <ChevronLeft aria-hidden className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium text-ink">{year}</span>
        <button
          aria-label={t("datePicker.nextYear")}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-ink/5 hover:text-ink"
          onClick={() => setYear((y) => y + 1)}
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

function parseDateValue(value?: string) {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
