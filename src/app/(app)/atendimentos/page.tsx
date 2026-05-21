"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import Link from "next/link";
import { useAuthToken } from "@/hooks/useAuthToken";
import { apiFetch } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

type Filtro = "disponiveis" | "meus" | "concluidos" | "todos";

type Pedido = {
  id: string;
  status: string;
  protocolo: string | null;
  preco: string;
  tipoCertificado: "ECPF" | "ECNPJ";
  nomeCliente: string;
  emailCliente: string;
  telefoneDdd: string;
  telefoneNumero: string;
  cnpj: string | null;
  razaoSocial: string | null;
  hopeUrl: string | null;
  atendidoEm: string | null;
  concluidoEm: string | null;
  atendenteResponsavel: { id: string; nome: string; email: string } | null;
  createdAt: string;
  agendamento: { inicio: string; duracaoMin: number; status: string } | null;
};

type Resposta = {
  pedidos: Pedido[];
  paginacao: { page: number; pageSize: number; total: number; totalPages: number };
};

const FILTROS: { valor: Filtro; label: string }[] = [
  { valor: "disponiveis", label: "Disponíveis" },
  { valor: "meus", label: "Meus em andamento" },
  { valor: "concluidos", label: "Concluídos hoje" },
  { valor: "todos", label: "Todos" },
];

function formatBRL(v: string | number) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
}

export default function AtendimentosPage() {
  const { token, ready } = useAuthToken();
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState<Filtro>("disponiveis");

  const query = useQuery({
    queryKey: ["atendimentos", filtro],
    enabled: !!token,
    placeholderData: keepPreviousData,
    refetchInterval: 15_000,
    queryFn: () =>
      apiFetch<Resposta>(`/api/admin/atendimentos?filtro=${filtro}&pageSize=50`, token!),
  });

  const pegar = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/admin/atendimentos/${id}/pegar`, token!, { method: "POST" }),
    onSuccess: () => {
      toast.success("Atendimento atribuído a você.");
      qc.invalidateQueries({ queryKey: ["atendimentos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const concluir = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/admin/atendimentos/${id}/concluir`, token!, { method: "POST" }),
    onSuccess: () => {
      toast.success("Atendimento marcado como concluído.");
      qc.invalidateQueries({ queryKey: ["atendimentos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const data = query.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Atendimentos</h1>
        <p className="text-sm text-muted-foreground">
          Fila de pedidos pagos aguardando atendimento. Auto-atualiza a cada 15s.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <Button
            key={f.valor}
            variant={filtro === f.valor ? "default" : "outline"}
            size="sm"
            onClick={() => setFiltro(f.valor)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {data?.paginacao.total ?? 0} pedido(s)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!ready || (query.isLoading && !data) ? (
            <div className="p-6 space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : query.error ? (
            <p className="p-6 text-sm text-destructive">{query.error.message}</p>
          ) : data?.pedidos.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">
              Nada por aqui no momento.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Agendamento</TableHead>
                  <TableHead>Atendente</TableHead>
                  <TableHead className="w-[180px]">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.pedidos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">
                      <Link href={`/pedidos/${p.id}`} className="text-primary hover:underline">
                        {p.protocolo ?? p.id.slice(-8)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{p.nomeCliente}</div>
                      <div className="text-xs text-muted-foreground">
                        ({p.telefoneDdd}) {p.telefoneNumero}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          p.tipoCertificado === "ECPF"
                            ? "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100"
                            : "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100"
                        }
                      >
                        {p.tipoCertificado}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatBRL(p.preco)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{p.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {p.agendamento ? (
                        <div>
                          <div className="font-medium">
                            {format(new Date(p.agendamento.inicio), "dd/MM HH:mm", { locale: ptBR })}
                          </div>
                          <div className="text-muted-foreground">
                            {p.agendamento.duracaoMin}min · {p.agendamento.status}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.atendenteResponsavel?.nome ?? "—"}
                    </TableCell>
                    <TableCell>
                      {!p.atendenteResponsavel && (
                        <Button
                          size="sm"
                          onClick={() => pegar.mutate(p.id)}
                          disabled={pegar.isPending}
                        >
                          Pegar
                        </Button>
                      )}
                      {p.atendenteResponsavel && !p.concluidoEm && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => concluir.mutate(p.id)}
                          disabled={concluir.isPending}
                        >
                          Concluir
                        </Button>
                      )}
                      {p.concluidoEm && (
                        <span className="text-xs text-muted-foreground">
                          ✓ {format(new Date(p.concluidoEm), "HH:mm", { locale: ptBR })}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
