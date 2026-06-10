import { cn } from "../../lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger";
  className?: string;
}

export function StatCard({ label, value, tone = "default", className }: StatCardProps) {
  const valueClass = {
    default: "text-ink",
    success: "text-success",
    danger: "text-danger",
  }[tone];

  return (
    <div className={cn("panel p-5", className)}>
      <p className="text-sm text-muted">{label}</p>
      <p className={cn("mt-2 text-2xl font-semibold tabular", valueClass)}>{value}</p>
    </div>
  );
}
