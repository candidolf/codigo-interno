import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { VendedorForm } from "@/components/brand/VendedorForm";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/vendedores/$code")({
  component: EditSeller,
});

function EditSeller() {
  const { code } = Route.useParams();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["seller", code],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sellers")
        .select("*")
        .eq("code", code)
        .single();
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
  if (isError) {
    return (
      <div className="min-h-screen">
        <BrandHeader />
        <main className="container mx-auto px-6 py-12 text-destructive">
          Erro ao carregar vendedor: {(error as any)?.message ?? "desconhecido"}
        </main>
      </div>
    );
  }
  return <VendedorForm seller={data as any} />;
}