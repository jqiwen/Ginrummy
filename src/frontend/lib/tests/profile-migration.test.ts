import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "../../supabase/migrations/202609010001_player_id_avatars.sql"),
  "utf8",
);

describe("Player ID and avatar database migration", () => {
  it("renames username in place so existing users and UUID relationships survive", () => {
    expect(migration).toMatch(/alter table public\.profiles rename column username to player_id/i);
    expect(migration).not.toMatch(/drop table\s+(?:if exists\s+)?public\.profiles/i);
    expect(migration).not.toMatch(/delete from public\.profiles/i);
    expect(migration).toMatch(/update public\.profiles\s+set player_id = lower\(trim\(player_id\)\)/i);
  });

  it("enforces lowercase, database-unique, immutable User IDs", () => {
    expect(migration).toMatch(/profiles_player_id_unique\s+on public\.profiles \(lower\(player_id\)\)/i);
    expect(migration).toMatch(/new\.player_id is distinct from old\.player_id/i);
    expect(migration).toContain("User ID cannot be changed after registration.");
    expect(migration).toMatch(/raise exception 'PLAYER_ID_TAKEN' using errcode = '23505'/i);
  });

  it("keeps email out of profiles and limits profile writes to avatar_path", () => {
    expect(migration).toMatch(/add column if not exists avatar_path text/i);
    expect(migration).toMatch(/grant update \(avatar_path\) on table public\.profiles to authenticated/i);
    expect(migration).toMatch(/grant select \(id, player_id, avatar_path\) on table public\.profiles to anon, authenticated/i);
    expect(migration).not.toMatch(/add column if not exists email/i);
  });

  it("creates profiles with player_id and satisfies the legacy display_name requirement", () => {
    expect(migration).not.toMatch(/alter column display_name drop not null/i);
    expect(migration).toMatch(
      /insert into public\.profiles \(id, player_id, display_name, avatar_path\)\s+values \(new\.id, requested_player_id, requested_player_id, null\)/i,
    );
  });

  it("creates a public avatars bucket with owner-folder write policies", () => {
    expect(migration).toMatch(/insert into storage\.buckets/i);
    expect(migration).toMatch(/'avatars',\s*'avatars',\s*true,\s*2097152/i);
    expect(migration).toMatch(/array\['image\/jpeg', 'image\/png', 'image\/webp'\]/i);
    expect(migration.match(/storage\.foldername\(name\)\)\[1\] = \(select auth\.uid\(\)::text\)/gi)?.length).toBeGreaterThanOrEqual(3);
  });
});
