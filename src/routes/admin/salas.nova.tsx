import { createFileRoute } from "@tanstack/react-router";
import { SalaForm } from "@/components/brand/SalaForm";

export const Route = createFileRoute("/admin/salas/nova")({ component: () => <SalaForm /> });
