-- Typing… · Migración: salas con aprobación (privacidad).
--
-- - `settings.require_approval` (por defecto false). Si está activo, quien se une queda `pending`: no ve nada de la
--   sala ni aparece en la lista hasta que el host le acepta (`approve_player`) o le rechaza (`reject_player`).
-- - Rechazado = no puede volver a intentarlo en esa sala (como echado).
-- - Si el host desactiva la aprobación, los pendientes entran automáticamente (hasta llenar la sala).
-- - `get_room_state` para un pendiente devuelve solo { pending, code, hostName }; para el host añade `pendingPlayers`.
-- - Los pendientes pueden escuchar el canal de la sala (solo reciben "algo cambió") para enterarse al instante.

alter table game.room_players drop constraint if exists room_players_status_check;
alter table game.room_players add constraint room_players_status_check
  check (status in ('active', 'left', 'kicked', 'pending', 'rejected'));

alter table game.rooms alter column settings set default '{
  "rounds": null, "writing_seconds": 45, "voting_seconds": 25, "reveal_seconds": 12,
  "leaderboard_seconds": 4, "max_players": 8, "mimic": false, "host_advance": true, "require_approval": false
}'::jsonb;

create or replace function game.requires_approval(p_room game.rooms) returns boolean
language sql stable set search_path = ''
as $$ select coalesce((p_room.settings ->> 'require_approval')::boolean, false) $$;

