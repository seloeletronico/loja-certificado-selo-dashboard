"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { use, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Copy, MessageCircle, RotateCcw, Trash2, XCircle, Zap } from "lucide-react";
import { useAuthToken } from "@/hooks/useAuthToken";
import { apiFetch } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type MotivoCancelamento =
  | "DESISTENCIA"
  | "MATCH_BIOMETRICO_FALHOU"
  | "COMPROU_EM_OUTRO_LOCAL";

type MotivoDescarte =
  | "DESISTENCIA_CONFIRMADA"
  | "SEM_CONTATO"
  | "OUTRO";

const MOTIVOS_DESCARTE: { valor: MotivoDescarte; label: string; hint: string }[] = [
  {
    valor: "DESISTENCIA_CONFIRMADA",
    label: "Cliente confirmou desistência",
    hint: "Entrei em contato e o cliente disse que não quer mais.",
  },
  {
    valor: "SEM_CONTATO",
    label: "Sem resposta após contato",
    hint: "Tentei por telefone/WhatsApp/email e cliente não respondeu.",
  },
  {
    valor: "OUTRO",
    label: "Outro motivo",
    hint: "Caso específico — detalhe em observação abaixo.",
  },
];

const MOTIVOS: { valor: MotivoCancelamento; label: string }[] = [
  { valor: "DESISTENCIA", label: "Desistência do cliente" },
  { valor: "MATCH_BIOMETRICO_FALHOU", label: "Match biométrico não bateu" },
  { valor: "COMPROU_EM_OUTRO_LOCAL", label: "Comprou em outro local" },
];

const STATUS_NAO_CANCELAVEIS = new Set([
  "EMITIDO",
  "CONCLUIDO",
  "REVOGADO",
  "CANCELADO",
]);

type PedidoDetalhe = {
  id: string;
  status: string;
  tipoCertificado: "ECPF" | "ECNPJ";
  preco: string;
  protocolo: string | null;
  safe2payId: string | null;
  safe2payLink: string | null;
  paginaUrl: string | null;
  hopeUrl: string | null;
  nomeCliente: string;
  emailCliente: string;
  telefoneDdd: string;
  telefoneNumero: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  cnpj: string | null;
  razaoSocial: string | null;
  numeroCnh: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  motivoCancelamento: MotivoCancelamento | null;
  createdAt: string;
  updatedAt: string;
  historico: Array<{
    id: string;
    statusAnterior: string | null;
    statusNovo: string;
    origem: string;
    meta: Record<string, unknown> | null;
    createdAt: string;
  }>;
};

function formatBRL(v: string | number) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

function Linha({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span>{valor ?? "—"}</span>
    </div>
  );
}

