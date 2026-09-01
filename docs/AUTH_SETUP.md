# Supabase authentication setup

The application code is complete, but authentication will not work in a deployed environment until a Supabase project and the repository variables below are configured. No service-role key is used or required.

## 1. Create or select a Supabase project

In the [Supabase dashboard](https://supabase.com/dashboard), create a project or select the project that should own Gin Rummy accounts. User credentials live in Supabase Auth; public game identity lives in `public.profiles`.

## 2. Apply the database migrations

This step is mandatory for every new Supabase project. A local migration file does not modify the remote database by itself.

Open the dashboard and follow this exact path:

**Supabase → Ginrummy project → SQL Editor → New query → paste the complete migration → Run**

Run the complete contents of these files in order:

```text
supabase/migrations/202608310001_create_profiles.sql
supabase/migrations/202608310002_create_game_invites.sql
supabase/migrations/202609010001_player_id_avatars.sql
```

Alternatively, link the repository with the Supabase CLI and run `supabase db push`. The migrations create:

- `public.profiles`, keyed by the UUID from `auth.users`
- database-enforced, lowercase unique and immutable public User IDs (`player_id`)
- optional public avatar paths with owner-only profile updates
- a public `avatars` Storage bucket with authenticated owner-folder writes
- row-level security for public profile reads and avatar-only owner updates
- a trigger that creates a profile from signup metadata
- an `updated_at` trigger
- persistent `public.game_invites` rows with a 30-minute expiration
- RLS that exposes an invite only to its sender and recipient
- narrow authenticated functions for send, accept, decline, cancel, and lazy expiration
- a partial unique index that prevents duplicate pending invitations between the same two players

The trigger intentionally rejects invalid or duplicate User IDs at the database boundary. If it fails, Supabase rejects the related signup instead of creating an auth user without a profile. `profiles.id` remains the private Supabase Auth UUID; `profiles.player_id` is the public identity.

Until these migrations are applied, the signup User ID check fails and `auth.signUp()` is not called. Apply the migrations instead of bypassing the profile check. Existing projects that already ran the first two files only need to run `202609010001_player_id_avatars.sql`.

## 3. Enable Email/Password authentication

In **Authentication → Providers → Email**, enable Email/Password. Either email-confirmation mode is supported:

- With confirmation enabled, signup shows “Check your email” and does not claim the player is signed in.
- With confirmation disabled, a returned session is restored immediately and the player is sent to `/home`.

## 4. Configure URLs

In **Authentication → URL Configuration**, set:

```text
Site URL: https://ginrummy.jqiwen.com
```

Add these redirect URLs:

```text
https://ginrummy.jqiwen.com/**
http://localhost:3000/**
```

The `/**` patterns allow the static export's trailing-slash routes, including `/login/`.

This Dashboard change is manual. Codex cannot change the Supabase project settings. Follow the exact path:

**Supabase → Ginrummy project → Authentication → URL Configuration**

## 5. Copy the public project values

From **Project Settings → API**, copy:

- Project URL
- Public anon/publishable key

The anon/publishable key is designed for browser use and is constrained by Supabase Auth and PostgreSQL RLS. Never use or expose the service-role key.

For local frontend development, copy `src/frontend/.env.example` to `src/frontend/.env.local` and set:

```dotenv
NEXT_PUBLIC_GAME_WS_URL=http://localhost:8080
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

For the local game service, copy `src/game-service/.env.example` to `src/game-service/.env` and set the same public project values under server-side names:

```dotenv
PORT=8080
FRONTEND_ORIGIN=http://localhost:3000
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

## 6. Add GitHub Repository Variables

Open **GitHub → Repository → Settings → Secrets and variables → Actions → Variables** and add:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `https://ginrummy.jqiwen.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon/publishable key |

The Pages workflow compiles these into the static browser bundle. `NEXT_PUBLIC_SITE_URL` controls the email-confirmation destination; production must use `https://ginrummy.jqiwen.com`. The Cloud Run workflow maps the Supabase repository variables to `SUPABASE_URL` and `SUPABASE_ANON_KEY` on the game-service revision. This avoids maintaining duplicate Supabase values.

## 7. Deploy in order

1. Apply all SQL migrations in filename order.
2. Configure Email/Password and the URL allowlist.
3. Add the three frontend repository variables.
4. Run **Deploy game service to Cloud Run** so the service can verify access tokens.
5. Run **Deploy frontend to GitHub Pages** so the static bundle receives the public Supabase configuration.

The existing Cloud Run deployment command supplies the backend environment values automatically. No manual Cloud Run console edit is needed after the GitHub variables exist.

## 8. Verify the live flow

1. Register a new User ID and email.
2. If confirmation is enabled, follow the email link and sign in.
3. Confirm the header shows the User ID and avatar fallback after a refresh.
4. Upload a JPG, PNG, or WebP avatar smaller than 2 MB and confirm it appears immediately.
5. Open Private Match, search for the second account by User ID, and send an invite.
6. Sign in as that second user in a separate browser profile, accept the invite, and confirm both sessions enter the same match with both avatars.
7. Refresh one match session and confirm its authenticated seat, User ID, and opponent avatar reconnect without entering a room code.
8. Sign out and confirm Private Match redirects back to login while the guest tutorial remains available.

If signup fails with a generic account error, check Supabase Auth logs and confirm the migration ran successfully. A missing `profiles` table or profile trigger will deliberately prevent an incomplete account from being used.
