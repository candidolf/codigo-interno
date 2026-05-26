import { Outlet, createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabaseConfigured } from "@/integrations/supabase/client";
import { getSessionHome } from "@/lib/session.functions";

type Status = "checking" | "admin" | "denied" | "error";

function AdminGate() {
  const fetchHome = useServerFn(getSessionHome);
  const [status, setStatus] = useState<Status>("checking");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) {
      setStatus("admin");
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const info = await fetchHome();
        if (!mounted) return;
        if (info.isAdmin) setStatus("admin");
        else setStatus("denied");
      } catch (e: any) {
        if (!mounted) return;
        setErrMsg(e?.message ?? "Falha ao validar permissão");
        setStatus("error");
      }
    })();
    return () => { mounted = false; };
  }, [fetchHome]);

  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Verificando permissões…
      </div>
    );
  }
  if (status === "denied") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="font-display text-2xl font-bold">Acesso restrito</h1>
        <p className="text-muted-foreground">Sua conta não tem permissão de administrador.</p>
        <Link to="/dashboard" className="underline cursor-pointer">Voltar ao dashboard</Link>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="font-display text-2xl font-bold">Não foi possível validar permissão</h1>
        <p className="text-destructive text-sm">{errMsg}</p>
        <Link to="/dashboard" className="underline cursor-pointer">Voltar ao dashboard</Link>
      </div>
    );
  }
  return <Outlet />;
}

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminGate,
});