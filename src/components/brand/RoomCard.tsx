import { Link } from "@tanstack/react-router";
import { themeStyle, type Room } from "@/data/mock";
import { cn } from "@/lib/utils";
import { ArrowRight, Lock } from "lucide-react";

export function RoomCard({
  room,
  testId,
  progress = 0,
  locked = false,
  lockedReason,
}: {
  room: Room;
  testId: string;
  progress?: number;
  locked?: boolean;
  lockedReason?: string;
}) {
  const s = themeStyle(room.theme);
  const inner = (
    <>
      <div className={cn("absolute inset-0 rounded-2xl opacity-30 transition-opacity", s.bg, !locked && "group-hover:opacity-50")} />
      <div className="relative">
        <div className="flex items-start justify-between">
          <span className="text-4xl">{s.emoji}</span>
          <span className="text-xs px-2 py-1 rounded-full bg-background/60 border border-border">
            {room.ageMin}–{room.ageMax} anos
          </span>
        </div>
        <h3 className={cn("font-display font-bold text-xl mt-4", s.text)}>{room.title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{room.description}</p>
        <div className="mt-5 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">{progress}% concluído</div>
          {locked ? <Lock className="h-4 w-4 text-muted-foreground" /> : <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />}
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-background/50 overflow-hidden">
          <div className="h-full bg-gradient-brand" style={{ width: `${progress}%` }} />
        </div>
        {locked && lockedReason && (
          <p className="mt-3 text-xs text-muted-foreground">{lockedReason}</p>
        )}
      </div>
    </>
  );

  if (locked) {
    return (
      <div
        aria-disabled="true"
        className={cn(
          "group relative block rounded-2xl border p-6 opacity-50 cursor-not-allowed",
          "glass", s.border,
        )}
      >
        {inner}
      </div>
    );
  }

  return (
    <Link
      to="/teste/$id/sala/$slug"
      params={{ id: testId, slug: room.slug }}
      className={cn(
        "group relative block rounded-2xl border p-6 transition-all hover:-translate-y-1 cursor-pointer",
        "glass", s.border,
      )}
    >
      {inner}
    </Link>
  );
}
