import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "./ConfirmDialog";
import { Loader2, Sparkles, Trash2, AlertTriangle } from "lucide-react";
import { fetchAgents, parseGeneratedQuestions, runAgent, type GeneratedQuestion } from "@/lib/ai-agents";

export type DraftGenerated = {
  text: string;
  answers: { label: string; emoji: string }[];
};

export function GenerateQuestionsDialog({
  open,
  onOpenChange,
  room,
  saving,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  room: { title: string; theme: string; ageMin: number; ageMax: number; hint?: string | null };
  saving: boolean;
  onSave: (questions: DraftGenerated[]) => void;
}) {
  const [agentId, setAgentId] = useState("");
  const [quantidade, setQuantidade] = useState(5);
  const [faixa, setFaixa] = useState(`${room.ageMin} a ${room.ageMax} anos`);
  const [tema, setTema] = useState(room.hint ?? room.title);
  const [extra, setExtra] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<DraftGenerated[] | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const { data: agents } = useQuery({
    queryKey: ["agents", "question_generator"],
    queryFn: () => fetchAgents("question_generator"),
    enabled: open,
  });

  const selectedAgent = agentId || agents?.[0]?.id || "";

  const generate = async () => {
    if (!selectedAgent) {
      toast.error("Cadastre um agente gerador de perguntas antes.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await runAgent({
        agentId: selectedAgent,
        variables: {
          sala: room.title,
          tema,
          faixa_etaria: faixa,
          quantidade,
          instrucoes: extra,
        },
      });
      const parsed: GeneratedQuestion[] = parseGeneratedQuestions(result);
      if (!parsed.length) throw new Error("O agente não retornou nenhuma pergunta.");
      setPreview(
        parsed.map((q) => ({
          text: q.texto,
          answers: q.alternativas.slice(0, 4).map((a) => ({ label: a.label, emoji: a.emoji ?? "" })),
        })),
      );
    } catch (e: any) {
      setError(e?.message ?? "Falha ao gerar perguntas.");
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    setPreview(null);
    setError(null);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-purple" />
              Gerar perguntas com IA
            </DialogTitle>
          </DialogHeader>

          {!preview && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Agente</Label>
                <select
                  value={selectedAgent}
                  onChange={(e) => setAgentId(e.target.value)}
                  className="w-full bg-input border border-border rounded-md h-9 px-3 text-sm cursor-pointer"
                >
                  {(agents ?? []).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.model})
                    </option>
                  ))}
                  {!agents?.length && <option value="">Nenhum agente cadastrado</option>}
                </select>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Quantidade de perguntas</Label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={quantidade}
                    onChange={(e) => setQuantidade(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Faixa etária</Label>
                  <Input value={faixa} onChange={(e) => setFaixa(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tema / contexto</Label>
                <Input value={tema} onChange={(e) => setTema(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Instruções extras (opcional)</Label>
                <Textarea value={extra} onChange={(e) => setExtra(e.target.value)} />
              </div>
              {error && (
                <p className="text-sm text-destructive flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span className="break-words">{error}</span>
                </p>
              )}
            </div>
          )}

          {preview && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Revise e edite antes de salvar na sala. {preview.length} pergunta(s) geradas.
              </p>
              {preview.map((q, qi) => (
                <div key={qi} className="rounded-xl border border-border p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <Textarea
                      value={q.text}
                      onChange={(e) => {
                        const arr = [...preview];
                        arr[qi] = { ...arr[qi], text: e.target.value };
                        setPreview(arr);
                      }}
                      className="flex-1"
                    />
                    <button
                      type="button"
                      className="cursor-pointer text-muted-foreground hover:text-destructive mt-1"
                      onClick={() => setPreview(preview.filter((_, i) => i !== qi))}
                      aria-label="Remover pergunta"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {q.answers.map((a, ai) => (
                      <div key={ai} className="flex gap-2">
                        <Input
                          value={a.emoji}
                          placeholder="🌟"
                          className="w-16"
                          onChange={(e) => {
                            const arr = [...preview];
                            const ans = [...arr[qi].answers];
                            ans[ai] = { ...ans[ai], emoji: e.target.value };
                            arr[qi] = { ...arr[qi], answers: ans };
                            setPreview(arr);
                          }}
                        />
                        <Input
                          value={a.label}
                          className="flex-1"
                          onChange={(e) => {
                            const arr = [...preview];
                            const ans = [...arr[qi].answers];
                            ans[ai] = { ...ans[ai], label: e.target.value };
                            arr[qi] = { ...arr[qi], answers: ans };
                            setPreview(arr);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="gap-2">
            {!preview ? (
              <>
                <Button variant="ghost" className="cursor-pointer" onClick={close}>
                  Cancelar
                </Button>
                <Button
                  className="cursor-pointer bg-gradient-brand text-white border-0"
                  disabled={loading}
                  onClick={() => void generate()}
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Gerando…" : "Gerar perguntas"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  className="cursor-pointer"
                  onClick={() => setConfirmDiscard(true)}
                >
                  Descartar
                </Button>
                <Button
                  variant="outline"
                  className="cursor-pointer"
                  disabled={loading}
                  onClick={() => void generate()}
                >
                  Gerar de novo
                </Button>
                <Button
                  className="cursor-pointer bg-gradient-brand text-white border-0"
                  disabled={saving || !preview.length}
                  onClick={() => onSave(preview)}
                >
                  {saving ? "Salvando…" : "Salvar na sala"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Descartar perguntas geradas?"
        description="As perguntas geradas serão perdidas e não serão salvas na sala."
        onConfirm={() => {
          setConfirmDiscard(false);
          setPreview(null);
        }}
      />
    </>
  );
}