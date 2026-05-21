"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { ArrowLeft, Bot, MessageCircle, Monitor, Send, UserRound, Tv, ExternalLink } from "lucide-react";
import { useAuthToken } from "@/hooks/useAuthToken";
import { buscarConversa, ConversaStatus, ConversaCanal } from "@/lib/conversas";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { TurnosTimeline } from "@/components/conversas/TurnosTimeline";

const STATUS_STYLE: Record<ConversaStatus, { label: string; className: string }> = {
  ATIVA: { label: "Ativa", className: "bg-green-100 text-green-800 border-green-200" },
  IA_PAUSADA: { label: "IA Pausada", className: "bg-orange-100 text-orange-800 border-orange-200" },
  HUMANO: { label: "Humano", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  CONVERTEU: { label: "Converteu", className: "bg-blue-100 text-blue-800 border-blue-200" },
  ABANDONADA: { label: "Abandonada", className: "bg-neutral-100 text-neutral-500 border-neutral-200" },
};

const CANAL_ICON: Record<ConversaCanal, React.ReactNode> = {
  SITE: <Monitor className="size-4" />,
  WHATSAPP: <MessageCircle className="size-4" />,
  SIMULADOR: <Bot className="size-4" />,
};

function Linha({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="break-words">{valor ?? "—"}</span>
    </div>
  );
}

export default function ConversaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { token, ready } = useAuthToken();
  const [mensagem, setMensagem] = useState("");

  const query = useQuery({
    queryKey: ["conversa", id],
    enabled: !!token && ready,
    queryFn: () => buscarConversa(id, token!),
    staleTime: 30_000,
  });

  const c = query.data;
  const duracaoMs = c ? new Date(c.lastActiveAt).getTime() - new Date(c.createdAt).getTime() : 0;
  const duracaoMin = Math.round(duracaoMs / 60_000);

  const enviarMensagem = () => {
    if (!mensagem.trim()) return;
    toast.info("Envio de mensagem será disponível quando os endpoints estiverem prontos.");
    setMensagem("");
  };
  const assumirConversa = () => toast.info("Endpoint /assumir ainda não implementado.");
  const devolverIA = () => toast.info("Endpoint /devolver ainda não implementado.");

  const statusStyle = c ? STATUS_STYLE[c.status] : null;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/conversas" className="hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="size-3.5" />
            Conversas
          </Link>
          <span>/</span>
          <span className="text-foreground font-mono">{id.slice(0, 12)}…</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {statusStyle && <Badge variant="outline" className={statusStyle.className}>{statusStyle.label}</Badge>}
          {c && (
            <>
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                {CANAL_ICON[c.canal]}
                {c.canal}
              </span>
              {c.nomeMascarado && (
                <span className="flex items-center gap-1.5 text-sm">
                  <UserRound className="size-4 text-muted-foreground" />
                  {c.nomeMascarado}
                </span>
              )}
            </>
          )}
          <div className="ml-auto flex gap-2">
            {c?.status === "ATIVA" && (
              <Button size="sm" variant="outline" onClick={assumirConversa}>
                <UserRound className="size-4" />
                Assumir conversa
              </Button>
            )}
            {c?.status === "HUMANO" && (
              <Button size="sm" variant="outline" onClick={devolverIA}>
                <Bot className="size-4" />
                Devolver à IA
              </Button>
            )}
            {c?.pedidoId && (
              <Button size="sm" variant="outline" render={<Link href={`/pedidos/${c.pedidoId}`} />}>
                <ExternalLink className="size-4" />
                Ver pedido
              </Button>
            )}
          </div>
        </div>
      </div>

      {!ready || query.isLoading ? (
        <Skeleton className="h-96" />
      ) : query.error ? (
        <p className="text-sm text-destructive">{(query.error as Error).message}</p>
      ) : c ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Dados do cliente</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Linha label="Nome" valor={c.nomeMascarado} />
                <Linha label="Telefone" valor={c.telefoneMascarado} />
                <Linha label="Email" valor={c.emailMascarado} />
                {(c.cep || c.cidade) && (
                  <>
                    <Separator className="my-2" />
                    <Linha label="CEP" valor={c.cep} />
                    <Linha label="Cidade/UF" valor={[c.cidade, c.uf].filter(Boolean).join(" / ")} />
                  </>
                )}
                {c.cpfHash && (
                  <>
                    <Separator className="my-2" />
                    <Linha
                      label="CPF hash"
                      valor={<span className="font-mono text-xs text-muted-foreground">{c.cpfHash.slice(0, 8)}…</span>}
                    />
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Atribuição</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Linha label="Source" valor={c.utmSource} />
                <Linha label="Medium" valor={c.utmMedium} />
                <Linha label="Campaign" valor={c.utmCampaign} />
                {c.gclid && (
                  <Linha
                    label="GCLID"
                    valor={
                      <span className="flex items-center gap-1 text-blue-600 text-xs">
                        <Tv className="size-3.5" />
                        <span className="font-mono">{c.gclid.slice(0, 16)}…</span>
                      </span>
                    }
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm">Timestamps</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Linha label="Início" valor={format(new Date(c.createdAt), "dd/MM/yy HH:mm", { locale: ptBR })} />
                <Linha
                  label="Última ativ."
                  valor={formatDistanceToNow(new Date(c.lastActiveAt), { addSuffix: true, locale: ptBR })}
                />
                <Linha label="Duração" valor={duracaoMin < 60 ? `${duracaoMin} min` : `${Math.round(duracaoMin / 60)} h`} />
                <Linha label="Turnos" valor={c.turnos?.length ?? 0} />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-4">
            <Card className="flex-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Timeline — {c.turnos?.length ?? 0} turnos</CardTitle>
              </CardHeader>
              <CardContent>
                <TurnosTimeline turnos={c.turnos ?? []} />
              </CardContent>
            </Card>

            {c.status === "HUMANO" && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex gap-2">
                    <textarea
                      value={mensagem}
                      onChange={(e) => setMensagem(e.target.value)}
                      placeholder="Digite sua mensagem para o cliente..."
                      rows={3}
                      className="flex-1 min-h-[80px] px-3 py-2 border rounded-lg text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) enviarMensagem();
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={enviarMensagem}
                      disabled={!mensagem.trim()}
                      aria-label="Enviar mensagem"
                      className="self-end"
                    >
                      <Send className="size-4" />
                      Enviar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Ctrl+Enter para enviar. Endpoint pendente de implementação.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
