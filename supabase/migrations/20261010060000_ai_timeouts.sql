-- Typing… · Migración: tiempos de espera para un modelo más lento (Hermes 3 70B vía OpenRouter, ~10–13 s por chat).
-- - Ronda 1: la sala espera en `generating` hasta 20 s (antes 12) antes de usar el respaldo.
-- - pg_net espera a la Edge Function hasta 35 s (rondas 2+ tienen ~25 s de margen) y 25 s para el bot Mimic.
-- Idempotente. Para volver a Groq basta con bajar generation_timeout_seconds a 12.

update game.config set value = '20' where key = 'generation_timeout_seconds';

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
      timeout_milliseconds := 35000
    );
  exception when others then
    perform game.log_event((select room_id from game.rounds where id = p_round_id),
                           'generation_request_failed', jsonb_build_object('error', sqlerrm));
    perform game.fill_fallback(p_round_id);
  end;
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
    timeout_milliseconds := 25000
  );
end $$;

revoke all on function game.request_generation(uuid) from public, anon, authenticated;
revoke all on function game.request_mimic(uuid) from public, anon, authenticated;
