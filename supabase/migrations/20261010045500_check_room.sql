-- Typing… · Migración: comprobar un código de sala ANTES de pedir el nombre.
--
-- public.check_room(p_code) dice si se puede entrar con ese código, con las mismas reglas que join_room
-- (existe y está activa, no ha empezado, no está llena; quien ya está dentro siempre puede volver).
-- No devuelve ids ni nombres: solo { ok, reason, players }. La pueden llamar `anon` y `authenticated`,
-- así la pantalla del código no tiene que crear un usuario anónimo solo para comprobarlo.
-- Idempotente.

create or replace function public.check_room(p_code text) returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_room game.rooms;
  v_players int;
  v_member boolean := false;
begin
  select * into v_room from game.rooms
   where code = upper(btrim(coalesce(p_code, ''))) and status in ('lobby', 'playing')
   limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'room_not_found', 'players', 0);
  end if;

  select count(*) into v_players from game.room_players where room_id = v_room.id and status = 'active';

  if auth.uid() is not null then
    select exists (
      select 1 from game.room_players where room_id = v_room.id and user_id = auth.uid() and status = 'active'
    ) into v_member;
  end if;
  if v_member then
    return jsonb_build_object('ok', true, 'reason', null, 'players', v_players);
  end if;

  if v_room.status <> 'lobby' then
    return jsonb_build_object('ok', false, 'reason', 'game_in_progress', 'players', v_players);
  end if;
  if v_players >= coalesce((v_room.settings ->> 'max_players')::int, 8) then
    return jsonb_build_object('ok', false, 'reason', 'room_full', 'players', v_players);
  end if;
  return jsonb_build_object('ok', true, 'reason', null, 'players', v_players);
end $$;

revoke all on function public.check_room(text) from public;
grant execute on function public.check_room(text) to anon, authenticated;
