begin;

-- Preserve every existing public identity while giving the column an
-- unambiguous name. profiles.id remains the auth.users UUID.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'username'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'player_id'
  ) then
    alter table public.profiles rename column username to player_id;
  end if;
end;
$$;

alter table public.profiles
  add column if not exists avatar_path text;

-- The previous schema already prevented case-only duplicates. Normalize the
-- preserved values before installing the renamed constraints.
update public.profiles
set player_id = lower(trim(player_id))
where player_id is distinct from lower(trim(player_id));

alter table public.profiles drop constraint if exists profiles_username_length;
alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles drop constraint if exists profiles_username_normalized;
alter table public.profiles drop constraint if exists profiles_display_name_length;
alter table public.profiles drop constraint if exists profiles_player_id_length;
alter table public.profiles drop constraint if exists profiles_player_id_format;
alter table public.profiles drop constraint if exists profiles_player_id_normalized;

alter table public.profiles
  add constraint profiles_player_id_length check (char_length(player_id) between 3 and 20),
  add constraint profiles_player_id_format check (player_id ~ '^[a-z0-9_]+$'),
  add constraint profiles_player_id_normalized check (player_id = lower(player_id));

drop index if exists public.profiles_username_unique;
create unique index if not exists profiles_player_id_unique
  on public.profiles (lower(player_id));

-- A public User ID can never be edited after account creation. The explicit
-- trigger keeps this invariant even for privileged update paths.
create or replace function public.prevent_player_id_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.player_id is distinct from old.player_id then
    raise exception 'User ID cannot be changed after registration.' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_player_id_change on public.profiles;
create trigger profiles_prevent_player_id_change
  before update on public.profiles
  for each row execute procedure public.prevent_player_id_change();

revoke update on table public.profiles from authenticated;
grant update (avatar_path) on table public.profiles to authenticated;

-- New signups use player_id metadata. The username fallback only supports an
-- already-open registration page during a rolling deployment.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_player_id text;
begin
  requested_player_id := lower(trim(coalesce(
    new.raw_user_meta_data ->> 'player_id',
    new.raw_user_meta_data ->> 'username'
  )));

  if requested_player_id is null or requested_player_id = '' then
    requested_player_id := 'player_' || substr(replace(new.id::text, '-', ''), 1, 12);
  end if;

  insert into public.profiles (id, player_id, avatar_path)
  values (new.id, requested_player_id, null);
  return new;
exception
  when unique_violation then
    raise exception 'PLAYER_ID_TAKEN' using errcode = '23505';
end;
$$;

revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;

-- Public profile images are intentionally readable. Object writes remain
-- limited to the folder named after the authenticated auth.users UUID.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

drop policy if exists "Players can upload their own avatar" on storage.objects;
create policy "Players can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Players can replace their own avatar" on storage.objects;
create policy "Players can replace their own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Players can delete their own avatar" on storage.objects;
create policy "Players can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

commit;
