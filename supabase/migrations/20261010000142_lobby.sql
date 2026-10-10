-- Typing… · Migración 1: identidad, salas, jugadores, configuración (preguntas) y métricas.
--
-- Modelo de seguridad:
-- - Las tablas viven en el esquema privado `game` (no expuesto por la Data API). RLS activado y sin políticas:
--   nadie las lee ni escribe directamente desde el cliente.
-- - El cliente solo llama a funciones RPC de `public` (security definer, search_path vacío) que comprueban
--   `auth.uid()` (usuario anónimo de Supabase) y las reglas del juego. Ejecutables solo por `authenticated`.
-- - Cada cambio de sala sube `rooms.version` y un trigger emite un broadcast privado en el canal `room:<id>`;
--   el cliente, al recibirlo, vuelve a pedir `get_room_state`.

create schema if not exists game;
revoke all on schema game from public, anon, authenticated;

-- ───────────────────────── Tablas ─────────────────────────

create table game.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 16),
  emoji text not null default '🙂' check (char_length(emoji) between 1 and 16),
  metadata jsonb not null default '{}'::jsonb, -- edad, verificación, foto… (sin migrar)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table game.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null check (code ~ '^[A-Z]{4}$'),
  host_id uuid not null references auth.users (id),
  status text not null default 'lobby' check (status in ('lobby', 'playing', 'finished', 'closed')),
  phase text check (phase in ('generating', 'writing', 'voting', 'reveal', 'leaderboard')),
  current_round int not null default 0,
  total_rounds int,
  phase_ends_at timestamptz,
  settings jsonb not null default '{
    "rounds": null,
    "writing_seconds": 25,
    "voting_seconds": 15,
    "reveal_seconds": 8,
    "leaderboard_seconds": 4,
    "max_players": 8
  }'::jsonb,
  setup jsonb not null default '{}'::jsonb,   -- respuestas a setup_questions: { question_id: value }
  memory jsonb not null default '{}'::jsonb,  -- memoria de la IA entre rondas
  version bigint not null default 0,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz,
  last_activity_at timestamptz not null default now()
);
-- El código solo es único entre salas activas: los códigos se reciclan.
create unique index rooms_active_code_key on game.rooms (code) where status in ('lobby', 'playing');
create index rooms_host_id_idx on game.rooms (host_id);

create table game.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references game.rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 16),
  emoji text not null check (char_length(emoji) between 1 and 16),
  color text not null,
  role text not null default 'player' check (role in ('host', 'player')),
  status text not null default 'active' check (status in ('active', 'left', 'kicked')),
  score int not null default 0,
  seat int not null, -- orden de llegada
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  last_seen_at timestamptz not null default now(),
  unique (room_id, user_id)
);
create index room_players_user_id_idx on game.room_players (user_id);

