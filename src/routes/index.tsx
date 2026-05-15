import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { GradientButton } from "@/components/brand/GradientButton";
import logoMark from "@/assets/logo-mark.png";
import { Brain, Compass, Sparkles, Target, ArrowRight, Check, Mail, Instagram, Linkedin } from "lucide-react";

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

      </main>
      <footer className="border-t border-border/60 mt-8">
        <div className="container mx-auto px-6 py-14 grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2.5">
              <img src={logoMark} alt="Código Interno" width={40} height={40} className="h-10 w-10" />
              <span className="font-display font-bold text-lg">
                Código <span className="text-gradient-brand">Interno</span>
              </span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground max-w-sm">
              Avaliação psicológica gamificada conduzida por IA. Uma jornada por salas temáticas para entender quem você é.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a href="mailto:contato@codigointerno.com" aria-label="Email" className="grid place-items-center h-9 w-9 rounded-full glass hover:bg-secondary/80 transition-colors">
                <Mail className="h-4 w-4" />
              </a>
              <a href="#" aria-label="Instagram" className="grid place-items-center h-9 w-9 rounded-full glass hover:bg-secondary/80 transition-colors">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="#" aria-label="LinkedIn" className="grid place-items-center h-9 w-9 rounded-full glass hover:bg-secondary/80 transition-colors">
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-display font-bold text-sm mb-4">Plataforma</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/comprar" className="hover:text-foreground transition-colors">Comprar teste</Link></li>
              <li><Link to="/login" className="hover:text-foreground transition-colors">Entrar</Link></li>
              <li><Link to="/cadastro" className="hover:text-foreground transition-colors">Criar conta</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display font-bold text-sm mb-4">Institucional</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Sobre</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Termos de uso</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Política de privacidade</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Contato</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border/60">
          <div className="container mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>© 2026 Código Interno · Todos os direitos reservados</span>
            <span>Mockup demonstrativo</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