export default function PedidoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { token, ready } = useAuthToken();
  const qc = useQueryClient();
  const [modalCancelar, setModalCancelar] = useState(false);
  const [motivo, setMotivo] = useState<MotivoCancelamento | null>(null);
  const [modalDescartar, setModalDescartar] = useState(false);
  const [motivoDescarte, setMotivoDescarte] = useState<MotivoDescarte | null>(null);
  const [observacaoDescarte, setObservacaoDescarte] = useState("");

  const query = useQuery({
    queryKey: ["pedido", id],
    enabled: !!token,
    queryFn: () => apiFetch<PedidoDetalhe>(`/api/admin/pedidos/${id}`, token!),
  });

  const p = query.data;

  const cancelar = useMutation({
    mutationFn: (motivoSelecionado: MotivoCancelamento) =>
      apiFetch(`/api/admin/pedidos/${id}/cancelar`, token!, {
        method: "POST",
        body: JSON.stringify({ motivo: motivoSelecionado }),
      }),
    onSuccess: () => {
      toast.success("Pedido cancelado.");
      setModalCancelar(false);
      setMotivo(null);
      qc.invalidateQueries({ queryKey: ["pedido", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Reativar pedido ABANDONADO (cliente voltou pra retomar via contato do agente)
  const reativar = useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean; slotRestaurado: boolean; slotInicio: string | null }>(
        `/api/admin/pedidos/${id}/reativar`,
        token!,
        { method: "POST" }
      ),
    onSuccess: (r) => {
      toast.success(
        r.slotRestaurado
          ? "Pedido reativado — horário original preservado."
          : "Pedido reativado. Slot original já tinha sido liberado — cliente precisa escolher novo horário."
      );
      qc.invalidateQueries({ queryKey: ["pedido", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Descartar pedido ABANDONADO (libera slot + vira CANCELADO)
  const descartar = useMutation({
    mutationFn: (body: { motivo: MotivoDescarte; observacao?: string }) =>
      apiFetch(`/api/admin/pedidos/${id}/descartar`, token!, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      toast.success("Pedido descartado. Horário liberado na agenda.");
      setModalDescartar(false);
      setMotivoDescarte(null);
      setObservacaoDescarte("");
      qc.invalidateQueries({ queryKey: ["pedido", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Regenerar PIX para pedido em AGUARDANDO_PAGAMENTO
  const regenerarPix = useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean; pixQrCode: string; pixCopiaECola: string; safe2payId: string }>(
        `/api/admin/pedidos/${id}/regenerar-pix`,
        token!,
        { method: "POST" }
      ),
    onSuccess: (r) => {
      toast.success("Novo PIX gerado com sucesso! Link atualizado.");
      qc.invalidateQueries({ queryKey: ["pedido", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // safe2payLink guarda ou URL HTTP do boleto, ou string EMV do Pix (não é URL).
  // Distinguir evita tratar EMV como path relativo no <a href>.
  const ehBoleto = Boolean(p?.safe2payLink?.startsWith("http"));
  const ehPix = Boolean(p?.safe2payLink && !ehBoleto);

  const copiarLinkPagamento = async () => {
    if (!p?.safe2payLink) return;
    try {
      await navigator.clipboard.writeText(p.safe2payLink);
      toast.success(ehBoleto ? "Link do boleto copiado." : "Código Pix copiado.");
    } catch {
      toast.error("Falha ao copiar.");
    }
  };

  const copiarLinkCliente = async () => {
    if (!p?.paginaUrl) return;
    try {
      await navigator.clipboard.writeText(p.paginaUrl);
      toast.success("Link do cliente copiado.");
    } catch {
      toast.error("Falha ao copiar.");
    }
  };

  const abrirWhatsApp = () => {
    if (!p) return;
    const ddd = p.telefoneDdd;
    const numero = p.telefoneNumero.replace(/\D/g, "");
    const telefone = `55${ddd}${numero}`;
    // Preferência: link da página pública do cliente (mesma que foi por email).
    // Ele abre, vê status + QR + Pix copia-e-cola + botão copiar, tudo em UI.
    const linhaPagamento = p.paginaUrl
      ? `Acompanhe e pague aqui: ${p.paginaUrl}`
      : p.safe2payLink
      ? ehBoleto
        ? `Link do boleto: ${p.safe2payLink}`
        : `Código Pix Copia-e-Cola:\n${p.safe2payLink}`
      : "";
    const texto =
      `Olá, ${p.nomeCliente.split(" ")[0]}! Seu pedido ${p.protocolo ?? ""} está aguardando pagamento.\n\n` +
      `Valor: ${formatBRL(p.preco)}\n\n` +
      linhaPagamento;
    window.open(
      `https://wa.me/${telefone}?text=${encodeURIComponent(texto)}`,
      "_blank"
    );
  };

  const podeCancelar = p && !STATUS_NAO_CANCELAVEIS.has(p.status);
  const ehAbandonado = p?.status === "ABANDONADO";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/pedidos" />}
          >
            ← Voltar
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight mt-2">
            Pedido {p?.protocolo ?? "aguardando protocolo..."}
          </h1>
        </div>
        {p && (
          <div className="flex gap-2 items-center">
            <Badge
              className={
                ehAbandonado
                  ? "border-amber-500 bg-amber-50 text-amber-900"
                  : undefined
              }
              variant={ehAbandonado ? "outline" : "default"}
            >
              {p.status}
            </Badge>
            <Badge variant="outline">{p.tipoCertificado}</Badge>
          </div>
        )}
      </div>

      {p && (
        <div className="flex flex-wrap gap-2">
          {p.paginaUrl && (
            <Button size="sm" variant="outline" onClick={copiarLinkCliente}>
              <Copy className="size-4 mr-1" /> Copiar link do cliente
            </Button>
          )}
          {p.safe2payLink && (
            <>
              <Button size="sm" variant="outline" onClick={copiarLinkPagamento}>
                <Copy className="size-4 mr-1" />
                {ehBoleto ? "Copiar link boleto" : "Copiar Pix"}
              </Button>
              <Button size="sm" variant="outline" onClick={abrirWhatsApp}>
                <MessageCircle className="size-4 mr-1" /> WhatsApp
              </Button>
            </>
          )}
          {ehAbandonado && (
            <>
              <Button
                size="sm"
                variant="default"
                onClick={() => reativar.mutate()}
                disabled={reativar.isPending}
              >
                <RotateCcw className="size-4 mr-1" />
                {reativar.isPending ? "Reativando..." : "Reativar pedido"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setModalDescartar(true)}
              >
                <Trash2 className="size-4 mr-1" /> Descartar
              </Button>
            </>
          )}
          {p.status === "AGUARDANDO_PAGAMENTO" && p.safe2payLink && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => regenerarPix.mutate()}
              disabled={regenerarPix.isPending}
            >
              <Zap className="size-4 mr-1" />
              {regenerarPix.isPending ? "Regenerando..." : "Regenerar PIX"}
            </Button>
          )}
          {podeCancelar && !ehAbandonado && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setModalCancelar(true)}
            >
              <XCircle className="size-4 mr-1" /> Cancelar pedido
            </Button>
          )}
        </div>
      )}

      <Dialog open={modalCancelar} onOpenChange={setModalCancelar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar pedido</DialogTitle>
            <DialogDescription>
              Selecione o motivo. A ação fica registrada em auditoria.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {MOTIVOS.map((m) => (
              <label
                key={m.valor}
                className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted ${
                  motivo === m.valor ? "border-primary bg-muted" : ""
                }`}
              >
                <input
                  type="radio"
                  name="motivo"
                  value={m.valor}
                  checked={motivo === m.valor}
                  onChange={() => setMotivo(m.valor)}
                />
                <span className="text-sm">{m.label}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalCancelar(false)}
              disabled={cancelar.isPending}
            >
              Voltar
            </Button>
            <Button
              variant="destructive"
              disabled={!motivo || cancelar.isPending}
              onClick={() => motivo && cancelar.mutate(motivo)}
            >
              {cancelar.isPending ? "Cancelando..." : "Confirmar cancelamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalDescartar} onOpenChange={setModalDescartar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Descartar pedido abandonado</DialogTitle>
            <DialogDescription>
              O horário volta para a agenda pública e fica disponível pra outro
              cliente. A ação fica registrada em auditoria.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {MOTIVOS_DESCARTE.map((m) => (
              <label
                key={m.valor}
                className={`flex items-start gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted ${
                  motivoDescarte === m.valor ? "border-primary bg-muted" : ""
                }`}
              >
                <input
                  type="radio"
                  name="motivoDescarte"
                  value={m.valor}
                  checked={motivoDescarte === m.valor}
                  onChange={() => setMotivoDescarte(m.valor)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">{m.label}</div>
                  <div className="text-xs text-muted-foreground">{m.hint}</div>
                </div>
              </label>
            ))}
          </div>
          {motivoDescarte === "OUTRO" && (
            <div className="space-y-1">
              <label className="text-sm text-muted-foreground">
                Observação (obrigatória em &quot;Outro motivo&quot;)
              </label>
              <textarea
                value={observacaoDescarte}
                onChange={(e) => setObservacaoDescarte(e.target.value)}
                className="w-full min-h-[80px] px-3 py-2 border rounded-md text-sm bg-background"
                placeholder="Detalhe o motivo pra registro em auditoria..."
                maxLength={500}
              />
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalDescartar(false)}
              disabled={descartar.isPending}
            >
              Voltar
            </Button>
            <Button
              variant="destructive"
              disabled={
                !motivoDescarte ||
                descartar.isPending ||
                (motivoDescarte === "OUTRO" && !observacaoDescarte.trim())
              }
              onClick={() =>
                motivoDescarte &&
                descartar.mutate({
                  motivo: motivoDescarte,
                  observacao: observacaoDescarte.trim() || undefined,
                })
              }
            >
              {descartar.isPending ? "Descartando..." : "Confirmar descarte"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!ready || query.isLoading ? (
        <Skeleton className="h-96" />
      ) : query.error ? (
        <p className="text-sm text-destructive">{query.error.message}</p>
      ) : p ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Linha label="Nome" valor={p.nomeCliente} />
                <Linha label="Email" valor={p.emailCliente} />
                <Linha
                  label="Telefone"
                  valor={`(${p.telefoneDdd}) ${p.telefoneNumero}`}
                />
                {p.cnpj && (
                  <>
                    <Separator className="my-3" />
                    <Linha label="CNPJ" valor={p.cnpj} />
                    <Linha label="Razão social" valor={p.razaoSocial} />
                  </>
                )}
                {p.numeroCnh && <Linha label="CNH" valor={p.numeroCnh} />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Endereço</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Linha label="CEP" valor={p.cep} />
                <Linha
                  label="Logradouro"
                  valor={`${p.logradouro}, ${p.numero}${
                    p.complemento ? ` — ${p.complemento}` : ""
                  }`}
                />
                <Linha label="Bairro" valor={p.bairro} />
                <Linha label="Cidade/UF" valor={`${p.cidade}/${p.uf}`} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Histórico ({p.historico.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {p.historico.map((h) => (
                    <li
                      key={h.id}
                      className="flex gap-3 text-sm border-l-2 border-muted pl-3"
                    >
                      <span className="text-muted-foreground w-32 shrink-0">
                        {format(new Date(h.createdAt), "dd/MM HH:mm:ss", {
                          locale: ptBR,
                        })}
                      </span>
                      <div className="flex-1">
                        <div>
                          {h.statusAnterior ? (
                            <>
                              <span className="text-muted-foreground">
                                {h.statusAnterior}
                              </span>{" "}
                              →{" "}
                            </>
                          ) : null}
                          <span className="font-medium">{h.statusNovo}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          via {h.origem}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pagamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Linha label="Valor" valor={formatBRL(p.preco)} />
                <Linha label="Protocolo Safeweb" valor={p.protocolo} />
                {p.hopeUrl && (
                  <Linha
                    label="Link Hope"
                    valor={
                      <a
                        href={p.hopeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline break-all"
                      >
                        Abrir videoconferência / importar documento
                      </a>
                    }
                  />
                )}
                <Linha label="ID Safe2Pay" valor={p.safe2payId} />
                {p.paginaUrl && (
                  <Linha
                    label="Link do cliente"
                    valor={
                      <a
                        href={p.paginaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline"
                      >
                        abrir página do pagamento
                      </a>
                    }
                  />
                )}
                {p.safe2payLink && ehBoleto && (
                  <Linha
                    label="Link pagamento"
                    valor={
                      <a
                        href={p.safe2payLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline"
                      >
                        abrir boleto
                      </a>
                    }
                  />
                )}
                {p.safe2payLink && ehPix && (
                  <Linha
                    label="Pix (copia-e-cola)"
                    valor={
                      <span className="font-mono text-xs break-all">
                        {p.safe2payLink.slice(0, 40)}…
                      </span>
                    }
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Origem (UTM)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Linha label="Source" valor={p.utmSource} />
                <Linha label="Medium" valor={p.utmMedium} />
                <Linha label="Campaign" valor={p.utmCampaign} />
                <Linha label="Term" valor={p.utmTerm} />
                <Linha label="Content" valor={p.utmContent} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Timestamps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Linha
                  label="Criado"
                  valor={format(
                    new Date(p.createdAt),
                    "dd/MM/yy HH:mm:ss",
                    { locale: ptBR }
                  )}
                />
                <Linha
                  label="Atualizado"
                  valor={format(
                    new Date(p.updatedAt),
                    "dd/MM/yy HH:mm:ss",
                    { locale: ptBR }
                  )}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
