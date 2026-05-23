"use server";

import { postSuggestion, postFeedback, AgenteApiError } from "@/lib/agente-api";

export async function gerarSugestao(input: { customerMessage: string; category?: string }) {
  try {
    const res = await postSuggestion(input);
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
  try {
    const res = await postFeedback(input);
    return { ok: true as const, data: res };
  } catch (e) {
    const err = e instanceof AgenteApiError ? e : new Error(String(e));
    return { ok: false as const, error: err.message };
  }
}
