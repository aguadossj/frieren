-- Typing… · Migración: borradores de la ronda 1 escritos en segundo plano mientras se une la gente.
--
-- Cuando el host termina las tarjetas (save_setup con `know`, sala en lobby), un trigger pide a la Edge Function
-- 3 chats "borrador" sin nombres: {W} es quien contestará y {P1} {P2} {P3} los demás. Llegan en ~10 s, mucho antes
-- de que el host pulse Empezar. Al empezar, la ronda 1 coge un borrador y pone los nombres reales: sin esperar a la IA.
-- Si no hay borrador listo (se empezó muy rápido o la IA falló), la ronda 1 se genera como siempre.
-- Las rondas 2+ siguen generándose con nombres y memoria durante la votación anterior.
-- Idempotente.

create table if not exists game.ai_drafts (
  id bigint generated always as identity primary key,
  room_id uuid not null references game.rooms (id) on delete cascade,
  setup_hash text not null,           -- md5 del setup para el que se escribió
  conversation jsonb not null,        -- { title, lines: [{ from: 'P1'|'P2'|'P3', text: '... {W} ... {P1} ...' }] }
  theme text,                         -- id de THEMES (core.ts), para no repetirlo en las rondas siguientes
  situation text,
  used_round_id uuid references game.rounds (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists ai_drafts_room_id_idx on game.ai_drafts (room_id);
alter table game.ai_drafts enable row level security;
revoke all on table game.ai_drafts from public, anon, authenticated;

create or replace function game.setup_hash(p_setup jsonb) returns text
language sql immutable set search_path = ''
as $$ select md5(coalesce(p_setup, '{}'::jsonb)::text) $$;

-- Pide borradores para la sala si hace falta. Nunca rompe a quien la llama.
create or replace function game.request_drafts(p_room_id uuid) returns void
language plpgsql set search_path = ''
as $$
declare
  v_room game.rooms;
  v_hash text;
  v_url text;
  v_secret text;
  v_lang text;
  v_spicy boolean;
begin
  select * into v_room from game.rooms where id = p_room_id;
  if not found or v_room.status <> 'lobby' or not (v_room.setup ? 'know') then return; end if;
  if not coalesce((game.conf('ai_enabled'))::boolean, false) then return; end if;
  v_hash := game.setup_hash(v_room.setup);

  -- Los borradores de un setup anterior ya no valen.
  delete from game.ai_drafts where room_id = p_room_id and used_round_id is null and setup_hash <> v_hash;
  -- Ya hay borradores para este setup, o se pidieron hace menos de un minuto.
  if exists (select 1 from game.ai_drafts where room_id = p_room_id and setup_hash = v_hash and used_round_id is null)
     or exists (select 1 from game.events where room_id = p_room_id and type = 'drafts_requested'
                  and payload ->> 'hash' = v_hash and created_at > now() - interval '60 seconds') then
    return;
  end if;

  begin
    select decrypted_secret into v_url from vault.decrypted_secrets where name = 'generate_round_url';
    select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'generate_round_secret';
    if v_url is null or v_secret is null then raise exception 'ai_not_configured'; end if;
    v_lang := game.room_lang(v_room.setup);
    v_spicy := game.spicy_allowed(v_room.setup) and coalesce(v_room.setup ->> 'spicy', 'yes') <> 'no';
    perform net.http_post(
      url := v_url,
      body := jsonb_build_object(
        'mode', 'drafts',
        'room_id', p_room_id,
        'setup_hash', v_hash,
        'count', 3,
        'input', jsonb_build_object(
          'setup', v_room.setup || jsonb_build_object('lang', v_lang),
          'house_examples', game.house_examples(v_lang, 2, v_spicy),
          'style_examples', game.style_examples_for('chat', 3, v_spicy, v_lang))),
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-generate-secret', v_secret),
      timeout_milliseconds := 45000
    );
    perform game.log_event(p_room_id, 'drafts_requested', jsonb_build_object('hash', v_hash));
  exception when others then
    perform game.log_event(p_room_id, 'drafts_request_failed', jsonb_build_object('error', sqlerrm));
  end;
end $$;

create or replace function game.rooms_setup_drafts() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  begin
    perform game.request_drafts(new.id);
  exception when others then
    null; -- los borradores son una mejora: nunca deben romper save_setup
  end;
  return null;
end $$;

drop trigger if exists rooms_setup_drafts on game.rooms;
create trigger rooms_setup_drafts
  after update of setup on game.rooms
  for each row when (new.setup is distinct from old.setup and new.status = 'lobby')
  execute function game.rooms_setup_drafts();

-- La Edge Function entrega aquí los borradores (solo service_role).
create or replace function public.ai_save_drafts(p_room_id uuid, p_setup_hash text, p_drafts jsonb) returns int
language plpgsql security definer set search_path = ''
as $$
declare
  v_room game.rooms;
  v_draft jsonb;
  n int := 0;
begin
  select * into v_room from game.rooms where id = p_room_id;
  if not found or game.setup_hash(v_room.setup) <> p_setup_hash or jsonb_typeof(p_drafts) <> 'array' then return 0; end if;
  for v_draft in select * from jsonb_array_elements(p_drafts) loop
    if jsonb_typeof(v_draft -> 'lines') = 'array' and jsonb_array_length(v_draft -> 'lines') between 2 and 6
       and char_length(coalesce(v_draft ->> 'title', '')) between 1 and 40
       and not exists (select 1 from jsonb_array_elements(v_draft -> 'lines') l
                        where (l ->> 'from') not in ('P1', 'P2', 'P3')
                           or char_length(coalesce(l ->> 'text', '')) not between 1 and 120)
       and (v_draft -> 'lines' -> -1 ->> 'text') like '%{W}%' then
      insert into game.ai_drafts (room_id, setup_hash, conversation, theme, situation)
      values (p_room_id, p_setup_hash,
              jsonb_build_object('title', v_draft ->> 'title', 'lines', v_draft -> 'lines'),
              left(v_draft ->> 'theme', 40), left(v_draft ->> 'situation', 80));
      n := n + 1;
    end if;
  end loop;
  perform game.log_event(p_room_id, 'drafts_saved', jsonb_build_object('count', n));
  return n;
end $$;

-- Pone un borrador en la ronda con los nombres reales. Devuelve false si no hay ninguno válido.
create or replace function game.use_draft(p_round_id uuid) returns boolean
language plpgsql set search_path = ''
as $$
declare
  v_round game.rounds;
  v_room game.rooms;
  v_draft game.ai_drafts;
  v_writer game.room_players;
  v_others game.room_players[];
  v_names jsonb;
  v_messages jsonb;
  v_title text;
  v_memory jsonb;
begin
  select * into v_round from game.rounds where id = p_round_id for update;
  select * into v_room from game.rooms where id = v_round.room_id;
  select * into v_draft from game.ai_drafts
   where room_id = v_room.id and used_round_id is null and setup_hash = game.setup_hash(v_room.setup)
   order by created_at limit 1
   for update skip locked;
  if not found then return false; end if;

  select * into v_writer from game.room_players where id = v_round.writer_id;
  v_others := array(select p from game.room_players p
                     where p.room_id = v_room.id and p.status = 'active' and p.id <> v_writer.id order by random());
  if coalesce(array_length(v_others, 1), 0) = 0 then return false; end if;

  -- {W} -> writer; {P1} {P2} {P3} -> los demás (si hay menos, se repiten).
  v_names := jsonb_build_object(
    'W', v_writer.display_name,
    'P1', (v_others[1]).display_name,
    'P2', (v_others[1 + (1 % array_length(v_others, 1))]).display_name,
    'P3', (v_others[1 + (2 % array_length(v_others, 1))]).display_name);

  select jsonb_agg(jsonb_build_object(
           'player_id', case l ->> 'from'
                          when 'P1' then (v_others[1]).id
                          when 'P2' then (v_others[1 + (1 % array_length(v_others, 1))]).id
                          else (v_others[1 + (2 % array_length(v_others, 1))]).id end,
           'text', replace(replace(replace(replace(l ->> 'text',
                     '{W}', v_names ->> 'W'), '{P1}', v_names ->> 'P1'), '{P2}', v_names ->> 'P2'), '{P3}', v_names ->> 'P3')
         ) order by ord)
    into v_messages
    from jsonb_array_elements(v_draft.conversation -> 'lines') with ordinality as t(l, ord);
  v_title := replace(replace(replace(replace(v_draft.conversation ->> 'title',
               '{W}', v_names ->> 'W'), '{P1}', v_names ->> 'P1'), '{P2}', v_names ->> 'P2'), '{P3}', v_names ->> 'P3');

  update game.rounds
     set conversation = jsonb_build_object('title', v_title, 'messages', v_messages, 'draft_id', v_draft.id),
         context = v_room.setup, source = 'ai', status = 'ready'
   where id = p_round_id;
  update game.ai_drafts set used_round_id = p_round_id where id = v_draft.id;

  -- Que las rondas siguientes no repitan tema ni situación.
  v_memory := coalesce(v_room.memory, '{}'::jsonb);
  v_memory := jsonb_set(v_memory, '{used_themes}',
                coalesce(v_memory -> 'used_themes', '[]'::jsonb) || to_jsonb(array_remove(array[v_draft.theme], null)));
  v_memory := jsonb_set(v_memory, '{used_situations}',
                coalesce(v_memory -> 'used_situations', '[]'::jsonb) || to_jsonb(array_remove(array[v_draft.situation], null)));
  update game.rooms set memory = v_memory where id = v_room.id;

  perform game.log_event(v_room.id, 'draft_used', jsonb_build_object('round', v_round.round_number, 'draft', v_draft.id));
  return true;
end $$;

-- Igual que en ai_timeouts, pero la ronda 1 usa un borrador si lo hay.
create or replace function game.request_generation(p_round_id uuid) returns void
language plpgsql set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
  v_round_number int;
begin
  update game.rounds set status = 'generating' where id = p_round_id and status in ('pending', 'failed');
  if coalesce((game.conf('ai_enabled'))::boolean, false) = false then
    perform game.fill_fallback(p_round_id);
    return;
  end if;

  select round_number into v_round_number from game.rounds where id = p_round_id;
  if v_round_number = 1 then
    begin
      if game.use_draft(p_round_id) then return; end if;
    exception when others then
      perform game.log_event((select room_id from game.rounds where id = p_round_id),
                             'draft_failed', jsonb_build_object('error', sqlerrm));
    end;
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

revoke all on function game.setup_hash(jsonb) from public, anon, authenticated;
revoke all on function game.request_drafts(uuid) from public, anon, authenticated;
revoke all on function game.rooms_setup_drafts() from public, anon, authenticated;
revoke all on function game.use_draft(uuid) from public, anon, authenticated;
revoke all on function game.request_generation(uuid) from public, anon, authenticated;
revoke all on function public.ai_save_drafts(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.ai_save_drafts(uuid, text, jsonb) to service_role;
