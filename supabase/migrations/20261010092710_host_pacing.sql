-- Typing… · Migración: ritmo controlado por el host y más tiempo por fase.
--
-- - Tiempos por defecto más largos: escribir 45 s, votar 25 s, revelación 12 s (antes 25/15/8).
-- - `settings.host_advance` (por defecto true): tras la revelación la sala se queda en la clasificación (pantalla del
--   panda) SIN temporizador hasta que el host pulsa "siguiente" (`skip_phase`). Con false, vuelve a ser automático.
-- - Red de seguridad: si la sala espera al host y el host lleva > 45 s sin dar señales (móvil bloqueado, se fue),
--   el jugador activo visto más recientemente pasa a ser host (pg_cron cada 5 s), para que nadie se quede atascado.
-- - `update_settings` acepta `host_advance` y rangos de tiempo más amplios (escribir hasta 120 s, votar hasta 90 s).

alter table game.rooms alter column settings set default '{
  "rounds": null, "writing_seconds": 45, "voting_seconds": 25, "reveal_seconds": 12,
  "leaderboard_seconds": 4, "max_players": 8, "mimic": false, "host_advance": true
}'::jsonb;

-- Salas abiertas ahora mismo: nuevos tiempos y espera al host.
update game.rooms
   set settings = settings || '{"writing_seconds": 45, "voting_seconds": 25, "reveal_seconds": 12, "host_advance": true}'::jsonb
 where status in ('lobby', 'playing');

create or replace function game.host_advance(p_room game.rooms) returns boolean
language sql stable set search_path = ''
as $$ select coalesce((p_room.settings ->> 'host_advance')::boolean, true) $$;

create or replace function game.advance(p_room_id uuid, p_force boolean default false) returns boolean
language plpgsql set search_path = ''
as $$
declare
  v_room game.rooms;
  v_round game.rounds;
begin
  select * into v_room from game.rooms where id = p_room_id for update;
  if not found or v_room.status <> 'playing' then return false; end if;
  if not p_force and not (coalesce(now() >= v_room.phase_ends_at, false) or game.phase_complete(v_room)) then return false; end if;

  if v_room.phase = 'generating' then
    select * into v_round from game.rounds where room_id = p_room_id and round_number = v_room.current_round;
    if v_round.status <> 'ready' then
      perform game.fill_fallback(v_round.id);
      perform game.log_event(p_room_id, 'generation_timeout', jsonb_build_object('round', v_room.current_round));
    end if;
    perform game.begin_writing(p_room_id, v_room.current_round);
  elsif v_room.phase = 'writing' then
    perform game.begin_voting(p_room_id);
  elsif v_room.phase = 'voting' then
    perform game.begin_reveal(p_room_id);
  elsif v_room.phase = 'reveal' then
    -- Con host_advance la clasificación no tiene reloj: solo el host la cierra (skip_phase).
    update game.rooms
       set phase = 'leaderboard',
           phase_ends_at = case when game.host_advance(v_room) then null
                                else now() + make_interval(secs => game.setting_seconds(v_room, 'leaderboard_seconds', 4)) end
     where id = p_room_id;
  elsif v_room.phase = 'leaderboard' then
    update game.rounds set status = 'done', ended_at = now()
     where room_id = p_room_id and round_number = v_room.current_round;
    if v_room.current_round >= v_room.total_rounds then
      perform game.finish_game(p_room_id);
    else
      perform game.start_round(p_room_id, v_room.current_round + 1);
    end if;
  end if;

  perform game.touch_room(p_room_id);
  return true;
end $$;

-- Si la sala espera al host y el host no da señales, el jugador activo más reciente hereda el botón.
create or replace function game.rescue_waiting_rooms() returns int
language plpgsql set search_path = ''
as $$
declare r record; n int := 0;
begin
  for r in
    select ro.id as room_id, h.id as host_id
      from game.rooms ro
      join game.room_players h on h.room_id = ro.id and h.role = 'host' and h.status = 'active'
     where ro.status = 'playing' and ro.phase = 'leaderboard' and ro.phase_ends_at is null
       and h.last_seen_at < now() - interval '45 seconds'
       for update of ro skip locked
  loop
    if exists (select 1 from game.room_players p
                where p.room_id = r.room_id and p.status = 'active' and p.id <> r.host_id
                  and p.last_seen_at >= now() - interval '20 seconds') then
      update game.room_players set role = 'player' where id = r.host_id;
      update game.room_players set role = 'host'
       where id = (select p.id from game.room_players p
                    where p.room_id = r.room_id and p.status = 'active' and p.id <> r.host_id
                    order by p.last_seen_at desc limit 1);
      update game.rooms set host_id = (select user_id from game.room_players where room_id = r.room_id and role = 'host' and status = 'active')
       where id = r.room_id;
      perform game.log_event(r.room_id, 'host_rescued');
      perform game.touch_room(r.room_id);
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

create or replace function game.advance_overdue_rooms() returns int
language plpgsql set search_path = ''
as $$
declare v_id uuid; n int := 0;
begin
  for v_id in select id from game.rooms
               where status = 'playing' and phase_ends_at < now() - interval '2 seconds'
               for update skip locked loop
    if game.advance(v_id) then n := n + 1; end if;
  end loop;
  n := n + game.rescue_waiting_rooms();
  update game.rooms set status = 'closed', ended_at = coalesce(ended_at, now())
   where status in ('lobby', 'playing', 'finished') and last_activity_at < now() - interval '3 hours';
  return n;
end $$;

create or replace function public.update_settings(p_room_id uuid, p_settings jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_room game.rooms;
  v_clean jsonb := '{}'::jsonb;
  v_key text;
  v_val jsonb;
  v_n int;
  v_limits constant jsonb := '{
    "rounds": [3, 8], "writing_seconds": [10, 120], "voting_seconds": [8, 90],
    "reveal_seconds": [4, 30], "leaderboard_seconds": [2, 15], "max_players": [3, 8]
  }';
begin
  perform game.require_host(p_room_id);
  select * into v_room from game.rooms where id = p_room_id for update;
  if v_room.status not in ('lobby', 'playing') then raise exception 'room_not_active' using errcode = '55000'; end if;

  for v_key, v_val in select * from jsonb_each(coalesce(p_settings, '{}'::jsonb)) loop
    if v_key in ('mimic', 'host_advance') then
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

  update game.rooms set settings = settings || v_clean where id = p_room_id;
  -- Si se desactiva la espera estando en la clasificación, que vuelva a tener reloj.
  if v_room.status = 'playing' and v_room.phase = 'leaderboard' and v_room.phase_ends_at is null
     and (v_clean ->> 'host_advance') = 'false' then
    update game.rooms set phase_ends_at = now() + make_interval(secs => game.setting_seconds(v_room, 'leaderboard_seconds', 4))
     where id = p_room_id;
  end if;
  perform game.log_event(p_room_id, 'settings_updated', v_clean);
  perform game.touch_room(p_room_id);
  return (select settings from game.rooms where id = p_room_id);
end $$;

revoke all on function public.update_settings(uuid, jsonb) from public, anon;
grant execute on function public.update_settings(uuid, jsonb) to authenticated;
revoke all on all functions in schema game from public, anon, authenticated;
grant execute on function game.can_listen(text) to authenticated;
