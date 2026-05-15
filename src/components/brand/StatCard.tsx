import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  className,
}: {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("glass rounded-2xl p-5", className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        {Icon && (
          <span className="grid place-items-center h-8 w-8 rounded-lg bg-gradient-brand-soft">
            <Icon className="h-4 w-4 text-foreground" />
          </span>
        )}
      </div>
      <p className="font-display text-3xl font-bold mt-3">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
