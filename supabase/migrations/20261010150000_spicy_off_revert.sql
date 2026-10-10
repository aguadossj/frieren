-- Typing… · Migración: deshace 20261010140000_spicy_off (decisión del equipo).
--
-- game.spicy_allowed vuelve a mirar solo la edad (definición original de la migración de rondas). El "¿picante? no"
-- del host sigue llegando a la IA por el prompt (core.ts: noSpicy) y a los borradores (game.request_drafts), pero ya
-- no filtra los ejemplos del equipo, los respaldos ni los ejemplos de Mimic.
-- Idempotente.

create or replace function game.spicy_allowed(p_setup jsonb) returns boolean
language sql stable set search_path = ''
as $$
  select coalesce(p_setup ->> 'age', '') <> all (
    select jsonb_array_elements_text(coalesce(rules -> 'disables_spicy_when', '[]'::jsonb))
      from game.setup_questions where id = 'age'
  )
$$;

revoke all on function game.spicy_allowed(jsonb) from public, anon, authenticated;
