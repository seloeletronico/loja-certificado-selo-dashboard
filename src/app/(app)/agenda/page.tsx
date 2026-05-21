"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useAuthToken } from "@/hooks/useAuthToken";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

type Padrao = {
  diaSemana: number;
  ativo: boolean;
  horaInicio: string;
  horaFim: string;
  almocoInicio: string | null;
  almocoFim: string | null;
};

type Override = {
  data: string;
  ativo: boolean;
  horaInicio: string | null;
  horaFim: string | null;
  almocoInicio: string | null;
  almocoFim: string | null;
  motivo: string | null;
};

const DIAS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

export default function AgendaPage() {
  const { token, ready } = useAuthToken();
  const qc = useQueryClient();
  const [mes, setMes] = useState(() => {
    const d = new Date();
    return { ano: d.getFullYear(), mes: d.getMonth() };
  });
  const [modalPadrao, setModalPadrao] = useState(false);
  const [drawerDia, setDrawerDia] = useState<string | null>(null);

  const padraoQ = useQuery({
    queryKey: ["agenda-padrao"],
    enabled: !!token,
    queryFn: () => apiFetch<{ padrao: Padrao[] }>("/api/admin/agenda/padrao", token!),
  });

  const inicioMes = new Date(mes.ano, mes.mes, 1).toISOString().slice(0, 10);
  const fimMes = new Date(mes.ano, mes.mes + 1, 0).toISOString().slice(0, 10);

  const overridesQ = useQuery({
    queryKey: ["agenda-overrides", inicioMes, fimMes],
    enabled: !!token,
    queryFn: () =>
      apiFetch<{ overrides: Override[] }>(
        `/api/admin/agenda/overrides?de=${inicioMes}&ate=${fimMes}`,
        token!
      ),
  });

  const materializar = useMutation({
    mutationFn: () =>
      apiFetch<{ criados: number; atendentes: number }>(
        "/api/admin/agenda/materializar",
        token!,
        { method: "POST" }
      ),
    onSuccess: (r) => {
      toast.success(`${r.criados} slots gerados (${r.atendentes} atendentes)`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const overrideMap = new Map(
    overridesQ.data?.overrides.map((o) => [o.data.slice(0, 10), o]) ?? []
  );

  const primeiroDiaSemana = new Date(mes.ano, mes.mes, 1).getDay();
  const ultimoDia = new Date(mes.ano, mes.mes + 1, 0).getDate();

  const proxMes = () => {
    const d = new Date(mes.ano, mes.mes + 1, 1);
    setMes({ ano: d.getFullYear(), mes: d.getMonth() });
  };
  const antMes = () => {
    const d = new Date(mes.ano, mes.mes - 1, 1);
    setMes({ ano: d.getFullYear(), mes: d.getMonth() });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            Configure padrão semanal e bloqueie dias específicos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setModalPadrao(true)}>
            Padrão semanal
          </Button>
          <Button
            variant="outline"
            onClick={() => materializar.mutate()}
            disabled={materializar.isPending}
          >
            {materializar.isPending ? "Gerando..." : "Regerar slots"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">
            {new Date(mes.ano, mes.mes, 1).toLocaleDateString("pt-BR", {
              month: "long",
              year: "numeric",
            })}
          </CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={antMes}>
              ◀
            </Button>
            <Button size="sm" variant="ghost" onClick={proxMes}>
              ▶
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-2">
            {DIAS.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: primeiroDiaSemana }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: ultimoDia }).map((_, i) => {
              const dia = i + 1;
              const data = `${mes.ano}-${String(mes.mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
              const override = overrideMap.get(data);
              const bloqueado = override && !override.ativo;
              const customizado = override && override.ativo;
              return (
                <button
                  key={dia}
                  onClick={() => setDrawerDia(data)}
                  className={`aspect-square rounded-md border text-sm flex flex-col items-center justify-center hover:border-primary transition-colors ${
                    bloqueado
                      ? "bg-red-50 border-red-300 text-red-900"
                      : customizado
                        ? "bg-amber-50 border-amber-300 text-amber-900"
                        : "border-border hover:bg-muted"
                  }`}
                >
                  <span className="font-medium">{dia}</span>
                  {bloqueado && <span className="text-[10px]">bloq</span>}
                  {customizado && <span className="text-[10px]">custom</span>}
                </button>
              );
            })}
          </div>
          <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="size-3 rounded bg-amber-50 border border-amber-300"></span>
              Customizado
            </span>
            <span className="flex items-center gap-1">
              <span className="size-3 rounded bg-red-50 border border-red-300"></span>
              Bloqueado
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Modal Padrão Semanal */}
      <Dialog open={modalPadrao} onOpenChange={setModalPadrao}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Padrão semanal</DialogTitle>
          </DialogHeader>
          {padraoQ.data ? (
            <PadraoForm
              padrao={padraoQ.data.padrao}
              token={token!}
              onSaved={() => {
                qc.invalidateQueries({ queryKey: ["agenda-padrao"] });
                setModalPadrao(false);
              }}
            />
          ) : (
            <Skeleton className="h-64" />
          )}
        </DialogContent>
      </Dialog>

      {/* Drawer Override do Dia */}
      <Dialog open={!!drawerDia} onOpenChange={(o) => !o && setDrawerDia(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {drawerDia &&
                new Date(drawerDia + "T12:00:00").toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
            </DialogTitle>
          </DialogHeader>
          {drawerDia && (
            <OverrideForm
              data={drawerDia}
              override={overrideMap.get(drawerDia)}
              token={token!}
              onSaved={() => {
                qc.invalidateQueries({ queryKey: ["agenda-overrides"] });
                setDrawerDia(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PadraoForm({
  padrao,
  token,
  onSaved,
}: {
  padrao: Padrao[];
  token: string;
  onSaved: () => void;
}) {
  const [linhas, setLinhas] = useState<Padrao[]>(padrao);

  const salvar = useMutation({
    mutationFn: () =>
      apiFetch("/api/admin/agenda/padrao", token, {
        method: "PUT",
        body: JSON.stringify({ linhas }),
      }),
    onSuccess: () => {
      toast.success("Padrão salvo.");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function update(idx: number, patch: Partial<Padrao>) {
    setLinhas((arr) => arr.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {linhas.map((l, idx) => (
          <div
            key={l.diaSemana}
            className="grid grid-cols-[60px_60px_1fr_1fr_1fr_1fr] gap-2 items-center text-sm"
          >
            <span className="font-medium">{DIAS[l.diaSemana]}</span>
            <input
              type="checkbox"
              checked={l.ativo}
              onChange={(e) => update(idx, { ativo: e.target.checked })}
              className="size-4"
            />
            <Input
              type="time"
              value={l.horaInicio}
              onChange={(e) => update(idx, { horaInicio: e.target.value })}
              disabled={!l.ativo}
            />
            <Input
              type="time"
              value={l.horaFim}
              onChange={(e) => update(idx, { horaFim: e.target.value })}
              disabled={!l.ativo}
            />
            <Input
              type="time"
              placeholder="almoço início"
              value={l.almocoInicio ?? ""}
              onChange={(e) => update(idx, { almocoInicio: e.target.value || null })}
              disabled={!l.ativo}
            />
            <Input
              type="time"
              placeholder="almoço fim"
              value={l.almocoFim ?? ""}
              onChange={(e) => update(idx, { almocoFim: e.target.value || null })}
              disabled={!l.ativo}
            />
          </div>
        ))}
      </div>
      <DialogFooter>
        <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>
          {salvar.isPending ? "Salvando..." : "Salvar padrão"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function OverrideForm({
  data,
  override,
  token,
  onSaved,
}: {
  data: string;
  override?: Override;
  token: string;
  onSaved: () => void;
}) {
  const [ativo, setAtivo] = useState(override?.ativo ?? true);
  const [horaInicio, setHoraInicio] = useState(override?.horaInicio ?? "");
  const [horaFim, setHoraFim] = useState(override?.horaFim ?? "");
  const [almocoInicio, setAlmocoInicio] = useState(override?.almocoInicio ?? "");
  const [almocoFim, setAlmocoFim] = useState(override?.almocoFim ?? "");
  const [motivo, setMotivo] = useState(override?.motivo ?? "");

  const salvar = useMutation({
    mutationFn: () =>
      apiFetch(`/api/admin/agenda/overrides/${data}`, token, {
        method: "PUT",
        body: JSON.stringify({
          ativo,
          horaInicio: horaInicio || null,
          horaFim: horaFim || null,
          almocoInicio: almocoInicio || null,
          almocoFim: almocoFim || null,
          motivo: motivo || null,
        }),
      }),
    onSuccess: () => {
      toast.success("Override salvo.");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remover = useMutation({
    mutationFn: () =>
      apiFetch(`/api/admin/agenda/overrides/${data}`, token, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Override removido — usa padrão semanal.");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={ativo}
          onChange={(e) => setAtivo(e.target.checked)}
          className="size-4"
        />
        <span className="text-sm">Dia ativo (desmarque pra bloquear o dia inteiro)</span>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Hora início (vazio = padrão)</Label>
          <Input
            type="time"
            value={horaInicio}
            onChange={(e) => setHoraInicio(e.target.value)}
            disabled={!ativo}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Hora fim (vazio = padrão)</Label>
          <Input
            type="time"
            value={horaFim}
            onChange={(e) => setHoraFim(e.target.value)}
            disabled={!ativo}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Almoço início</Label>
          <Input
            type="time"
            value={almocoInicio}
            onChange={(e) => setAlmocoInicio(e.target.value)}
            disabled={!ativo}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Almoço fim</Label>
          <Input
            type="time"
            value={almocoFim}
            onChange={(e) => setAlmocoFim(e.target.value)}
            disabled={!ativo}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Motivo (opcional)</Label>
        <Input
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Feriado, treinamento, evento..."
        />
      </div>

      <DialogFooter className="gap-2">
        {override && (
          <Button
            variant="outline"
            onClick={() => remover.mutate()}
            disabled={remover.isPending}
          >
            Remover override
          </Button>
        )}
        <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>
          {salvar.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </div>
  );
}
