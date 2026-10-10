-- Typing… · Migración 4: bot "Mimic" (IA impostora independiente del generador de conversaciones).
--
-- - El host lo activa con `settings.mimic = true` (en lobby o durante la partida; aplica desde la siguiente ronda).
-- - En cada ronda, una Edge Function externa ("mimic") genera UNA respuesta imitando al writer y la entrega con
--   `public.submit_bot_answer` (solo service_role). Aprende de `public.ai_round_context`: todo lo que cada jugador
--   ha escrito en la sala (respuestas reales e imitaciones), ronda a ronda.
-- - La respuesta del bot entra como opción EXTRA en la papeleta (real + hasta 4 impostores + bot), anónima.
-- - Quien vota al bot pierde 100 puntos (config `mimic_penalty`); la puntuación nunca baja de 0.
-- - El bot no es un jugador: no sale en el lobby ni en el ranking; se descubre en la revelación (`isBot`, `authorId = "mimic"`).
-- - Si no hay IA o el bot no llega a tiempo, la ronda sigue sin él.

-- ───────────────────────── Esquema ─────────────────────────

alter table game.answers alter column player_id drop not null;
alter table game.answers add column is_bot boolean not null default false;
alter table game.answers add constraint answers_author_check check ((is_bot and player_id is null) or (not is_bot and player_id is not null));
create unique index answers_one_bot_per_round on game.answers (round_id) where is_bot;

insert into game.config (key, value) values
  ('mimic_penalty', '100'),
  ('mimic_wait_seconds', '10') -- la escritura no se cierra antes de tiempo hasta que llegue el bot o pasen estos segundos
on conflict (key) do nothing;

alter table game.rooms alter column settings set default '{
  "rounds": null, "writing_seconds": 25, "voting_seconds": 15, "reveal_seconds": 8,
  "leaderboard_seconds": 4, "max_players": 8, "mimic": false
}'::jsonb;

-- ¿Hay que esperar / contar con el bot en esta sala?
create function game.mimic_active(p_room game.rooms) returns boolean
language sql stable set search_path = ''
as $$ select coalesce((p_room.settings ->> 'mimic')::boolean, false) and coalesce((game.conf('ai_enabled'))::boolean, false) $$;

-- ───────────────────────── Ajustes: aceptar `mimic` ─────────────────────────

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
    "rounds": [3, 8], "writing_seconds": [10, 90], "voting_seconds": [8, 60],
    "reveal_seconds": [4, 20], "leaderboard_seconds": [2, 15], "max_players": [3, 8]
  }';
begin
  perform game.require_host(p_room_id);
  select * into v_room from game.rooms where id = p_room_id for update;
  if v_room.status not in ('lobby', 'playing') then raise exception 'room_not_active' using errcode = '55000'; end if;

  for v_key, v_val in select * from jsonb_each(coalesce(p_settings, '{}'::jsonb)) loop
    if v_key = 'mimic' then
      if jsonb_typeof(v_val) <> 'boolean' then raise exception 'invalid_setting:mimic' using errcode = '22023'; end if;
      v_clean := v_clean || jsonb_build_object('mimic', v_val);
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
  perform game.log_event(p_room_id, 'settings_updated', v_clean);
  perform game.touch_room(p_room_id);
  return (select settings from game.rooms where id = p_room_id);
end $$;

-- ───────────────────────── Motor: escritura, papeleta y puntuación ─────────────────────────

-- La escritura se cierra antes de tiempo cuando todos han contestado y (si el bot está activo) ha llegado el bot
-- o han pasado `mimic_wait_seconds`.
create or replace function game.phase_complete(p_room game.rooms) returns boolean
language plpgsql stable set search_path = ''
as $$
declare v_round game.rounds;
begin
  select * into v_round from game.rounds where room_id = p_room.id and round_number = p_room.current_round;
  if p_room.phase = 'writing' then
    return not exists (
      select 1 from game.room_players p
       where p.room_id = p_room.id and p.status = 'active'
         and not exists (select 1 from game.answers a where a.round_id = v_round.id and a.player_id = p.id))
      and (not game.mimic_active(p_room)
           or exists (select 1 from game.answers a where a.round_id = v_round.id and a.is_bot)
           or now() >= v_round.started_at + make_interval(secs => coalesce((game.conf('mimic_wait_seconds'))::int, 10)));
  elsif p_room.phase = 'voting' then
    return not exists (
      select 1 from game.room_players p
       where p.room_id = p_room.id and p.status = 'active' and p.id <> v_round.writer_id
         and exists (select 1 from game.answers a
                      where a.round_id = v_round.id and a.in_ballot and a.player_id is distinct from p.id)
         and not exists (select 1 from game.votes v where v.round_id = v_round.id and v.voter_id = p.id));
  elsif p_room.phase = 'generating' then
    return v_round.status = 'ready';
  end if;
  return false;
end $$;

