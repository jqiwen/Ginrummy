"use client";

import type { Session } from "@supabase/supabase-js";
import { useEffect } from "react";
import { useDispatch } from "react-redux";

import { clearAuthenticatedSession, initializeAuthenticatedSession } from "@/lib/auth/session-initialization";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AppDispatch } from "@shared-store/index";

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    let active = true;
    let revision = 0;
    let authEventObserved = false;

    const applySession = async (session: Session | null, currentRevision: number) => {
      if (!active || currentRevision !== revision) return;
      if (!session) {
        clearAuthenticatedSession(dispatch);
        return;
      }
      try {
        await initializeAuthenticatedSession(session, dispatch, {
          shouldApply: () => active && currentRevision === revision,
        });
      } catch (error) {
        if (!active || currentRevision !== revision) return;
        console.error("[auth] Session initialization failed", error);
        clearAuthenticatedSession(dispatch);
      }
    };

    const scheduleSession = (session: Session | null) => {
      const currentRevision = ++revision;
      window.setTimeout(() => void applySession(session, currentRevision), 0);
    };

    let subscription: { unsubscribe: () => void } | undefined;
    try {
      const supabase = getSupabaseBrowserClient();
      void supabase.auth.getSession().then(({ data }) => {
        if (!authEventObserved) scheduleSession(data.session);
      });
      subscription = supabase.auth.onAuthStateChange((_event, session) => {
        authEventObserved = true;
        scheduleSession(session);
      }).data.subscription;
    } catch (error) {
      console.error("[auth] Supabase initialization failed", error);
      clearAuthenticatedSession(dispatch);
    }

    return () => {
      active = false;
      revision += 1;
      subscription?.unsubscribe();
    };
  }, [dispatch]);

  return children;
}
