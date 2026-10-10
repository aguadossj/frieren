-- Typing… · Migración: ejemplos de estilo para la IA y disparo del bot Mimic.
--
-- 1. game.style_examples: fragmentos REALES de chats de grupo, anonimizados (hablantes A, B, C…; sin nombres,
--    menciones, enlaces ni números). Los datos NO están en git: se cargan aparte desde un export privado.
--    kind 'chat'  -> 3–6 mensajes seguidos: ritmo y tono para las conversaciones que escribe la IA.
--    kind 'reply' -> pregunta + respuesta real: cómo contesta la gente, para las respuestas del bot Mimic.
--    `spicy` (alcohol, fiestas…) nunca se usa si game.spicy_allowed(setup) es falso.
-- 2. game.ai_round_input añade `style_examples` (3 fragmentos al azar, con preferencia por los que están en inglés).
-- 3. Bot Mimic: game.begin_writing lo pide por pg_net si game.mimic_active(sala). Misma Edge Function y secretos
--    que generate-round, con { mode: 'mimic', round_id, context, examples }. Nunca rompe begin_writing.
-- Idempotente (create or replace / if not exists).

create table if not exists game.style_examples (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('chat', 'reply')),
  lang text not null,
  spicy boolean not null default false,
  lines jsonb not null, -- [{ "who": "A", "text": "..." }]
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table game.style_examples enable row level security;
revoke all on table game.style_examples from public, anon, authenticated;

-- n ejemplos al azar; los de inglés salen el doble de a menudo (la partida es en inglés).
create or replace function game.style_examples_for(p_kind text, p_n int, p_spicy_allowed boolean) returns jsonb
language sql volatile set search_path = ''
as $$
  select coalesce(jsonb_agg(s.lines), '[]'::jsonb)
    from (select e.lines from game.style_examples e
           where e.kind = p_kind and e.active and (p_spicy_allowed or not e.spicy)
           order by random() * case when e.lang = 'en' then 0.5 else 1 end
           limit p_n) s
$$;

-- ───────────────────────── Generador de conversaciones ─────────────────────────

create or replace function game.ai_round_input(p_round_id uuid) returns jsonb
language plpgsql volatile set search_path = ''
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
    'style_examples', game.style_examples_for('chat', 3, game.spicy_allowed(v_room.setup)),
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
              from game.answers a where a.round_id = r.id and not a.is_real and not a.is_bot), '[]'::jsonb),
          'found_by', case when sc.scored then (
            select count(*) from game.votes v join game.answers a on a.id = v.answer_id
             where v.round_id = r.id and a.is_real) end,
          'laughs', case when sc.scored then (
            select coalesce(jsonb_object_agg(x.player_id, x.n), '{}'::jsonb)
              from (select a.player_id, count(*) as n
                      from game.reactions re join game.answers a on a.id = re.answer_id
                     where a.round_id = r.id and not a.is_bot group by a.player_id) x) end
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

-- ───────────────────────── Bot Mimic ─────────────────────────

create or replace function game.request_mimic(p_round_id uuid) returns void
language plpgsql set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
  v_context jsonb;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'generate_round_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'generate_round_secret';
  if v_url is null or v_secret is null then raise exception 'ai_not_configured'; end if;
  v_context := public.ai_round_context(p_round_id);
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object(
      'mode', 'mimic',
      'round_id', p_round_id,
      'context', v_context,
      'examples', game.style_examples_for('reply', 6, coalesce((v_context ->> 'spicy_allowed')::boolean, false))),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-generate-secret', v_secret),
    timeout_milliseconds := 15000
  );
end $$;

create or replace function game.begin_writing(p_room_id uuid, p_round_number int) returns void
language plpgsql set search_path = ''
as $$
declare
  v_room game.rooms;
  v_round_id uuid;
begin
  select * into v_room from game.rooms where id = p_room_id;
  update game.rounds set status = 'playing', started_at = now()
   where room_id = p_room_id and round_number = p_round_number
   returning id into v_round_id;
  update game.rooms
     set current_round = p_round_number, phase = 'writing',
         phase_ends_at = now() + make_interval(secs => game.setting_seconds(v_room, 'writing_seconds', 25))
   where id = p_room_id;
  perform game.log_event(p_room_id, 'round_started', jsonb_build_object('round', p_round_number));

  -- Bot Mimic: si falla la petición, la ronda sigue sin él.
  if game.mimic_active(v_room) and v_round_id is not null then
    begin
      perform game.request_mimic(v_round_id);
    exception when others then
      perform game.log_event(p_room_id, 'mimic_request_failed', jsonb_build_object('error', sqlerrm));
    end;
  end if;
end $$;

revoke all on function game.style_examples_for(text, int, boolean) from public, anon, authenticated;
revoke all on function game.ai_round_input(uuid) from public, anon, authenticated;
revoke all on function game.request_mimic(uuid) from public, anon, authenticated;
revoke all on function game.begin_writing(uuid, int) from public, anon, authenticated;
