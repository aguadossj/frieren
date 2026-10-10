-- Typing… · Nombres y pandas únicos dentro de la sala.
--
-- 1. check_room devuelve también lo que ya está cogido en la sala (pandas `p01`…`p20` y nombres, de jugadores
--    activos Y pendientes de aprobación). El móvil elige un panda libre al confirmar el código, lo enseña y entra con
--    él (p_emoji), y avisa en cuanto escribes un nombre repetido.
-- 2. join_room:
--    - nombre repetido (sin distinguir mayúsculas) entre activos y pendientes → error `name_taken`;
--    - si el panda pedido ya lo tiene otro (dos entrando a la vez), se le da otro libre al azar;
--    - el color se elige entre los que no usan ni activos ni PENDIENTES (antes los pendientes podían repetir color).
-- Idempotente (create or replace). Mismos permisos que las versiones anteriores.

create or replace function public.check_room(p_code text)
returns jsonb
language plpgsql
stable security definer
set search_path to ''
as $function$
declare
  v_room game.rooms;
  v_players int;
  v_member boolean := false;
  v_avatars jsonb;
  v_names jsonb;
begin
  select * into v_room from game.rooms
   where code = upper(btrim(coalesce(p_code, ''))) and status in ('lobby', 'playing')
   limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'room_not_found', 'players', 0);
  end if;

  select count(*) into v_players from game.room_players where room_id = v_room.id and status = 'active';

  select coalesce(jsonb_agg(distinct emoji) filter (where emoji ~ '^p(0[1-9]|1[0-9]|20)$'), '[]'::jsonb),
         coalesce(jsonb_agg(distinct lower(display_name)), '[]'::jsonb)
    into v_avatars, v_names
    from game.room_players
   where room_id = v_room.id and status in ('active', 'pending')
     and (auth.uid() is null or user_id <> auth.uid());

  if auth.uid() is not null then
    select exists (
      select 1 from game.room_players where room_id = v_room.id and user_id = auth.uid() and status = 'active'
    ) into v_member;
  end if;
  if v_member then
    return jsonb_build_object('ok', true, 'reason', null, 'players', v_players, 'taken_avatars', v_avatars, 'taken_names', v_names);
  end if;

  if v_room.status <> 'lobby' then
    return jsonb_build_object('ok', false, 'reason', 'game_in_progress', 'players', v_players);
  end if;
  if v_players >= coalesce((v_room.settings ->> 'max_players')::int, 8) then
    return jsonb_build_object('ok', false, 'reason', 'room_full', 'players', v_players);
  end if;
  return jsonb_build_object('ok', true, 'reason', null, 'players', v_players, 'taken_avatars', v_avatars, 'taken_names', v_names);
end $function$;

create or replace function public.join_room(p_code text, p_name text, p_emoji text default null::text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
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

  -- Nombre repetido en la sala (activos o esperando aprobación)
  if exists (
    select 1 from game.room_players
     where room_id = v_room.id and status in ('active', 'pending') and user_id <> uid
       and lower(display_name) = lower(v_name)
  ) then
    raise exception 'name_taken' using errcode = '23505';
  end if;

  -- Panda pedido ya cogido por otro (entraron a la vez): otro libre al azar
  if v_emoji ~ '^p(0[1-9]|1[0-9]|20)$' and exists (
    select 1 from game.room_players
     where room_id = v_room.id and status in ('active', 'pending') and user_id <> uid and emoji = v_emoji
  ) then
    select a into v_emoji
      from (select 'p' || lpad(n::text, 2, '0') as a from generate_series(1, 20) n) free
     where a not in (
       select emoji from game.room_players
        where room_id = v_room.id and status in ('active', 'pending') and user_id <> uid
     )
     order by random() limit 1;
    v_emoji := coalesce(v_emoji, game.clean_emoji(p_emoji));
  end if;

  insert into game.profiles (user_id, display_name, emoji) values (uid, v_name, v_emoji)
  on conflict (user_id) do update set display_name = excluded.display_name, emoji = excluded.emoji, updated_at = now();

  v_status := case when game.requires_approval(v_room) then 'pending' else 'active' end;
  -- Color libre entre activos Y pendientes (los pendientes ya "reservan" el suyo)
  select c into v_color from unnest(game.player_colors()) with ordinality as t(c, n)
   where c not in (select color from game.room_players where room_id = v_room.id and status in ('active', 'pending'))
   order by n limit 1;

  if v_me.id is not null then
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
end $function$;

-- 3. Al aprobar a alguien conserva el color que reservó al pedir entrar (antes se le daba otro y le cambiaba el panda);
--    solo si ese color ya lo tiene un activo se le busca uno libre.
create or replace function game.activate_player(p_room game.rooms, p_player_id uuid)
returns boolean
language plpgsql
set search_path to ''
as $function$
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
     set status = 'active',
         color = case
           when color not in (select color from game.room_players where room_id = p_room.id and status = 'active') then color
           else coalesce(v_color, color)
         end,
         left_at = null, last_seen_at = now()
   where id = p_player_id and room_id = p_room.id and status = 'pending';
  return found;
end $function$;
