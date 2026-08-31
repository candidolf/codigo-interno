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
  return (
    <article className={cn("rounded-3xl border-2 bg-background/80 p-6 sm:p-10 shadow-2xl", tone)}>
      <p className="text-xs uppercase tracking-[0.25em] font-semibold">Revelação da sala</p>
      <div className="mt-4 flex items-start gap-4 border-b border-current/20 pb-5">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-current/20 font-bold">
          {reveal.codigo}
        </span>
        <div>
          <h1 className="font-display text-3xl sm:text-5xl font-bold uppercase text-foreground">
            {reveal.titulo}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {report.nome} | {report.idade} anos
            {roomNumber ? ` | Sala ${roomNumber} de ${totalRooms ?? report.revelacoes.length}` : ""}
          </p>
        </div>
      </div>
      <p className="mt-8 text-xl sm:text-2xl italic leading-relaxed text-foreground">
        {reveal.texto}
      </p>
      <div className="mt-10 grid gap-4">
        <Insight title="O que te move" value={reveal.move} />
        <Insight title="O que te dá energia" value={reveal.energia} />
        <Insight title="O que te trava" value={reveal.trava} />
      </div>
      <p className="mt-8 border-t border-current/20 pt-4 text-xs text-muted-foreground">
        MÉTODO CÓDIGO INTERNO · metodocodigointerno.com.br
      </p>
    </article>
  );
}

function Insight({ title, value }: { title: string; value: string }) {
  return (
    <section className="rounded-2xl border border-current/20 bg-current/10 p-5">
      <h2 className="text-xs uppercase tracking-widest font-bold">{title}</h2>
      <p className="mt-2 text-base leading-relaxed text-foreground/80">{value}</p>
    </section>
  );
}
