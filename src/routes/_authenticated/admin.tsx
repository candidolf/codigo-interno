import { Outlet, createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "@/integrations/supabase/client";

type Status = "checking" | "admin" | "denied" | "error";

function AdminGate() {
  const [status, setStatus] = useState<Status>(() => {
    if (typeof window !== "undefined") {
      try {
        // qualquer cache positivo prévio
        const keys = Object.keys(sessionStorage).filter((k) => k.startsWith("admin-role:"));
        if (keys.some((k) => sessionStorage.getItem(k) === "1")) return "admin";
      } catch {}
    }
    return "checking";
  });
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) {
      setStatus("admin"); // sem backend: não bloqueia navegação
      return;
    }
    let mounted = true;
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user.id;
      if (!uid) return; // _authenticated trata redirect para /login
      const cacheKey = `admin-role:${uid}`;
      try {
        if (sessionStorage.getItem(cacheKey) === "1") {
          if (mounted) setStatus("admin");
          return;
        }
      } catch {}
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid);
      if (!mounted) return;
      if (error) {
        setErrMsg(error.message);
        setStatus("error");
        return;
      }
      const isAdmin = (data ?? []).some((r: any) => r.role === "admin");
      if (isAdmin) {
        try { sessionStorage.setItem(cacheKey, "1"); } catch {}
        setStatus("admin");
      } else {
        setStatus("denied");
      }
    })();
    return () => { mounted = false; };
  }, []);

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