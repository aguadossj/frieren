-- Typing… · Migración 2: rondas, respuestas, votos, reacciones, puntuación, avance de fases y conversaciones de respaldo.
--
-- Ciclo de una partida (todo en el servidor; los clientes solo llaman RPC):
--   start_game → [generating] → writing → voting → reveal → leaderboard → (siguiente ronda | final)
-- - Cada ronda se genera por separado (`rounds.status`: pending → generating → ready → playing → done | failed).
--   Mientras no exista la Edge Function de IA (`game.config.ai_enabled = false`) se usa una conversación de respaldo.
-- - `advance_phase` lo puede llamar cualquier jugador; solo avanza si se acabó el tiempo o todos han terminado.
--   Además, pg_cron revisa cada 5 s las salas con la fase vencida (por si todos bloquean el móvil).
-- - Puntuación igual que app/src/game/scoring.ts.

-- ───────────────────────── Tablas ─────────────────────────

create table game.config (
  key text primary key,
  value jsonb not null
);
insert into game.config (key, value) values
  ('ai_enabled', 'false'),
  ('generation_timeout_seconds', '12'),
  ('submit_grace_seconds', '2');

create table game.rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references game.rooms (id) on delete cascade,
  round_number int not null check (round_number >= 1),
  writer_id uuid not null references game.room_players (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'generating', 'ready', 'failed', 'playing', 'done')),
  conversation jsonb, -- { "title": text, "messages": [{ "player_id": uuid, "text": text }] }
  context jsonb not null default '{}'::jsonb, -- copia de rooms.setup usada para generar esta ronda
  source text check (source in ('ai', 'fallback')),
  award text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz,
  unique (room_id, round_number)
);
create index rounds_writer_id_idx on game.rounds (writer_id);

create table game.answers (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references game.rounds (id) on delete cascade,
  player_id uuid not null references game.room_players (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 80),
  is_real boolean not null,
  in_ballot boolean not null default false,
  ballot_order int,
  created_at timestamptz not null default now(),
  unique (round_id, player_id)
);
create index answers_player_id_idx on game.answers (player_id);