-- Papeleta: real + hasta 4 impostores + (si existe) la respuesta del bot, barajadas.
create or replace function game.begin_voting(p_room_id uuid) returns void
language plpgsql set search_path = ''
as $$
declare
  v_room game.rooms;
  v_round game.rounds;
  v_next game.rounds;
begin
  select * into v_room from game.rooms where id = p_room_id;
  select * into v_round from game.rounds where room_id = p_room_id and round_number = v_room.current_round;

  insert into game.answers (round_id, player_id, text, is_real)
  values (v_round.id, v_round.writer_id, '…', true)
  on conflict (round_id, player_id) do nothing;

  with ballot as (
    select a.id from game.answers a where a.round_id = v_round.id and a.is_real
    union all
    (select a.id from game.answers a where a.round_id = v_round.id and not a.is_real and not a.is_bot order by random() limit 4)
    union all
    select a.id from game.answers a where a.round_id = v_round.id and a.is_bot
  ), ordered as (
    select id, row_number() over (order by random()) as n from ballot
  )
  update game.answers a set in_ballot = true, ballot_order = o.n from ordered o where a.id = o.id;

  update game.rooms
     set phase = 'voting',
         phase_ends_at = now() + make_interval(secs => game.setting_seconds(v_room, 'voting_seconds', 15))
   where id = p_room_id;

  select * into v_next from game.rounds where room_id = p_room_id and round_number = v_room.current_round + 1;
  if found and v_next.status in ('pending', 'failed') then
    perform game.request_generation(v_next.id);
  end if;
end $$;

-- Puntuación (como scoring.ts) + castigo por votar al bot; nunca por debajo de 0. El bot puede ganar el premio.
create or replace function game.begin_reveal(p_room_id uuid) returns void
language plpgsql set search_path = ''
as $$
declare
  v_room game.rooms;
  v_round game.rounds;
  v_writer game.room_players;
  v_winner text;
  v_winner_votes int;
  v_bot_votes int;
  v_award text;
  v_penalty int := coalesce((game.conf('mimic_penalty'))::int, 100);
begin
  select * into v_room from game.rooms where id = p_room_id;
  select * into v_round from game.rounds where room_id = p_room_id and round_number = v_room.current_round;
  select * into v_writer from game.room_players where id = v_round.writer_id;

  insert into game.round_scores (round_id, player_id, points, breakdown)
  select v_round.id, s.player_id, sum(s.points), jsonb_object_agg(s.reason, s.points)
  from (
    select v.voter_id as player_id, 'found_real' as reason, 200 * count(*) as points
      from game.votes v join game.answers a on a.id = v.answer_id
     where v.round_id = v_round.id and a.is_real group by v.voter_id
    union all
    select v_round.writer_id, 'recognised', 100 * count(*)
      from game.votes v join game.answers a on a.id = v.answer_id
     where v.round_id = v_round.id and a.is_real having count(*) > 0
    union all
    select a.player_id, 'fooled', 150 * count(*)
      from game.votes v join game.answers a on a.id = v.answer_id
     where v.round_id = v_round.id and not a.is_real and not a.is_bot group by a.player_id
    union all
    select v.voter_id, 'fooled_by_bot', -v_penalty * count(*)
      from game.votes v join game.answers a on a.id = v.answer_id
     where v.round_id = v_round.id and a.is_bot group by v.voter_id
    union all
    select a.player_id, 'laughs', 50 * count(*)
      from game.reactions r join game.answers a on a.id = r.answer_id
     where a.round_id = v_round.id and not a.is_bot group by a.player_id
  ) s
  group by s.player_id
  on conflict (round_id, player_id) do nothing;

  update game.room_players p set score = greatest(0, p.score + rs.points)
    from game.round_scores rs where rs.round_id = v_round.id and rs.player_id = p.id;

  select p.display_name, count(*) into v_winner, v_winner_votes
    from game.votes v join game.answers a on a.id = v.answer_id join game.room_players p on p.id = a.player_id
   where v.round_id = v_round.id and not a.is_real and not a.is_bot
   group by p.id, p.display_name order by count(*) desc, random() limit 1;

  select count(*) into v_bot_votes
    from game.votes v join game.answers a on a.id = v.answer_id
   where v.round_id = v_round.id and a.is_bot;

  v_award := case
    when v_bot_votes > 0 and v_bot_votes >= coalesce(v_winner_votes, 0) then replace((array[
      '🤖 Mimic fooled ' || v_bot_votes || '. The AI knows {writer} too well.',
      '🤖 The AI did a better {writer} than you. Worrying.',
      '🤖 Mimic is learning {writer}. Be afraid.'
    ])[1 + floor(random() * 3)::int], '{writer}', v_writer.display_name)
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

-- 😂 solo a respuestas de jugadores (no al bot) y nunca a la tuya.
create or replace function public.react(p_room_id uuid, p_answer_id uuid) returns void
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
       and a.player_id is distinct from v_me.id
  ) then raise exception 'invalid_answer' using errcode = '22023'; end if;

  insert into game.reactions (answer_id, player_id) values (p_answer_id, v_me.id) on conflict do nothing;
  if found then perform game.touch_room(p_room_id); end if;
