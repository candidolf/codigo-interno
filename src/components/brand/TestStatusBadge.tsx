import { cn } from "@/lib/utils";
const map: Record<string, string> = {
  "Não iniciado": "bg-muted text-muted-foreground",
  "Em andamento": "bg-brand-blue/20 text-brand-blue",
  "Concluído": "bg-discovery/20 text-discovery",
  "Presenteado": "bg-brand-orange/20 text-brand-orange",
};
export function TestStatusBadge({ status }: { status: string }) {
  return <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", map[status] || map["Não iniciado"])}>{status}</span>;
}
