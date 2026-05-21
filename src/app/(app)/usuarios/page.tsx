"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useAuthToken } from "@/hooks/useAuthToken";
import { apiFetch } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type Papel =
  | "ADMIN"
  | "GERENTE"
  | "ATENDENTE"
  | "FINANCEIRO"
  | "AUDITOR";

type Usuario = {
  id: string;
  email: string;
  nome: string;
  ativo: boolean;
  papeis: Papel[];
  realizaAtendimento: boolean;
  slotDurationMin: number;
  diasSemana: number[];
  horarioInicio: string | null;
  horarioFim: string | null;
  almocoInicio: string | null;
  almocoFim: string | null;
  createdAt: string;
};

const DIAS_LABELS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

const PAPEIS: Papel[] = [
  "ADMIN",
  "GERENTE",
  "ATENDENTE",
  "FINANCEIRO",
  "AUDITOR",
];

export default function UsuariosPage() {
  const { token, ready } = useAuthToken();
  const qc = useQueryClient();
  const [openNovo, setOpenNovo] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [form, setForm] = useState({
    email: "",
    nome: "",
    papel: "ATENDENTE" as Papel,
    realizaAtendimento: true,
    slotDurationMin: 15,
  });

  const lista = useQuery({
    queryKey: ["usuarios"],
    enabled: !!token,
    queryFn: () =>
      apiFetch<{ usuarios: Usuario[] }>("/api/admin/usuarios", token!),
  });

  const criar = useMutation({
    mutationFn: (payload: typeof form) =>
      apiFetch("/api/admin/usuarios", token!, {
        method: "POST",
        body: JSON.stringify({
          email: payload.email,
          nome: payload.nome,
          papeis: [payload.papel],
          realizaAtendimento: payload.realizaAtendimento,
          slotDurationMin: payload.slotDurationMin,
        }),
      }),
    onSuccess: () => {
      toast.success("Usuário criado e convidado por email.");
      setOpenNovo(false);
      setForm({ email: "", nome: "", papel: "ATENDENTE", realizaAtendimento: true, slotDurationMin: 15 });
      qc.invalidateQueries({ queryKey: ["usuarios"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const atualizarAtendimento = useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: { realizaAtendimento?: boolean; slotDurationMin?: number } }) =>
      apiFetch(`/api/admin/usuarios/${id}/atendimento`, token!, {
        method: "PATCH",
        body: JSON.stringify(dados),
      }),
    onSuccess: () => {
      toast.success("Atendimento atualizado.");
      qc.invalidateQueries({ queryKey: ["usuarios"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const desativar = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/admin/usuarios/${id}`, token!, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Usuário desativado.");
      qc.invalidateQueries({ queryKey: ["usuarios"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Admins e atendentes com acesso ao sistema.
          </p>
        </div>
        <Dialog open={openNovo} onOpenChange={setOpenNovo}>
          <DialogTrigger render={<Button />}>+ Convidar</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Convidar usuário</DialogTitle>
              <DialogDescription>
                O convite é enviado por email via Clerk.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="papel">Papel</Label>
                <select
                  id="papel"
                  className="w-full border rounded-md h-9 px-3 bg-background"
                  value={form.papel}
                  onChange={(e) =>
                    setForm({ ...form, papel: e.target.value as Papel })
                  }
                >
                  {PAPEIS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.realizaAtendimento}
                  onChange={(e) => setForm({ ...form, realizaAtendimento: e.target.checked })}
                  className="size-4"
                />
                <span className="text-sm">Realiza atendimento (entra na agenda)</span>
              </label>
              {form.realizaAtendimento && (
                <div className="space-y-2">
                  <Label htmlFor="duracao">Duração do slot (min)</Label>
                  <select
                    id="duracao"
                    className="w-full border rounded-md h-9 px-3 bg-background"
                    value={form.slotDurationMin}
                    onChange={(e) => setForm({ ...form, slotDurationMin: Number(e.target.value) })}
                  >
                    {[15, 20, 30, 45, 60].map((n) => (
                      <option key={n} value={n}>{n} min</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOpenNovo(false)}
                disabled={criar.isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => criar.mutate(form)}
                disabled={criar.isPending || !form.email || !form.nome}
              >
                {criar.isPending ? "Enviando..." : "Convidar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contas cadastradas</CardTitle>
          <CardDescription>
            {lista.data?.usuarios.length ?? 0} usuário(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!ready || lista.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : lista.error ? (
            <p className="text-sm text-destructive">
              Erro ao carregar: {lista.error.message}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Papéis</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.data?.usuarios.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nome}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.email}
                    </TableCell>
                    <TableCell className="space-x-1">
                      {u.papeis.length === 0 ? (
                        <span className="text-xs text-muted-foreground">
                          sem papel
                        </span>
                      ) : (
                        u.papeis.map((p, i) => (
                          <Badge key={`${u.id}-${p}-${i}`} variant="secondary">
                            {p}
                          </Badge>
                        ))
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.ativo ? "default" : "outline"}>
                        {u.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {u.ativo && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditando(u)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => desativar.mutate(u.id)}
                            disabled={desativar.isPending}
                          >
                            Desativar
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? editando.nome : ""}</DialogTitle>
            <DialogDescription>
              Configure agenda específica do atendente. Sem configuração, não entra no pool.
            </DialogDescription>
          </DialogHeader>
          {editando && (
            <EditarAtendimentoForm
              usuario={editando}
              token={token!}
              onSaved={() => {
                qc.invalidateQueries({ queryKey: ["usuarios"] });
                setEditando(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditarAtendimentoForm({
  usuario,
  token,
  onSaved,
}: {
  usuario: Usuario;
  token: string;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    realizaAtendimento: usuario.realizaAtendimento,
    slotDurationMin: usuario.slotDurationMin,
    diasSemana: usuario.diasSemana || [],
    horarioInicio: usuario.horarioInicio || "",
    horarioFim: usuario.horarioFim || "",
    almocoInicio: usuario.almocoInicio || "",
    almocoFim: usuario.almocoFim || "",
  });

  const salvar = useMutation({
    mutationFn: () =>
      apiFetch(`/api/admin/usuarios/${usuario.id}/atendimento`, token, {
        method: "PATCH",
        body: JSON.stringify({
          realizaAtendimento: form.realizaAtendimento,
          slotDurationMin: form.slotDurationMin,
          diasSemana: form.diasSemana,
          horarioInicio: form.horarioInicio || null,
          horarioFim: form.horarioFim || null,
          almocoInicio: form.almocoInicio || null,
          almocoFim: form.almocoFim || null,
        }),
      }),
    onSuccess: () => {
      toast.success("Configuração salva. Clique em 'Regerar slots' na Agenda para aplicar.");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function toggleDia(d: number) {
    setForm((f) =>
      f.diasSemana.includes(d)
        ? { ...f, diasSemana: f.diasSemana.filter((x) => x !== d) }
        : { ...f, diasSemana: [...f.diasSemana, d].sort() }
    );
  }

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={form.realizaAtendimento}
          onChange={(e) => setForm({ ...form, realizaAtendimento: e.target.checked })}
          className="size-4"
        />
        <span className="text-sm">Realiza atendimento (entra na agenda)</span>
      </label>

      {form.realizaAtendimento && (
        <>
          <div className="space-y-2">
            <Label className="text-xs">Duração do slot</Label>
            <select
              className="w-full border rounded-md h-9 px-3 bg-background"
              value={form.slotDurationMin}
              onChange={(e) => setForm({ ...form, slotDurationMin: Number(e.target.value) })}
            >
              {[15, 20, 30, 45, 60].map((n) => (
                <option key={n} value={n}>{n} min</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Dias de atendimento (obrigatório)</Label>
            <div className="flex gap-1 flex-wrap">
              {DIAS_LABELS.map((lbl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleDia(i)}
                  className={`px-3 py-1 text-xs rounded border ${
                    form.diasSemana.includes(i)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground"
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Início (obrigatório)</Label>
              <Input
                type="time"
                value={form.horarioInicio}
                onChange={(e) => setForm({ ...form, horarioInicio: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fim (obrigatório)</Label>
              <Input
                type="time"
                value={form.horarioFim}
                onChange={(e) => setForm({ ...form, horarioFim: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Almoço início (opcional)</Label>
              <Input
                type="time"
                value={form.almocoInicio}
                onChange={(e) => setForm({ ...form, almocoInicio: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Almoço fim (opcional)</Label>
              <Input
                type="time"
                value={form.almocoFim}
                onChange={(e) => setForm({ ...form, almocoFim: e.target.value })}
              />
            </div>
          </div>
        </>
      )}

      <DialogFooter>
        <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>
          {salvar.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </div>
  );
}
