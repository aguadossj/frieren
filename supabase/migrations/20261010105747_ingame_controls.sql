-- Typing… · Migración: controles en partida (abandonar, echar) sin romper la partida.
--
-- Cuando un jugador sale o le echan a mitad de partida (`game.handle_departure`):
-- - Si quedan menos de 2 jugadores activos, la partida termina (pantalla final con la clasificación).
-- - Sus rondas futuras como writer se reasignan al jugador activo que menos rondas tenga como writer. Si esa ronda ya
--   estaba generada (o generándose), se vuelve a pedir con el nuevo writer (la respuesta tardía de la IA se ignora:
--   `ai_complete_round` solo acepta rondas en `generating`). Si es la ronda que la sala está esperando, se relanza ya.
-- - La ronda en curso sigue (si era el writer, su respuesta real queda en "…").
-- - Si ya solo faltaba él por contestar/votar, la fase avanza.
-- Terminar partida (host) ya existe: `public.end_game`.

create or replace function game.handle_departure(p_room_id uuid, p_player_id uuid) returns void
language plpgsql set search_path = ''
as $$
declare
  v_room game.rooms;
  v_round game.rounds;
  v_new uuid;
begin
  select * into v_room from game.rooms where id = p_room_id for update;
  if not found or v_room.status <> 'playing' then return; end if;

  if (select count(*) from game.room_players where room_id = p_room_id and status = 'active') < 2 then
    perform game.finish_game(p_room_id);
    perform game.log_event(p_room_id, 'game_ended_not_enough_players');
    return;
  end if;

  for v_round in
    select * from game.rounds
     where room_id = p_room_id and writer_id = p_player_id
       and status in ('pending', 'generating', 'ready', 'failed')
       and (round_number > v_room.current_round or (round_number = v_room.current_round and v_room.phase = 'generating'))
     order by round_number
     for update
  loop
    select p.id into v_new
      from game.room_players p
     where p.room_id = p_room_id and p.status = 'active'
     order by (select count(*) from game.rounds r where r.room_id = p_room_id and r.writer_id = p.id), random()
     limit 1;
    update game.rounds
       set writer_id = v_new, status = 'pending', conversation = null, source = null
     where id = v_round.id;
    perform game.log_event(p_room_id, 'round_writer_reassigned',
      jsonb_build_object('round', v_round.round_number, 'from', p_player_id, 'to', v_new));
    if v_round.round_number = v_room.current_round and v_room.phase = 'generating' then
      perform game.request_generation(v_round.id);
      update game.rooms
         set phase_ends_at = now() + make_interval(secs => coalesce((game.conf('generation_timeout_seconds'))::int, 12))
       where id = p_room_id;
    end if;
  end loop;

  perform game.advance(p_room_id); -- por si ya solo faltaba él
end $$;

create or replace function public.leave_room(p_room_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare v_me game.room_players;
begin
  select * into v_me from game.room_players
   where room_id = p_room_id and user_id = game.require_uid() and status in ('active', 'pending');
  if not found then raise exception 'not_in_room' using errcode = '42501'; end if;
  update game.room_players set status = 'left', left_at = now(), role = 'player' where id = v_me.id;
  if v_me.status = 'active' then
    perform game.ensure_host(p_room_id);
    perform game.handle_departure(p_room_id, v_me.id);
  end if;
  perform game.log_event(p_room_id, case when v_me.status = 'pending' then 'join_cancelled' else 'player_left' end);
  perform game.touch_room(p_room_id);
end $$;

create or replace function public.kick_player(p_room_id uuid, p_player_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare v_host game.room_players := game.require_host(p_room_id);
begin
  if p_player_id = v_host.id then raise exception 'cannot_kick_self' using errcode = '22023'; end if;
  update game.room_players set status = 'kicked', left_at = now(), role = 'player'
   where id = p_player_id and room_id = p_room_id and status = 'active';
  if not found then raise exception 'player_not_found' using errcode = 'P0002'; end if;
  perform game.handle_departure(p_room_id, p_player_id);
  perform game.log_event(p_room_id, 'player_kicked', jsonb_build_object('player_id', p_player_id));
  perform game.touch_room(p_room_id);
end $$;

revoke all on function public.leave_room(uuid) from public, anon;
grant execute on function public.leave_room(uuid) to authenticated;
revoke all on function public.kick_player(uuid, uuid) from public, anon;
grant execute on function public.kick_player(uuid, uuid) to authenticated;
revoke all on all functions in schema game from public, anon, authenticated;
grant execute on function game.can_listen(text) to authenticated;
