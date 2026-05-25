import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SalaForm } from "@/components/brand/SalaForm";
import { supabase } from "@/integrations/supabase/client";
import { BrandHeader } from "@/components/brand/BrandHeader";

export const Route = createFileRoute("/_authenticated/admin/salas/$id")({
  component: EditSala,
});

function EditSala() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["room", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
  if (isLoading) {
    return (
      <div className="min-h-screen">
        <BrandHeader />
        <main className="container mx-auto px-6 py-12 text-muted-foreground">Carregando…</main>
      </div>
    );
  }
  return <SalaForm room={data as any} />;
}