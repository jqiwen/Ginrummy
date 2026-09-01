import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(process.cwd(), "../../supabase/migrations/202608310001_create_profiles.sql"),
  "utf8",
);

describe("profiles database migration", () => {
  it("defines one canonical public profiles table with database username uniqueness", () => {
    expect(migration.match(/create table if not exists public\.profiles/gi)).toHaveLength(1);
    expect(migration).toMatch(/id uuid primary key references auth\.users \(id\) on delete cascade/i);
    expect(migration).toMatch(/username text not null/i);
    expect(migration).toMatch(/create unique index if not exists profiles_username_unique\s+on public\.profiles \(lower\(username\)\)/i);
  });

  it("enables RLS and creates profiles from auth user metadata", () => {
    expect(migration).toMatch(/alter table public\.profiles enable row level security/i);
    expect(migration).toMatch(/for update\s+to authenticated\s+using \(\(select auth\.uid\(\)\) = id\)/i);
    expect(migration).toMatch(/after insert on auth\.users\s+for each row execute procedure public\.handle_new_auth_user\(\)/i);
  });
});