-- Catálogo de preguntas iniciales: se añaden/cambian sin desplegar código.
create table game.setup_questions (
  id text primary key,
  label text not null,
  kind text not null check (kind in ('single', 'multi', 'text', 'scale')),
  options jsonb not null default '[]'::jsonb, -- [{ "value": "...", "label": "...", "emoji": "..." }]
  sort int not null default 0,
  required boolean not null default false,
  active boolean not null default true,
  rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Métricas: append-only, solo se escribe desde las RPC.
create table game.events (
  id bigint generated always as identity primary key,
  room_id uuid references game.rooms (id) on delete set null,
  user_id uuid,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index events_room_id_idx on game.events (room_id);
create index events_type_created_at_idx on game.events (type, created_at);

alter table game.profiles enable row level security;
alter table game.rooms enable row level security;
alter table game.room_players enable row level security;
alter table game.setup_questions enable row level security;
alter table game.events enable row level security;

insert into game.setup_questions (id, label, kind, options, sort, required, rules) values
  ('who', 'Who''s playing?', 'single', '[
    {"value": "students", "label": "Students", "emoji": "🎓"},
    {"value": "friends", "label": "Friends", "emoji": "👯"},
    {"value": "coworkers", "label": "Coworkers", "emoji": "💼"},
    {"value": "family", "label": "Family", "emoji": "🏠"},
    {"value": "couples", "label": "Couples", "emoji": "💘"}
  ]', 10, false, '{}'),
  ('age', 'Age range', 'single', '[
    {"value": "under_18", "label": "Under 18"},
    {"value": "18_24", "label": "18–24"},
    {"value": "25_34", "label": "25–34"},
    {"value": "35_plus", "label": "35+"},
    {"value": "mixed", "label": "Mixed"}
  ]', 20, false, '{"disables_spicy_when": ["under_18", "mixed"]}'),
  ('vibes', 'What should the chats be about?', 'multi', '[
    {"value": "spicy", "label": "Spicy", "emoji": "🌶️"},
    {"value": "exes", "label": "Exes & dating", "emoji": "💔"},
    {"value": "ethics", "label": "Moral dilemmas", "emoji": "⚖️"},
    {"value": "uni", "label": "Uni life", "emoji": "📚"},
    {"value": "work", "label": "Work drama", "emoji": "🏢"},
    {"value": "chaos", "label": "Pure chaos", "emoji": "🌀"}
  ]', 30, false, '{}'),
  ('topic', 'Or write your own topic', 'text', '[]', 40, false, '{"max_length": 120}');

-- ───────────────────────── Helpers internos ─────────────────────────

-- Colores de avatar (sin rojo: el fondo de la app es rojo). Igual que PLAYER_COLORS en app/src/game/types.ts.
create function game.player_colors() returns text[]
language sql immutable set search_path = ''
as $$ select array['#1E6BFF','#00B060','#6B3BFF','#111111','#FF8A00','#00B8A9','#F5B700','#FF4FA3'] $$;

create function game.require_uid() returns uuid
language plpgsql stable set search_path = ''
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  return uid;
end $$;

create function game.clean_name(p_name text) returns text
language plpgsql immutable set search_path = ''
as $$
declare v text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
begin
  if char_length(v) < 1 or char_length(v) > 16 then raise exception 'invalid_name' using errcode = '22023'; end if;
  return v;
end $$;

create function game.clean_emoji(p_emoji text) returns text
language sql immutable set search_path = ''
as $$ select case when char_length(btrim(coalesce(p_emoji, ''))) between 1 and 16 then btrim(p_emoji) else '🙂' end $$;

-- Sube la versión de la sala (dispara el broadcast) y marca actividad.
create function game.touch_room(p_room_id uuid) returns void
language sql set search_path = ''
as $$ update game.rooms set version = version + 1, last_activity_at = now() where id = p_room_id $$;

create function game.log_event(p_room_id uuid, p_type text, p_payload jsonb default '{}'::jsonb) returns void
language sql set search_path = ''
as $$ insert into game.events (room_id, user_id, type, payload) values (p_room_id, auth.uid(), p_type, coalesce(p_payload, '{}'::jsonb)) $$;

-- Jugador activo del usuario actual en la sala (o error).
create function game.require_member(p_room_id uuid) returns game.room_players
language plpgsql stable set search_path = ''
as $$
declare p game.room_players;
begin
  select * into p from game.room_players
   where room_id = p_room_id and user_id = game.require_uid() and status = 'active';
  if not found then raise exception 'not_in_room' using errcode = '42501'; end if;
  return p;
end $$;

create function game.require_host(p_room_id uuid) returns game.room_players
language plpgsql stable set search_path = ''
as $$
declare p game.room_players := game.require_member(p_room_id);
begin
  if p.role <> 'host' then raise exception 'host_only' using errcode = '42501'; end if;
  return p;
end $$;

-- Si el host ya no está activo, el jugador activo más antiguo pasa a ser host. Si no queda nadie, se cierra.
create function game.ensure_host(p_room_id uuid) returns void
language plpgsql set search_path = ''
as $$
declare next_host game.room_players;
begin
  if exists (select 1 from game.room_players where room_id = p_room_id and role = 'host' and status = 'active') then
    return;
  end if;
  update game.room_players set role = 'player' where room_id = p_room_id and role = 'host';
  select * into next_host from game.room_players
   where room_id = p_room_id and status = 'active' order by seat limit 1;
  if found then
    update game.room_players set role = 'host' where id = next_host.id;
    update game.rooms set host_id = next_host.user_id where id = p_room_id;
    perform game.log_event(p_room_id, 'host_transferred', jsonb_build_object('player_id', next_host.id));
  else
    update game.rooms set status = 'closed', ended_at = coalesce(ended_at, now()) where id = p_room_id;
    perform game.log_event(p_room_id, 'room_closed', '{"reason": "empty"}');
  end if;
end $$;

-- ───────────────────────── Realtime ─────────────────────────

create function game.broadcast_room_change() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform realtime.send(
    jsonb_build_object('room_id', new.id, 'version', new.version, 'status', new.status, 'phase', new.phase),
    'room_changed',
    'room:' || new.id::text,
    true
  );
  return null;
end $$;

create trigger rooms_broadcast_change
  after update of version on game.rooms
  for each row when (new.version is distinct from old.version)
  execute function game.broadcast_room_change();

-- Solo los jugadores activos de una sala pueden escuchar su canal privado `room:<id>`.
create function game.can_listen(p_topic text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_topic like 'room:%' and exists (
    select 1 from game.room_players
     where room_id::text = substr(p_topic, 6) and user_id = auth.uid() and status = 'active'
  )
$$;
revoke all on function game.can_listen(text) from public, anon;
grant usage on schema game to authenticated;
grant execute on function game.can_listen(text) to authenticated;

create policy "room members can receive room broadcasts" on realtime.messages
  for select to authenticated
  using ( game.can_listen((select realtime.topic())) );

-- ───────────────────────── RPC públicas ─────────────────────────

create function public.create_room(p_name text, p_emoji text default null) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := game.require_uid();
  v_name text := game.clean_name(p_name);
  v_emoji text := game.clean_emoji(p_emoji);
  v_code text;
  v_room game.rooms;
begin
  insert into game.profiles (user_id, display_name, emoji) values (uid, v_name, v_emoji)
  on conflict (user_id) do update set display_name = excluded.display_name, emoji = excluded.emoji, updated_at = now();

  for i in 1..30 loop
    v_code := (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + floor(random() * 24)::int, 1), '')
                 from generate_series(1, 4));
    exit when not exists (select 1 from game.rooms where code = v_code and status in ('lobby', 'playing'));
    if i = 30 then raise exception 'no_codes_available'; end if;
  end loop;

  insert into game.rooms (code, host_id) values (v_code, uid) returning * into v_room;
  insert into game.room_players (room_id, user_id, display_name, emoji, color, role, seat)
  values (v_room.id, uid, v_name, v_emoji, (game.player_colors())[1], 'host', 0);

  perform game.log_event(v_room.id, 'room_created');
  return jsonb_build_object('room_id', v_room.id, 'code', v_room.code);
end $$;

create function public.join_room(p_code text, p_name text, p_emoji text default null) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := game.require_uid();
  v_name text := game.clean_name(p_name);
  v_emoji text := game.clean_emoji(p_emoji);
  v_room game.rooms;
  v_me game.room_players;
  v_color text;
begin
  select * into v_room from game.rooms
   where code = upper(btrim(p_code)) and status in ('lobby', 'playing')
   for update;
  if not found then raise exception 'room_not_found' using errcode = 'P0002'; end if;

  select * into v_me from game.room_players where room_id = v_room.id and user_id = uid;
  if found and v_me.status = 'kicked' then raise exception 'kicked' using errcode = '42501'; end if;
  -- Reconexión: si ya estaba activo, simplemente vuelve.
  if found and v_me.status = 'active' then
    return jsonb_build_object('room_id', v_room.id, 'code', v_room.code);
  end if;
  if v_room.status <> 'lobby' then raise exception 'game_in_progress' using errcode = '55000'; end if;
  if (select count(*) from game.room_players where room_id = v_room.id and status = 'active')
     >= coalesce((v_room.settings ->> 'max_players')::int, 8) then
    raise exception 'room_full' using errcode = '53300';
  end if;

  insert into game.profiles (user_id, display_name, emoji) values (uid, v_name, v_emoji)
  on conflict (user_id) do update set display_name = excluded.display_name, emoji = excluded.emoji, updated_at = now();

  select c into v_color from unnest(game.player_colors()) with ordinality as t(c, n)
   where c not in (select color from game.room_players where room_id = v_room.id and status = 'active')
   order by n limit 1;

  if v_me.id is not null then -- había salido: vuelve
    update game.room_players
       set status = 'active', display_name = v_name, emoji = v_emoji, color = coalesce(v_color, color),
           left_at = null, last_seen_at = now()
     where id = v_me.id;
  else
    insert into game.room_players (room_id, user_id, display_name, emoji, color, seat)
    values (v_room.id, uid, v_name, v_emoji, coalesce(v_color, (game.player_colors())[1]),
            (select coalesce(max(seat), -1) + 1 from game.room_players where room_id = v_room.id));
  end if;

  perform game.ensure_host(v_room.id);
  perform game.log_event(v_room.id, 'player_joined');
  perform game.touch_room(v_room.id);
  return jsonb_build_object('room_id', v_room.id, 'code', v_room.code);
end $$;

create function public.leave_room(p_room_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare v_me game.room_players := game.require_member(p_room_id);
begin
  update game.room_players set status = 'left', left_at = now(), role = 'player' where id = v_me.id;
  perform game.ensure_host(p_room_id);
  perform game.log_event(p_room_id, 'player_left');
  perform game.touch_room(p_room_id);
end $$;

create function public.kick_player(p_room_id uuid, p_player_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare v_host game.room_players := game.require_host(p_room_id);
begin
  if p_player_id = v_host.id then raise exception 'cannot_kick_self' using errcode = '22023'; end if;
  update game.room_players set status = 'kicked', left_at = now(), role = 'player'
   where id = p_player_id and room_id = p_room_id and status = 'active';
  if not found then raise exception 'player_not_found' using errcode = 'P0002'; end if;
  perform game.log_event(p_room_id, 'player_kicked', jsonb_build_object('player_id', p_player_id));
  perform game.touch_room(p_room_id);
end $$;

create function public.transfer_host(p_room_id uuid, p_player_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_host game.room_players := game.require_host(p_room_id);
  v_target game.room_players;
begin
  select * into v_target from game.room_players where id = p_player_id and room_id = p_room_id and status = 'active';
  if not found then raise exception 'player_not_found' using errcode = 'P0002'; end if;
  update game.room_players set role = 'player' where id = v_host.id;
  update game.room_players set role = 'host' where id = v_target.id;
  update game.rooms set host_id = v_target.user_id where id = p_room_id;
  perform game.log_event(p_room_id, 'host_transferred', jsonb_build_object('player_id', v_target.id));
  perform game.touch_room(p_room_id);
end $$;

-- Respuestas a las preguntas iniciales. Se puede cambiar en lobby y durante la partida (aplica a la siguiente ronda).
create function public.save_setup(p_room_id uuid, p_answers jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_room game.rooms;
  v_q game.setup_questions;
  v_key text;
  v_val jsonb;
  v_clean jsonb := '{}'::jsonb;
  v_allowed text[];
begin
  perform game.require_host(p_room_id);
  select * into v_room from game.rooms where id = p_room_id for update;
  if v_room.status not in ('lobby', 'playing') then raise exception 'room_not_active' using errcode = '55000'; end if;
  if jsonb_typeof(coalesce(p_answers, '{}'::jsonb)) <> 'object' then raise exception 'invalid_setup' using errcode = '22023'; end if;

  for v_key, v_val in select * from jsonb_each(p_answers) loop
    select * into v_q from game.setup_questions where id = v_key and active;
    if not found then continue; end if; -- se ignoran preguntas desconocidas
    v_allowed := array(select o ->> 'value' from jsonb_array_elements(v_q.options) o);
    if v_val is null or v_val = 'null'::jsonb then
      v_clean := v_clean || jsonb_build_object(v_key, null);
    elsif v_q.kind = 'single' then
      if jsonb_typeof(v_val) <> 'string' or not (v_val #>> '{}') = any (v_allowed) then
        raise exception 'invalid_answer:%', v_key using errcode = '22023';
      end if;
      v_clean := v_clean || jsonb_build_object(v_key, v_val);
    elsif v_q.kind = 'multi' then
      if jsonb_typeof(v_val) <> 'array' or exists (
        select 1 from jsonb_array_elements_text(v_val) x where not x = any (v_allowed)
      ) then raise exception 'invalid_answer:%', v_key using errcode = '22023'; end if;
      v_clean := v_clean || jsonb_build_object(v_key, v_val);
    elsif v_q.kind = 'text' then
      v_clean := v_clean || jsonb_build_object(v_key,
        left(btrim(v_val #>> '{}'), coalesce((v_q.rules ->> 'max_length')::int, 120)));
    elsif v_q.kind = 'scale' then
      v_clean := v_clean || jsonb_build_object(v_key, (v_val #>> '{}')::numeric);
    end if;
  end loop;

  update game.rooms set setup = setup || v_clean where id = p_room_id;
  perform game.log_event(p_room_id, 'setup_saved', jsonb_build_object('keys', (select jsonb_agg(k) from jsonb_object_keys(v_clean) k)));
  perform game.touch_room(p_room_id);
  return (select setup from game.rooms where id = p_room_id);
end $$;

-- Ajustes de la partida (solo claves conocidas y dentro de rango). Aplica desde la siguiente fase.
create function public.update_settings(p_room_id uuid, p_settings jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_room game.rooms;
  v_clean jsonb := '{}'::jsonb;
  v_key text;
  v_val jsonb;
  v_n int;
  v_limits constant jsonb := '{
    "rounds": [3, 8], "writing_seconds": [10, 90], "voting_seconds": [8, 60],
    "reveal_seconds": [4, 20], "leaderboard_seconds": [2, 15], "max_players": [3, 8]
  }';
begin
  perform game.require_host(p_room_id);
  select * into v_room from game.rooms where id = p_room_id for update;
  if v_room.status not in ('lobby', 'playing') then raise exception 'room_not_active' using errcode = '55000'; end if;

  for v_key, v_val in select * from jsonb_each(coalesce(p_settings, '{}'::jsonb)) loop
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
    if v_key in ('rounds', 'max_players') and v_room.status <> 'lobby' then continue; end if; -- solo antes de empezar
    v_clean := v_clean || jsonb_build_object(v_key, v_n);
  end loop;

  update game.rooms set settings = settings || v_clean where id = p_room_id;
  perform game.log_event(p_room_id, 'settings_updated', v_clean);
  perform game.touch_room(p_room_id);
  return (select settings from game.rooms where id = p_room_id);
end $$;

create function public.get_setup_questions() returns jsonb
language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'label', label, 'kind', kind, 'options', options, 'required', required, 'rules', rules
  ) order by sort), '[]'::jsonb)
  from game.setup_questions where active
$$;

-- Sala activa del usuario (para volver tras recargar).
create function public.get_my_active_room() returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('room_id', r.id, 'code', r.code)
    from game.room_players p join game.rooms r on r.id = p.room_id
   where p.user_id = auth.uid() and p.status = 'active' and r.status in ('lobby', 'playing', 'finished')
   order by p.joined_at desc limit 1
$$;

-- Lo que este jugador puede ver de la sala. (La migración de rondas añadirá chat, respuestas y resultados.)
create function public.get_room_state(p_room_id uuid) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := game.require_uid();
  v_me game.room_players;
  v_room game.rooms;
begin
  select * into v_me from game.room_players where room_id = p_room_id and user_id = uid;
  if not found then raise exception 'not_in_room' using errcode = '42501'; end if;
  if v_me.status = 'kicked' then return jsonb_build_object('kicked', true); end if;
  if v_me.status <> 'active' then return jsonb_build_object('left', true); end if;

  update game.room_players set last_seen_at = now() where id = v_me.id;
  select * into v_room from game.rooms where id = p_room_id;

  return jsonb_build_object(
    'room_id', v_room.id,
    'code', v_room.code,
    'status', v_room.status,
    'phase', v_room.phase,
    'current_round', v_room.current_round,
    'total_rounds', v_room.total_rounds,
    'phase_ends_at', v_room.phase_ends_at,
    'server_now', now(),
    'settings', v_room.settings,
    'setup', v_room.setup,
    'version', v_room.version,
    'me', v_me.id,
    'players', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.display_name, 'emoji', p.emoji, 'color', p.color,
        'role', p.role, 'score', p.score, 'seat', p.seat
      ) order by p.seat), '[]'::jsonb)
      from game.room_players p where p.room_id = p_room_id and p.status = 'active'
    )
  );
end $$;

-- Solo usuarios con sesión (anónima o no) pueden llamar a la API del juego.
do $$
declare f text;
begin
  foreach f in array array[
    'public.create_room(text, text)', 'public.join_room(text, text, text)', 'public.leave_room(uuid)',
    'public.kick_player(uuid, uuid)', 'public.transfer_host(uuid, uuid)', 'public.save_setup(uuid, jsonb)',
    'public.update_settings(uuid, jsonb)', 'public.get_setup_questions()', 'public.get_my_active_room()',
    'public.get_room_state(uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- Los helpers internos no son llamables desde fuera.
revoke all on all functions in schema game from public, anon, authenticated;
grant execute on function game.can_listen(text) to authenticated;
