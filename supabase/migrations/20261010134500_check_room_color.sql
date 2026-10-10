-- Typing… · Migración: check_room devuelve también el color que te tocará al entrar (10 oct, 13:45).
--
-- El panda de cada jugador sale de su color (lib/avatars.ts), y el color lo asigna join_room: el primero libre.
-- Con esto, la pantalla de "pon tu nombre" puede enseñar tu panda ANTES de entrar.
-- Solo añade el campo `color` a la respuesta ({ ok, reason, players, color }); el resto, igual. Idempotente.

create or replace function public.check_room(p_code text) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_room game.rooms;
  v_players int;
  v_member boolean := false;
  v_color text;
begin
  select * into v_room from game.rooms
   where code = upper(btrim(coalesce(p_code, ''))) and status in ('lobby', 'playing')
   limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'room_not_found', 'players', 0);
  end if;

  select count(*) into v_players from game.room_players where room_id = v_room.id and status = 'active';

  if auth.uid() is not null then
    select color into v_color from game.room_players
     where room_id = v_room.id and user_id = auth.uid() and status = 'active';
    v_member := found;
  end if;
  if v_member then
    return jsonb_build_object('ok', true, 'reason', null, 'players', v_players, 'color', v_color);
  end if;

  -- El mismo color que le daría join_room ahora mismo: el primero libre entre los jugadores activos
  select c into v_color from unnest(game.player_colors()) with ordinality as t(c, n)
   where c not in (select color from game.room_players where room_id = v_room.id and status = 'active')
   order by n limit 1;

  if v_room.status <> 'lobby' then
    return jsonb_build_object('ok', false, 'reason', 'game_in_progress', 'players', v_players);
  end if;
  if v_players >= coalesce((v_room.settings ->> 'max_players')::int, 8) then
    return jsonb_build_object('ok', false, 'reason', 'room_full', 'players', v_players);
  end if;
  return jsonb_build_object('ok', true, 'reason', null, 'players', v_players, 'color', v_color);
end $$;

revoke all on function public.check_room(text) from public;
grant execute on function public.check_room(text) to anon, authenticated;
