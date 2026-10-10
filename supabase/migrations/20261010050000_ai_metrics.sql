-- Typing… · Migración: métricas de la IA (solo lectura, esquema privado `game`).
--
-- game.ai_naturalness: rasgos de escritura de los chats de la IA (por versión de prompt e idioma) frente a los
--   fragmentos reales de game.style_examples. Cuanto más se parezcan las filas, más natural suena.
-- game.ai_quality: lo que dicen los jugadores en partidas terminadas (sin las salas de prueba "E2E"):
--   😂 por ronda, % de votos a la respuesta real, % engañados por amigos y % engañados por el bot Mimic.
-- Consultar con: select * from game.ai_naturalness;  select * from game.ai_quality;

create or replace view game.ai_naturalness as
with lines as (
  select 'real chats' as source, e.lang, l ->> 'text' as t
    from game.style_examples e, jsonb_array_elements(e.lines) l
   where e.kind = 'chat'
  union all
  select coalesce(g.prompt_version, 'ai (unlogged)'), game.room_lang(ro.setup), m ->> 'text'
    from game.rounds r
    join game.rooms ro on ro.id = r.room_id
    left join lateral (select g.prompt_version from game.ai_generations g
                        where g.round_id = r.id and g.status = 'ok' and g.prompt_version like 'round-%'
                        order by g.created_at desc limit 1) g on true,
         jsonb_array_elements(r.conversation -> 'messages') m
   where r.source = 'ai'
)
select source, lang, count(*) as messages,
       percentile_cont(0.5) within group (order by char_length(t)) as median_chars,
       round(avg(array_length(regexp_split_to_array(btrim(t), '\s+'), 1))::numeric, 1) as avg_words,
       round(avg((t ~ '^[[:upper:]]')::int) * 100) as pct_starts_upper,
       round(avg((t ~ ',')::int) * 100) as pct_comma,
       round(avg((t ~ '[¿¡]')::int) * 100) as pct_inverted_marks,
       round(avg((t ~ '[^.]\.$')::int) * 100) as pct_final_period,
       round(avg((t ~ '[\U0001F300-\U0001FAFF☀-➿]')::int) * 100) as pct_emoji,
       round(avg((t ~* '(ja){2,}|(je){2,}|(ha){2,}|\mlol\M|\mlmao\M|\mxd+\M|\mjsjs')::int) * 100) as pct_laughter,
       round(avg((t ~ '([[:alpha:]])\1\1')::int) * 100) as pct_stretched
  from lines
 group by source, lang;

create or replace view game.ai_quality as
with rounds as (
  select r.id,
         game.room_lang(ro.setup) as lang,
         case when r.source = 'ai' then coalesce(
                (select g.prompt_version from game.ai_generations g
                  where g.round_id = r.id and g.status = 'ok' and g.prompt_version like 'round-%'
                  order by g.created_at desc limit 1), 'ai (unlogged)')
              else 'fallback' end as version
    from game.rounds r
    join game.rooms ro on ro.id = r.room_id
   where r.status = 'done'
     and not exists (select 1 from game.room_players p where p.room_id = r.room_id and p.display_name like 'E2E%')
), votes as (
  select v.round_id,
         count(*) as total,
         count(*) filter (where a.is_real) as on_real,
         count(*) filter (where not a.is_real and not a.is_bot) as on_friends,
         count(*) filter (where a.is_bot) as on_bot
    from game.votes v join game.answers a on a.id = v.answer_id
   group by v.round_id
), laughs as (
  select a.round_id, count(*) as n
    from game.reactions re join game.answers a on a.id = re.answer_id
   group by a.round_id
)
select r.version, r.lang, count(*) as rounds,
       round(avg(coalesce(l.n, 0)), 2) as laughs_per_round,
       round(100.0 * sum(coalesce(v.on_real, 0)) / nullif(sum(v.total), 0)) as pct_votes_on_real,
       round(100.0 * sum(coalesce(v.on_friends, 0)) / nullif(sum(v.total), 0)) as pct_votes_fooled_by_friends,
       round(100.0 * sum(coalesce(v.on_bot, 0)) / nullif(sum(v.total), 0)) as pct_votes_fooled_by_mimic
  from rounds r
  left join votes v on v.round_id = r.id
  left join laughs l on l.round_id = r.id
 group by r.version, r.lang;

revoke all on game.ai_naturalness from public, anon, authenticated;
revoke all on game.ai_quality from public, anon, authenticated;
