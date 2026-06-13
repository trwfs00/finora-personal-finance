import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { DayPicker, type DayPickerProps, type DropdownProps } from "react-day-picker";

import { cn } from "../../lib/utils";

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  formatters,
  ...props
}: DayPickerProps) {
  return (
    <DayPicker
      className={cn("p-0", className)}
      classNames={{
        months: "flex flex-col gap-4",
        month: "space-y-4",
        month_caption: "flex h-9 items-center justify-center px-8",
        caption_label: "text-sm font-medium text-ink",
        nav: "absolute inset-x-0 top-3 flex items-center justify-between px-1",
        button_previous:
          "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-40",
        button_next:
          "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-40",
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday: "w-9 rounded-md text-center text-xs font-medium text-muted",
        week: "mt-1 flex w-full",
        day: "h-9 w-9 p-0 text-center text-sm",
        day_button:
          "h-9 w-9 rounded-md text-sm transition-colors hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        selected: "text-white [&>button]:bg-primary [&>button]:text-white [&>button]:hover:bg-primary",
        today: "[&>button]:border [&>button]:border-primary/40",
        outside: "text-muted opacity-45",
        disabled: "text-muted opacity-40",
        hidden: "invisible",
        // Custom dropdown caption layout. Avoid native select popups because their
        // OS/browser styling clashes with the Finora popover surface.
        dropdowns: "flex items-center gap-2",
        dropdown_root:
          "relative flex h-7 items-center rounded-md focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary",
        dropdown:
          "inline-flex h-7 min-w-16 items-center justify-between gap-1 rounded-md border border-line bg-surface px-2 text-sm font-medium text-ink shadow-sm transition-colors hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-50",
        ...classNames,
      }}
      formatters={{
        formatMonthDropdown: (month, dateLib) => dateLib?.format(month, "MMM") ?? month.toLocaleString(undefined, { month: "short" }),
        formatYearDropdown: (year, dateLib) => dateLib?.format(year, "yyyy") ?? String(year.getFullYear()),
        ...formatters,
      }}
      components={{
        Dropdown: CalendarDropdown,
        Chevron: ({ orientation }) => {
          if (orientation === "left") return <ChevronLeft aria-hidden className="h-4 w-4" />;
          if (orientation === "down") return <ChevronDown aria-hidden className="h-3 w-3 text-muted" />;
          return <ChevronRight aria-hidden className="h-4 w-4" />;
        },
      }}
      showOutsideDays={showOutsideDays}
      {...props}
    />
  );
}

function CalendarDropdown({
  options,
  value,
  onChange,
  disabled,
  className,
  id,
  "aria-label": ariaLabel,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selectedOption = options?.find((option) => option.value === value);

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
    <span className="relative flex items-center" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-label={ariaLabel}
        className={cn(
          "inline-flex h-7 min-w-16 flex-row items-center justify-between gap-1 rounded-md border border-line bg-surface px-2 text-sm font-medium text-ink shadow-sm transition-colors hover:bg-surface-2 disabled:pointer-events-none disabled:opacity-50",
          className,
        )}
        disabled={disabled}
        id={id}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>{selectedOption?.label}</span>
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
          {options?.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                aria-selected={isSelected}
                className={cn(
                  "flex w-full items-center justify-center whitespace-nowrap rounded-md px-2 py-1.5 text-sm transition-colors",
                  isSelected ? "bg-primary text-white" : "text-ink hover:bg-surface-2",
                )}
                disabled={option.disabled}
                data-selected={isSelected}
                key={option.value}
                onClick={() => {
                  onChange?.({ target: { value: String(option.value) } } as ChangeEvent<HTMLSelectElement>);
                  setOpen(false);
                }}
                role="option"
                type="button"
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </span>
  );
}
