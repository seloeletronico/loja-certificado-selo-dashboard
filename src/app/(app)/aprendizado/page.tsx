"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Sparkles, FileText, Inbox, History, Loader2, Send, Check, X,
  MessageSquare, ListChecks,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  actionListarConversas, actionBuscarConversa, actionExtrair, actionRefinar,
  actionSubmeter, actionFilaRevisao, actionRevisar, actionHistorico, actionPegarUserCtx,
} from "./actions";

type Tab = "extract" | "queue" | "history";

type ConversationSummary = { id: string; sessionId: string; firstName: string | null; status: "ACTIVE" | "CLOSED"; updatedAt: string };
type Message = { id: string; from: "user" | "operator"; message: string; fromName: string | null; sentAt: string };
type ConvDetail = ConversationSummary & { messages: Message[] };

type Extraction = {
  id: string;
  conversationId: string;
  product: string | null;
  category: string | null;
  problem: string | null;
  solution: string | null;
  operatorDraft: string | null;
  refinedText: string | null;
  status: "PENDING_OPERATOR" | "PENDING_REVIEW" | "APPROVED" | "DISCARDED";
  operatorName: string;
  reviewerName: string | null;
  team: "EMISSAO" | "ATENDIMENTO";
  updatedAt: string;
  createdAt: string;
};

const STATUS_STYLE: Record<Extraction["status"], { label: string; className: string }> = {
  PENDING_OPERATOR: { label: "Rascunho", className: "bg-neutral-100 text-neutral-700 border-neutral-200" },
  PENDING_REVIEW: { label: "Aguardando", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  APPROVED: { label: "Aprovado", className: "bg-green-100 text-green-800 border-green-200" },
  DISCARDED: { label: "Descartado", className: "bg-red-100 text-red-800 border-red-200" },
};

export default function AprendizadoPage() {
  const [tab, setTab] = useState<Tab>("extract");
  const [userRole, setUserRole] = useState<"admin" | "supervisor" | "atendente">("atendente");

  useEffect(() => {
    actionPegarUserCtx().then((u) => u && setUserRole(u.role));
  }, []);

  const canReview = userRole === "supervisor" || userRole === "admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Aprendizado IA</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Workflow de extração e revisão de conhecimento das conversas. Aprovados viram fonte do RAG.
        </p>
      </div>

      <div className="flex gap-1 border-b">
        <TabButton active={tab === "extract"} onClick={() => setTab("extract")} icon={<Sparkles className="size-4" />}>
          Extrair
        </TabButton>
        {canReview && (
          <TabButton active={tab === "queue"} onClick={() => setTab("queue")} icon={<Inbox className="size-4" />}>
            Fila de revisão
          </TabButton>
        )}
        <TabButton active={tab === "history"} onClick={() => setTab("history")} icon={<History className="size-4" />}>
          Histórico
        </TabButton>
      </div>

      {tab === "extract" && <ExtractTab />}
      {tab === "queue" && canReview && <QueueTab />}
      {tab === "history" && <HistoryTab />}
    </div>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
        active ? "border-blue-600 text-blue-600" : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon} {children}
    </button>
  );
}

