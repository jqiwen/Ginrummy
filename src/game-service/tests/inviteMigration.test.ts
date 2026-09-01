import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
  new URL("../../../supabase/migrations/202608310002_create_game_invites.sql", import.meta.url),
);
const migration = readFileSync(migrationPath, "utf8");

describe("game invitation migration", () => {
  it("persists invitations with expiration, indexes, and duplicate-pending protection", () => {
    expect(migration).toContain("create table if not exists public.game_invites");
    expect(migration).toContain("expires_at timestamptz not null");
    expect(migration).toContain("game_invites_recipient_id_idx");
    expect(migration).toContain("game_invites_sender_id_idx");
    expect(migration).toContain("game_invites_one_pending_per_pair_idx");
    expect(migration).toContain("where status = 'pending'");
  });

  it("uses RLS and narrow authenticated functions instead of public table writes", () => {
    expect(migration).toContain("alter table public.game_invites enable row level security");
    expect(migration).toContain("grant select on table public.game_invites to authenticated");
    expect(migration).toContain("revoke all on table public.game_invites from anon, authenticated");
    expect(migration).toContain("create or replace function public.send_game_invite");
    expect(migration).toContain("create or replace function public.accept_game_invite");
    expect(migration).not.toMatch(/\bemail\b/i);
  });
});
