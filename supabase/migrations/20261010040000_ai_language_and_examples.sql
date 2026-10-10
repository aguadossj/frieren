-- Typing… · Migración: el idioma de la sala manda en la IA y en los respaldos; los chats del equipo vuelven a ser
-- la referencia de la IA.
--
-- - game.fallback_chats tiene `lang` ('en' | 'es') y versión en castellano de los 13 chats del equipo.
--   game.fill_fallback solo elige chats del idioma de la sala (setup.lang, por defecto 'en').
-- - game.house_examples(lang, n, spicy): chats del equipo (fallback_chats) como ejemplos de estructura para la IA.
-- - game.style_examples_for(kind, n, spicy, lang): solo fragmentos del idioma de la sala.
-- - game.ai_round_input envía house_examples + style_examples del idioma de la sala; game.request_mimic igual.
-- Idempotente.

-- ───────────────────────── Respaldos por idioma ─────────────────────────

alter table game.fallback_chats add column if not exists lang text not null default 'en';

insert into game.fallback_chats (id, vibe, title, lines, spicy, lang) values
  ('uni-yogurt-es', 'uni', 'Piso 3B', '[{"who":0,"text":"¿quién se ha comido mi yogur? 😤"},{"who":1,"text":"{writer} tiene yogur en la cara"},{"who":0,"text":"{writer}?? explícate"}]', false, 'es'),
  ('uni-project-es', 'uni', 'Trabajo en grupo 📚', '[{"who":0,"text":"la entrega es en 3 horas"},{"who":1,"text":"yo hice la intro y la conclusión"},{"who":0,"text":"{writer} y tú qué has hecho exactamente"}]', false, 'es'),
  ('uni-alarm-es', 'uni', 'Los del examen', '[{"who":0,"text":"el examen empieza en 10 min dónde estás"},{"who":1,"text":"su ubicación dice que sigue en casa 💀"},{"who":0,"text":"{writer} coge el teléfono"}]', false, 'es'),
  ('work-meeting-es', 'work', 'Equipo 💼', '[{"who":0,"text":"por qué el jefe acaba de decir tu nombre en la reunión general"},{"who":1,"text":"estaba cabreadísimo"},{"who":0,"text":"{writer} qué has hecho"}]', false, 'es'),
  ('work-friday-es', 'work', 'Los de la ofi', '[{"who":0,"text":"alguien ha vuelto a calentar pescado en el micro"},{"who":1,"text":"huele toda la planta"},{"who":0,"text":"{writer} confiesa"}]', false, 'es'),
  ('chaos-cat-es', 'chaos', 'La pandilla', '[{"who":0,"text":"por qué hay una cabra en el salón"},{"who":1,"text":"lleva un sombrero"},{"who":0,"text":"{writer} anoche fuiste tú quien cerró la puerta"}]', false, 'es'),
  ('chaos-tattoo-es', 'chaos', 'Finde 🍸', '[{"who":0,"text":"eso de tu story es un tatuaje nuevo??"},{"who":1,"text":"pone algo en chino"},{"who":0,"text":"{writer} qué significa"}]', false, 'es'),
  ('ethics-wallet-es', 'ethics', 'Los de la cena', '[{"who":0,"text":"me he encontrado una cartera con 200€ en el bus"},{"who":1,"text":"dentro hay un DNI"},{"who":0,"text":"{writer} sinceramente qué harías"}]', false, 'es'),
  ('ethics-exam-es', 'ethics', 'Grupo de estudio', '[{"who":0,"text":"alguien vende las respuestas del examen por 20€"},{"who":1,"text":"media clase ya las ha comprado"},{"who":0,"text":"{writer} te apuntas o no"}]', false, 'es'),
  ('exes-story-es', 'exes', 'Besties 💅', '[{"who":1,"text":"tu ex me acaba de dar like a la story"},{"who":0,"text":"NO PUEDE SER"},{"who":1,"text":"{writer} le contesto o no"}]', true, 'es'),
  ('exes-k-es', 'exes', 'Noche de chicas', '[{"who":0,"text":"le mando un párrafo y me contesta \"ok\""},{"who":1,"text":"red flag 🚩"},{"who":0,"text":"{writer} tú qué le contestarías"}]', true, 'es'),
  ('spicy-3am-es', 'spicy', 'Planes del sábado', '[{"who":0,"text":"quién se fue con quién anoche"},{"who":1,"text":"yo no digo nada 🤐"},{"who":0,"text":"{writer} desapareciste a las 3. dónde estabas"}]', true, 'es'),
  ('spicy-tinder-es', 'spicy', 'El grupo 🔥', '[{"who":0,"text":"acabo de hacer match con el ex de {writer} en tinder"},{"who":1,"text":"uff esto va a estar bueno"},{"who":0,"text":"{writer} le doy o no"}]', true, 'es')
on conflict (id) do update set title = excluded.title, lines = excluded.lines, spicy = excluded.spicy, lang = excluded.lang, vibe = excluded.vibe;

