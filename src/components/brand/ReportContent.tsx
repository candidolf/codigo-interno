import type { ReactElement } from "react";
import { parseReportDocument, type ReportDocument } from "@/lib/report-schema";

/** Renderiza o contrato fixo da SOL. Mantém fallback para relatórios antigos em Markdown. */
export function ReportContent({ content }: { content: string }) {
  try {
    return <StructuredReport report={parseReportDocument(content)} />;
  } catch {
    return <LegacyReport content={content} />;
  }
}

function StructuredReport({ report }: { report: ReportDocument }) {
  return (
    <div className="report-content space-y-8">
      <section>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Resultado oficial</p>
        <h2 className="font-display text-3xl font-bold mt-2">{report.identidade.titulo}</h2>
        {report.identidade.subtitulo && (
          <p className="text-lg text-brand-purple mt-1">{report.identidade.subtitulo}</p>
        )}
        <p className="text-sm leading-relaxed text-muted-foreground mt-4">
          {report.identidade.descricao}
        </p>
        <List title="Arquétipos secundários" items={report.identidade.arquetipos_secundarios} />
        <MetaGrid
          items={[
            ["Temperamento", report.identidade.temperamento],
            ["Arquétipo", report.identidade.arquetipo],
            ["Inteligência", report.identidade.inteligencia],
            ["Raridade", report.identidade.raridade],
          ]}
        />
      </section>
      <Section
        title="Seu mapa psicológico"
        subtitle="Temperamentos, inteligências e padrões profundos"
      >
        <MetricGroup title="Os 4 temperamentos" items={report.mapa_psicologico.temperamentos} />
        <MetricGroup
          title="Inteligências múltiplas"
          items={report.mapa_psicologico.inteligencias}
        />
      </Section>
      <Section
        title="Sua sombra e seu dom oculto"
        subtitle="O padrão que limita e o tesouro que ele esconde"
      >
        <TextCard title="A sombra" text={report.sombra_e_dom.sombra} />
        <TextCard title="O dom oculto por trás" text={report.sombra_e_dom.dom_oculto} />
        {report.sombra_e_dom.fechamento && (
          <p className="italic text-muted-foreground">{report.sombra_e_dom.fechamento}</p>
        )}
      </Section>
      <Section title="Como você funciona" subtitle="O que dá energia, o que drena e como aprende">
        <List title="O que dá energia" items={report.como_funciona.energiza} />
        <List title="O que drena" items={report.como_funciona.drena} />
        <Cards items={report.como_funciona.aprende_melhor} />
      </Section>
      <Section
        title="Profissões + estilo de vida"
        subtitle="Não é só a profissão: é como viver dentro dela"
      >
        {report.profissoes_estilo_de_vida.map((career) => (
          <article key={career.titulo} className="border border-border rounded-xl p-4 space-y-3">
            <div className="flex justify-between gap-3">
              <h3 className="font-bold">{career.titulo}</h3>
              {career.compatibilidade != null && <b>{career.compatibilidade}%</b>}
            </div>
            <p className="text-sm text-muted-foreground">{career.descricao}</p>
            <Cards items={career.estilos_de_vida} />
            <List title="Áreas de atuação" items={career.areas} />
            {career.faixas_salariais.length > 0 && (
              <div className="text-sm">
                <p className="font-semibold mb-2">Faixas salariais</p>
                {career.faixas_salariais.map((row) => (
                  <p key={row.nivel}>
                    <b>{row.nivel}:</b> {row.faixa}
                    {row.observacao ? ` - ${row.observacao}` : ""}
                  </p>
                ))}
              </div>
            )}
          </article>
        ))}
      </Section>
      <Section title="O que desenvolver" subtitle="As próximas versões de você">
        <Cards items={report.desenvolvimento} />
      </Section>
      <Section title="Missão dos próximos 12 meses" subtitle="Ações concretas, não planos">
        <Cards
          items={report.missao_12_meses.map((x) => ({
            titulo: `${x.numero}. ${x.titulo}`,
            descricao: x.descricao,
          }))}
        />
      </Section>
      <Section
        title="Manual dos pais"
        subtitle="Como se relacionar, motivar e apoiar da forma certa"
      >
        <TextCard title="Como aprende" text={report.manual_dos_pais.como_aprende} />
        <TextCard title="Como reage sob pressão" text={report.manual_dos_pais.reage_sob_pressao} />
        <TextCard title="A linguagem que chega" text={report.manual_dos_pais.linguagem_que_chega} />
        <List title="O que fazer" items={report.manual_dos_pais.fazer} />
        <List title="O que evitar" items={report.manual_dos_pais.evitar} />
      </Section>
      <section className="bg-brand-purple/10 rounded-xl p-5">
        <h2 className="font-display text-xl font-bold">Mensagem final</h2>
        <p className="text-sm leading-relaxed mt-3">{report.mensagem_final}</p>
      </section>
      <section className="border-2 border-brand-purple rounded-xl p-5">
        <p className="text-xs uppercase tracking-widest">Card de identidade</p>
        <h2 className="font-display text-2xl font-bold mt-2">{report.card_identidade.titulo}</h2>
        <p className="text-sm mt-2">{report.card_identidade.frase}</p>
        <List title="Traços" items={report.card_identidade.tracos} />
        <MetricGroup title="Métricas" items={report.card_identidade.metricas} />
      </section>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactElement | ReactElement[];
}) {
  return (
    <section>
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      <div className="space-y-4 mt-4">{children}</div>
    </section>
  );
}
function TextCard({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground mt-1">{text}</p>
    </div>
  );
}
function List({ title, items }: { title: string; items: string[] }) {
  return items.length ? (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground mt-2">
        {items.map((x, i) => (
          <li key={`${title}-${i}`}>{x}</li>
        ))}
      </ul>
    </div>
  ) : null;
}
function Cards({ items }: { items: { titulo: string; descricao: string }[] }) {
  return (
    <div className="grid gap-3">
      {items.map((x, i) => (
        <div className="bg-muted/30 rounded-lg p-3" key={`${x.titulo}-${i}`}>
          <h3 className="font-semibold text-sm">{x.titulo}</h3>
          <p className="text-sm text-muted-foreground mt-1">{x.descricao}</p>
        </div>
      ))}
    </div>
  );
}
function MetricGroup({
  title,
  items,
}: {
  title: string;
  items: { nome: string; percentual: number; classificacao?: string; descricao?: string }[];
}) {
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <div className="grid sm:grid-cols-2 gap-3 mt-2">
        {items.map((x) => (
          <div key={x.nome} className="border border-border rounded-lg p-3">
            <div className="flex justify-between text-sm">
              <b>{x.nome}</b>
              <b>{x.percentual}%</b>
            </div>
            {x.classificacao && <p className="text-xs text-brand-purple mt-1">{x.classificacao}</p>}
            {x.descricao && <p className="text-xs text-muted-foreground mt-1">{x.descricao}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
function MetaGrid({ items }: { items: [string, string | undefined][] }) {
  return (
    <div className="grid grid-cols-2 gap-3 mt-5">
      {items
        .filter((x): x is [string, string] => Boolean(x[1]))
        .map(([label, value]) => (
          <div key={label}>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-sm font-semibold">{value}</p>
          </div>
        ))}
    </div>
  );
}
function LegacyReport({ content }: { content: string }) {
  const blocks: ReactElement[] = [];
  content.split("\n").forEach((line, i) => {
    const clean = line.trim();
    if (!clean) return;
    const h = clean.match(/^#{1,6}\s+(.*)$/);
    blocks.push(
      h ? (
        <h2 key={i} className="font-display font-bold text-xl mt-6">
          {h[1]}
        </h2>
      ) : (
        <p key={i} className="text-sm leading-relaxed text-muted-foreground mt-3">
          {clean.replace(/\*\*/g, "")}
        </p>
      ),
    );
  });
  return <div className="report-content">{blocks}</div>;
}
