"use client";

import type { Session } from "@supabase/supabase-js";
import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";

import { loadProfile } from "@/lib/auth/actions";
import { setGameSocketAccessToken } from "@/lib/socket";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AppDispatch } from "@shared-store/index";
import { setAuthenticatedUser, setUnauthenticated } from "@shared-store/slices/user";

function metadataString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const previousUserId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    let revision = 0;

    const applySession = async (session: Session | null) => {
      const currentRevision = ++revision;
      const nextUserId = session?.user.id ?? null;
      const identityChanged = previousUserId.current !== nextUserId;
      previousUserId.current = nextUserId;
      setGameSocketAccessToken(session?.access_token ?? null, identityChanged);

      if (!session) {
        if (active) dispatch(setUnauthenticated());
        return;
      }

      const profile = await loadProfile(session.user.id);
      if (!active || currentRevision !== revision) {
        return;
      }

      const metadata = session.user.user_metadata;
      const fallbackUsername = metadataString(metadata.username)
        ?? session.user.email?.split("@")[0]
        ?? "player";
      dispatch(setAuthenticatedUser({
        id: session.user.id,
        email: session.user.email ?? "",
        username: profile?.username ?? fallbackUsername,
        displayName: profile?.displayName ?? metadataString(metadata.display_name) ?? fallbackUsername,
      }));
    };

    let subscription: { unsubscribe: () => void } | undefined;
    try {
      const supabase = getSupabaseBrowserClient();
      void supabase.auth.getSession().then(({ data }) => applySession(data.session));
      subscription = supabase.auth.onAuthStateChange((_event, session) => {
        window.setTimeout(() => void applySession(session), 0);
      }).data.subscription;
    } catch (error) {
      console.error("[auth] Supabase initialization failed", error);
      setGameSocketAccessToken(null, true);
      dispatch(setUnauthenticated());
    }

    return () => {
      active = false;
      revision += 1;
      subscription?.unsubscribe();
    };
  }, [dispatch]);

  return children;
}
