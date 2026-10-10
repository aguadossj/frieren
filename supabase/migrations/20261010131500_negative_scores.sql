-- Typing… · Migración: la puntuación puede ser negativa (10 oct, 13:15).
-- Antes, votar al bot Mimic (−100) nunca te bajaba de 0. Ahora sí: con 0 puntos y votando al bot te quedas en −100.
-- Solo cambia la línea del `update game.room_players` de begin_reveal (resto igual que speed_scoring).

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
  v_total int;
  v_start timestamptz;
begin
  select * into v_room from game.rooms where id = p_room_id;
  select * into v_round from game.rounds where room_id = p_room_id and round_number = v_room.current_round;
  select * into v_writer from game.room_players where id = v_round.writer_id;

  -- Cuándo empezó la votación: begin_voting fija phase_ends_at = inicio + voting_seconds (y la votación no lo cambia).
  v_total := greatest(1, game.setting_seconds(v_room, 'voting_seconds', 15));
  v_start := coalesce(v_room.phase_ends_at, now()) - make_interval(secs => v_total);

  -- Solo puntúa acertar la real (200 → 100 según lo rápido) y votar al bot resta. Un voto por persona.
  insert into game.round_scores (round_id, player_id, points, breakdown)
  select v_round.id, s.player_id, sum(s.points), jsonb_object_agg(s.reason, s.points)
  from (
    select v.voter_id as player_id, 'found_real' as reason, game.speed_points(v.created_at, v_start, v_total) as points
      from game.votes v join game.answers a on a.id = v.answer_id
     where v.round_id = v_round.id and a.is_real
    union all
    select v.voter_id, 'fooled_by_bot', -v_penalty
      from game.votes v join game.answers a on a.id = v.answer_id
     where v.round_id = v_round.id and a.is_bot
  ) s
  group by s.player_id
  on conflict (round_id, player_id) do nothing;

  -- Sin suelo: la puntuación puede quedar en negativo (votar al bot Mimic resta 100 aunque tengas 0).
  update game.room_players p set score = p.score + rs.points
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
