"use server";

import { z } from "zod";
import { postSuggestion, postFeedback, AgenteApiError } from "@/lib/agente-api";

// Server Actions são endpoints HTTP gerados pelo Next.js — Cliente envia FormData
// ou JSON e o runtime executa essa função server-side. Zod aqui é defense-in-depth:
// mesmo que o cliente seja invadido e mande payload arbitrário, validação acontece
// antes de chegar no agente-api.

const VALID_CATEGORIES = [
  "emissao",
  "renovacao",
  "revogacao",
  "agendamento",
  "comercial",
  "suporte_instalacao",
  "problema_tecnico",
  "duvida_normativa",
  "outro",
] as const;

const GerarSugestaoSchema = z.object({
  customerMessage: z.string().min(1, "Mensagem vazia").max(5000, "Mensagem muito longa"),
  category: z.enum(VALID_CATEGORIES).optional(),
});

const EnviarFeedbackSchema = z.object({
  chatId: z.string().min(1).max(256),
  category: z.enum(VALID_CATEGORIES),
  suggestion: z.string().min(1).max(10000),
  action: z.enum(["ACCEPTED_AS_IS", "EDITED", "REJECTED"]),
  editedVersion: z.string().max(10000).optional(),
  rejectReason: z.string().max(1000).optional(),
});

export async function gerarSugestao(input: { customerMessage: string; category?: string }) {
  const parsed = GerarSugestaoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues.map((i) => i.message).join("; "), status: 400 };
  }
  try {
    const res = await postSuggestion(parsed.data);
    return { ok: true as const, data: res };
  } catch (e) {
    const err = e instanceof AgenteApiError ? e : new Error(String(e));
    return { ok: false as const, error: err.message, status: e instanceof AgenteApiError ? e.status : 500 };
  }
}

export async function enviarFeedback(input: {
  chatId: string;
  category: string;
  suggestion: string;
  action: "ACCEPTED_AS_IS" | "EDITED" | "REJECTED";
  editedVersion?: string;
  rejectReason?: string;
}) {
  const parsed = EnviarFeedbackSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  try {
    const res = await postFeedback(parsed.data);
    return { ok: true as const, data: res };
  } catch (e) {
    const err = e instanceof AgenteApiError ? e : new Error(String(e));
    return { ok: false as const, error: err.message };
  }
}
