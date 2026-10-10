-- Typing… · Migración: "¿picante?" = no del host se respeta en toda la IA y en los respaldos.
--
-- game.spicy_allowed solo miraba la edad, así que en una sala de adultos con setup.spicy = 'no':
--   - game.ai_round_input mandaba chats picantes del equipo como house_examples (y style_examples picantes),
--     contradiciendo al prompt ("no flirting, dating…");
--   - game.fill_fallback podía elegir un respaldo picante (ex en Tinder, "quién se fue con quién");
--   - el bot Mimic (ai_round_context.spicy_allowed) recibía ejemplos de respuesta picantes.
-- Solo game.request_drafts lo comprobaba aparte. Ahora la regla vive en un único sitio: todos los anteriores
-- llaman a esta función y quedan arreglados sin redefinirlos.
-- Idempotente.

create or replace function game.spicy_allowed(p_setup jsonb) returns boolean
language sql stable set search_path = ''
as $$
  select coalesce(p_setup ->> 'spicy', 'yes') <> 'no'
     and coalesce(p_setup ->> 'age', '') <> all (
       select jsonb_array_elements_text(coalesce(rules -> 'disables_spicy_when', '[]'::jsonb))
         from game.setup_questions where id = 'age'
     )
$$;

revoke all on function game.spicy_allowed(jsonb) from public, anon, authenticated;
