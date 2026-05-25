import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { BrandHeader } from "./BrandHeader";
import { GradientButton } from "./GradientButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { maskCPF, maskPhone, isValidCPF } from "@/lib/masks";

export type Seller = {
  id?: string;
  code: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  commission_rate: number;
  active: boolean;
};

function genCode() {
  const n = Math.floor(Math.random() * 900) + 100;
  return `VEND-${n}`;
}

export function VendedorForm({ seller }: { seller?: Seller | null }) {
  const editing = !!seller;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState<Seller>({
    code: seller?.code ?? "",
    full_name: seller?.full_name ?? "",
    email: seller?.email ?? "",
    phone: seller?.phone ?? "",
    cpf: seller?.cpf ?? "",
    commission_rate: seller?.commission_rate ?? 0.2,
    active: seller?.active ?? true,
  });

  const save = useMutation({
    mutationFn: async () => {
      if (form.cpf && !isValidCPF(form.cpf)) throw new Error("CPF inválido");
      const payload = {
        ...form,
        code: form.code || genCode(),
        email: form.email || null,
        phone: form.phone || null,
        cpf: form.cpf || null,
      };
      if (editing) {
        const { error } = await supabase.from("sellers").update(payload).eq("id", seller!.id!);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sellers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Vendedor salvo");
      qc.invalidateQueries({ queryKey: ["sellers"] });
      navigate({ to: "/admin/vendedores" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen">
      <BrandHeader />
      <main className="container mx-auto px-6 py-12 max-w-2xl">
        <Link to="/admin/vendedores" className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
          ← Vendedores
        </Link>
        <h1 className="font-display text-4xl font-bold mt-2">
          {editing ? "Editar vendedor" : "Novo vendedor"}
        </h1>
        <form
          className="glass rounded-2xl p-6 mt-8 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="space-y-2">
            <Label>Nome*</Label>
            <Input
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Código</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="auto: VEND-XXX"
              />
            </div>
            <div className="space-y-2">
              <Label>Comissão (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={(form.commission_rate * 100).toFixed(1)}
                onChange={(e) =>
                  setForm({ ...form, commission_rate: Number(e.target.value) / 100 })
                }
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>CPF</Label>
              <Input
                value={form.cpf ?? ""}
                onChange={(e) => setForm({ ...form, cpf: maskCPF(e.target.value) })}
                placeholder="000.000.000-00"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={form.phone ?? ""}
                onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })}
                placeholder="(11) 91234-5678"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="cursor-pointer"
            />
            <span className="text-sm">Ativo</span>
          </label>
          <div className="flex gap-3 pt-2">
            <GradientButton type="submit" disabled={save.isPending}>
              {save.isPending ? "Salvando…" : "Salvar"}
            </GradientButton>
            <Link
              to="/admin/vendedores"
              className="cursor-pointer px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}