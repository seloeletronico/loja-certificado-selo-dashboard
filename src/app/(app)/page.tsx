"use client";

import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { useAuthToken } from "@/hooks/useAuthToken";
import { apiFetch } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type Metricas = {
  hoje: {
    pedidos: number;
    pagos: number;
    faturamento: number;
    ticketMedio: number;
  };
  periodo7d: {
    pedidos: number;
    pagos: number;
    faturamento: number;
    conversao: number;
  };
  serie: Array<{
    dia: string;
    total: number;
    pagos: number;
    faturamento: number;
  }>;
};

const chartConfig = {
  total: { label: "Criados", color: "oklch(0.6 0.2 240)" },
  pagos: { label: "Pagos", color: "oklch(0.65 0.2 145)" },
} satisfies ChartConfig;

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}

export default function DashboardHome() {
  const { user } = useUser();
  const { token, ready } = useAuthToken();
  const nome = user?.firstName ?? user?.emailAddresses[0]?.emailAddress ?? "Admin";

  const query = useQuery({
    queryKey: ["metricas"],
    enabled: !!token,
    queryFn: () => apiFetch<Metricas>("/api/admin/metricas", token!),
    refetchInterval: 60_000,
  });

  const m = query.data;

  const kpis = [
    {
      label: "Pedidos hoje",
      valor: m?.hoje.pedidos ?? "—",
      hint: m ? `${m.hoje.pagos} pagos` : "",
    },
    {
      label: "Faturamento hoje",
      valor: m ? formatBRL(m.hoje.faturamento) : "—",
      hint: m ? `ticket médio ${formatBRL(m.hoje.ticketMedio)}` : "",
    },
    {
      label: "Pedidos 7 dias",
      valor: m?.periodo7d.pedidos ?? "—",
      hint: m ? `${m.periodo7d.pagos} pagos` : "",
    },
    {
      label: "Conversão 7 dias",
      valor: m ? `${m.periodo7d.conversao.toFixed(1)}%` : "—",
      hint: m ? formatBRL(m.periodo7d.faturamento) : "",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Bem-vindo, {nome}
        </h1>
        <p className="text-sm text-muted-foreground">
          Visão geral do Selo Eletrônico.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {k.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!ready || query.isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-semibold">{k.valor}</div>
                  <p className="text-xs text-muted-foreground mt-1">{k.hint}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos 7 dias</CardTitle>
        </CardHeader>
        <CardContent>
          {!ready || query.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : query.error ? (
            <p className="text-sm text-destructive">
              Erro: {query.error.message}
            </p>
          ) : m ? (
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <BarChart
                data={m.serie.map((s) => ({
                  ...s,
                  diaLabel: format(parseISO(s.dia), "dd/MM", { locale: ptBR }),
                }))}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="diaLabel" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} width={30} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="total" fill="var(--color-total)" radius={4} />
                <Bar dataKey="pagos" fill="var(--color-pagos)" radius={4} />
              </BarChart>
            </ChartContainer>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
