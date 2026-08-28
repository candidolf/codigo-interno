import { Link, useNavigate } from "@tanstack/react-router";
import logoFull from "@/assets/logo-full.png";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProfile } from "@/lib/profile.functions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LogOut, Menu } from "lucide-react";
import { useState } from "react";

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
    { to: "/comprar", label: "Comprar teste" },
  ],
  user: [
    { to: "/dashboard", label: "Início" },
  ],
  admin: [
    { to: "/admin", label: "Início" },
    { to: "/admin/salas", label: "Salas" },
    { to: "/admin/vendedores", label: "Vendedores" },
    { to: "/admin/usuarios", label: "Usuários" },
    { to: "/admin/comissoes", label: "Comissões" },
    { to: "/admin/agentes", label: "Agentes" },
  ],
};

export function BrandHeader() {
  const { user, isAuthenticated, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const role: Role = !isAuthenticated ? "guest" : isAdmin ? "admin" : "master";
  const items = loading ? [] : navByRole[role];
  const [mobileOpen, setMobileOpen] = useState(false);

  const onLogout = async () => {
    await signOut();
    navigate({ to: "/login", replace: true });
  };

  const fetchProfile = useServerFn(getMyProfile);
  const { data: profile } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => fetchProfile(),
    enabled: isAuthenticated && !loading,
    staleTime: 60_000,
  });

  const displayName = profile?.fullName ?? user?.email?.split("@")[0] ?? null;
  const displayEmail = profile?.email ?? user?.email ?? null;
  const initials = (displayName ?? displayEmail ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p: string) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";
  const roleLabel = role === "admin" ? "Admin" : role === "master" ? "Master" : "";

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
        <div className="flex items-center gap-3">
          {loading ? null : role === "guest" ? (
            <Button asChild size="sm" className="bg-gradient-brand text-white border-0 hover:opacity-90 cursor-pointer">
              <Link to="/cadastro">Criar conta</Link>
            </Button>
          ) : (
            <>
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden cursor-pointer"
                    aria-label="Abrir menu"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72">
                  <SheetHeader>
                    <SheetTitle>Navegação</SheetTitle>
                  </SheetHeader>
                  <nav className="mt-6 flex flex-col gap-1">
                    {items.map((it) => (
                      <Link
                        key={it.to}
                        to={it.to}
                        onClick={() => setMobileOpen(false)}
                        className="cursor-pointer px-3 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                        activeProps={{
                          className:
                            "cursor-pointer px-3 py-2 text-sm rounded-md text-foreground bg-secondary/80",
                        }}
                      >
                        {it.label}
                      </Link>
                    ))}
                  </nav>
                </SheetContent>
              </Sheet>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Menu da conta"
                    className="cursor-pointer rounded-full outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 hover:ring-2 hover:ring-border"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-brand text-white font-display text-sm">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-60 border border-border/60 bg-popover/95 backdrop-blur"
                >
                  <DropdownMenuLabel className="flex flex-col gap-1 py-2">
                    {displayName && (
                      <span className="text-sm font-semibold text-foreground truncate">
                        {displayName}
                      </span>
                    )}
                    {displayEmail && (
                      <span className="text-xs font-normal text-muted-foreground truncate">
                        {displayEmail}
                      </span>
                    )}
                    {roleLabel && (
                      <span className="mt-1 inline-flex w-fit items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-secondary-foreground">
                        {roleLabel}
                      </span>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      onLogout();
                    }}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

// Mantemos homeByRole exportado caso outros componentes precisem do destino "Início" por papel.
export { homeByRole };