-- Pendientes también escuchan el canal (solo para enterarse de que les han aceptado o rechazado).
create or replace function game.can_listen(p_topic text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_topic like 'room:%' and exists (
    select 1 from game.room_players
     where room_id::text = substr(p_topic, 6) and user_id = auth.uid() and status in ('active', 'pending')
  )
$$;

-- Activa a un jugador (aceptado) con color libre. Devuelve false si la sala está llena.
create or replace function game.activate_player(p_room game.rooms, p_player_id uuid) returns boolean
language plpgsql set search_path = ''
as $$
declare v_color text;
begin
  if (select count(*) from game.room_players where room_id = p_room.id and status = 'active')
     >= coalesce((p_room.settings ->> 'max_players')::int, 8) then
    return false;
  end if;
  select c into v_color from unnest(game.player_colors()) with ordinality as t(c, n)
   where c not in (select color from game.room_players where room_id = p_room.id and status = 'active')
   order by n limit 1;
  update game.room_players
     set status = 'active', color = coalesce(v_color, color), left_at = null, last_seen_at = now()
   where id = p_player_id and room_id = p_room.id and status = 'pending';
  return found;
end $$;

create or replace function public.join_room(p_code text, p_name text, p_emoji text default null) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := game.require_uid();
  v_name text := game.clean_name(p_name);
  v_emoji text := game.clean_emoji(p_emoji);
  v_room game.rooms;
  v_me game.room_players;
  v_color text;
  v_status text;
begin
  select * into v_room from game.rooms
   where code = upper(btrim(p_code)) and status in ('lobby', 'playing')
   for update;
  if not found then raise exception 'room_not_found' using errcode = 'P0002'; end if;

  select * into v_me from game.room_players where room_id = v_room.id and user_id = uid;
  if found and v_me.status in ('kicked', 'rejected') then raise exception 'kicked' using errcode = '42501'; end if;
  if found and v_me.status in ('active', 'pending') then
    return jsonb_build_object('room_id', v_room.id, 'code', v_room.code, 'pending', v_me.status = 'pending');
  end if;
  if v_room.status <> 'lobby' then raise exception 'game_in_progress' using errcode = '55000'; end if;
  if (select count(*) from game.room_players where room_id = v_room.id and status = 'active')
     >= coalesce((v_room.settings ->> 'max_players')::int, 8) then
    raise exception 'room_full' using errcode = '53300';
  end if;

  insert into game.profiles (user_id, display_name, emoji) values (uid, v_name, v_emoji)
  on conflict (user_id) do update set display_name = excluded.display_name, emoji = excluded.emoji, updated_at = now();

  v_status := case when game.requires_approval(v_room) then 'pending' else 'active' end;
  select c into v_color from unnest(game.player_colors()) with ordinality as t(c, n)
   where c not in (select color from game.room_players where room_id = v_room.id and status = 'active')
   order by n limit 1;

  if v_me.id is not null then -- había salido: vuelve
    update game.room_players
       set status = v_status, display_name = v_name, emoji = v_emoji, color = coalesce(v_color, color),
           left_at = null, last_seen_at = now(), joined_at = now()
     where id = v_me.id;
  else
    insert into game.room_players (room_id, user_id, display_name, emoji, color, seat, status)
    values (v_room.id, uid, v_name, v_emoji, coalesce(v_color, (game.player_colors())[1]),
            (select coalesce(max(seat), -1) + 1 from game.room_players where room_id = v_room.id), v_status);
  end if;

  if v_status = 'active' then perform game.ensure_host(v_room.id); end if;
  perform game.log_event(v_room.id, case when v_status = 'pending' then 'join_requested' else 'player_joined' end);
  perform game.touch_room(v_room.id);
  return jsonb_build_object('room_id', v_room.id, 'code', v_room.code, 'pending', v_status = 'pending');
end $$;

create or replace function public.approve_player(p_room_id uuid, p_player_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare v_room game.rooms;
begin
  perform game.require_host(p_room_id);
  select * into v_room from game.rooms where id = p_room_id for update;
  if v_room.status <> 'lobby' then raise exception 'game_in_progress' using errcode = '55000'; end if;
  if not exists (select 1 from game.room_players where id = p_player_id and room_id = p_room_id and status = 'pending') then
    raise exception 'player_not_found' using errcode = 'P0002';
  end if;
  if not game.activate_player(v_room, p_player_id) then raise exception 'room_full' using errcode = '53300'; end if;
  perform game.log_event(p_room_id, 'player_approved', jsonb_build_object('player_id', p_player_id));
  perform game.touch_room(p_room_id);
end $$;

create or replace function public.reject_player(p_room_id uuid, p_player_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform game.require_host(p_room_id);
  update game.room_players set status = 'rejected', left_at = now()
   where id = p_player_id and room_id = p_room_id and status = 'pending';
  if not found then raise exception 'player_not_found' using errcode = 'P0002'; end if;
  perform game.log_event(p_room_id, 'player_rejected', jsonb_build_object('player_id', p_player_id));
  perform game.touch_room(p_room_id);
end $$;

-- Salir también sirve para cancelar una solicitud pendiente.
create or replace function public.leave_room(p_room_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare v_me game.room_players;
begin
  select * into v_me from game.room_players
   where room_id = p_room_id and user_id = game.require_uid() and status in ('active', 'pending');
  if not found then raise exception 'not_in_room' using errcode = '42501'; end if;
  update game.room_players set status = 'left', left_at = now(), role = 'player' where id = v_me.id;
  if v_me.status = 'active' then perform game.ensure_host(p_room_id); end if;
  perform game.log_event(p_room_id, case when v_me.status = 'pending' then 'join_cancelled' else 'player_left' end);
  perform game.touch_room(p_room_id);
end $$;

-- Ajustes: acepta `require_approval`; al desactivarlo, los pendientes entran solos (hasta llenar la sala).
create or replace function public.update_settings(p_room_id uuid, p_settings jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_room game.rooms;
  v_clean jsonb := '{}'::jsonb;
  v_key text;
  v_val jsonb;
  v_n int;
  v_pending uuid;
  v_limits constant jsonb := '{
    "rounds": [3, 8], "writing_seconds": [10, 120], "voting_seconds": [8, 90],
    "reveal_seconds": [4, 30], "leaderboard_seconds": [2, 15], "max_players": [3, 8]
  }';
begin
  perform game.require_host(p_room_id);
  select * into v_room from game.rooms where id = p_room_id for update;
  if v_room.status not in ('lobby', 'playing') then raise exception 'room_not_active' using errcode = '55000'; end if;

  for v_key, v_val in select * from jsonb_each(coalesce(p_settings, '{}'::jsonb)) loop
    if v_key in ('mimic', 'host_advance', 'require_approval') then
      if jsonb_typeof(v_val) <> 'boolean' then raise exception 'invalid_setting:%', v_key using errcode = '22023'; end if;
      v_clean := v_clean || jsonb_build_object(v_key, v_val);
      continue;
    end if;
    if not v_limits ? v_key then continue; end if;
    if v_key = 'rounds' and (v_val is null or v_val = 'null'::jsonb) then
      v_clean := v_clean || '{"rounds": null}';
      continue;
    end if;
    if jsonb_typeof(v_val) <> 'number' then raise exception 'invalid_setting:%', v_key using errcode = '22023'; end if;
    v_n := (v_val #>> '{}')::int;
    if v_n < (v_limits -> v_key ->> 0)::int or v_n > (v_limits -> v_key ->> 1)::int then
      raise exception 'invalid_setting:%', v_key using errcode = '22023';
    end if;
    if v_key in ('rounds', 'max_players') and v_room.status <> 'lobby' then continue; end if;
    v_clean := v_clean || jsonb_build_object(v_key, v_n);
  end loop;

  update game.rooms set settings = settings || v_clean where id = p_room_id returning * into v_room;
  if v_room.status = 'playing' and v_room.phase = 'leaderboard' and v_room.phase_ends_at is null
     and (v_clean ->> 'host_advance') = 'false' then
    update game.rooms set phase_ends_at = now() + make_interval(secs => game.setting_seconds(v_room, 'leaderboard_seconds', 4))
     where id = p_room_id;
  end if;
  if (v_clean ->> 'require_approval') = 'false' and v_room.status = 'lobby' then
    for v_pending in select id from game.room_players where room_id = p_room_id and status = 'pending' order by joined_at loop
      exit when not game.activate_player(v_room, v_pending);
    end loop;
  end if;
  perform game.log_event(p_room_id, 'settings_updated', v_clean);
  perform game.touch_room(p_room_id);
  return (select settings from game.rooms where id = p_room_id);
end $$;

-- Estado visible: pendientes ven solo "esperando"; el host ve las solicitudes.
-- (Mismo cuerpo que la versión de mimic_bot + `pending`/`rejected` y `pendingPlayers`.)
create or replace function public.get_room_state(p_room_id uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := game.require_uid();
  v_me game.room_players;
  v_room game.rooms;
  v_round game.rounds;
  v_phase text;
  v_chat jsonb;
  v_answers jsonb := '[]'::jsonb;
  v_result jsonb;
begin
  select * into v_me from game.room_players where room_id = p_room_id and user_id = uid;
  if not found then raise exception 'not_in_room' using errcode = '42501'; end if;
  if v_me.status = 'kicked' then return jsonb_build_object('kicked', true); end if;
  if v_me.status = 'rejected' then return jsonb_build_object('rejected', true); end if;
  select * into v_room from game.rooms where id = p_room_id;
  if v_me.status = 'pending' then
    update game.room_players set last_seen_at = now() where id = v_me.id;
    if v_room.status <> 'lobby' then return jsonb_build_object('left', true); end if; -- empezó sin él
    return jsonb_build_object('pending', true, 'roomId', v_room.id, 'code', v_room.code, 'meId', v_me.id,
      'hostName', (select display_name from game.room_players where room_id = p_room_id and role = 'host' and status = 'active'));
  end if;
  if v_me.status <> 'active' then return jsonb_build_object('left', true); end if;

  update game.room_players set last_seen_at = now() where id = v_me.id;
  select * into v_round from game.rounds where room_id = p_room_id and round_number = v_room.current_round;

  v_phase := case v_room.status when 'lobby' then 'lobby' when 'playing' then v_room.phase else 'final' end;

  if v_phase in ('writing', 'voting', 'reveal', 'leaderboard') and v_round.conversation is not null then
    v_chat := jsonb_build_object(
      'title', v_round.conversation ->> 'title',
      'writerId', v_round.writer_id,
      'messages', (select coalesce(jsonb_agg(jsonb_build_object('playerId', m ->> 'player_id', 'text', m ->> 'text') order by ord), '[]'::jsonb)
                     from jsonb_array_elements(v_round.conversation -> 'messages') with ordinality as t(m, ord)));
  end if;

  if v_phase = 'voting' then
    select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'text', a.text, 'mine', a.player_id is not distinct from v_me.id and not a.is_bot)
                    order by a.ballot_order), '[]'::jsonb)
      into v_answers from game.answers a where a.round_id = v_round.id and a.in_ballot;
  end if;

  if v_phase in ('reveal', 'leaderboard') then
    v_result := jsonb_build_object(
      'answers', (select coalesce(jsonb_agg(jsonb_build_object(
                    'id', a.id, 'text', a.text,
                    'authorId', case when a.is_bot then 'mimic' else a.player_id::text end,
                    'isReal', a.is_real, 'isBot', a.is_bot,
                    'voterIds', (select coalesce(jsonb_agg(v.voter_id), '[]'::jsonb) from game.votes v where v.answer_id = a.id),
                    'laughs', (select count(*) from game.reactions r where r.answer_id = a.id)
                  ) order by a.ballot_order), '[]'::jsonb)
                  from game.answers a where a.round_id = v_round.id and a.in_ballot),
      'points', (select coalesce(jsonb_object_agg(rs.player_id, rs.points), '{}'::jsonb)
                   from game.round_scores rs where rs.round_id = v_round.id),
      'award', v_round.award);
  end if;

  return jsonb_build_object(
    'roomId', v_room.id,
    'code', v_room.code,
    'status', v_room.status,
    'phase', v_phase,
    'roundIndex', greatest(v_room.current_round - 1, 0),
    'totalRounds', coalesce(v_room.total_rounds, 0),
    'phaseEndsAt', game.epoch_ms(v_room.phase_ends_at),
    'serverNow', game.epoch_ms(now()),
    'settings', v_room.settings,
    'setup', v_room.setup,
    'version', v_room.version,
    'meId', v_me.id,
    'mimic', coalesce((v_room.settings ->> 'mimic')::boolean, false),
    'players', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.display_name, 'emoji', p.emoji, 'color', p.color,
        'score', p.score, 'isHost', p.role = 'host'
      ) order by p.seat), '[]'::jsonb)
      from game.room_players p where p.room_id = p_room_id and p.status = 'active'
    ),
    'pendingPlayers', case when v_me.role = 'host' then (
      select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'name', p.display_name, 'emoji', p.emoji) order by p.joined_at), '[]'::jsonb)
        from game.room_players p where p.room_id = p_room_id and p.status = 'pending'
    ) else '[]'::jsonb end,
    'chat', v_chat,
    'answers', v_answers,
    'submittedIds', case when v_phase = 'writing' then
        (select coalesce(jsonb_agg(a.player_id), '[]'::jsonb) from game.answers a where a.round_id = v_round.id and not a.is_bot)
      else '[]'::jsonb end,
    'votedIds', case when v_phase = 'voting' then
        (select coalesce(jsonb_agg(v.voter_id), '[]'::jsonb) from game.votes v where v.round_id = v_round.id)
      else '[]'::jsonb end,
    'myVote', (select v.answer_id from game.votes v where v.round_id = v_round.id and v.voter_id = v_me.id),
    'myLaughs', (select coalesce(jsonb_agg(r.answer_id), '[]'::jsonb)
                   from game.reactions r join game.answers a on a.id = r.answer_id
                  where a.round_id = v_round.id and r.player_id = v_me.id),
    'result', v_result
  );
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.join_room(text, text, text)', 'public.approve_player(uuid, uuid)', 'public.reject_player(uuid, uuid)',
    'public.leave_room(uuid)', 'public.update_settings(uuid, jsonb)', 'public.get_room_state(uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

revoke all on all functions in schema game from public, anon, authenticated;
grant execute on function game.can_listen(text) to authenticated;
