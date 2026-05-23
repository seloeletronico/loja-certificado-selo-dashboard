/**
 * clerk-user-ctx.ts — extrai UserCtx do Clerk PROD do dashboard,
 * pronto pra propagar via headers X-User-* no agente-api.
 *
 * Server-only (importa @clerk/nextjs/server).
 */

import { currentUser } from "@clerk/nextjs/server";
import type { UserCtx } from "./agente-api";

if (typeof window !== "undefined") {
  throw new Error("clerk-user-ctx.ts é server-only");
}

export async function getClerkUserCtx(): Promise<UserCtx | null> {
  const user = await currentUser();
  if (!user) return null;

  const role = (user.publicMetadata?.role as UserCtx["role"]) || "atendente";
  const team = (user.publicMetadata?.team as UserCtx["team"]) || null;
  const name =
    user.firstName ||
    user.fullName ||
    user.emailAddresses[0]?.emailAddress ||
    "operador";

  return { id: user.id, role, team, name };
}