// ─────────────────────────────────────────
// EXTRAIR — conversas → IA gera draft → operador refina → submete
// ─────────────────────────────────────────
function ExtractTab() {
  const [convs, setConvs] = useState<ConversationSummary[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [selected, setSelected] = useState<ConvDetail | null>(null);
  const [extracao, setExtracao] = useState<Extraction | null>(null);
  const [team, setTeam] = useState<"EMISSAO" | "ATENDIMENTO">("EMISSAO");
  const [draftEditado, setDraftEditado] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setLoadingConvs(true);
    actionListarConversas({ status: "ACTIVE", page: 1 }).then((r) => {
      if (r.ok) setConvs(r.data.conversations);
      else toast.error(`Erro listar conversas: ${r.error}`);
      setLoadingConvs(false);
    });
  }, []);

  const carregarConversa = (id: string) => {
    startTransition(async () => {
      const r = await actionBuscarConversa(id);
      if (r.ok) {
        setSelected(r.data as ConvDetail);
        setExtracao(null);
      } else toast.error(`Erro: ${r.error}`);
    });
  };

  const extrair = () => {
    if (!selected) return;
    startTransition(async () => {
      const r = await actionExtrair({ conversationId: selected.id, team });
      if (r.ok) {
        setExtracao(r.data as Extraction);
        setDraftEditado(r.data.refinedText || "");
        toast.success("Extração concluída pela IA.");
      } else toast.error(`Falha: ${r.error}`);
    });
  };

  const refinar = () => {
    if (!extracao || !draftEditado.trim()) return;
    startTransition(async () => {
      const r = await actionRefinar({ extractionId: extracao.id, operatorDraft: draftEditado });
      if (r.ok) {
        setExtracao(r.data as Extraction);
        setDraftEditado(r.data.refinedText || "");
        toast.success("Refinado pela IA.");
      } else toast.error(`Falha: ${r.error}`);
    });
  };

  const submeter = () => {
    if (!extracao) return;
    startTransition(async () => {
      const r = await actionSubmeter({ extractionId: extracao.id });
      if (r.ok) {
        setExtracao(r.data as Extraction);
        toast.success("Enviado para revisão do supervisor.");
      } else toast.error(`Falha: ${r.error}`);
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_1fr] gap-4">
      {/* Coluna 1: lista de conversas */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-1.5"><MessageSquare className="size-4" /> Conversas</CardTitle></CardHeader>
        <CardContent className="space-y-1.5 max-h-[600px] overflow-auto">
          {loadingConvs ? <Skeleton className="h-32" /> : convs.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma conversa ativa.</p>
          ) : convs.map((c) => (
            <button
              key={c.id}
              onClick={() => carregarConversa(c.id)}
              className={`w-full text-left p-2 rounded hover:bg-muted text-xs ${selected?.id === c.id ? "bg-muted" : ""}`}
            >
              <div className="font-medium truncate">{c.firstName || "Anônimo"}</div>
              <div className="text-muted-foreground text-[10px] truncate">{c.sessionId.slice(0, 18)}…</div>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Coluna 2: detalhe da conversa */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Mensagens</CardTitle></CardHeader>
        <CardContent className="max-h-[600px] overflow-auto space-y-2">
          {!selected ? (
            <p className="text-xs text-muted-foreground">Selecione uma conversa.</p>
          ) : (
            selected.messages.map((m) => (
              <div key={m.id} className={`p-2 rounded text-xs ${m.from === "user" ? "bg-neutral-100" : "bg-blue-50 border border-blue-100"}`}>
                <div className="font-medium text-[10px] uppercase text-muted-foreground mb-0.5">
                  {m.from === "user" ? "Cliente" : m.fromName || "Operador"}
                </div>
                <div className="whitespace-pre-wrap break-words">{m.message}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Coluna 3: extração */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-1.5"><Sparkles className="size-4 text-blue-600" /> Extração IA</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!selected ? (
            <p className="text-xs text-muted-foreground">Selecione uma conversa pra extrair conhecimento.</p>
          ) : !extracao ? (
            <>
              <div className="flex gap-2">
                <select value={team} onChange={(e) => setTeam(e.target.value as "EMISSAO" | "ATENDIMENTO")} className="px-2 py-1 text-sm border rounded">
                  <option value="EMISSAO">Emissão</option>
                  <option value="ATENDIMENTO">Atendimento</option>
                </select>
                <Button size="sm" onClick={extrair} disabled={pending}>
                  {pending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Extrair
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={STATUS_STYLE[extracao.status].className}>{STATUS_STYLE[extracao.status].label}</Badge>
                <Badge variant="outline" className="text-[10px]">{extracao.team}</Badge>
              </div>
              <Field label="Produto" value={extracao.product} />
              <Field label="Categoria" value={extracao.category} />
              <Field label="Problema" value={extracao.problem} />
              <Field label="Solução" value={extracao.solution} multiline />
              <div>
                <label className="text-[11px] text-muted-foreground font-medium mb-1 block">Refinamento do operador</label>
                <textarea
                  value={draftEditado}
                  onChange={(e) => setDraftEditado(e.target.value)}
                  rows={5}
                  disabled={extracao.status !== "PENDING_OPERATOR"}
                  className="w-full px-2 py-1.5 text-xs border rounded resize-y bg-background"
                  placeholder="Edite o texto antes de submeter..."
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {extracao.status === "PENDING_OPERATOR" && (
                  <>
                    <Button size="sm" variant="outline" onClick={refinar} disabled={pending || !draftEditado.trim()}>
                      <Sparkles className="size-4 text-blue-600" /> Refinar com IA
                    </Button>
                    <Button size="sm" onClick={submeter} disabled={pending}>
                      <Send className="size-4" /> Enviar p/ revisão
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, multiline }: { label: string; value: string | null; multiline?: boolean }) {
  return (
    <div>
      <span className="text-[11px] text-muted-foreground font-medium block">{label}</span>
      <p className={`text-xs ${multiline ? "whitespace-pre-wrap" : "truncate"}`}>{value || "—"}</p>
    </div>
  );
}

// ─────────────────────────────────────────
// QUEUE — supervisor revisa
// ─────────────────────────────────────────
function QueueTab() {
  const [items, setItems] = useState<Extraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, startReview] = useTransition();
  const [team, setTeam] = useState<"" | "EMISSAO" | "ATENDIMENTO">("");

  const reload = () => {
    setLoading(true);
    actionFilaRevisao({ team: team || undefined, page: 1 }).then((r) => {
      if (r.ok) setItems(r.data.items as Extraction[]);
      else toast.error(`Erro: ${r.error}`);
      setLoading(false);
    });
  };
  useEffect(reload, [team]);

  const revisar = (id: string, action: "APPROVED" | "DISCARDED", reviewNote?: string) => {
    startReview(async () => {
      const r = await actionRevisar({ extractionId: id, action, reviewNote });
      if (r.ok) {
        toast.success(action === "APPROVED" ? "Aprovado e indexado no Vertex." : "Descartado.");
        setItems((prev) => prev.filter((i) => i.id !== id));
      } else toast.error(`Erro: ${r.error}`);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ListChecks className="size-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{items.length} aguardando revisão</span>
        <div className="ml-auto">
          <select value={team} onChange={(e) => setTeam(e.target.value as "" | "EMISSAO" | "ATENDIMENTO")} className="px-2 py-1 text-xs border rounded">
            <option value="">Todos times</option>
            <option value="EMISSAO">Emissão</option>
            <option value="ATENDIMENTO">Atendimento</option>
          </select>
        </div>
      </div>
      {loading ? <Skeleton className="h-64" /> : items.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Nenhuma extração aguardando.</CardContent></Card>
      ) : items.map((it) => (
        <Card key={it.id}>
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={STATUS_STYLE[it.status].className}>{STATUS_STYLE[it.status].label}</Badge>
                <Badge variant="outline" className="text-[10px]">{it.team}</Badge>
                <span className="text-xs text-muted-foreground">por {it.operatorName}</span>
              </div>
              <span className="text-xs text-muted-foreground">{format(new Date(it.updatedAt), "dd/MM HH:mm", { locale: ptBR })}</span>
            </div>
            <Field label="Produto / categoria" value={`${it.product || "—"} · ${it.category || "—"}`} />
            <Field label="Problema" value={it.problem} />
            <Field label="Solução refinada" value={it.refinedText || it.solution} multiline />
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={() => revisar(it.id, "APPROVED")} disabled={reviewing}>
                <Check className="size-4" /> Aprovar e indexar
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
                const motivo = prompt("Motivo do descarte?");
                if (motivo === null) return;
                revisar(it.id, "DISCARDED", motivo);
              }} disabled={reviewing}>
                <X className="size-4 text-red-600" /> Descartar
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────
// HISTORY — extrações + filtros
// ─────────────────────────────────────────
function HistoryTab() {
  const [items, setItems] = useState<Extraction[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<"" | "PENDING_OPERATOR" | "PENDING_REVIEW" | "APPROVED" | "DISCARDED">("APPROVED");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    actionHistorico({ status: status || undefined, page: 1 }).then((r) => {
      if (r.ok) {
        setItems(r.data.items as Extraction[]);
        setCounts(r.data.counts as Record<string, number>);
      } else toast.error(`Erro: ${r.error}`);
      setLoading(false);
    });
  }, [status]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {(["PENDING_OPERATOR", "PENDING_REVIEW", "APPROVED", "DISCARDED"] as const).map((s) => (
          <Card key={s} className={`cursor-pointer hover:bg-muted ${status === s ? "border-blue-500 border-2" : ""}`} onClick={() => setStatus(s)}>
            <CardContent className="py-3">
              <div className="text-[10px] uppercase text-muted-foreground">{STATUS_STYLE[s].label}</div>
              <div className="text-xl font-semibold">{counts[s] ?? 0}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      {loading ? <Skeleton className="h-64" /> : items.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Nenhum item nesse status.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <Card key={it.id}>
              <CardContent className="pt-3 pb-3 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={STATUS_STYLE[it.status].className}>{STATUS_STYLE[it.status].label}</Badge>
                    <span className="text-xs text-muted-foreground">{it.product || "—"} · {it.category || "—"}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{format(new Date(it.updatedAt), "dd/MM HH:mm", { locale: ptBR })}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{it.problem || "—"}</p>
                <p className="text-xs">{it.refinedText || it.solution || "—"}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
