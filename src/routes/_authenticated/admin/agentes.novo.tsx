import { createFileRoute } from "@tanstack/react-router";
import { AgenteForm } from "@/components/brand/AgenteForm";

export const Route = createFileRoute("/_authenticated/admin/agentes/novo")({
  component: () => <AgenteForm />,
});