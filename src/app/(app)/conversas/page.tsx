"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { useAuthToken } from "@/hooks/useAuthToken";
import { listarConversas, ConversaStatus, ConversaCanal } from "@/lib/conversas";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConversasFilters, FiltrosConversas } from "@/components/conversas/ConversasFilters";
import { ConversasTable } from "@/components/conversas/ConversasTable";

const FILTROS_INICIAIS: FiltrosConversas = {
  status: "",
  canal: "",
  periodo: "",
  cpfHash: "",
};

export default function ConversasPage() {
  const router = useRouter();
  const { token, ready } = useAuthToken();
  const [filtros, setFiltros] = useState<FiltrosConversas>(FILTROS_INICIAIS);
  const [pagina, setPagina] = useState(1);

  const ehFiltroAtivo = filtros.status === "ATIVA";

  const query = useQuery({
    queryKey: ["conversas", filtros, pagina],
    enabled: !!token && ready,
    staleTime: ehFiltroAtivo ? 0 : 30_000,
    refetchInterval: ehFiltroAtivo ? 5_000 : false,
    queryFn: () =>
      listarConversas(
        {
          status: filtros.status as ConversaStatus | "",
          canal: filtros.canal as ConversaCanal | "",
          periodo: filtros.periodo,
          cpfHash: filtros.cpfHash || undefined,
          pagina,
          porPagina: 25,
        },
        token!
      ),
    throwOnError: false,
  });

  // Toast só dispara quando o erro MUDA, não em todo re-render.
  useEffect(() => {
    if (query.error) toast.error((query.error as Error).message);
  }, [query.error]);

  const handleFiltroChange = useCallback((patch: Partial<FiltrosConversas>) => {
    setFiltros((prev) => ({ ...prev, ...patch }));
    setPagina(1);
  }, []);

  const data = query.data;
  const ativas = data?.conversas.filter((c) => c.status === "ATIVA").length ?? 0;
  const humano = data?.conversas.filter((c) => c.status === "HUMANO").length ?? 0;
  const converteram = data?.conversas.filter((c) => c.status === "CONVERTEU").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Conversas IA</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            {data ? (
              <>
                <span><span className="font-medium text-green-700">{ativas}</span> ativas</span>
                <span>·</span>
                <span><span className="font-medium text-blue-700">{converteram}</span> converteram</span>
                <span>·</span>
                <span><span className="font-medium text-yellow-700">{humano}</span> em handoff</span>
              </>
            ) : (
              <span>Carregando...</span>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          aria-label="Atualizar conversas"
        >
          <RefreshCw className={`size-4 ${query.isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4">
          <ConversasFilters filtros={filtros} onChange={handleFiltroChange} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <ConversasTable
            data={data?.conversas}
            isLoading={!ready || (query.isLoading && !data)}
            onRowClick={(id) => router.push(`/conversas/${id}`)}
          />
        </CardContent>
      </Card>

      {data && data.paginacao.totalPaginas > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {data.paginacao.pagina} de {data.paginacao.totalPaginas} — {data.paginacao.total} conversas
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagina >= data.paginacao.totalPaginas}
              onClick={() => setPagina((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
