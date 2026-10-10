-- Typing… · Migración: tiempos por defecto más cortos (10 oct, 14:08).
--
-- - Votar: 25 s → 15 s (la puntuación Kahoot va de 200 a 100 a lo largo de esos 15 s).
-- - Revelación entre rondas: 12 s → 8 s.
-- Solo cambia el valor por defecto de las salas nuevas y las salas que aún están en el lobby con los
-- valores antiguos. Las partidas en curso no se tocan: la puntuación por rapidez calcula el inicio de la
-- votación con voting_seconds, así que cambiarlo a mitad de una votación descuadraría los puntos.

alter table game.rooms alter column settings set default '{
  "rounds": null, "writing_seconds": 45, "voting_seconds": 15, "reveal_seconds": 8,
  "leaderboard_seconds": 4, "max_players": 8, "mimic": false, "host_advance": true, "require_approval": false
}'::jsonb;

update game.rooms
   set settings = settings || '{"voting_seconds": 15}'::jsonb
 where status = 'lobby' and (settings ->> 'voting_seconds')::int = 25;

update game.rooms
   set settings = settings || '{"reveal_seconds": 8}'::jsonb
 where status = 'lobby' and (settings ->> 'reveal_seconds')::int = 12;