create or replace function game.room_lang(p_setup jsonb) returns text
language sql immutable set search_path = ''
as $$ select case when p_setup ->> 'lang' = 'es' then 'es' else 'en' end $$;

-- Igual que en la migración de rondas, pero solo con chats del idioma de la sala.
create or replace function game.fill_fallback(p_round_id uuid) returns void
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
  v_lang text;
begin
  select * into v_round from game.rounds where id = p_round_id for update;
  select * into v_room from game.rooms where id = v_round.room_id;
  select * into v_writer from game.room_players where id = v_round.writer_id;
  v_vibes := array(select jsonb_array_elements_text(coalesce(v_room.setup -> 'vibes', '[]'::jsonb)));
  v_lang := game.room_lang(v_room.setup);

  select * into v_chat from game.fallback_chats c
   where c.active and c.lang = v_lang
     and (not c.spicy or game.spicy_allowed(v_room.setup))
     and c.id not in (select r.conversation ->> 'fallback_id' from game.rounds r
                       where r.room_id = v_room.id and r.conversation ? 'fallback_id')
   order by (c.vibe = any (v_vibes)) desc, random()
   limit 1;
  if not found then -- se acabaron: se permite repetir (siempre en el idioma de la sala)
    select * into v_chat from game.fallback_chats c
     where c.active and c.lang = v_lang and (not c.spicy or game.spicy_allowed(v_room.setup))
     order by random() limit 1;
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

-- ───────────────────────── Ejemplos para la IA ─────────────────────────

-- Chats del equipo como ejemplos de estructura. who: A, B… o WRITER; {writer} -> WRITER.
create or replace function game.house_examples(p_lang text, p_n int, p_spicy_allowed boolean) returns jsonb
language sql volatile set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('title', s.title, 'lines', s.lines)), '[]'::jsonb)
    from (select c.title,
                 (select jsonb_agg(jsonb_build_object(
                           'who', case when l ->> 'who' = 'writer' then 'WRITER' else chr(65 + (l ->> 'who')::int) end,
                           'text', replace(l ->> 'text', '{writer}', 'WRITER')) order by ord)
                    from jsonb_array_elements(c.lines) with ordinality as t(l, ord)) as lines
            from game.fallback_chats c
           where c.active and c.lang = p_lang and (p_spicy_allowed or not c.spicy)
           order by random()
           limit p_n) s
$$;

drop function if exists game.style_examples_for(text, int, boolean);
create or replace function game.style_examples_for(p_kind text, p_n int, p_spicy_allowed boolean, p_lang text) returns jsonb
language sql volatile set search_path = ''
as $$
  select coalesce(jsonb_agg(s.lines), '[]'::jsonb)
    from (select e.lines from game.style_examples e
           where e.kind = p_kind and e.active and e.lang = p_lang and (p_spicy_allowed or not e.spicy)
           order by random()
           limit p_n) s
$$;

create or replace function game.ai_round_input(p_round_id uuid) returns jsonb
language plpgsql volatile set search_path = ''
as $$
declare
  v_round game.rounds;
  v_room game.rooms;
  v_lang text;
  v_spicy boolean;
begin
  select * into v_round from game.rounds where id = p_round_id;
  select * into v_room from game.rooms where id = v_round.room_id;
  v_lang := game.room_lang(v_room.setup);
  v_spicy := game.spicy_allowed(v_room.setup);

  return jsonb_build_object(
    'round', v_round.round_number,
    'total_rounds', v_room.total_rounds,
    'setup', v_room.setup || jsonb_build_object('lang', v_lang),
    'writer_id', v_round.writer_id,
    'memory', v_room.memory,
    'house_examples', game.house_examples(v_lang, 2, v_spicy),
    'style_examples', game.style_examples_for('chat', 3, v_spicy, v_lang),
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

create or replace function game.request_mimic(p_round_id uuid) returns void
language plpgsql set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
  v_context jsonb;
  v_lang text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'generate_round_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'generate_round_secret';
  if v_url is null or v_secret is null then raise exception 'ai_not_configured'; end if;
  v_context := public.ai_round_context(p_round_id);
  v_lang := game.room_lang(v_context -> 'setup');
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object(
      'mode', 'mimic',
      'round_id', p_round_id,
      'context', jsonb_set(v_context, '{setup}', coalesce(v_context -> 'setup', '{}'::jsonb) || jsonb_build_object('lang', v_lang)),
      'examples', game.style_examples_for('reply', 6, coalesce((v_context ->> 'spicy_allowed')::boolean, false), v_lang)),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-generate-secret', v_secret),
    timeout_milliseconds := 15000
  );
end $$;

revoke all on function game.room_lang(jsonb) from public, anon, authenticated;
revoke all on function game.fill_fallback(uuid) from public, anon, authenticated;
revoke all on function game.house_examples(text, int, boolean) from public, anon, authenticated;
revoke all on function game.style_examples_for(text, int, boolean, text) from public, anon, authenticated;
revoke all on function game.ai_round_input(uuid) from public, anon, authenticated;
revoke all on function game.request_mimic(uuid) from public, anon, authenticated;
