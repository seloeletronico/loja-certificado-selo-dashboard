/**
 * agente-api.ts — cliente server-side pro `agente-api` (Cloud Run southamerica-east1).
 *
 * Usado apenas em Server Components / Route Handlers do dashboard.
 * O token X-Agent-Token nunca vai pro browser — é injetado server-side.
 *
 * Endpoints disponíveis (rev 00012-mmv do agente-api, ativada em 2026-05-23):
 *  - GET  /api/metrics    — métricas agregadas (AAR, queries, feedback)
 *  - POST /api/suggestion — playground RAG (Vertex + Gemini)
 *  - POST /api/feedback   — feedback do operador
 */

const BASE_URL = process.env.AGENTE_API_BASE_URL;
const TOKEN = process.env.AGENT_RAG_TOKEN;

if (typeof window !== "undefined") {
  throw new Error("agente-api.ts é server-only — não importe em client components");
}

export class AgenteApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "AgenteApiError";
  }
}

/**
 * UserCtx propagado nos headers X-User-* quando dashboard chama agente-api.
 * O agente-api confia nesses valores SE X-Agent-Token bater — defense in depth
 * via shared-secret + propagação de identidade Clerk-server-side.
 */
export type UserCtx = {
  id: string;
  role: "admin" | "supervisor" | "atendente";
  team: "EMISSAO" | "ATENDIMENTO" | null;
  name: string;
};

async function call<T>(path: string, init: RequestInit = {}, user?: UserCtx): Promise<T> {
  if (!BASE_URL) throw new AgenteApiError(500, "AGENTE_API_BASE_URL não configurado");
  if (!TOKEN) throw new AgenteApiError(500, "AGENT_RAG_TOKEN não configurado");

  const userHeaders: Record<string, string> = user
    ? {
        "X-User-Id": user.id,
        "X-User-Role": user.role,
        "X-User-Team": user.team || "",
        "X-User-Name": user.name,
      }
    : {};

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      "X-Agent-Token": TOKEN,
      "Content-Type": "application/json",
      ...userHeaders,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    // Body cru do agente-api NÃO vai pro browser — só pro log server-side.
    // Mensagem exposta na UI é genérica por status (mapping abaixo).
    const body = await res.text();
    console.error(
      `[agente-api] ${init.method || "GET"} ${path} → ${res.status}: ${body.slice(0, 500)}`
    );
    throw new AgenteApiError(res.status, friendlyMessage(res.status, path));
  }

  return res.json() as Promise<T>;
}

// Mapa de HTTP status → mensagem amigável pro operador (não expõe detalhe interno).
function friendlyMessage(status: number, path: string): string {
  if (status === 401) return "Sem autorização para acessar este recurso.";
  if (status === 403) return "Permissão insuficiente para essa ação.";
  if (status === 404) return "Recurso não encontrado.";
  if (status === 422 || status === 400) return "Dados inválidos enviados.";
  if (status === 429) return "Limite de requisições excedido. Aguarde alguns segundos.";
  if (status === 500) return `Erro interno no agente-api em ${path}. Time foi notificado.`;
  if (status === 502 || status === 503 || status === 504)
    return "Agente-api temporariamente indisponível. Tente novamente em segundos.";
  return `Erro ${status} ao chamar agente-api.`;
}

// ──────────────────────────────────────────────
// Tipos das responses do agente-api
// ──────────────────────────────────────────────

export type FeedbackCounts = {
  ACCEPTED_AS_IS: number;
  EDITED: number;
  REJECTED: number;
};

export type CategoryStat = {
  category: string;
  total: number;
  aar: number;
};

export type RecentFeedback = {
  id: string;
  chatId: string;
  category: string;
  action: "ACCEPTED_AS_IS" | "EDITED" | "REJECTED";
  agentName: string;
  createdAt: string;
};

export type Metrics = {
  totalQueries: number;
  queriesToday: number;
  avgLatencyMs: number;
  aar: number;
  feedbackCounts: FeedbackCounts | null;
  feedbackToday: number;
  recentFeedback: RecentFeedback[];
  categoryStats: CategoryStat[];
};

export type SuggestionResponse = {
  suggestion: string;
  confidence: number;
  sources: string[];
  latencyMs: number;
  chatId: string;
};

// ──────────────────────────────────────────────
// Knowledge workflow — tipos
// ──────────────────────────────────────────────

