-- Typing… · Migración 3: IA ronda a ronda con la Edge Function `generate-round` (supabase/functions/generate-round).
--
-- Con `game.config.ai_enabled = true`, `game.request_generation` llama a la función por pg_net (después del commit)
-- con { round_id, input }. La función genera el chat, actualiza la memoria ("aprendizaje") y llama de vuelta a:
--   - public.ai_complete_round(round_id, result): guarda la conversación si la ronda sigue `generating`
--     (si no, ya se usó el respaldo), la memoria en rooms.memory y una fila en game.ai_generations.
--   - public.ai_fail_round(round_id, status, error): registra el fallo y usa el respaldo al momento.
-- Cualquier problema al pedir la generación (vault sin configurar, pg_net…) => respaldo, nunca rompe la partida.
-- Si nada contesta, el temporizador de `generating` (12 s) ya ponía el respaldo (migración 2).
--
-- Idempotente (create or replace): se aplicó con `supabase db query` y se puede volver a ejecutar.
-- Configuración fuera de la migración (no es código y el secreto no se versiona), en Vault:
--   generate_round_url    = https://<ref>.supabase.co/functions/v1/generate-round
--   generate_round_secret = el mismo valor que el secreto GENERATE_ROUND_SECRET de la función

create extension if not exists pg_net;

-- ───────────────────────── Entrada para la IA ─────────────────────────

-- GenerateRoundInput (ver core.ts) para una ronda. Historial: rondas anteriores con respuestas;
-- votos y 😂 solo de las ya puntuadas (la N+1 se pide al empezar la votación de la N).
create or replace function game.ai_round_input(p_round_id uuid) returns jsonb
language plpgsql stable set search_path = ''
as $$
declare
  v_round game.rounds;
  v_room game.rooms;
begin
  select * into v_round from game.rounds where id = p_round_id;
  select * into v_room from game.rooms where id = v_round.room_id;

  return jsonb_build_object(
    'round', v_round.round_number,
    'total_rounds', v_room.total_rounds,
    'setup', v_room.setup,
    'writer_id', v_round.writer_id,
    'memory', v_room.memory,
    'players', (
      select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'name', p.display_name) order by p.seat), '[]'::jsonb)
        from game.room_players p where p.room_id = v_room.id and p.status = 'active'
    ),
    'history', (
      select coalesce(jsonb_agg(h.item order by h.round_number), '[]'::jsonb)
      from (
        select r.round_number, jsonb_strip_nulls(jsonb_build_object(
          'round', r.round_number,
          'writer_id', r.writer_id,
          'title', r.conversation ->> 'title',
          'messages', coalesce((
            select jsonb_agg(jsonb_build_object('player_id', m ->> 'player_id', 'text', m ->> 'text'))
              from jsonb_array_elements(r.conversation -> 'messages') m), '[]'::jsonb),
          'real_answer', coalesce((select a.text from game.answers a where a.round_id = r.id and a.is_real), '…'),
          'fakes', coalesce((
            select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                     'player_id', a.player_id,
                     'text', a.text,
                     'fooled', case when sc.scored then (select count(*) from game.votes v where v.answer_id = a.id) end)))
              from game.answers a where a.round_id = r.id and not a.is_real), '[]'::jsonb),
          'found_by', case when sc.scored then (
            select count(*) from game.votes v join game.answers a on a.id = v.answer_id
             where v.round_id = r.id and a.is_real) end,
          'laughs', case when sc.scored then (
            select coalesce(jsonb_object_agg(x.player_id, x.n), '{}'::jsonb)
              from (select a.player_id, count(*) as n
                      from game.reactions re join game.answers a on a.id = re.answer_id
                     where a.round_id = r.id group by a.player_id) x) end
        )) as item
        from game.rounds r
        cross join lateral (select exists (select 1 from game.round_scores s where s.round_id = r.id) as scored) sc
        where r.room_id = v_room.id
          and r.round_number < v_round.round_number
          and r.conversation is not null
          and exists (select 1 from game.answers a where a.round_id = r.id)
      ) h
    )
  );
end $$;

-- ───────────────────────── Petición ─────────────────────────

create or replace function game.request_generation(p_round_id uuid) returns void
language plpgsql set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  update game.rounds set status = 'generating' where id = p_round_id and status in ('pending', 'failed');
  if coalesce((game.conf('ai_enabled'))::boolean, false) = false then
    perform game.fill_fallback(p_round_id);
    return;
  end if;

  begin
    select decrypted_secret into v_url from vault.decrypted_secrets where name = 'generate_round_url';
    select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'generate_round_secret';
    if v_url is null or v_secret is null then raise exception 'ai_not_configured'; end if;
    perform net.http_post(
      url := v_url,
      body := jsonb_build_object('round_id', p_round_id, 'input', game.ai_round_input(p_round_id)),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-generate-secret', v_secret),
      timeout_milliseconds := 20000
    );
  exception when others then
    perform game.log_event((select room_id from game.rounds where id = p_round_id),
                           'generation_request_failed', jsonb_build_object('error', sqlerrm));
    perform game.fill_fallback(p_round_id);
  end;
end $$;

-- ───────────────────────── Respuesta de la función ─────────────────────────

