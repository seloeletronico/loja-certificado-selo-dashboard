"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuthToken } from "@/hooks/useAuthToken";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type Registro = {
  id: string;
  pedidoId: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  gclid: string | null;
  fbclid: string | null;
  gadsCampaignId: string | null;
  gadsAdgroupId: string | null;
  gadsCreative: string | null;
  gadsKeyword: string | null;
  gadsMatchtype: string | null;
  gadsNetwork: string | null;
  gadsDevice: string | null;
  gadsDevicemodel: string | null;
  gadsPlacement: string | null;
  gadsAdposition: string | null;
  referrer: string | null;
  paginaOrigem: string | null;
  landingPage: string | null;
  hostname: string | null;
  userAgent: string | null;
  language: string | null;
  screenSize: string | null;
  deviceType: string | null;
  clientId: string | null;
  ipAddress: string | null;
  createdAt: string;
  pedido: {
    id: string;
    status: string;
    protocolo: string | null;
    preco: string;
    tipoCertificado: "ECPF" | "ECNPJ";
    nomeCliente: string;
    createdAt: string;
  };
};

type Resposta = {
  registros: Registro[];
  paginacao: { page: number; pageSize: number; total: number; totalPages: number };
};

function formatBRL(v: string | number) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n || 0);
}

function short(s: string | null, n = 30) {
  if (!s) return "—";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export default function AtribuicaoPage() {
  const { token, ready } = useAuthToken();
  const [silo, setSilo] = useState("");
  const [keyword, setKeyword] = useState("");
  const [utmSource, setUtmSource] = useState("");
  const [page, setPage] = useState(1);
  const [filtrosAtivos, setFiltrosAtivos] = useState<{
    silo: string;
    keyword: string;
    utmSource: string;
  }>({ silo: "", keyword: "", utmSource: "" });

  const query = useQuery({
    queryKey: ["atribuicao", filtrosAtivos, page],
    enabled: !!token,
    placeholderData: keepPreviousData,
    queryFn: () => {
      const qs = new URLSearchParams();
      if (filtrosAtivos.silo) qs.set("silo", filtrosAtivos.silo);
      if (filtrosAtivos.keyword) qs.set("keyword", filtrosAtivos.keyword);
      if (filtrosAtivos.utmSource) qs.set("utmSource", filtrosAtivos.utmSource);
      qs.set("page", String(page));
      qs.set("pageSize", "50");
      return apiFetch<Resposta>(`/api/admin/atribuicao?${qs}`, token!);
    },
  });

  const data = query.data;

  const exportarCsv = () => {
    if (!data?.registros.length) return;
    const cabecalho = [
      "data","protocolo","valor","tipo","status","nome",
      "hostname","utm_source","utm_medium","utm_campaign","utm_term",
      "gclid","fbclid","keyword","matchtype","campaignid","creative",
      "network","device","placement","referrer","landingPage"
    ];
    const linhas = data.registros.map(r => [
      new Date(r.createdAt).toISOString(),
      r.pedido.protocolo || "",
      r.pedido.preco,
      r.pedido.tipoCertificado,
      r.pedido.status,
      r.pedido.nomeCliente,
      r.hostname || "",
      r.utmSource || "",
      r.utmMedium || "",
      r.utmCampaign || "",
      r.utmTerm || "",
      r.gclid || "",
      r.fbclid || "",
      r.gadsKeyword || "",
      r.gadsMatchtype || "",
      r.gadsCampaignId || "",
      r.gadsCreative || "",
      r.gadsNetwork || "",
      r.gadsDevice || "",
      r.gadsPlacement || "",
      r.referrer || "",
      r.landingPage || "",
    ].map(c => `"${String(c).replace(/"/g, '""')}"`).join(","));
    const csv = [cabecalho.join(","), ...linhas].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `atribuicao-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Atribuição</h1>
          <p className="text-sm text-muted-foreground">
            {data?.paginacao.total ?? 0} pedido(s) com dados de rastreamento
          </p>
        </div>
        <Button variant="outline" onClick={exportarCsv} disabled={!data?.registros.length}>
          Exportar CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 grid-cols-1 sm:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setFiltrosAtivos({ silo, keyword, utmSource });
            }}
          >
            <Input
              placeholder="Silo (hostname)"
              value={silo}
              onChange={(e) => setSilo(e.target.value)}
            />
            <Input
              placeholder="Palavra-chave (Google Ads)"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <Input
              placeholder="UTM source (google, facebook…)"
              value={utmSource}
              onChange={(e) => setUtmSource(e.target.value)}
            />
            <Button type="submit">Buscar</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {!ready || (query.isLoading && !data) ? (
            <div className="p-6 space-y-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : query.error ? (
            <p className="p-6 text-sm text-destructive">{query.error.message}</p>
          ) : data?.registros.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">
              Nenhum registro encontrado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Hostname</TableHead>
                  <TableHead>UTM source</TableHead>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Click ID</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.registros.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(new Date(r.createdAt), "dd/MM HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.pedido.protocolo ?? r.pedidoId.slice(-8)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatBRL(r.pedido.preco)}
                    </TableCell>
                    <TableCell className="text-xs">{short(r.hostname, 20)}</TableCell>
                    <TableCell>
                      {r.utmSource ? (
                        <Badge variant="secondary">{r.utmSource}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs" title={r.gadsKeyword ?? ""}>
                      {short(r.gadsKeyword, 20)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {short(r.utmCampaign || r.gadsCampaignId, 18)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.deviceType ?? r.gadsDevice ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs font-mono" title={r.gclid ?? r.fbclid ?? ""}>
                      {r.gclid ? "G" : ""}{r.fbclid ? "F" : ""}{(!r.gclid && !r.fbclid) && "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{r.pedido.status}</Badge>
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