export type KnowledgeStatus = "PENDING_OPERATOR" | "PENDING_REVIEW" | "APPROVED" | "DISCARDED";
export type Team = "EMISSAO" | "ATENDIMENTO";

export type KnowledgeExtraction = {
  id: string;
  conversationId: string;
  summary: string | null;
  product: string | null;
  category: string | null;
  problem: string | null;
  solution: string | null;
  price: string | null;
  operatorDraft: string | null;
  refinedText: string | null;
  status: KnowledgeStatus;
  operatorId: string;
  operatorName: string;
  reviewerId: string | null;
  reviewerName: string | null;
  reviewNote: string | null;
  team: Team;
  vectorId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ConversationSummary = {
  id: string;
  sessionId: string;
  customerId: string | null;
  firstName: string | null;
  status: "ACTIVE" | "CLOSED";
  createdAt: string;
  updatedAt: string;
};

export type Message = {
  id: string;
  botmakerId: string;
  from: "user" | "operator";
  message: string;
  fromName: string | null;
  operatorEmail: string | null;
  operatorRole: string | null;
  sentAt: string;
};

export type ConversationDetail = ConversationSummary & {
  messages: Message[];
};

// ──────────────────────────────────────────────
// API pública
// ──────────────────────────────────────────────

export async function getMetrics(): Promise<Metrics> {
  return call<Metrics>("/api/metrics");
}

export async function postSuggestion(input: {
  customerMessage: string;
  category?: string;
}): Promise<SuggestionResponse> {
  return call<SuggestionResponse>("/api/suggestion", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function postFeedback(input: {
  chatId: string;
  category: string;
  suggestion: string;
  action: "ACCEPTED_AS_IS" | "EDITED" | "REJECTED";
  editedVersion?: string;
  rejectReason?: string;
}): Promise<{ status: string; id: string }> {
  return call("/api/feedback", { method: "POST", body: JSON.stringify(input) });
}

// ──────────────────────────────────────────────
// Knowledge workflow — API (todas recebem UserCtx pra RBAC)
// ──────────────────────────────────────────────

export async function listarConversas(
  params: { status?: "ACTIVE" | "CLOSED"; page?: number },
  user: UserCtx
): Promise<{ conversations: ConversationSummary[]; total: number; page: number; totalPages: number }> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.page) qs.set("page", String(params.page));
  return call(`/api/conversations?${qs}`, {}, user);
}

export async function buscarConversa(id: string, user: UserCtx): Promise<ConversationDetail> {
  return call(`/api/conversations/${id}`, {}, user);
}

export async function extrairConhecimento(
  input: { conversationId: string; team: Team },
  user: UserCtx
): Promise<KnowledgeExtraction> {
  return call(`/api/knowledge/extract`, { method: "POST", body: JSON.stringify(input) }, user);
}

export async function refinarTexto(
  input: { extractionId: string; operatorDraft: string },
  user: UserCtx
): Promise<KnowledgeExtraction> {
  return call(`/api/knowledge/refine`, { method: "POST", body: JSON.stringify(input) }, user);
}

export async function submeterParaRevisao(
  input: { extractionId: string },
  user: UserCtx
): Promise<KnowledgeExtraction> {
  return call(`/api/knowledge/submit`, { method: "POST", body: JSON.stringify(input) }, user);
}

export async function listarFilaRevisao(
  params: { team?: Team; page?: number },
  user: UserCtx
): Promise<{ items: KnowledgeExtraction[]; page: number }> {
  const qs = new URLSearchParams();
  if (params.team) qs.set("team", params.team);
  if (params.page) qs.set("page", String(params.page));
  return call(`/api/knowledge/queue?${qs}`, {}, user);
}

export async function revisarExtracao(
  input: { extractionId: string; action: "APPROVED" | "DISCARDED"; reviewNote?: string },
  user: UserCtx
): Promise<KnowledgeExtraction> {
  return call(`/api/knowledge/review`, { method: "POST", body: JSON.stringify(input) }, user);
}

export async function listarHistorico(
  params: { status?: KnowledgeStatus; team?: Team; page?: number },
  user: UserCtx
): Promise<{
  items: KnowledgeExtraction[];
  counts: Record<KnowledgeStatus, number>;
  page: number;
}> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.team) qs.set("team", params.team);
  if (params.page) qs.set("page", String(params.page));
  return call(`/api/knowledge?${qs}`, {}, user);
}
