import { Link } from "@tanstack/react-router";
import logoMark from "@/assets/logo-mark.png";
import { Button } from "@/components/ui/button";
import { useState } from "react";

type Role = "guest" | "master" | "admin" | "user";

const navByRole: Record<Role, { to: string; label: string }[]> = {
  guest: [
    { to: "/", label: "Início" },
    { to: "/login", label: "Login" },
  ],
  master: [
    { to: "/dashboard", label: "Meus testes" },
    { to: "/relatorios", label: "Relatórios" },
    { to: "/comprar", label: "Comprar teste" },
  ],
  user: [{ to: "/dashboard", label: "Meu teste" }],
  admin: [
    { to: "/admin", label: "Painel" },
    { to: "/admin/salas", label: "Salas" },
    { to: "/admin/usuarios", label: "Usuários" },
    { to: "/admin/comissoes", label: "Comissões" },
  ],
};

export function BrandHeader({ role = "guest" as Role }) {
  const [active, setActive] = useState<Role>(role);
  const items = navByRole[active];
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-background/70 border-b border-border/60">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logoMark} alt="Código Interno" width={40} height={40} className="h-10 w-10" />
          <span className="hidden sm:inline font-display font-bold text-lg tracking-tight leading-none">
            Código <span className="text-gradient-brand">Interno</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {items.map((it) => (
            <Link
              key={it.to}
              to={it.to}
              className="px-3 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              activeProps={{ className: "px-3 py-2 text-sm rounded-md text-foreground bg-secondary/80" }}
            >
              {it.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <select
            value={active}
            onChange={(e) => setActive(e.target.value as Role)}
            className="hidden sm:block bg-secondary/60 border border-border text-xs rounded-md px-2 py-1.5"
            title="Alternar role (demo)"
          >
            <option value="guest">guest</option>
            <option value="master">master</option>
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
          {active === "guest" ? (
            <Button asChild size="sm" className="bg-gradient-brand text-white border-0 hover:opacity-90">
              <Link to="/cadastro">Criar conta</Link>
            </Button>
          ) : (
            <Button asChild size="sm" variant="ghost">
              <Link to="/">Sair</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
