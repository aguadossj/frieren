-- ⚠️ PENDIENTE: NO aplicada todavía en Supabase. Al aplicarla con el MCP, renombrar con la versión que asigne Supabase.
-- Typing… · Migración 3: contexto libre para la IA en `save_setup` y `play_again`.
--
-- - `save_setup` sigue validando las preguntas del catálogo (game.setup_questions), y además acepta
--   claves de contexto libres y opcionales (p. ej. `situation`, `know` de la pantalla de crear sala) que
--   solo sirven de contexto para la IA. Límites: clave ^[a-z][a-z0-9_]{0,31}$; valor texto ≤ 120,
--   lista de ≤ 10 textos ≤ 40, número, booleano o null; máx. 20 claves en total.
-- - `play_again`: al acabar, cualquier jugador devuelve la sala al lobby (mismos jugadores, puntos a 0, mismo contexto).

create or replace function public.save_setup(p_room_id uuid, p_answers jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_room game.rooms;
  v_q game.setup_questions;
  v_key text;
  v_val jsonb;
  v_clean jsonb := '{}'::jsonb;
  v_allowed text[];
begin
  perform game.require_host(p_room_id);
  select * into v_room from game.rooms where id = p_room_id for update;
  if v_room.status not in ('lobby', 'playing') then raise exception 'room_not_active' using errcode = '55000'; end if;
  if jsonb_typeof(coalesce(p_answers, '{}'::jsonb)) <> 'object' then raise exception 'invalid_setup' using errcode = '22023'; end if;

  for v_key, v_val in select * from jsonb_each(p_answers) loop
    select * into v_q from game.setup_questions where id = v_key and active;

    if not found then
      -- Contexto libre (no es una pregunta del catálogo): solo se valida forma y tamaño.
      if v_key !~ '^[a-z][a-z0-9_]{0,31}$' then raise exception 'invalid_context_key' using errcode = '22023'; end if;
      if v_val is null or jsonb_typeof(v_val) in ('null', 'number', 'boolean') then
        v_clean := v_clean || jsonb_build_object(v_key, v_val);
      elsif jsonb_typeof(v_val) = 'string' then
        v_clean := v_clean || jsonb_build_object(v_key, left(btrim(v_val #>> '{}'), 120));
      elsif jsonb_typeof(v_val) = 'array' and jsonb_array_length(v_val) <= 10
            and not exists (select 1 from jsonb_array_elements(v_val) x where jsonb_typeof(x) <> 'string') then
        v_clean := v_clean || jsonb_build_object(v_key,
          (select coalesce(jsonb_agg(left(btrim(x), 40)), '[]'::jsonb) from jsonb_array_elements_text(v_val) x));
      else
        raise exception 'invalid_context:%', v_key using errcode = '22023';
      end if;
      continue;
    end if;

    v_allowed := array(select o ->> 'value' from jsonb_array_elements(v_q.options) o);
    if v_val is null or v_val = 'null'::jsonb then
      v_clean := v_clean || jsonb_build_object(v_key, null);
    elsif v_q.kind = 'single' then
      if jsonb_typeof(v_val) <> 'string' or not (v_val #>> '{}') = any (v_allowed) then
        raise exception 'invalid_answer:%', v_key using errcode = '22023';
      end if;
      v_clean := v_clean || jsonb_build_object(v_key, v_val);
    elsif v_q.kind = 'multi' then
      if jsonb_typeof(v_val) <> 'array' or exists (
        select 1 from jsonb_array_elements_text(v_val) x where not x = any (v_allowed)
      ) then raise exception 'invalid_answer:%', v_key using errcode = '22023'; end if;
      v_clean := v_clean || jsonb_build_object(v_key, v_val);
    elsif v_q.kind = 'text' then
      v_clean := v_clean || jsonb_build_object(v_key,
        left(btrim(v_val #>> '{}'), coalesce((v_q.rules ->> 'max_length')::int, 120)));
    elsif v_q.kind = 'scale' then
      v_clean := v_clean || jsonb_build_object(v_key, (v_val #>> '{}')::numeric);
    end if;
  end loop;

  if (select count(*) from jsonb_object_keys(v_room.setup || v_clean)) > 20 then
    raise exception 'too_much_context' using errcode = '22023';
  end if;

  update game.rooms set setup = setup || v_clean where id = p_room_id;
  perform game.log_event(p_room_id, 'setup_saved', jsonb_build_object('keys', (select jsonb_agg(k) from jsonb_object_keys(v_clean) k)));
  perform game.touch_room(p_room_id);
  return (select setup from game.rooms where id = p_room_id);
end $$;

create function public.play_again(p_room_id uuid) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_room game.rooms;
  v_code text;
begin
  perform game.require_member(p_room_id);
  select * into v_room from game.rooms where id = p_room_id for update;
  if v_room.status = 'lobby' then return; end if; -- otro jugador ya lo pulsó
  if v_room.status <> 'finished' then raise exception 'not_finished' using errcode = '55000'; end if;

  -- Mientras la sala estaba terminada otra pudo coger el mismo código: si pasa, código nuevo.
  v_code := v_room.code;
  if exists (select 1 from game.rooms where code = v_code and status in ('lobby', 'playing') and id <> p_room_id) then
    for i in 1..30 loop
      v_code := (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ', 1 + floor(random() * 24)::int, 1), '')
                   from generate_series(1, 4));
      exit when not exists (select 1 from game.rooms where code = v_code and status in ('lobby', 'playing'));
    end loop;
  end if;

  delete from game.rounds where room_id = p_room_id; -- respuestas, votos y puntos de ronda en cascada
  update game.room_players set score = 0 where room_id = p_room_id;
  update game.rooms
     set status = 'lobby', code = v_code, phase = null, phase_ends_at = null, current_round = 0,
         total_rounds = null, started_at = null, ended_at = null
   where id = p_room_id;

  perform game.ensure_host(p_room_id);
  perform game.log_event(p_room_id, 'play_again');
  perform game.touch_room(p_room_id);
end $$;

revoke all on function public.play_again(uuid) from public, anon;
grant execute on function public.play_again(uuid) to authenticated;