end $$;

-- ───────────────────────── API para las Edge Functions de IA (solo service_role) ─────────────────────────

-- Todo lo que una IA necesita para una ronda: contexto, jugadores, writer, conversación e historial de la sala
-- (qué escribió cada jugador, real o imitando a otro), más la memoria de la sala.
create function public.ai_round_context(p_round_id uuid) returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'round_id', r.id,
    'round_number', r.round_number,
    'total_rounds', ro.total_rounds,
    'room_id', ro.id,
    'setup', ro.setup,
    'settings', ro.settings,
    'memory', ro.memory,
    'spicy_allowed', game.spicy_allowed(ro.setup),
    'writer', (select jsonb_build_object('id', p.id, 'name', p.display_name) from game.room_players p where p.id = r.writer_id),
    'players', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'name', p.display_name) order by p.seat), '[]'::jsonb)
                  from game.room_players p where p.room_id = ro.id and p.status = 'active'),
    'conversation', r.conversation,
    'history', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'round_number', hr.round_number,
               'writer_id', hr.writer_id,
               'conversation', hr.conversation,
               'answers', (select coalesce(jsonb_agg(jsonb_build_object(
                             'player_id', a.player_id, 'is_real', a.is_real, 'is_bot', a.is_bot, 'text', a.text,
                             'votes', (select count(*) from game.votes v where v.answer_id = a.id))), '[]'::jsonb)
                           from game.answers a where a.round_id = hr.id)
             ) order by hr.round_number), '[]'::jsonb)
        from game.rounds hr where hr.room_id = ro.id and hr.round_number < r.round_number
    )
  )
  from game.rounds r join game.rooms ro on ro.id = r.room_id
  where r.id = p_round_id
$$;

-- La Edge Function "mimic" entrega aquí la respuesta del bot. Devuelve false si ya no hace falta (fase pasada,
-- bot desactivado o ya entregada).
create function public.submit_bot_answer(p_round_id uuid, p_text text) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_round game.rounds;
  v_room game.rooms;
  v_text text := left(btrim(regexp_replace(coalesce(p_text, ''), '\s+', ' ', 'g')), 80);
begin
  if v_text = '' then return false; end if;
  select * into v_round from game.rounds where id = p_round_id;
  if not found then return false; end if;
  select * into v_room from game.rooms where id = v_round.room_id for update;
  if v_room.status <> 'playing' or v_room.phase not in ('generating', 'writing')
     or v_room.current_round <> v_round.round_number
     or not coalesce((v_room.settings ->> 'mimic')::boolean, false) then
    return false;
  end if;

  insert into game.answers (round_id, player_id, text, is_real, is_bot)
  values (p_round_id, null, v_text, false, true)
  on conflict do nothing;
  if not found then return false; end if;

  perform game.log_event(v_room.id, 'bot_answer_submitted', jsonb_build_object('round', v_round.round_number));
  if v_room.phase = 'writing' then perform game.advance(v_room.id); end if; -- por si ya solo faltaba el bot
  return true;
end $$;

-- Registro de cada llamada a la IA (para métricas y para el informe de tokens del jurado).
create function public.log_ai_generation(
  p_room_id uuid, p_round_id uuid, p_provider text, p_model text, p_prompt_version text, p_status text,
  p_input_tokens int, p_output_tokens int, p_latency_ms int, p_error text
) returns void
language sql security definer set search_path = ''
as $$
  insert into game.ai_generations (room_id, round_id, provider, model, prompt_version, status, input_tokens, output_tokens, latency_ms, error)
  values (p_room_id, p_round_id, p_provider, p_model, p_prompt_version, p_status, p_input_tokens, p_output_tokens, p_latency_ms, left(p_error, 1000))
$$;

-- La memoria de la sala (lo que la IA "aprende" entre rondas) la actualiza la IA.
create function public.update_room_memory(p_room_id uuid, p_memory jsonb) returns void
language sql security definer set search_path = ''
as $$ update game.rooms set memory = coalesce(p_memory, '{}'::jsonb) where id = p_room_id $$;

-- ───────────────────────── Estado visible: el bot en la revelación ─────────────────────────

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

  -- Papeleta anónima: el bot no se distingue de los demás.
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

-- ───────────────────────── Permisos ─────────────────────────

do $$
declare f text;
begin
  -- API de jugadores
  foreach f in array array['public.update_settings(uuid, jsonb)', 'public.react(uuid, uuid)', 'public.get_room_state(uuid)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
  -- API de IA: solo el servidor (Edge Functions con service_role)
  foreach f in array array[
    'public.ai_round_context(uuid)', 'public.submit_bot_answer(uuid, text)',
    'public.log_ai_generation(uuid, uuid, text, text, text, text, int, int, int, text)',
    'public.update_room_memory(uuid, jsonb)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

revoke all on all functions in schema game from public, anon, authenticated;
grant execute on function game.can_listen(text) to authenticated;
