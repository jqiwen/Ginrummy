import type { Session } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { emailConfirmationRedirectUrl } from "./site-url";
import { normalizePlayerId, type LoginValues, type SignupValues } from "./validation";

export interface Profile {
  id: string;
  playerId: string;
  avatarPath: string | null;
}

export interface SignupResult {
  email: string;
  session: Session | null;
}

export class AuthUiError extends Error {
  constructor(
    message: string,
    readonly code: "configuration" | "email_exists" | "invalid_credentials" | "player_id_exists" | "unavailable",
  ) {
    super(message);
    this.name = "AuthUiError";
  }
}

export function getAuthErrorMessage(error: unknown, fallback: string): string {
  return error instanceof AuthUiError ? error.message : fallback;
}

interface SupabaseErrorDetails {
  code?: unknown;
  message?: unknown;
}

function supabaseErrorDetails(error: unknown): { code?: string; message: string } {
  if (typeof error !== "object" || error === null) {
    return { message: "" };
  }
  const candidate = error as SupabaseErrorDetails;
  return {
    ...(typeof candidate.code === "string" ? { code: candidate.code } : {}),
    message: typeof candidate.message === "string" ? candidate.message : "",
  };
}

function profilesTableIsUnavailable(error: unknown): boolean {
  const { code, message } = supabaseErrorDetails(error);
  const normalizedMessage = message.toLowerCase();
  return code === "PGRST205"
    || code === "42P01"
    || (normalizedMessage.includes("profiles")
      && (normalizedMessage.includes("schema cache")
        || normalizedMessage.includes("does not exist")
        || normalizedMessage.includes("could not find the table")));
}

function logDevelopmentAuthError(operation: string, error?: unknown): void {
  if (process.env.NODE_ENV === "production") return;
  const { code } = supabaseErrorDetails(error);
  console.error("[auth] Unexpected Supabase error", {
    operation,
    ...(code ? { code } : {}),
  });
}

function requireClient() {
  try {
    return getSupabaseBrowserClient();
  } catch {
    throw new AuthUiError(
      "Account services are not configured yet. Please try again later.",
      "configuration",
    );
  }
}

export async function signInWithEmail(values: LoginValues): Promise<Session> {
  const supabase = requireClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: values.email,
    password: values.password,
  });

  if (error || !data.session) {
    const message = error?.message.toLowerCase() ?? "";
    if (message.includes("invalid login") || message.includes("invalid credentials")) {
      throw new AuthUiError("Email or password is incorrect.", "invalid_credentials");
    }
    throw new AuthUiError("Unable to sign in. Please try again.", "unavailable");
  }

  return data.session;
}

export async function checkPlayerIdAvailability(playerId: string): Promise<boolean> {
  const supabase = requireClient();
  const normalizedPlayerId = normalizePlayerId(playerId);

  try {
    const { data: existingProfile, error: profileLookupError } = await supabase
      .from("profiles")
      .select("id")
      .eq("player_id", normalizedPlayerId)
      .maybeSingle();

    if (profileLookupError) {
      if (profilesTableIsUnavailable(profileLookupError)) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[auth] Supabase profiles table is unavailable. Apply the auth database migration.");
        }
      } else {
        logDevelopmentAuthError("player_id_availability", profileLookupError);
      }
      throw new AuthUiError("Unable to create your account. Please try again.", "unavailable");
    }
    return !existingProfile;
  } catch (error) {
    if (error instanceof AuthUiError) throw error;
    logDevelopmentAuthError("player_id_availability_network", error);
    throw new AuthUiError("Unable to create your account. Please try again.", "unavailable");
  }
}

export async function signUpWithEmail(values: SignupValues): Promise<SignupResult> {
  const supabase = requireClient();
  const playerId = normalizePlayerId(values.playerId);
  const email = values.email.trim().toLowerCase();
  if (!(await checkPlayerIdAvailability(playerId))) {
    throw new AuthUiError("This User ID is already taken.", "player_id_exists");
  }

  let signupResponse: Awaited<ReturnType<typeof supabase.auth.signUp>>;
  try {
    signupResponse = await supabase.auth.signUp({
      email,
      password: values.password,
      options: {
        data: {
          player_id: playerId,
        },
        emailRedirectTo: emailConfirmationRedirectUrl(),
      },
    });
  } catch (error) {
    logDevelopmentAuthError("auth_signup_network", error);
    throw new AuthUiError("Unable to create your account. Please try again.", "unavailable");
  }

  const { data, error } = signupResponse;

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("already registered") || message.includes("already exists")) {
      throw new AuthUiError("An account with this email already exists. Try signing in instead.", "email_exists");
    }
    if (message.includes("player_id_taken") || message.includes("duplicate") || message.includes("user id")) {
      throw new AuthUiError("This User ID is already taken.", "player_id_exists");
    }
    if (message.includes("database error") || message.includes("saving new user")) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[auth] Supabase profile creation failed during signup. Check that the auth database migration and profile trigger are applied.");
      }
      throw new AuthUiError("This User ID is already taken. Choose another User ID and try again.", "player_id_exists");
    } else {
      logDevelopmentAuthError("auth_signup", error);
    }
    throw new AuthUiError("Unable to create your account. Please try again.", "unavailable");
  }

  if (!data.user) {
    throw new AuthUiError("Unable to create your account. Please try again.", "unavailable");
  }

  if (data.user.identities && data.user.identities.length === 0) {
    throw new AuthUiError("An account with this email already exists. Try signing in instead.", "email_exists");
  }

  return { email, session: data.session };
}

export async function loadProfile(userId: string): Promise<Profile | null> {
  const supabase = requireClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, player_id, avatar_path")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id as string,
    playerId: data.player_id as string,
    avatarPath: (data.avatar_path as string | null) ?? null,
  };
}

export async function signOutUser(): Promise<void> {
  const supabase = requireClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new AuthUiError("Unable to sign out. Please try again.", "unavailable");
  }
}
