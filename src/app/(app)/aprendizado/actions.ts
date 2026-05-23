"use server";

import {
  listarConversas,
  buscarConversa,
  extrairConhecimento,
  refinarTexto,
  submeterParaRevisao,
  listarFilaRevisao,
  revisarExtracao,
  listarHistorico,
  AgenteApiError,
  type Team,
  type KnowledgeStatus,
} from "@/lib/agente-api";
import { getClerkUserCtx } from "@/lib/clerk-user-ctx";

async function withUser<T>(fn: (user: NonNullable<Awaited<ReturnType<typeof getClerkUserCtx>>>) => Promise<T>) {
  const user = await getClerkUserCtx();
  if (!user) throw new AgenteApiError(401, "Usuário não autenticado");
  return fn(user);
}

function wrap<T>(p: Promise<T>) {
  return p
    .then((data) => ({ ok: true as const, data }))
    .catch((e) => {
      const err = e instanceof AgenteApiError ? e : new Error(String(e));
      return { ok: false as const, error: err.message, status: e instanceof AgenteApiError ? e.status : 500 };
    });
}

export async function actionListarConversas(params: { status?: "ACTIVE" | "CLOSED"; page?: number }) {
  return wrap(withUser((u) => listarConversas(params, u)));
}

export async function actionBuscarConversa(id: string) {
  return wrap(withUser((u) => buscarConversa(id, u)));
}

export async function actionExtrair(input: { conversationId: string; team: Team }) {
  return wrap(withUser((u) => extrairConhecimento(input, u)));
}

export async function actionRefinar(input: { extractionId: string; operatorDraft: string }) {
  return wrap(withUser((u) => refinarTexto(input, u)));
}

export async function actionSubmeter(input: { extractionId: string }) {
  return wrap(withUser((u) => submeterParaRevisao(input, u)));
}

export async function actionFilaRevisao(params: { team?: Team; page?: number }) {
  return wrap(withUser((u) => listarFilaRevisao(params, u)));
}

export async function actionRevisar(input: { extractionId: string; action: "APPROVED" | "DISCARDED"; reviewNote?: string }) {
  return wrap(withUser((u) => revisarExtracao(input, u)));
}

export async function actionHistorico(params: { status?: KnowledgeStatus; team?: Team; page?: number }) {
  return wrap(withUser((u) => listarHistorico(params, u)));
}

export async function actionPegarUserCtx() {
  const user = await getClerkUserCtx();
  return user;
}
