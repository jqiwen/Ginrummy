create table if not exists public.game_invites (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null default (timezone('utc', now()) + interval '30 minutes'),
  room_id text,
  constraint game_invites_different_players check (sender_id <> recipient_id),
  constraint game_invites_status check (
    status in ('pending', 'accepted', 'declined', 'cancelled', 'expired')
  )
);

create index if not exists game_invites_recipient_id_idx
  on public.game_invites (recipient_id);
create index if not exists game_invites_sender_id_idx
  on public.game_invites (sender_id);
create index if not exists game_invites_status_idx
  on public.game_invites (status);
create index if not exists game_invites_created_at_idx
  on public.game_invites (created_at desc);

-- A pair of players may have at most one pending invitation, regardless of
-- which player sent it. Declined/cancelled/expired invitations remain as history.
create unique index if not exists game_invites_one_pending_per_pair_idx
  on public.game_invites (
    least(sender_id, recipient_id),
    greatest(sender_id, recipient_id)
  )
  where status = 'pending';

create or replace function public.set_game_invite_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists game_invites_set_updated_at on public.game_invites;
create trigger game_invites_set_updated_at
  before update on public.game_invites
  for each row execute procedure public.set_game_invite_updated_at();

alter table public.game_invites enable row level security;

revoke all on table public.game_invites from anon, authenticated;
grant select on table public.game_invites to authenticated;

drop policy if exists "Players can read their game invitations" on public.game_invites;
create policy "Players can read their game invitations"
  on public.game_invites for select
  to authenticated
  using (
    (select auth.uid()) = sender_id
    or (select auth.uid()) = recipient_id
  );

-- State changes are deliberately exposed as narrow authenticated functions.
-- Browser clients cannot insert/update/delete invite rows directly.
create or replace function public.send_game_invite(
  p_recipient_id uuid,
  p_expires_at timestamptz default (timezone('utc', now()) + interval '30 minutes')
)
returns setof public.game_invites
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_id uuid := auth.uid();
  v_invite public.game_invites;
begin
  if v_sender_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_recipient_id = v_sender_id then
    raise exception 'CANNOT_INVITE_SELF' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = p_recipient_id) then
    raise exception 'PLAYER_NOT_FOUND' using errcode = 'P0002';
  end if;
  update public.game_invites
  set status = 'expired'
  where status = 'pending'
    and expires_at <= timezone('utc', now())
    and (sender_id = v_sender_id or recipient_id = v_sender_id);
  if (
    select count(*) from public.game_invites
    where sender_id = v_sender_id and status = 'pending' and expires_at > timezone('utc', now())
  ) >= 5 then
    raise exception 'INVITE_RATE_LIMITED' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.game_invites
    where sender_id = v_sender_id and created_at > timezone('utc', now()) - interval '3 seconds'
  ) then
    raise exception 'INVITE_RATE_LIMITED' using errcode = 'P0001';
  end if;

  insert into public.game_invites (sender_id, recipient_id, expires_at)
  values (
    v_sender_id,
    p_recipient_id,
    least(p_expires_at, timezone('utc', now()) + interval '30 minutes')
  )
  returning * into v_invite;
  return next v_invite;
exception
  when unique_violation then
    raise exception 'INVITE_ALREADY_PENDING' using errcode = '23505';
end;
$$;

create or replace function public.accept_game_invite(p_invite_id uuid)
returns setof public.game_invites
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_invite public.game_invites;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select * into v_invite
  from public.game_invites
  where id = p_invite_id
  for update;

  if not found or v_invite.recipient_id <> v_user_id or v_invite.status <> 'pending' then
    return;
  end if;

  if v_invite.expires_at <= timezone('utc', now()) then
    update public.game_invites
    set status = 'expired'
    where id = p_invite_id
    returning * into v_invite;
    return next v_invite;
    return;
  end if;

  update public.game_invites
  set status = 'accepted', room_id = gen_random_uuid()::text
  where id = p_invite_id and status = 'pending'
  returning * into v_invite;
  if found then return next v_invite; end if;
end;
$$;

create or replace function public.decline_game_invite(p_invite_id uuid)
returns setof public.game_invites
language sql
security definer
set search_path = ''
as $$
  update public.game_invites
  set status = case
    when expires_at <= timezone('utc', now()) then 'expired'
    else 'declined'
  end
  where id = p_invite_id
    and recipient_id = auth.uid()
    and status = 'pending'
  returning *;
$$;

create or replace function public.cancel_game_invite(p_invite_id uuid)
returns setof public.game_invites
language sql
security definer
set search_path = ''
as $$
  update public.game_invites
  set status = case
    when expires_at <= timezone('utc', now()) then 'expired'
    else 'cancelled'
  end
  where id = p_invite_id
    and sender_id = auth.uid()
    and status = 'pending'
  returning *;
$$;

create or replace function public.expire_my_game_invites()
returns setof public.game_invites
language sql
security definer
set search_path = ''
as $$
  update public.game_invites
  set status = 'expired'
  where status = 'pending'
    and expires_at <= timezone('utc', now())
    and (sender_id = auth.uid() or recipient_id = auth.uid())
  returning *;
$$;

revoke all on function public.send_game_invite(uuid, timestamptz) from public, anon;
revoke all on function public.accept_game_invite(uuid) from public, anon;
revoke all on function public.decline_game_invite(uuid) from public, anon;
revoke all on function public.cancel_game_invite(uuid) from public, anon;
revoke all on function public.expire_my_game_invites() from public, anon;

grant execute on function public.send_game_invite(uuid, timestamptz) to authenticated;
grant execute on function public.accept_game_invite(uuid) to authenticated;
grant execute on function public.decline_game_invite(uuid) to authenticated;
grant execute on function public.cancel_game_invite(uuid) to authenticated;
grant execute on function public.expire_my_game_invites() to authenticated;
