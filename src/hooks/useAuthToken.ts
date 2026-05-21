"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState, useRef } from "react";

/**
 * Token Clerk fresco — renova a cada 30s em background.
 * JWT Clerk tem vida curta (~60s); pegar só uma vez causa 401 após inatividade.
 */
export function useAuthToken() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let active = true;

    const refresh = () =>
      getToken().then((t) => {
        if (active) setToken(t);
      });

    refresh();
    intervalRef.current = setInterval(refresh, 30_000);

    return () => {
      active = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isLoaded, isSignedIn, getToken]);

  return { token, ready: isLoaded };
}
