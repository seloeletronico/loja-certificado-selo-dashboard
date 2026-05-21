"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuthToken } from "@/hooks/useAuthToken";
import { apiFetch } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

type PedidoStatus =
  | "INICIADO"
  | "VALIDADO"
  | "PROTOCOLO_GERADO"
  | "AGUARDANDO_PAGAMENTO"
  | "PAGO"
  | "CADASTRO_CONFIRMADO"
  | "EM_VALIDACAO"
  | "EM_VERIFICACAO"
  | "EMITIDO"
  | "REVOGADO"
  | "CONCLUIDO"
  | "CANCELADO"
  | "ABANDONADO";

type Pedido = {
  id: string;
  status: PedidoStatus;
  tipoCertificado: "ECPF" | "ECNPJ";
  preco: string;
  protocolo: string | null;
  nomeCliente: string;
  emailCliente: string;
  cidade: string;
  uf: string;
  cnpj: string | null;
  razaoSocial: string | null;
  utmSource: string | null;
  createdAt: string;
};

type Resposta = {
  pedidos: Pedido[];
  paginacao: { page: number; pageSize: number; total: number; totalPages: number };
};

const STATUS_LABEL: Record<PedidoStatus, string> = {
  INICIADO: "Iniciado",
  VALIDADO: "Validado",
  PROTOCOLO_GERADO: "Protocolo gerado",
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PAGO: "Pago",
  CADASTRO_CONFIRMADO: "Cadastro confirmado",
  EM_VALIDACAO: "Em validação",
  EM_VERIFICACAO: "Em verificação",
  EMITIDO: "Emitido",
  REVOGADO: "Revogado",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
  ABANDONADO: "Abandonado",
};

const STATUS_VARIANT: Record<
  PedidoStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  INICIADO: "outline",
  VALIDADO: "outline",
  PROTOCOLO_GERADO: "secondary",
  AGUARDANDO_PAGAMENTO: "secondary",
  PAGO: "default",
  CADASTRO_CONFIRMADO: "default",
  EM_VALIDACAO: "secondary",
  EM_VERIFICACAO: "secondary",
  EMITIDO: "default",
  REVOGADO: "destructive",
  CONCLUIDO: "default",
  CANCELADO: "destructive",
  ABANDONADO: "outline", // destacado por className no JSX (laranja)
};

const STATUS_OPTIONS: (PedidoStatus | "")[] = [
  "",
  "ABANDONADO", // logo depois de "todos" pra agente localizar fácil
  "AGUARDANDO_PAGAMENTO",
  "PAGO",
  "EMITIDO",
  "CANCELADO",
  "INICIADO",
  "VALIDADO",
  "PROTOCOLO_GERADO",
  "CADASTRO_CONFIRMADO",
  "EM_VALIDACAO",
  "EM_VERIFICACAO",
  "CONCLUIDO",
  "REVOGADO",
];

function formatBRL(v: string | number) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

export default function PedidosPage() {
  const { token, ready } = useAuthToken();
  const [busca, setBusca] = useState("");
  const [buscaAtiva, setBuscaAtiva] = useState("");
  const [status, setStatus] = useState<string>("");
  const [incluirInativos, setIncluirInativos] = useState(false);
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["pedidos", { buscaAtiva, status, incluirInativos, page }],
    enabled: !!token,
    placeholderData: keepPreviousData,
    queryFn: () => {
      const qs = new URLSearchParams();
      if (buscaAtiva) qs.set("busca", buscaAtiva);
      if (status) qs.set("status", status);
      if (incluirInativos) qs.set("incluirInativos", "true");
      qs.set("page", String(page));
      qs.set("pageSize", "20");
      return apiFetch<Resposta>(`/api/admin/pedidos?${qs}`, token!);
    },
  });

  const data = query.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pedidos</h1>
        <p className="text-sm text-muted-foreground">
          {data?.paginacao.total ?? 0} pedido(s) encontrado(s)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col sm:flex-row gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setBuscaAtiva(busca.trim());
            }}
          >
            <Input
              placeholder="Nome, email, CNPJ, protocolo ou ID"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="flex-1"
            />
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 border rounded-md bg-background min-w-[200px]"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === "" ? "Ativos (sem cancelados/abandonados)" : STATUS_LABEL[s as PedidoStatus]}
                </option>
              ))}
            </select>
            <Button type="submit">Buscar</Button>
          </form>
          <label className="mt-3 flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={incluirInativos}
              onChange={(e) => {
                setIncluirInativos(e.target.checked);
                setPage(1);
              }}
            />
            Incluir cancelados e abandonados no resultado
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {!ready || (query.isLoading && !data) ? (
            <div className="p-6 space-y-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : query.error ? (
            <p className="p-6 text-sm text-destructive">
              Erro: {query.error.message}
            </p>
          ) : data?.pedidos.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">
              Nenhum pedido encontrado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.pedidos.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">
                      {p.protocolo ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(p.createdAt), "dd/MM/yy HH:mm", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{p.nomeCliente}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.tipoCertificado === "ECNPJ" && p.razaoSocial
                          ? p.razaoSocial
                          : p.emailCliente}
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
                      <Badge
                        variant={STATUS_VARIANT[p.status]}
                        className={
                          p.status === "ABANDONADO"
                            ? "border-amber-500 bg-amber-50 text-amber-900"
                            : undefined
                        }
                      >
                        {STATUS_LABEL[p.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        nativeButton={false}
                        render={<Link href={`/pedidos/${p.id}`} />}
                      >
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {data && data.paginacao.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {data.paginacao.page} de {data.paginacao.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.paginacao.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
