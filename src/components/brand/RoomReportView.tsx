import type { RoomReportDocument } from "@/lib/report-schema";
import { cn } from "@/lib/utils";

const colors: Record<string, string> = {
  joy: "text-pink-400 border-pink-400 bg-pink-400/10",
  fear: "text-blue-400 border-blue-400 bg-blue-400/10",
  anger: "text-red-400 border-red-400 bg-red-400/10",
  discovery: "text-amber-400 border-amber-400 bg-amber-400/10",
};

export function RoomReportView({
  report,
  theme = "discovery",
  roomNumber,
  totalRooms,
}: {
  report: RoomReportDocument;
  theme?: string;
  roomNumber?: number;
  totalRooms?: number;
}) {
  const reveal = report.revelacoes[0];
  const tone = colors[theme] ?? colors.discovery;
  const normalizedCode = reveal.codigo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const displayCode = /^[A-Z0-9]{3}$/.test(normalizedCode)
    ? normalizedCode
    : roomNumber
      ? `S${roomNumber}`
      : "CI";
  return (
    <article className={cn("rounded-2xl border bg-background/90 p-5 shadow-xl sm:p-7", tone)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em]">Revelação da sala</p>
      <div className="mt-3 flex items-start gap-3 border-b border-current/20 pb-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-current/15 text-xs font-bold">
          {displayCode}
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold uppercase leading-tight text-foreground sm:text-3xl">
            {reveal.titulo}
          </h1>
          <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">
            {report.nome} | {report.idade} anos
            {roomNumber ? ` | Sala ${roomNumber} de ${totalRooms ?? report.revelacoes.length}` : ""}
          </p>
        </div>
      </div>
      <p className="mt-5 text-base italic leading-7 text-foreground sm:text-lg">{reveal.texto}</p>
      <div className="mt-6 grid gap-3">
        <Insight title="O que te move" value={reveal.move} />
        <Insight title="O que te dá energia" value={reveal.energia} />
        <Insight title="O que te trava" value={reveal.trava} />
      </div>
      <p className="mt-6 border-t border-current/20 pt-3 text-[10px] text-muted-foreground">
        MÉTODO CÓDIGO INTERNO · metodocodigointerno.com.br
      </p>
    </article>
  );
}

function Insight({ title, value }: { title: string; value: string }) {
  return (
    <section className="rounded-xl border border-current/20 bg-current/10 p-4">
      <h2 className="text-[11px] font-bold uppercase tracking-widest">{title}</h2>
      <p className="mt-1.5 text-sm leading-6 text-foreground/80">{value}</p>
    </section>
  );
}
