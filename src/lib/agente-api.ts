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

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!BASE_URL) throw new AgenteApiError(500, "AGENTE_API_BASE_URL não configurado");
  if (!TOKEN) throw new AgenteApiError(500, "AGENT_RAG_TOKEN não configurado");

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      "X-Agent-Token": TOKEN,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new AgenteApiError(res.status, body.slice(0, 300));
  }

  return res.json() as Promise<T>;
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
