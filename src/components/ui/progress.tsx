import { clamp, cn } from "../../lib/utils";

interface ProgressProps {
  value: number;
  label?: string;
  tone?: "primary" | "success" | "warning" | "danger";
}

export function Progress({ value, label, tone = "primary" }: ProgressProps) {
  const width = clamp(value, 0, 100);
  const toneClass = {
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
  }[tone];

  return (
    <div className="space-y-1.5">
      {label ? <div className="text-sm text-muted">{label}</div> : null}
      <div
        className="h-2 overflow-hidden rounded-full bg-surface-2"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(width)}
        role="progressbar"
      >
        <div className={cn("h-full rounded-full", toneClass)} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
