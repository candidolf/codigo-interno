export function AgeRangeBadge({ min, max }: { min: number; max: number }) {
  return (
    <span className="inline-flex items-center text-xs px-2 py-1 rounded-full bg-secondary/70 border border-border text-muted-foreground">
      {min}–{max} anos
    </span>
  );
}