-- Respaldo inmediato si la ronda sigue esperando; si la sala está parada en `generating` por ella, arranca.
create or replace function game.ai_fallback_now(p_room game.rooms, p_round game.rounds) returns void
language plpgsql set search_path = ''
as $$
begin
  if p_round.status <> 'generating' then return; end if;
  perform game.fill_fallback(p_round.id);
  if p_room.status = 'playing' and p_room.phase = 'generating' and p_room.current_round = p_round.round_number then
    perform game.advance(p_room.id);
  end if;
end $$;

create or replace function public.ai_complete_round(p_round_id uuid, p_result jsonb) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_room_id uuid;
  v_room game.rooms;
  v_round game.rounds;
  v_messages jsonb := p_result -> 'chat' -> 'messages';
  v_valid boolean;
begin
  select room_id into v_room_id from game.rounds where id = p_round_id;
  if v_room_id is null then return 'round_not_found'; end if;
  -- Mismo orden de bloqueo que game.advance: sala y luego ronda.
  select * into v_room from game.rooms where id = v_room_id for update;
  select * into v_round from game.rounds where id = p_round_id for update;

  v_valid := jsonb_typeof(v_messages) = 'array'
    and jsonb_array_length(v_messages) between 2 and 6
    and char_length(coalesce(p_result -> 'chat' ->> 'title', '')) between 1 and 40
    and not exists (
      select 1 from jsonb_array_elements(v_messages) m
       where (m ->> 'player_id') = v_round.writer_id::text
          or char_length(coalesce(m ->> 'text', '')) not between 1 and 120
          or not exists (select 1 from game.room_players p
                          where p.room_id = v_room_id and p.id::text = m ->> 'player_id'));

  insert into game.ai_generations
    (room_id, round_id, provider, model, prompt_version, status, input_tokens, output_tokens, latency_ms, error)
  values
    (v_room_id, p_round_id, 'openai-compatible', left(p_result ->> 'model', 100), left(p_result ->> 'prompt_version', 40),
     case when v_valid then 'ok' else 'invalid' end,
     (p_result ->> 'input_tokens')::int, (p_result ->> 'output_tokens')::int, (p_result ->> 'latency_ms')::int,
     case when v_valid then null else 'rejected_by_database' end);

  if not v_valid then
    perform game.ai_fallback_now(v_room, v_round);
    return 'invalid';
  end if;

  -- La memoria se aprende aunque la ronda llegue tarde y nunca se sustituye por una más antigua de la misma
  -- partida. Con play_again la sala conserva la memoria (mismos jugadores) pero la numeración vuelve a 1:
  -- `game_started_at` distingue la partida.
  if jsonb_typeof(p_result -> 'memory') = 'object'
     and (coalesce(v_room.memory ->> 'game_started_at', '') is distinct from coalesce(v_room.started_at::text, '')
          or coalesce((p_result -> 'memory' ->> 'updated_round')::int, 0)
             >= coalesce((v_room.memory ->> 'updated_round')::int, 0)) then
    update game.rooms
       set memory = (p_result -> 'memory') || jsonb_build_object('game_started_at', coalesce(v_room.started_at::text, ''))
     where id = v_room_id;
  end if;

  if v_round.status <> 'generating' then return 'late'; end if; -- ya se usó el respaldo

  update game.rounds
     set conversation = jsonb_build_object(
           'title', p_result -> 'chat' ->> 'title',
           'messages', (select jsonb_agg(jsonb_build_object('player_id', m ->> 'player_id', 'text', m ->> 'text'))
                          from jsonb_array_elements(v_messages) m)),
         context = v_room.setup, source = 'ai', status = 'ready'
   where id = p_round_id;

  if v_room.status = 'playing' and v_room.phase = 'generating' and v_room.current_round = v_round.round_number then
    perform game.advance(v_room_id); -- la sala esperaba esta ronda: empieza ya
  end if;
  return 'ok';
end $$;

create or replace function public.ai_fail_round(p_round_id uuid, p_status text, p_error text) returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_room_id uuid;
  v_room game.rooms;
  v_round game.rounds;
begin
  select room_id into v_room_id from game.rounds where id = p_round_id;
  if v_room_id is null then return 'round_not_found'; end if;
  select * into v_room from game.rooms where id = v_room_id for update;
  select * into v_round from game.rounds where id = p_round_id for update;

  insert into game.ai_generations (room_id, round_id, status, error)
  values (v_room_id, p_round_id,
          case when p_status in ('error', 'timeout', 'invalid') then p_status else 'error' end,
          left(p_error, 500));
  perform game.ai_fallback_now(v_room, v_round);
  return 'fallback';
end $$;

-- ───────────────────────── Permisos ─────────────────────────

-- Solo la Edge Function (service_role) puede cerrar rondas. Los helpers internos, nadie desde fuera.
revoke all on function public.ai_complete_round(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.ai_fail_round(uuid, text, text) from public, anon, authenticated;
grant execute on function public.ai_complete_round(uuid, jsonb) to service_role;
grant execute on function public.ai_fail_round(uuid, text, text) to service_role;

revoke all on function game.ai_round_input(uuid) from public, anon, authenticated;
revoke all on function game.request_generation(uuid) from public, anon, authenticated;
revoke all on function game.ai_fallback_now(game.rooms, game.rounds) from public, anon, authenticated;

notify pgrst, 'reload schema';
