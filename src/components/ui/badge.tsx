import type { HTMLAttributes } from "react";

import { cn } from "../../lib/utils";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "primary" | "success" | "warning" | "danger";
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  const classes = {
    neutral: "border-line bg-surface-2 text-muted",
    primary: "border-primary/20 bg-primary/10 text-primary",
    success: "border-success/20 bg-success/10 text-success",
    warning: "border-warning/25 bg-warning/15 text-ink",
    danger: "border-danger/20 bg-danger/10 text-danger",
  };

  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full border px-2 text-xs font-medium",
        classes[tone],
        className,
      )}
      {...props}
    />
  );
}
