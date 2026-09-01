import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AuthenticatedSocketUser } from "../types/socketEvents.js";

export interface TokenVerifier {
  verifyAccessToken(accessToken: string): Promise<AuthenticatedSocketUser>;
}

export class SupabaseTokenVerifier implements TokenVerifier {
  constructor(private readonly supabase: SupabaseClient) {}

  async verifyAccessToken(accessToken: string): Promise<AuthenticatedSocketUser> {
    const { data: userData, error: userError } = await this.supabase.auth.getUser(accessToken);
    const user = userData.user;
    if (userError || !user || !user.email) {
      throw new Error("Token verification failed");
    }

    const { data: profile, error: profileError } = await this.supabase
      .from("profiles")
      .select("username, display_name")
      .eq("id", user.id)
      .single();
    if (profileError || !profile || typeof profile.username !== "string") {
      throw new Error("Authenticated profile not found");
    }

    return {
      id: user.id,
      email: user.email,
      username: profile.username,
      displayName: typeof profile.display_name === "string" ? profile.display_name : profile.username,
    };
  }
}

export function createSupabaseTokenVerifier(
  supabaseUrl = process.env.SUPABASE_URL,
  supabaseAnonKey = process.env.SUPABASE_ANON_KEY,
): TokenVerifier {
  const requiredEnvironmentVariables = [
    { name: "SUPABASE_URL", value: supabaseUrl },
    { name: "SUPABASE_ANON_KEY", value: supabaseAnonKey },
  ];
  const missingEnvironmentVariables = requiredEnvironmentVariables
    .filter(({ value }) => !value?.trim())
    .map(({ name }) => name);

  if (missingEnvironmentVariables.length > 0) {
    throw new Error(
      `Missing required environment variables:\n\n${missingEnvironmentVariables
        .map((name) => `- ${name}`)
        .join("\n")}\n\nCreate src/game-service/.env from src/game-service/.env.example and provide the missing values.`,
    );
  }

  return new SupabaseTokenVerifier(createClient(supabaseUrl!.trim(), supabaseAnonKey!.trim(), {
    auth: { autoRefreshToken: false, persistSession: false },
  }));
}
