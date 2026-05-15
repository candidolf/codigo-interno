import { createFileRoute } from "@tanstack/react-router";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { GradientButton } from "@/components/brand/GradientButton";
import { themeStyle, type Theme } from "@/data/mock";
import { Download, AlertTriangle, Sparkles } from "lucide-react";

export const Route = createFileRoute("/relatorio/$id")({ component: Relatorio });

const blocks: { theme: Theme; title: string; score: number; text: string }[] = [
  { theme: "joy", title: "Alegria", score: 78, text: "Forte conexão com prazer social e celebração de pequenas conquistas." },
  { theme: "fear", title: "Medo", score: 42, text: "Medo é gerenciado pela busca de controle e planejamento." },
  { theme: "anger", title: "Raiva", score: 35, text: "Raiva tende a ser internalizada; reflete sobre injustiça." },
  { theme: "discovery", title: "Descobertas", score: 84, text: "Curiosidade alta, abertura a experiências novas." },
];

function Relatorio() {
  const { id } = Route.useParams();
  return (
    <div className="min-h-screen">
      <BrandHeader role="master" />
      <main className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Relatório #{id}</p>
            <h1 className="font-display text-4xl font-bold mt-1">Análise emocional completa</h1>
          </div>
          <GradientButton><Download className="h-4 w-4" />Baixar PDF</GradientButton>
        </div>

        <section className="glass rounded-2xl p-6 mt-8">
          <h2 className="font-display text-xl font-bold">Resumo executivo</h2>
          <p className="text-muted-foreground mt-2">
            Perfil analítico-explorador, com forte impulso de descoberta e capacidade de saborear pequenas alegrias. Tende a evitar conflito direto e a planejar em torno do medo. Recomenda-se trabalhar expressão assertiva e desafios de novidade controlada.
          </p>
        </section>

        <h2 className="font-display text-xl font-bold mt-10 mb-4">Por emoção</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {blocks.map((b) => {
            const s = themeStyle(b.theme);
            return (
              <div key={b.theme} className={`glass rounded-2xl p-6 border ${s.border}`}>
                <div className="flex items-center justify-between">
                  <h3 className={`font-display font-bold text-lg ${s.text}`}>{s.emoji} {b.title}</h3>
                  <span className="font-display text-2xl font-bold">{b.score}</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full mt-3 overflow-hidden">
                  <div className={`h-full bg-gradient-brand`} style={{ width: `${b.score}%` }} />
                </div>
                <p className="text-sm text-muted-foreground mt-3">{b.text}</p>
              </div>
            );
          })}
        </div>

        <section className="glass rounded-2xl p-6 mt-8">
          <h2 className="font-display text-xl font-bold flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-brand-orange" />Pontos de atenção</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground list-disc pl-5">
            <li>Tendência a engolir conflito pode gerar desgaste prolongado.</li>
            <li>Buscar pertencimento pode levar a assumir responsabilidades em excesso.</li>
          </ul>
        </section>

        <section className="glass rounded-2xl p-6 mt-6">
          <h2 className="font-display text-xl font-bold flex items-center gap-2"><Sparkles className="h-5 w-5 text-brand-purple" />Recomendações</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground list-disc pl-5">
            <li>Praticar pequenas comunicações assertivas semanais.</li>
            <li>Reservar tempo regular para experimentar atividades novas.</li>
            <li>Considerar acompanhamento terapêutico para aprofundar autoconhecimento.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
