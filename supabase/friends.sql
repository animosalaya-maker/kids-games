-- Bobo Land «أصحابي / Friends» — server side (Supabase project vgpwtrzplggvlsuvqsas).
-- Applied as migration `bobo_friends`. Kept here for reference; edit and re-apply as a new migration.
--
-- Child safety: no names, no free text, no chat. A kid is a random device secret (only its SHA-256 is stored),
-- a public 6-letter friend code, an avatar id and an optional nickname picked from fixed word lists.
-- Tables live in the private schema `bobo_friends` (RLS on, no policies, no grants to anon/authenticated).
-- Every call goes through the SECURITY DEFINER functions `public.bobo_fr_*` below (EXECUTE granted to anon only).

create schema if not exists bobo_friends;
revoke all on schema bobo_friends from public, anon, authenticated;

create table if not exists bobo_friends.kids(
  id bigint generated always as identity primary key,
  secret_hash bytea not null unique,
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  avatar text not null default 'bobo',
  color text not null default 'purple',
  hat text,
  glasses text,
  nick_a text,
  nick_n text,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create table if not exists bobo_friends.requests(
  from_id bigint not null references bobo_friends.kids(id) on delete cascade,
  to_id bigint not null references bobo_friends.kids(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_id, to_id),
  check (from_id <> to_id)
);
create index if not exists requests_to_idx on bobo_friends.requests(to_id);
-- one row per direction, so "my friends" is a single index scan
create table if not exists bobo_friends.friends(
  kid_id bigint not null references bobo_friends.kids(id) on delete cascade,
  friend_id bigint not null references bobo_friends.kids(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (kid_id, friend_id),
  check (kid_id <> friend_id)
);
create index if not exists friends_friend_idx on bobo_friends.friends(friend_id);
create table if not exists bobo_friends.invites(
  id bigint generated always as identity primary key,
  from_id bigint not null references bobo_friends.kids(id) on delete cascade,
  to_id bigint not null references bobo_friends.kids(id) on delete cascade,
  room text not null check (room ~ '^[0-9]{4}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes',
  dismissed boolean not null default false
);
create index if not exists invites_to_idx on bobo_friends.invites(to_id, expires_at);
create index if not exists invites_from_idx on bobo_friends.invites(from_id, created_at);

alter table bobo_friends.kids enable row level security;
alter table bobo_friends.requests enable row level security;
alter table bobo_friends.friends enable row level security;
alter table bobo_friends.invites enable row level security;
revoke all on all tables in schema bobo_friends from public, anon, authenticated;
revoke all on all sequences in schema bobo_friends from public, anon, authenticated;

-- ---------- private helpers (not callable by anon) ----------
create or replace function bobo_friends.kid_of(p_secret text)
returns bobo_friends.kids language plpgsql stable security definer set search_path = '' as $$
declare k bobo_friends.kids;
begin
  if p_secret is null or length(p_secret) < 43 or length(p_secret) > 128 or p_secret !~ '^[A-Za-z0-9_-]+$' then
    raise exception 'bad_secret' using errcode = '22023';
  end if;
  select * into k from bobo_friends.kids where secret_hash = pg_catalog.sha256(convert_to(p_secret, 'UTF8'));
  if not found then raise exception 'not_registered' using errcode = 'P0002'; end if;
  return k;
end $$;

create or replace function bobo_friends.card(k bobo_friends.kids)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('code', k.code, 'avatar', k.avatar, 'color', k.color, 'hat', k.hat, 'glasses', k.glasses,
    'na', k.nick_a, 'nn', k.nick_n, 'online', k.last_seen > now() - interval '60 seconds');
$$;

create or replace function bobo_friends.counts(p_id bigint)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'requests', (select count(*) from bobo_friends.requests r where r.to_id = p_id),
    'invites', (select count(*) from bobo_friends.invites i
                  join bobo_friends.friends f on f.kid_id = p_id and f.friend_id = i.from_id
                 where i.to_id = p_id and not i.dismissed and i.expires_at > now()));
$$;

revoke all on function bobo_friends.kid_of(text) from public, anon, authenticated;
revoke all on function bobo_friends.card(bobo_friends.kids) from public, anon, authenticated;
revoke all on function bobo_friends.counts(bigint) from public, anon, authenticated;

-- ---------- public RPCs ----------

-- Register (first call) or read my profile. Also counts as a heartbeat.
create or replace function public.bobo_fr_me(p_secret text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare h bytea; k bobo_friends.kids; c text; b bytea; i int; tries int := 0;
  abc constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if p_secret is null or length(p_secret) < 43 or length(p_secret) > 128 or p_secret !~ '^[A-Za-z0-9_-]+$' then
    raise exception 'bad_secret' using errcode = '22023';
  end if;
  h := pg_catalog.sha256(convert_to(p_secret, 'UTF8'));
  update bobo_friends.kids set last_seen = now() where secret_hash = h returning * into k;
  if not found then
    loop
      tries := tries + 1;
      b := extensions.gen_random_bytes(6); c := '';
      for i in 0..5 loop c := c || substr(abc, (get_byte(b, i) % 32) + 1, 1); end loop;
      begin
        insert into bobo_friends.kids(secret_hash, code) values (h, c) returning * into k;
        exit;
      exception when unique_violation then
        select * into k from bobo_friends.kids where secret_hash = h;   -- same device raced itself
        if found then exit; end if;
        if tries > 8 then raise; end if;
      end;
    end loop;
  end if;
  return bobo_friends.card(k) || bobo_friends.counts(k.id);
end $$;

-- Avatar / Bobo colours / fixed nickname. Only ids from the allowed lists.
create or replace function public.bobo_fr_set_look(p_secret text, p_avatar text, p_color text, p_hat text, p_glasses text, p_nick_a text, p_nick_n text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare k bobo_friends.kids;
begin
  k := bobo_friends.kid_of(p_secret);
  if p_avatar not in ('bobo','cat','dog','fox','lion','tiger','panda','bear','rabbit','frog','owl','penguin','monkey') then raise exception 'bad_avatar' using errcode = '22023'; end if;
  if p_color not in ('purple','pink','green','orange','blue','gold') then raise exception 'bad_color' using errcode = '22023'; end if;
  if p_hat is not null and p_hat not in ('cap','bow','top','flower','grad','crown') then raise exception 'bad_hat' using errcode = '22023'; end if;
  if p_glasses is not null and p_glasses not in ('round','sun','goggles') then raise exception 'bad_glasses' using errcode = '22023'; end if;
  if (p_nick_a is null) <> (p_nick_n is null) then raise exception 'bad_nick' using errcode = '22023'; end if;
  if p_nick_a is not null and p_nick_a not in ('fast','brave','happy','smart','strong','funny','kind','golden','little','super','cool','shiny') then raise exception 'bad_nick' using errcode = '22023'; end if;
  if p_nick_n is not null and p_nick_n not in ('tiger','lion','rabbit','falcon','dolphin','bear','fox','penguin','cat','elephant','horse','star') then raise exception 'bad_nick' using errcode = '22023'; end if;
  update bobo_friends.kids set avatar = p_avatar, color = p_color, hat = p_hat, glasses = p_glasses, nick_a = p_nick_a, nick_n = p_nick_n, last_seen = now()
   where id = k.id returning * into k;
  return bobo_friends.card(k);
end $$;

-- Send a friend request by code. Idempotent. If they already asked me, we become friends at once.
-- Result status: sent | already_sent | accepted | already_friends | self | not_found | my_limit | their_limit | pending_limit
create or replace function public.bobo_fr_request(p_secret text, p_code text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare me bobo_friends.kids; o bobo_friends.kids; st text;
begin
  me := bobo_friends.kid_of(p_secret);
  select * into o from bobo_friends.kids where code = upper(trim(coalesce(p_code, '')));
  if not found then return jsonb_build_object('status', 'not_found'); end if;
  if o.id = me.id then return jsonb_build_object('status', 'self'); end if;
  if exists(select 1 from bobo_friends.friends where kid_id = me.id and friend_id = o.id) then
    st := 'already_friends';
  elsif exists(select 1 from bobo_friends.requests where from_id = o.id and to_id = me.id) then
    if (select count(*) from bobo_friends.friends where kid_id = me.id) >= 50 then return jsonb_build_object('status', 'my_limit'); end if;
    if (select count(*) from bobo_friends.friends where kid_id = o.id) >= 50 then return jsonb_build_object('status', 'their_limit'); end if;
    delete from bobo_friends.requests where (from_id = o.id and to_id = me.id) or (from_id = me.id and to_id = o.id);
    insert into bobo_friends.friends(kid_id, friend_id) values (me.id, o.id), (o.id, me.id) on conflict do nothing;
    st := 'accepted';
  elsif exists(select 1 from bobo_friends.requests where from_id = me.id and to_id = o.id) then
    st := 'already_sent';
  else
    if (select count(*) from bobo_friends.friends where kid_id = me.id) >= 50 then return jsonb_build_object('status', 'my_limit'); end if;
    if (select count(*) from bobo_friends.requests where from_id = me.id) >= 20 then return jsonb_build_object('status', 'pending_limit'); end if;
    insert into bobo_friends.requests(from_id, to_id) values (me.id, o.id) on conflict do nothing;
    st := 'sent';
  end if;
  return jsonb_build_object('status', st, 'kid', bobo_friends.card(o));
end $$;

-- Requests waiting for me (incoming) and the ones I sent (outgoing).
create or replace function public.bobo_fr_requests(p_secret text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare me bobo_friends.kids;
begin
  me := bobo_friends.kid_of(p_secret);
  return jsonb_build_object(
    'incoming', coalesce((select jsonb_agg(bobo_friends.card(k) order by r.created_at desc)
                            from bobo_friends.requests r join bobo_friends.kids k on k.id = r.from_id where r.to_id = me.id), '[]'::jsonb),
    'outgoing', coalesce((select jsonb_agg(bobo_friends.card(k) order by r.created_at desc)
                            from bobo_friends.requests r join bobo_friends.kids k on k.id = r.to_id where r.from_id = me.id), '[]'::jsonb));
end $$;

-- Accept (true) or decline (false) a request from p_code. Status: accepted | declined | none | my_limit | their_limit
create or replace function public.bobo_fr_answer(p_secret text, p_code text, p_accept boolean)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare me bobo_friends.kids; o bobo_friends.kids;
begin
  me := bobo_friends.kid_of(p_secret);
  select * into o from bobo_friends.kids where code = upper(trim(coalesce(p_code, '')));
  if not found or not exists(select 1 from bobo_friends.requests where from_id = o.id and to_id = me.id) then
    return jsonb_build_object('status', 'none');
  end if;
  if coalesce(p_accept, false) then
    if (select count(*) from bobo_friends.friends where kid_id = me.id) >= 50 then return jsonb_build_object('status', 'my_limit'); end if;
    if (select count(*) from bobo_friends.friends where kid_id = o.id) >= 50 then return jsonb_build_object('status', 'their_limit'); end if;
    delete from bobo_friends.requests where (from_id = o.id and to_id = me.id) or (from_id = me.id and to_id = o.id);
    insert into bobo_friends.friends(kid_id, friend_id) values (me.id, o.id), (o.id, me.id) on conflict do nothing;
    return jsonb_build_object('status', 'accepted', 'kid', bobo_friends.card(o));
  end if;
  delete from bobo_friends.requests where from_id = o.id and to_id = me.id;
  return jsonb_build_object('status', 'declined');
end $$;

-- Remove a friend (both directions) and any invites between us. Also cancels my outgoing request to p_code.
create or replace function public.bobo_fr_remove(p_secret text, p_code text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare me bobo_friends.kids; o bobo_friends.kids;
begin
  me := bobo_friends.kid_of(p_secret);
  select * into o from bobo_friends.kids where code = upper(trim(coalesce(p_code, '')));
  if not found then return jsonb_build_object('status', 'none'); end if;
  delete from bobo_friends.friends where (kid_id = me.id and friend_id = o.id) or (kid_id = o.id and friend_id = me.id);
  delete from bobo_friends.requests where from_id = me.id and to_id = o.id;
  delete from bobo_friends.invites where (from_id = me.id and to_id = o.id) or (from_id = o.id and to_id = me.id);
  return jsonb_build_object('status', 'removed');
end $$;

-- My friends, online ones first. online = seen in the last 60 s.
create or replace function public.bobo_fr_friends(p_secret text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare me bobo_friends.kids;
begin
  me := bobo_friends.kid_of(p_secret);
  return coalesce((select jsonb_agg(bobo_friends.card(k) order by (k.last_seen > now() - interval '60 seconds') desc, f.created_at desc)
                     from bobo_friends.friends f join bobo_friends.kids k on k.id = f.friend_id where f.kid_id = me.id), '[]'::jsonb);
end $$;

-- "I am here" (called every ~25 s while the app is open). Returns the badge counts.
create or replace function public.bobo_fr_heartbeat(p_secret text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare me bobo_friends.kids;
begin
  me := bobo_friends.kid_of(p_secret);
  update bobo_friends.kids set last_seen = now() where id = me.id;
  return bobo_friends.counts(me.id);
end $$;

-- Invite a friend into a 4-digit room of the 3D game. Expires after 10 minutes. Max 6 invites a minute.
-- Status: sent | not_friends | slow_down
create or replace function public.bobo_fr_invite(p_secret text, p_code text, p_room text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare me bobo_friends.kids; o bobo_friends.kids;
begin
  me := bobo_friends.kid_of(p_secret);
  if p_room is null or p_room !~ '^[0-9]{4}$' then raise exception 'bad_room' using errcode = '22023'; end if;
  select * into o from bobo_friends.kids where code = upper(trim(coalesce(p_code, '')));
  if not found or not exists(select 1 from bobo_friends.friends where kid_id = me.id and friend_id = o.id) then
    return jsonb_build_object('status', 'not_friends');
  end if;
  if (select count(*) from bobo_friends.invites where from_id = me.id and created_at > now() - interval '1 minute') >= 6 then
    return jsonb_build_object('status', 'slow_down');
  end if;
  delete from bobo_friends.invites where expires_at < now() - interval '1 day';   -- housekeeping
  update bobo_friends.invites set dismissed = true where from_id = me.id and to_id = o.id and not dismissed;
  insert into bobo_friends.invites(from_id, to_id, room) values (me.id, o.id, p_room);
  update bobo_friends.kids set last_seen = now() where id = me.id;
  return jsonb_build_object('status', 'sent');
end $$;

-- Live invites for me (newest first), only from current friends.
create or replace function public.bobo_fr_invites(p_secret text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare me bobo_friends.kids;
begin
  me := bobo_friends.kid_of(p_secret);
  return coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'room', i.room, 'from', bobo_friends.card(k),
                       'left', greatest(0, floor(extract(epoch from i.expires_at - now()))::int)) order by i.created_at desc)
                     from bobo_friends.invites i
                     join bobo_friends.friends f on f.kid_id = me.id and f.friend_id = i.from_id
                     join bobo_friends.kids k on k.id = i.from_id
                    where i.to_id = me.id and not i.dismissed and i.expires_at > now()), '[]'::jsonb);
end $$;

create or replace function public.bobo_fr_dismiss(p_secret text, p_id bigint)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare me bobo_friends.kids;
begin
  me := bobo_friends.kid_of(p_secret);
  update bobo_friends.invites set dismissed = true where id = p_id and to_id = me.id;
  return jsonb_build_object('status', 'dismissed');
end $$;

-- "Delete my friend data": removes me, my friend links, requests and invites (cascade).
create or replace function public.bobo_fr_delete_me(p_secret text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare me bobo_friends.kids;
begin
  begin
    me := bobo_friends.kid_of(p_secret);
  exception when sqlstate 'P0002' then
    return jsonb_build_object('status', 'deleted');
  end;
  delete from bobo_friends.kids where id = me.id;
  return jsonb_build_object('status', 'deleted');
end $$;

-- ---------- grants: anon may only EXECUTE the RPCs ----------
do $$
declare f text;
begin
  foreach f in array array[
    'public.bobo_fr_me(text)', 'public.bobo_fr_set_look(text,text,text,text,text,text,text)', 'public.bobo_fr_request(text,text)',
    'public.bobo_fr_requests(text)', 'public.bobo_fr_answer(text,text,boolean)', 'public.bobo_fr_remove(text,text)',
    'public.bobo_fr_friends(text)', 'public.bobo_fr_heartbeat(text)', 'public.bobo_fr_invite(text,text,text)',
    'public.bobo_fr_invites(text)', 'public.bobo_fr_dismiss(text,bigint)', 'public.bobo_fr_delete_me(text)']
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to anon', f);
  end loop;
end $$;