create table game.votes (
  round_id uuid not null references game.rounds (id) on delete cascade,
  voter_id uuid not null references game.room_players (id) on delete cascade,
  answer_id uuid not null references game.answers (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (round_id, voter_id)
);
create index votes_answer_id_idx on game.votes (answer_id);

create table game.reactions (
  answer_id uuid not null references game.answers (id) on delete cascade,
  player_id uuid not null references game.room_players (id) on delete cascade,
  kind text not null default 'laugh' check (kind in ('laugh')),
  created_at timestamptz not null default now(),
  primary key (answer_id, player_id, kind)
);
create index reactions_player_id_idx on game.reactions (player_id);

create table game.round_scores (
  round_id uuid not null references game.rounds (id) on delete cascade,
  player_id uuid not null references game.room_players (id) on delete cascade,
  points int not null default 0,
  breakdown jsonb not null default '{}'::jsonb,
  primary key (round_id, player_id)
);
create index round_scores_player_id_idx on game.round_scores (player_id);

-- Registro de llamadas a la IA (latencia, tokens, errores). Lo escribe la Edge Function.
create table game.ai_generations (
  id bigint generated always as identity primary key,
  room_id uuid references game.rooms (id) on delete set null,
  round_id uuid references game.rounds (id) on delete set null,
  provider text,
  model text,
  prompt_version text,
  status text not null check (status in ('ok', 'error', 'timeout', 'invalid')),
  input_tokens int,
  output_tokens int,
  latency_ms int,
  error text,
  created_at timestamptz not null default now()
);
create index ai_generations_room_id_idx on game.ai_generations (room_id);
create index ai_generations_round_id_idx on game.ai_generations (round_id);

-- Conversaciones de respaldo. `lines`: [{ "who": int | "writer", "text": "... {writer} ..." }].
-- `who` = índice entre los demás jugadores (módulo su número). El último mensaje debe interpelar al writer.
create table game.fallback_chats (
  id text primary key,
  vibe text not null, -- coincide con las opciones de la pregunta `vibes`
  title text not null,
  lines jsonb not null,
  spicy boolean not null default false,
  active boolean not null default true
);

alter table game.config enable row level security;
alter table game.rounds enable row level security;
alter table game.answers enable row level security;
alter table game.votes enable row level security;
alter table game.reactions enable row level security;
alter table game.round_scores enable row level security;
alter table game.ai_generations enable row level security;
alter table game.fallback_chats enable row level security;

insert into game.fallback_chats (id, vibe, title, lines, spicy) values
  ('uni-yogurt', 'uni', 'Piso 3B', '[{"who":0,"text":"who ate my yogurt 😤"},{"who":1,"text":"{writer} has yogurt on his face"},{"who":0,"text":"{writer}?? explain"}]', false),
  ('uni-project', 'uni', 'Group project 📚', '[{"who":0,"text":"deadline is in 3 hours"},{"who":1,"text":"I did the intro and the conclusion"},{"who":0,"text":"{writer} what did you do exactly"}]', false),
  ('uni-alarm', 'uni', 'Exam crew', '[{"who":0,"text":"exam starts in 10 min where are you"},{"who":1,"text":"his location says he''s still at home 💀"},{"who":0,"text":"{writer} answer the phone"}]', false),
  ('work-meeting', 'work', 'Team chat 💼', '[{"who":0,"text":"why did the boss just say your name in the all-hands"},{"who":1,"text":"he looked furious"},{"who":0,"text":"{writer} what did you do"}]', false),
  ('work-friday', 'work', 'Office squad', '[{"who":0,"text":"someone microwaved fish again"},{"who":1,"text":"the whole floor smells"},{"who":0,"text":"{writer} be honest"}]', false),
  ('chaos-cat', 'chaos', 'The squad', '[{"who":0,"text":"why is there a goat in our living room"},{"who":1,"text":"it''s wearing a hat"},{"who":0,"text":"{writer} you were the last one home"}]', false),
  ('chaos-tattoo', 'chaos', 'Weekend 🍸', '[{"who":0,"text":"is that a new tattoo in your story??"},{"who":1,"text":"it says something in chinese"},{"who":0,"text":"{writer} what does it mean"}]', false),
  ('ethics-wallet', 'ethics', 'Dinner group', '[{"who":0,"text":"found a wallet with 200€ on the bus"},{"who":1,"text":"there is an ID inside"},{"who":0,"text":"{writer} honestly what would you do"}]', false),
  ('ethics-exam', 'ethics', 'Study group', '[{"who":0,"text":"someone is selling the exam answers for 20€"},{"who":1,"text":"half the class already bought them"},{"who":0,"text":"{writer} are you in or not"}]', false),
  ('exes-story', 'exes', 'Besties 💅', '[{"who":1,"text":"your ex just liked my story"},{"who":0,"text":"NO WAY"},{"who":1,"text":"{writer} should I reply or not"}]', true),
  ('exes-k', 'exes', 'Girls night', '[{"who":0,"text":"he replied \"k\" after I sent a paragraph"},{"who":1,"text":"red flag 🚩"},{"who":0,"text":"{writer} what would you text back"}]', true),
  ('spicy-3am', 'spicy', 'Saturday plans', '[{"who":0,"text":"who went home with who last night"},{"who":1,"text":"not saying anything 🤐"},{"who":0,"text":"{writer} you disappeared at 3am. where were you"}]', true),
  ('spicy-tinder', 'spicy', 'The group 🔥', '[{"who":0,"text":"I just matched with {writer}''s ex on tinder"},{"who":1,"text":"oh this is going to be good"},{"who":0,"text":"{writer} do I swipe or not"}]', true);

-- ───────────────────────── Helpers internos ─────────────────────────

create function game.conf(p_key text) returns jsonb
language sql stable set search_path = ''
as $$ select value from game.config where key = p_key $$;

create function game.setting_seconds(p_room game.rooms, p_key text, p_default int) returns int
language sql stable set search_path = ''
as $$ select coalesce((p_room.settings ->> p_key)::int, p_default) $$;

create function game.epoch_ms(p_ts timestamptz) returns bigint
language sql immutable set search_path = ''
as $$ select case when p_ts is null then null else (extract(epoch from p_ts) * 1000)::bigint end $$;

-- ¿Se permite contenido picante con este contexto?
create function game.spicy_allowed(p_setup jsonb) returns boolean
language sql stable set search_path = ''
as $$
  select coalesce(p_setup ->> 'age', '') <> all (
    select jsonb_array_elements_text(coalesce(rules -> 'disables_spicy_when', '[]'::jsonb))
      from game.setup_questions where id = 'age'
  )
$$;

-- Rellena la ronda con una conversación de respaldo (por temas elegidos, sin repetir en la sala).
create function game.fill_fallback(p_round_id uuid) returns void
language plpgsql set search_path = ''
as $$
declare
  v_round game.rounds;
  v_room game.rooms;
  v_writer game.room_players;
  v_others uuid[];
  v_chat game.fallback_chats;
  v_vibes text[];
  v_messages jsonb;
begin
  select * into v_round from game.rounds where id = p_round_id for update;
  select * into v_room from game.rooms where id = v_round.room_id;
  select * into v_writer from game.room_players where id = v_round.writer_id;
  v_vibes := array(select jsonb_array_elements_text(coalesce(v_room.setup -> 'vibes', '[]'::jsonb)));

  select * into v_chat from game.fallback_chats c
   where c.active
     and (not c.spicy or game.spicy_allowed(v_room.setup))
     and c.id not in (select r.conversation ->> 'fallback_id' from game.rounds r
                       where r.room_id = v_room.id and r.conversation ? 'fallback_id')
   order by (c.vibe = any (v_vibes)) desc, random()
   limit 1;
  if not found then -- se acabaron: se permite repetir
    select * into v_chat from game.fallback_chats c
     where c.active and (not c.spicy or game.spicy_allowed(v_room.setup)) order by random() limit 1;
  end if;

  v_others := array(select id from game.room_players
                     where room_id = v_room.id and status = 'active' and id <> v_writer.id order by random());
  if coalesce(array_length(v_others, 1), 0) = 0 then v_others := array[v_writer.id]; end if;

  select jsonb_agg(jsonb_build_object(
           'player_id', case when l ->> 'who' = 'writer' then v_writer.id
                             else v_others[1 + ((l ->> 'who')::int % array_length(v_others, 1))] end,
           'text', replace(l ->> 'text', '{writer}', v_writer.display_name)
         ) order by ord)
    into v_messages
    from jsonb_array_elements(v_chat.lines) with ordinality as t(l, ord);

  update game.rounds
     set conversation = jsonb_build_object('title', v_chat.title, 'messages', v_messages, 'fallback_id', v_chat.id),
         context = v_room.setup, source = 'fallback', status = 'ready'
   where id = p_round_id;
end $$;

-- Pide generar una ronda. Sin IA activada: respaldo inmediato. Con IA: la Edge Function la rellenará (migración 3).
create function game.request_generation(p_round_id uuid) returns void
language plpgsql set search_path = ''
as $$
begin
  update game.rounds set status = 'generating' where id = p_round_id and status in ('pending', 'failed');
  if coalesce((game.conf('ai_enabled'))::boolean, false) = false then
    perform game.fill_fallback(p_round_id);
  end if;
end $$;

create function game.begin_writing(p_room_id uuid, p_round_number int) returns void
language plpgsql set search_path = ''
as $$
declare v_room game.rooms;
begin
  select * into v_room from game.rooms where id = p_room_id;
  update game.rounds set status = 'playing', started_at = now()
   where room_id = p_room_id and round_number = p_round_number;
  update game.rooms
     set current_round = p_round_number, phase = 'writing',
         phase_ends_at = now() + make_interval(secs => game.setting_seconds(v_room, 'writing_seconds', 25))
   where id = p_room_id;
  perform game.log_event(p_room_id, 'round_started', jsonb_build_object('round', p_round_number));
end $$;

-- Prepara la ronda N: si está lista empieza; si se está generando, espera (fase `generating`); si no, respaldo.
create function game.start_round(p_room_id uuid, p_round_number int) returns void
language plpgsql set search_path = ''
as $$
declare v_round game.rounds;
begin
  select * into v_round from game.rounds where room_id = p_room_id and round_number = p_round_number for update;
  if v_round.status in ('pending', 'failed') then
    perform game.request_generation(v_round.id);
    select * into v_round from game.rounds where id = v_round.id;
  end if;
  if v_round.status = 'ready' then
    perform game.begin_writing(p_room_id, p_round_number);
  else
    update game.rooms
       set current_round = p_round_number, phase = 'generating',
           phase_ends_at = now() + make_interval(secs => coalesce((game.conf('generation_timeout_seconds'))::int, 12))
     where id = p_room_id;
  end if;
end $$;

-- writing → voting: arma la papeleta (real + hasta 4 impostores), baraja y lanza la generación de la siguiente ronda.
create function game.begin_voting(p_room_id uuid) returns void
language plpgsql set search_path = ''
as $$
declare
  v_room game.rooms;
  v_round game.rounds;
  v_next game.rounds;
begin
  select * into v_room from game.rooms where id = p_room_id;
  select * into v_round from game.rounds where room_id = p_room_id and round_number = v_room.current_round;

  -- Si el writer no contestó, su respuesta real es "…".
  insert into game.answers (round_id, player_id, text, is_real)
  values (v_round.id, v_round.writer_id, '…', true)
  on conflict (round_id, player_id) do nothing;

  with ballot as (
    select a.id from game.answers a where a.round_id = v_round.id and a.is_real
    union all
    (select a.id from game.answers a where a.round_id = v_round.id and not a.is_real order by random() limit 4)
  ), ordered as (
    select id, row_number() over (order by random()) as n from ballot
  )
  update game.answers a set in_ballot = true, ballot_order = o.n from ordered o where a.id = o.id;

  update game.rooms
     set phase = 'voting',
         phase_ends_at = now() + make_interval(secs => game.setting_seconds(v_room, 'voting_seconds', 15))
   where id = p_room_id;

  -- Generar ya la siguiente ronda (con IA tendrá ~votación + revelación + ranking de margen).
  select * into v_next from game.rounds where room_id = p_room_id and round_number = v_room.current_round + 1;
  if found and v_next.status in ('pending', 'failed') then
    perform game.request_generation(v_next.id);
  end if;
end $$;

-- voting → reveal: puntuación (como scoring.ts) y premio del presentador.
create function game.begin_reveal(p_room_id uuid) returns void
language plpgsql set search_path = ''
as $$
declare
  v_room game.rooms;
  v_round game.rounds;
  v_writer game.room_players;
  v_winner text;
  v_award text;
begin
  select * into v_room from game.rooms where id = p_room_id;
  select * into v_round from game.rounds where room_id = p_room_id and round_number = v_room.current_round;
  select * into v_writer from game.room_players where id = v_round.writer_id;

  insert into game.round_scores (round_id, player_id, points, breakdown)
  select v_round.id, s.player_id, sum(s.points), jsonb_object_agg(s.reason, s.points)
  from (
    -- Votantes que encontraron la real: +200
    select v.voter_id as player_id, 'found_real' as reason, 200 * count(*) as points
      from game.votes v join game.answers a on a.id = v.answer_id
     where v.round_id = v_round.id and a.is_real group by v.voter_id
    union all
    -- Writer: +100 por cada amigo que le reconoce
    select v_round.writer_id, 'recognised', 100 * count(*)
      from game.votes v join game.answers a on a.id = v.answer_id
     where v.round_id = v_round.id and a.is_real having count(*) > 0
    union all
    -- Impostor: +150 por cada voto engañado
    select a.player_id, 'fooled', 150 * count(*)
      from game.votes v join game.answers a on a.id = v.answer_id
     where v.round_id = v_round.id and not a.is_real group by a.player_id
    union all
    -- +50 por cada 😂 recibido
    select a.player_id, 'laughs', 50 * count(*)
      from game.reactions r join game.answers a on a.id = r.answer_id
     where a.round_id = v_round.id group by a.player_id
  ) s
  group by s.player_id
  on conflict (round_id, player_id) do nothing;

  update game.room_players p set score = p.score + rs.points
    from game.round_scores rs where rs.round_id = v_round.id and rs.player_id = p.id;

  select p.display_name into v_winner
    from game.votes v join game.answers a on a.id = v.answer_id join game.room_players p on p.id = a.player_id
   where v.round_id = v_round.id and not a.is_real
   group by p.id, p.display_name order by count(*) desc, random() limit 1;

  v_award := case
    when v_winner is not null then replace(replace((array[
      'Best {writer} impression: {winner}. Scary accurate.',
      '{winner} knows {writer} better than {writer} does.',
      '{winner} should be investigated for that {writer} impression.'
    ])[1 + floor(random() * 3)::int], '{writer}', v_writer.display_name), '{winner}', v_winner)
    else replace((array[
      'Nobody can fake {writer}. Truly one of a kind.',
      '{writer} is an open book. Everyone saw it coming.'
    ])[1 + floor(random() * 2)::int], '{writer}', v_writer.display_name)
  end;

  update game.rounds set award = v_award where id = v_round.id;
  update game.rooms
     set phase = 'reveal',
         phase_ends_at = now() + make_interval(secs => game.setting_seconds(v_room, 'reveal_seconds', 8))
   where id = p_room_id;
end $$;

create function game.finish_game(p_room_id uuid) returns void
language plpgsql set search_path = ''
as $$
declare v_room game.rooms;
begin
  update game.rooms set status = 'finished', phase = null, phase_ends_at = null, ended_at = now()
   where id = p_room_id returning * into v_room;
  perform game.log_event(p_room_id, 'game_finished', jsonb_build_object(
    'duration_seconds', extract(epoch from v_room.ended_at - v_room.started_at)::int,
    'rounds', v_room.current_round,
    'players', (select count(*) from game.room_players where room_id = p_room_id and status = 'active')
  ));
end $$;

-- ¿Ha terminado todo el mundo la fase actual?
create function game.phase_complete(p_room game.rooms) returns boolean
language plpgsql stable set search_path = ''
as $$
declare v_round game.rounds;
begin
  select * into v_round from game.rounds where room_id = p_room.id and round_number = p_room.current_round;
  if p_room.phase = 'writing' then
    return not exists (
      select 1 from game.room_players p
       where p.room_id = p_room.id and p.status = 'active'
         and not exists (select 1 from game.answers a where a.round_id = v_round.id and a.player_id = p.id));
  elsif p_room.phase = 'voting' then
    return not exists (
      select 1 from game.room_players p
       where p.room_id = p_room.id and p.status = 'active' and p.id <> v_round.writer_id
         and exists (select 1 from game.answers a -- solo cuenta quien tiene algo que votar
                      where a.round_id = v_round.id and a.in_ballot and a.player_id <> p.id)
         and not exists (select 1 from game.votes v where v.round_id = v_round.id and v.voter_id = p.id));
  elsif p_room.phase = 'generating' then
    return v_round.status = 'ready';
  end if;
  return false;
end $$;

-- Motor de fases. Avanza como mucho un paso. Devuelve true si cambió algo.
create function game.advance(p_room_id uuid, p_force boolean default false) returns boolean
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
      perform game.fill_fallback(v_round.id); -- la IA no llegó a tiempo
      perform game.log_event(p_room_id, 'generation_timeout', jsonb_build_object('round', v_room.current_round));
    end if;
    perform game.begin_writing(p_room_id, v_room.current_round);
  elsif v_room.phase = 'writing' then
    perform game.begin_voting(p_room_id);
  elsif v_room.phase = 'voting' then
    perform game.begin_reveal(p_room_id);
  elsif v_room.phase = 'reveal' then
    update game.rooms
       set phase = 'leaderboard',
           phase_ends_at = now() + make_interval(secs => game.setting_seconds(v_room, 'leaderboard_seconds', 4))
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

-- Red de seguridad: avanza salas con la fase vencida aunque nadie llame (pg_cron cada 5 s).
create function game.advance_overdue_rooms() returns int
language plpgsql set search_path = ''
as $$
declare v_id uuid; n int := 0;
begin
  for v_id in select id from game.rooms
               where status = 'playing' and phase_ends_at < now() - interval '2 seconds'
               for update skip locked loop
    if game.advance(v_id) then n := n + 1; end if;
  end loop;
  -- Cierra salas abandonadas (3 h sin actividad).
  update game.rooms set status = 'closed', ended_at = coalesce(ended_at, now())
   where status in ('lobby', 'playing', 'finished') and last_activity_at < now() - interval '3 hours';
  return n;
end $$;

-- ───────────────────────── RPC públicas ─────────────────────────

create function public.start_game(p_room_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_room game.rooms;
  v_players uuid[];
  v_total int;
begin
  perform game.require_host(p_room_id);
  select * into v_room from game.rooms where id = p_room_id for update;
  if v_room.status <> 'lobby' then raise exception 'already_started' using errcode = '55000'; end if;

  v_players := array(select id from game.room_players where room_id = p_room_id and status = 'active' order by random());
  if coalesce(array_length(v_players, 1), 0) < 3 then raise exception 'not_enough_players' using errcode = '55000'; end if;

  -- Por defecto, una ronda por jugador (3–6). El host puede fijar `settings.rounds`.
  v_total := coalesce((v_room.settings ->> 'rounds')::int, least(greatest(array_length(v_players, 1), 3), 6));

  insert into game.rounds (room_id, round_number, writer_id)
  select p_room_id, n, v_players[1 + ((n - 1) % array_length(v_players, 1))]
    from generate_series(1, v_total) n;

  update game.rooms set status = 'playing', total_rounds = v_total, started_at = now() where id = p_room_id;
  perform game.log_event(p_room_id, 'game_started', jsonb_build_object(
    'players', array_length(v_players, 1), 'rounds', v_total, 'setup', v_room.setup));
  perform game.start_round(p_room_id, 1);
  perform game.touch_room(p_room_id);
end $$;

create function public.submit_answer(p_room_id uuid, p_text text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_me game.room_players := game.require_member(p_room_id);
  v_room game.rooms;
  v_round game.rounds;
  v_text text := left(btrim(regexp_replace(coalesce(p_text, ''), '\s+', ' ', 'g')), 80);
begin
  select * into v_room from game.rooms where id = p_room_id for update;
  if v_room.status <> 'playing' or v_room.phase <> 'writing'
     or now() > v_room.phase_ends_at + make_interval(secs => coalesce((game.conf('submit_grace_seconds'))::int, 2)) then
    raise exception 'not_writing_phase' using errcode = '55000';
  end if;
  if v_text = '' then v_text := '…'; end if;
  select * into v_round from game.rounds where room_id = p_room_id and round_number = v_room.current_round;

  insert into game.answers (round_id, player_id, text, is_real)
  values (v_round.id, v_me.id, v_text, v_me.id = v_round.writer_id)
  on conflict (round_id, player_id) do nothing;
  if not found then raise exception 'already_answered' using errcode = '23505'; end if;

  perform game.log_event(p_room_id, 'answer_submitted', jsonb_build_object(
    'round', v_room.current_round, 'is_real', v_me.id = v_round.writer_id,
    'seconds', extract(epoch from now() - v_round.started_at)::int));
  if not game.advance(p_room_id) then perform game.touch_room(p_room_id); end if;
end $$;

create function public.cast_vote(p_room_id uuid, p_answer_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_me game.room_players := game.require_member(p_room_id);
  v_room game.rooms;
  v_round game.rounds;
  v_answer game.answers;
begin
  select * into v_room from game.rooms where id = p_room_id for update;
  if v_room.status <> 'playing' or v_room.phase <> 'voting' then raise exception 'not_voting_phase' using errcode = '55000'; end if;
  select * into v_round from game.rounds where room_id = p_room_id and round_number = v_room.current_round;
  if v_me.id = v_round.writer_id then raise exception 'writer_cannot_vote' using errcode = '42501'; end if;

  select * into v_answer from game.answers where id = p_answer_id and round_id = v_round.id and in_ballot;
  if not found then raise exception 'invalid_answer' using errcode = '22023'; end if;
  if v_answer.player_id = v_me.id then raise exception 'cannot_vote_own' using errcode = '42501'; end if;

  insert into game.votes (round_id, voter_id, answer_id) values (v_round.id, v_me.id, p_answer_id)
  on conflict (round_id, voter_id) do nothing;
  if not found then raise exception 'already_voted' using errcode = '23505'; end if;

  perform game.log_event(p_room_id, 'vote_cast', jsonb_build_object('round', v_room.current_round, 'correct', v_answer.is_real));
  if not game.advance(p_room_id) then perform game.touch_room(p_room_id); end if;
end $$;

create function public.react(p_room_id uuid, p_answer_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_me game.room_players := game.require_member(p_room_id);
  v_room game.rooms;
begin
  select * into v_room from game.rooms where id = p_room_id;
  if v_room.status <> 'playing' or v_room.phase <> 'voting' then
    raise exception 'cannot_react_now' using errcode = '55000';
  end if;
  if not exists (
    select 1 from game.answers a join game.rounds r on r.id = a.round_id
     where a.id = p_answer_id and a.in_ballot and r.room_id = p_room_id and r.round_number = v_room.current_round
       and a.player_id <> v_me.id
  ) then raise exception 'invalid_answer' using errcode = '22023'; end if;

  insert into game.reactions (answer_id, player_id) values (p_answer_id, v_me.id) on conflict do nothing;
  if found then perform game.touch_room(p_room_id); end if;
end $$;

-- Cualquier jugador puede pedir avanzar; solo pasa si se acabó el tiempo o todos han terminado.
create function public.advance_phase(p_room_id uuid) returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  perform game.require_member(p_room_id);
  return game.advance(p_room_id);
end $$;

-- El host puede saltar la fase actual o terminar la partida.
create function public.skip_phase(p_room_id uuid) returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  perform game.require_host(p_room_id);
  perform game.log_event(p_room_id, 'phase_skipped');
  return game.advance(p_room_id, true);
end $$;

create function public.end_game(p_room_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  perform game.require_host(p_room_id);
  if not exists (select 1 from game.rooms where id = p_room_id and status = 'playing') then
    raise exception 'not_playing' using errcode = '55000';
  end if;
  perform game.finish_game(p_room_id);
  perform game.touch_room(p_room_id);
end $$;

-- Estado visible para el jugador, con la forma del contrato `Room` de app/src/game/types.ts (camelCase).
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
  if v_me.status <> 'active' then return jsonb_build_object('left', true); end if;

  update game.room_players set last_seen_at = now() where id = v_me.id;
  select * into v_room from game.rooms where id = p_room_id;
  select * into v_round from game.rounds where room_id = p_room_id and round_number = v_room.current_round;

  v_phase := case v_room.status when 'lobby' then 'lobby' when 'playing' then v_room.phase else 'final' end;

  if v_phase in ('writing', 'voting', 'reveal', 'leaderboard') and v_round.conversation is not null then
    v_chat := jsonb_build_object(
      'title', v_round.conversation ->> 'title',
      'writerId', v_round.writer_id,
      'messages', (select coalesce(jsonb_agg(jsonb_build_object('playerId', m ->> 'player_id', 'text', m ->> 'text') order by ord), '[]'::jsonb)
                     from jsonb_array_elements(v_round.conversation -> 'messages') with ordinality as t(m, ord)));
  end if;

  -- Papeleta anónima: solo en votación. Nunca se manda el autor ni cuál es la real.
  if v_phase = 'voting' then
    select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'text', a.text, 'mine', a.player_id = v_me.id)
                    order by a.ballot_order), '[]'::jsonb)
      into v_answers from game.answers a where a.round_id = v_round.id and a.in_ballot;
  end if;

  -- Resultados completos: solo desde la revelación.
  if v_phase in ('reveal', 'leaderboard') then
    v_result := jsonb_build_object(
      'answers', (select coalesce(jsonb_agg(jsonb_build_object(
                    'id', a.id, 'text', a.text, 'authorId', a.player_id, 'isReal', a.is_real,
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
    'players', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.display_name, 'emoji', p.emoji, 'color', p.color,
        'score', p.score, 'isHost', p.role = 'host'
      ) order by p.seat), '[]'::jsonb)
      from game.room_players p where p.room_id = p_room_id and p.status = 'active'
    ),
    'chat', v_chat,
    'answers', v_answers,
    'submittedIds', case when v_phase = 'writing' then
        (select coalesce(jsonb_agg(a.player_id), '[]'::jsonb) from game.answers a where a.round_id = v_round.id)
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

-- ───────────────────────── Permisos y cron ─────────────────────────

do $$
declare f text;
begin
  foreach f in array array[
    'public.start_game(uuid)', 'public.submit_answer(uuid, text)', 'public.cast_vote(uuid, uuid)',
    'public.react(uuid, uuid)', 'public.advance_phase(uuid)', 'public.skip_phase(uuid)', 'public.end_game(uuid)',
    'public.get_room_state(uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

revoke all on all functions in schema game from public, anon, authenticated;
grant execute on function game.can_listen(text) to authenticated;

create extension if not exists pg_cron;
select cron.schedule('typing-advance-overdue-rooms', '5 seconds', $$ select game.advance_overdue_rooms() $$);
