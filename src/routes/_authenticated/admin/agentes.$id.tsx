import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AgenteForm, type AiAgent } from "@/components/brand/AgenteForm";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/agentes/$id")({
  component: EditAgente,
});

function EditAgente() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["ai-agent", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_agents").select("*").eq("id", id).single();
      if (error) throw error;
      return data as unknown as AiAgent;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <BrandHeader />
        <main className="container mx-auto px-4 sm:px-6 py-12 text-muted-foreground">
          Carregando…
        </main>
      </div>
    );
  }
  return <AgenteForm agent={data} />;
}