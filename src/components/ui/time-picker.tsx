import { ChevronDown, ChevronUp, Clock } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

interface TimePickerProps {
  id?: string;
  value?: string; // "HH:mm"
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function parseHM(value?: string) {
  if (!value) {
    const now = new Date();
    return { h: now.getHours(), m: now.getMinutes() };
  }
  const [hStr, mStr] = value.split(":");
  const h = parseInt(hStr ?? "0", 10);
  const m = parseInt(mStr ?? "0", 10);
  return {
    h: Number.isNaN(h) ? 0 : Math.max(0, Math.min(23, h)),
    m: Number.isNaN(m) ? 0 : Math.max(0, Math.min(59, m)),
  };
}

export function TimePicker({
  id,
  value,
  onChange,
  placeholder,
  ariaLabel,
  className,
  disabled,
}: TimePickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          aria-label={ariaLabel}
          className={cn(
            "w-full justify-start text-left font-normal data-[empty=true]:text-muted",
            className,
          )}
          data-empty={!value}
          disabled={disabled}
          id={id}
          type="button"
          variant="secondary"
        >
          <Clock aria-hidden className="h-4 w-4" />
          {value ?? <span>{placeholder ?? t("timePicker.pickTime")}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3">
        <TimeSpinner onChange={onChange} value={value} />
      </PopoverContent>
    </Popover>
  );
}

const NAV_BTN =
  "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function TimeSpinner({
  value,
  onChange,
}: {
  value?: string;
  onChange: (v: string) => void;
}) {
  const { t } = useTranslation();
  const { h, m } = parseHM(value);

  function adjust(type: "h" | "m", delta: number) {
    if (type === "h") onChange(`${pad((h + delta + 24) % 24)}:${pad(m)}`);
    else onChange(`${pad(h)}:${pad((m + delta + 60) % 60)}`);
  }

  return (
    <div className="select-none">
      <div className="mb-2 flex items-center gap-1">
        <span className="w-10 text-center text-xs font-medium text-muted">
          {t("timePicker.hour")}
        </span>
        <span className="w-4" />
        <span className="w-10 text-center text-xs font-medium text-muted">
          {t("timePicker.minute")}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <div className="flex flex-col items-center gap-1">
          <button
            aria-label="Increase hour"
            className={NAV_BTN}
            onClick={() => adjust("h", 1)}
            type="button"
          >
            <ChevronUp aria-hidden className="h-4 w-4" />
          </button>
          <div
            className="flex h-9 w-10 cursor-default items-center justify-center rounded-md bg-primary text-sm font-semibold tabular-nums text-white"
            onWheel={(e) => {
              e.preventDefault();
              adjust("h", e.deltaY < 0 ? 1 : -1);
            }}
          >
            {pad(h)}
          </div>
          <button
            aria-label="Decrease hour"
            className={NAV_BTN}
            onClick={() => adjust("h", -1)}
            type="button"
          >
            <ChevronDown aria-hidden className="h-4 w-4" />
          </button>
        </div>

        <span className="pb-px text-lg font-medium text-muted/60">:</span>

        <div className="flex flex-col items-center gap-1">
          <button
            aria-label="Increase minute"
            className={NAV_BTN}
            onClick={() => adjust("m", 1)}
            type="button"
          >
            <ChevronUp aria-hidden className="h-4 w-4" />
          </button>
          <div
            className="flex h-9 w-10 cursor-default items-center justify-center rounded-md bg-primary text-sm font-semibold tabular-nums text-white"
            onWheel={(e) => {
              e.preventDefault();
              adjust("m", e.deltaY < 0 ? 1 : -1);
            }}
          >
            {pad(m)}
          </div>
          <button
            aria-label="Decrease minute"
            className={NAV_BTN}
            onClick={() => adjust("m", -1)}
            type="button"
          >
            <ChevronDown aria-hidden className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
