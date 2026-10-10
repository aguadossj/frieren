-- Typing… · Migración: un doble toque del host ya no se salta la escritura de la ronda siguiente.
--
-- "Empezar ronda 2" llama a skip_phase, que avanza la fase que haya en ese momento. El botón no se bloquea al tocarlo
-- y la pantalla tarda un instante en cambiar, así que un segundo toque (~1 s después) llegaba con la ronda 2 ya en
-- `writing` y la mandaba directa a `voting`, sin respuestas. Visto en 4 de 44 rondas 2 reales (10 oct); nunca en la 1.
-- Ahora skip_phase bloquea la sala y descarta un salto si el anterior fue hace menos de 3 s.
-- Idempotente.

create or replace function public.skip_phase(p_room_id uuid) returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  perform game.require_host(p_room_id);
  -- El bloqueo va antes de mirar: dos toques casi a la vez se ponen en fila y el segundo ya ve el primero.
  perform 1 from game.rooms where id = p_room_id for update;
  if exists (select 1 from game.events e
              where e.room_id = p_room_id and e.type = 'phase_skipped'
                and e.created_at > now() - interval '3 seconds') then
    return false;
  end if;
  perform game.log_event(p_room_id, 'phase_skipped');
  return game.advance(p_room_id, true);
end $$;

revoke all on function public.skip_phase(uuid) from public, anon;
grant execute on function public.skip_phase(uuid) to authenticated;
