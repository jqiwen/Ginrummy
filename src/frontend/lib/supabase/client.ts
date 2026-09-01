import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | undefined;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) {
    return browserClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const missingEnvironmentVariables = [
    ["NEXT_PUBLIC_SUPABASE_URL", supabaseUrl],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", supabaseAnonKey],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missingEnvironmentVariables.length > 0) {
    throw new Error(
      `Missing required frontend environment variables:\n\n${missingEnvironmentVariables
        .map((name) => `- ${name}`)
        .join("\n")}\n\nCreate src/frontend/.env.local from src/frontend/.env.example and provide the missing values.`,
    );
  }

  browserClient = createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });

  return browserClient;
}
