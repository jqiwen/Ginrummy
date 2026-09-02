# Player ID and avatar setup

## Identity model

Gin Rummy keeps authentication identity and public identity separate:

- `auth.users.id`: private Supabase UUID used for authentication, foreign keys, Socket.IO authorization, invitations, and room membership.
- `public.profiles.id`: the same UUID as the profile primary key.
- `public.profiles.player_id`: public, lowercase, unique, searchable User ID chosen at registration and immutable afterward.
- `public.profiles.avatar_path`: optional path to the player's public profile image.
- Email stays in Supabase Auth and is never copied into `public.profiles` or opponent payloads.

The legacy `display_name` column may remain in an existing database. The migration preserves its values, removes its old `NOT NULL` requirement, and removes it from Data API column grants; current application code does not read or write it.

## Required database and Storage migration

Generating this repository migration does not change the remote Supabase project. For an existing Gin Rummy project, open:

**Supabase → SQL Editor → New query → paste the complete file → Run**

Run this exact file:

```text
supabase/migrations/202609010001_player_id_avatars.sql
```

The migration safely renames `profiles.username` to `profiles.player_id`, preserving values such as `admin`, `admin2`, and `admin3`. It adds `avatar_path`, lowercase uniqueness constraints, an immutability trigger, and the `avatars` Storage bucket.

The bucket is intentionally public-read because avatars are public multiplayer profile images. Insert, update, and delete policies require the first object-path folder to equal `auth.uid()`, so users cannot write to another UUID folder.

## Avatar behavior

- Accepted types: JPG/JPEG, PNG, and WebP.
- Maximum size: 2 MB, enforced in the browser and bucket configuration.
- Object layout: `avatars/<auth.users UUID>/avatar-<unique version>.<extension>`.
- Unique object names provide cache busting when an avatar is replaced.
- The previous owned object is removed after the new profile path is committed.
- Players without an upload see the first letter of their User ID in a circular fallback.

No service-role key is required. Browser operations use the authenticated Supabase session and are constrained by database and Storage RLS.
