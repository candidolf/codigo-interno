import { createFileRoute } from "@tanstack/react-router";
import { rooms } from "@/data/mock";
import { SalaForm } from "@/components/brand/SalaForm";

export const Route = createFileRoute("/admin/salas/$id")({
  component: function Edit() {
    const { id } = Route.useParams();
    const room = rooms.find((r) => r.slug === id);
    return <SalaForm room={room} />;
  },
});
