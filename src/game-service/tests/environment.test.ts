import { describe, expect, it } from "vitest";
import { createSupabaseTokenVerifier } from "../src/auth/supabaseTokenVerifier.js";

describe("game-service environment configuration", () => {
  it("lists every missing Supabase variable without printing values", () => {
    expect(() => createSupabaseTokenVerifier("", "")).toThrowError(
      [
        "Missing required environment variables:",
        "",
        "- SUPABASE_URL",
        "- SUPABASE_ANON_KEY",
        "",
        "Create src/game-service/.env from src/game-service/.env.example and provide the missing values.",
      ].join("\n"),
    );
  });

  it("lists only the variable that is missing", () => {
    expect(() => createSupabaseTokenVerifier("https://project.example", " ")).toThrowError(
      /- SUPABASE_ANON_KEY/,
    );
    expect(() => createSupabaseTokenVerifier("https://project.example", " ")).not.toThrowError(
      /- SUPABASE_URL/,
    );
  });
});
