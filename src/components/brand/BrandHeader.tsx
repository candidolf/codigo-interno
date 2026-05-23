import { Link, useNavigate } from "@tanstack/react-router";
import logoFull from "@/assets/logo-full.png";
import { Button } from "@/components/ui/button";
import { useCurrentRole } from "@/hooks/use-current-role";
import { supabase, supabaseConfigured } from "@/integrations/supabase/client";

type Role = "guest" | "master" | "admin" | "user";

const homeByRole: Record<Role, string> = {
  guest: "/",
  master: "/dashboard",
  user: "/dashboard",
  admin: "/admin",
};

const navByRole: Record<Role, { to: string; label: string }[]> = {
  guest: [{ to: "/", label: "Início" }, { to: "/login", label: "Login" }],
  master: [
    { to: "/dashboard", label: "Início" },
    { to: "/dashboard", label: "Meus testes" },
    { to: "/relatorios", label: "Relatórios" },
    { to: "/comprar", label: "Comprar teste" },
  ],
  user: [
    { to: "/dashboard", label: "Início" },
    { to: "/dashboard", label: "Meu teste" },
  ],
  admin: [
    { to: "/admin", label: "Início" },
    { to: "/admin/salas", label: "Salas" },
    { to: "/admin/usuarios", label: "Usuários" },
    { to: "/admin/comissoes", label: "Comissões" },
  ],
};

export function BrandHeader() {
  const { role, loading } = useCurrentRole();
  const navigate = useNavigate();
  // Enquanto o papel carrega, se houver sessão ativa não devemos mostrar o menu de visitante
  // (que aponta "Início" para "/"). Renderizamos um menu vazio até saber o papel.
  const items = loading ? [] : navByRole[role];

  const onLogout = async () => {
    if (supabaseConfigured) await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-background/70 border-b border-border/60">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center cursor-pointer">
          <img src={logoFull} alt="Código Interno" className="h-10 w-auto" />
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {items.map((it) => (
            <Link key={it.to} to={it.to}
              className="cursor-pointer px-3 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              activeProps={{ className: "cursor-pointer px-3 py-2 text-sm rounded-md text-foreground bg-secondary/80" }}>
              {it.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {loading ? null : role === "guest" ? (
            <Button asChild size="sm" className="bg-gradient-brand text-white border-0 hover:opacity-90 cursor-pointer">
              <Link to="/cadastro">Criar conta</Link>
            </Button>
          ) : (
            <Button onClick={onLogout} size="sm" variant="ghost" className="cursor-pointer">Sair</Button>
          )}
        </div>
      </div>
    </header>
  );
}

// Mantemos homeByRole exportado caso outros componentes precisem do destino "Início" por papel.
export { homeByRole };
