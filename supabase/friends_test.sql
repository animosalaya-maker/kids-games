-- Self-check for supabase/friends.sql. Run in the SQL editor (or execute_sql). Uses fake secrets and deletes its rows at the end.
-- Any failed check raises an exception and rolls everything back.
do $$
declare
  sa text := 'TEST_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  sb text := 'TEST_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  sc text := 'TEST_cccccccccccccccccccccccccccccccccccccccccccc';
  a jsonb; b jsonb; c jsonb; r jsonb; ca text; cb text; cc text; inv bigint; n int; ok boolean;
begin
  a := public.bobo_fr_me(sa); b := public.bobo_fr_me(sb); c := public.bobo_fr_me(sc);
  ca := a->>'code'; cb := b->>'code'; cc := c->>'code';
  assert ca ~ '^[A-HJ-NP-Z2-9]{6}$', 'code format ' || ca;
  assert public.bobo_fr_me(sa)->>'code' = ca, 'me is stable';
  assert (select count(*) from bobo_friends.kids where secret_hash = convert_to(sa, 'UTF8')) = 0, 'secret not stored in clear';
  assert (select count(*) from bobo_friends.kids where secret_hash = pg_catalog.sha256(convert_to(sa, 'UTF8'))) = 1, 'hash stored';

  -- bad input
  ok := false; begin perform public.bobo_fr_me('short'); exception when others then ok := true; end; assert ok, 'short secret rejected';
  ok := false; begin perform public.bobo_fr_heartbeat('TEST_zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz'); exception when others then ok := true; end; assert ok, 'unknown secret rejected';
  ok := false; begin perform public.bobo_fr_set_look(sa, 'dragon', 'purple', null, null, null, null); exception when others then ok := true; end; assert ok, 'bad avatar rejected';
  ok := false; begin perform public.bobo_fr_set_look(sa, 'bobo', 'purple', null, null, 'fast', null); exception when others then ok := true; end; assert ok, 'half nickname rejected';
  r := public.bobo_fr_set_look(sa, 'tiger', 'gold', 'crown', 'sun', 'fast', 'tiger');
  assert r->>'avatar' = 'tiger' and r->>'hat' = 'crown' and r->>'na' = 'fast', 'look saved';

  -- requests
  assert public.bobo_fr_request(sa, ca)->>'status' = 'self', 'self';
  assert public.bobo_fr_request(sa, 'ZZZZZZ')->>'status' = 'not_found', 'not found';
  assert public.bobo_fr_request(sa, lower(cb))->>'status' = 'sent', 'sent (case-insensitive)';
  assert public.bobo_fr_request(sa, cb)->>'status' = 'already_sent', 'idempotent';
  assert public.bobo_fr_heartbeat(sb)->>'requests' = '1', 'b badge = 1';
  r := public.bobo_fr_requests(sb);
  assert jsonb_array_length(r->'incoming') = 1 and r->'incoming'->0->>'code' = ca and r->'incoming'->0->>'avatar' = 'tiger', 'b sees a';
  assert jsonb_array_length(public.bobo_fr_requests(sa)->'outgoing') = 1, 'a sees outgoing';
  assert public.bobo_fr_answer(sb, ca, true)->>'status' = 'accepted', 'accept';
  assert jsonb_array_length(public.bobo_fr_friends(sa)) = 1 and jsonb_array_length(public.bobo_fr_friends(sb)) = 1, 'friends both ways';
  assert public.bobo_fr_request(sb, ca)->>'status' = 'already_friends', 'already friends';
  -- auto-accept when the other one already asked
  assert public.bobo_fr_request(sc, ca)->>'status' = 'sent', 'c asks a';
  assert public.bobo_fr_request(sa, cc)->>'status' = 'accepted', 'a asks c -> auto accept';
  assert jsonb_array_length(public.bobo_fr_friends(sa)) = 2, 'a has 2 friends';
  assert jsonb_array_length(public.bobo_fr_requests(sa)->'incoming') = 0, 'no requests left';
  -- decline
  perform public.bobo_fr_remove(sa, cc);
  assert jsonb_array_length(public.bobo_fr_friends(sc)) = 0, 'removed both ways';
  assert public.bobo_fr_request(sc, ca)->>'status' = 'sent', 'c asks again';
  assert public.bobo_fr_answer(sa, cc, false)->>'status' = 'declined', 'decline';
  assert public.bobo_fr_answer(sa, cc, true)->>'status' = 'none', 'nothing to accept after decline';

  -- online flag
  update bobo_friends.kids set last_seen = now() - interval '5 minutes' where code = cb;
  assert (public.bobo_fr_friends(sa)->0->>'online')::boolean = false, 'b offline';
  perform public.bobo_fr_heartbeat(sb);
  assert (public.bobo_fr_friends(sa)->0->>'online')::boolean = true, 'b online after heartbeat';

  -- invites
  ok := false; begin perform public.bobo_fr_invite(sa, cb, '12a4'); exception when others then ok := true; end; assert ok, 'bad room rejected';
  assert public.bobo_fr_invite(sa, cc, '1234')->>'status' = 'not_friends', 'invite needs friendship';
  assert public.bobo_fr_invite(sa, cb, '1234')->>'status' = 'sent', 'invite sent';
  assert public.bobo_fr_invite(sa, cb, '5678')->>'status' = 'sent', 'second invite replaces first';
  r := public.bobo_fr_invites(sb);
  assert jsonb_array_length(r) = 1 and r->0->>'room' = '5678' and r->0->'from'->>'code' = ca, 'b sees newest invite only';
  assert (r->0->>'left')::int between 590 and 600, 'expires in ~10 min';
  assert public.bobo_fr_heartbeat(sb)->>'invites' = '1', 'b badge invites = 1';
  inv := (r->0->>'id')::bigint;
  perform public.bobo_fr_dismiss(sc, inv);  -- not c's invite: no effect
  assert jsonb_array_length(public.bobo_fr_invites(sb)) = 1, 'others cannot dismiss';
  perform public.bobo_fr_dismiss(sb, inv);
  assert jsonb_array_length(public.bobo_fr_invites(sb)) = 0, 'dismissed';
  perform public.bobo_fr_invite(sa, cb, '1111');
  update bobo_friends.invites set expires_at = now() - interval '1 second' where room = '1111';
  assert jsonb_array_length(public.bobo_fr_invites(sb)) = 0, 'expired invite hidden';
  perform public.bobo_fr_invite(sa, cb, '2222'); perform public.bobo_fr_invite(sa, cb, '3333');
  assert public.bobo_fr_invite(sa, cb, '4444')->>'status' = 'sent', '6th invite in a minute ok';
  assert public.bobo_fr_invite(sa, cb, '5555')->>'status' = 'slow_down', 'rate limit 6/min';

  -- pending-request limit (20)
  for n in 1..20 loop
    perform public.bobo_fr_me('TEST_pend' || lpad(n::text, 40, 'x'));
  end loop;
  for n in 1..19 loop
    perform public.bobo_fr_request(sc, (public.bobo_fr_me('TEST_pend' || lpad(n::text, 40, 'x')))->>'code');
  end loop;
  assert public.bobo_fr_request(sc, (public.bobo_fr_me('TEST_pend' || lpad('20', 40, 'x')))->>'code')->>'status' = 'sent', '20th ok';
  assert public.bobo_fr_request(sc, cb)->>'status' = 'pending_limit', '21st blocked';

  -- delete my data
  assert public.bobo_fr_delete_me(sa)->>'status' = 'deleted', 'delete';
  assert jsonb_array_length(public.bobo_fr_friends(sb)) = 0, 'friend links gone';
  assert jsonb_array_length(public.bobo_fr_invites(sb)) = 0, 'invites gone';
  assert public.bobo_fr_delete_me(sa)->>'status' = 'deleted', 'delete again is fine';
  assert public.bobo_fr_me(sa)->>'code' <> ca, 'new code after delete';

  -- clean up every test row
  delete from bobo_friends.kids where secret_hash in (select pg_catalog.sha256(convert_to(s, 'UTF8')) from unnest(array[sa, sb, sc]) s)
     or secret_hash in (select pg_catalog.sha256(convert_to('TEST_pend' || lpad(g::text, 40, 'x'), 'UTF8')) from generate_series(1, 20) g);
  raise notice 'ALL FRIENDS CHECKS PASSED';
end $$;
select count(*) as kids_left from bobo_friends.kids;
