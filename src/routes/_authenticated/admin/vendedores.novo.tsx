import { createFileRoute } from "@tanstack/react-router";
import { VendedorForm } from "@/components/brand/VendedorForm";

export const Route = createFileRoute("/_authenticated/admin/vendedores/novo")({
  component: () => <VendedorForm />,
});