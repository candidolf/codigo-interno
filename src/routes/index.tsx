import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { GradientButton } from "@/components/brand/GradientButton";
import { Brain, Compass, Sparkles, Target, ArrowRight, Check } from "lucide-react";

export const Route = createFileRoute("/")({ component: Landing });

const pillars = [
  { icon: Brain, title: "Autoconhecimento", desc: "Entenda emoções e padrões internos." },
  { icon: Compass, title: "Direcionamento", desc: "Saiba para onde caminhar com clareza." },
  { icon: Sparkles, title: "Desenvolvimento", desc: "Pratique habilidades emocionais." },
  { icon: Target, title: "Realização", desc: "Conquiste o que importa para você." },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="container mx-auto px-6">
        <section className="pt-20 pb-24 text-center">
          <span className="inline-block text-xs uppercase tracking-widest text-muted-foreground glass rounded-full px-4 py-1.5">
            Avaliação psicológica gamificada
          </span>
          <h1 className="font-display text-5xl md:text-7xl font-bold mt-6 leading-[1.05] max-w-4xl mx-auto">
            Entenda sua mente.<br />
            <span className="text-gradient-brand">Escolha seu caminho.</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
            Uma jornada por salas temáticas onde a IA conversa, observa e devolve um relatório profundo sobre quem você é — para você ou para alguém que você ama.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <GradientButton size="lg" asChild>
              <Link to="/cadastro">Começar agora <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </GradientButton>
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground px-4 py-2">
              Já tenho conta
            </Link>
          </div>
          <div className="mt-8 inline-flex items-center gap-3 glass rounded-full px-5 py-2.5">
            <span className="font-display text-2xl font-bold text-gradient-brand">R$ 29,90</span>
            <span className="text-sm text-muted-foreground">por teste · pagamento único</span>
          </div>
        </section>

        <section className="grid md:grid-cols-4 gap-4 pb-24">
          {pillars.map((p) => (
            <div key={p.title} className="glass rounded-2xl p-6">
              <span className="grid place-items-center h-11 w-11 rounded-xl bg-gradient-brand-soft">
                <p.icon className="h-5 w-5" />
              </span>
              <h3 className="font-display font-bold text-lg mt-4">{p.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{p.desc}</p>
            </div>
          ))}
        </section>

        <section className="grid md:grid-cols-2 gap-8 pb-24 items-center">
          <div>
            <h2 className="font-display text-4xl font-bold leading-tight">Como funciona</h2>
            <ul className="mt-6 space-y-4">
              {[
                "Você compra 1 teste por R$ 29,90.",
                "Pode fazer você mesmo ou presentear outra pessoa.",
                "O testando entra em salas temáticas e responde a perguntas da IA.",
                "Recebe um relatório completo com análise por emoção.",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <span className="grid place-items-center h-6 w-6 rounded-full bg-gradient-brand text-white shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-muted-foreground">{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="glass rounded-3xl p-8 grid grid-cols-2 gap-3">
            {["☀️ Alegria", "🌙 Medo", "🔥 Raiva", "🧭 Descobertas"].map((n) => (
              <div key={n} className="aspect-square rounded-2xl bg-gradient-brand-soft border border-border grid place-items-center font-display font-bold text-xl">
                {n}
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
          © 2026 Código Interno · mockup demonstrativo
        </footer>
      </main>
    </div>
  );
}
