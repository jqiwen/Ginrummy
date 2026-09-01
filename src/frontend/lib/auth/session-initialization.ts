import type { Session } from "@supabase/supabase-js";
import type { Dispatch, UnknownAction } from "@reduxjs/toolkit";

import { loadProfile } from "@/lib/auth/actions";
import { setGameSocketAccessToken, waitForGameSocket } from "@/lib/socket";
import { setAuthenticatedUser, setUnauthenticated } from "@shared-store/slices/user";

interface InitializationOptions {
  connectSocket?: boolean;
  shouldApply?: () => boolean;
}

interface AuthenticatedUserState {
  id: string;
  email: string;
  username: string;
  displayName: string;
}

let profileInitialization: {
  userId: string;
  promise: Promise<AuthenticatedUserState>;
} | null = null;
let appliedAccessToken: string | null = null;

function metadataString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function loadAuthenticatedUser(session: Session): Promise<AuthenticatedUserState> {
  if (profileInitialization?.userId === session.user.id) {
    return profileInitialization.promise;
  }

  const promise = loadProfile(session.user.id).then((profile) => {
    const metadata = session.user.user_metadata;
    const fallbackUsername = metadataString(metadata.username)
      ?? session.user.email?.split("@")[0]
      ?? "player";
    return {
      id: session.user.id,
      email: session.user.email ?? "",
      username: profile?.username ?? fallbackUsername,
      displayName: profile?.displayName ?? metadataString(metadata.display_name) ?? fallbackUsername,
    };
  });
  profileInitialization = { userId: session.user.id, promise };
  return promise;
}

export async function initializeAuthenticatedSession(
  session: Session,
  dispatch: Dispatch<UnknownAction>,
  options: InitializationOptions = {},
): Promise<AuthenticatedUserState> {
  setGameSocketAccessToken(session.access_token, true);
  const authenticatedUser = await loadAuthenticatedUser(session);
  const shouldApply = options.shouldApply?.() ?? true;

  if (shouldApply && appliedAccessToken !== session.access_token) {
    dispatch(setAuthenticatedUser(authenticatedUser));
    appliedAccessToken = session.access_token;
  }

  if (options.connectSocket) {
    await waitForGameSocket();
  }

  return authenticatedUser;
}

export function clearAuthenticatedSession(dispatch: Dispatch<UnknownAction>): void {
  profileInitialization = null;
  appliedAccessToken = null;
  setGameSocketAccessToken(null, true);
  dispatch(setUnauthenticated());
}
