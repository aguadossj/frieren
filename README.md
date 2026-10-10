# Typing… 💬

**Your friends fake your replies. Spot the real one.**

A party game for 3–8 people, played on everyone's phone. An AI writes a group chat starring your friends, one of
you answers for real, and everyone else tries to sound exactly like them. Then you all vote for the real reply.

**Play now: https://frieren-bfq.pages.dev**: no app, no account, no download.

---

## How to play (it takes 60 seconds)

1. **Open the link** on one phone and tap **Create room**. Type what's going on right now ("Mario's 30th, he can't get
   over his ex") and swipe through a few yes/no cards: do you know each other, is everyone an adult, keep it spicy,
   hide an AI among the answers.
2. **Friends scan the QR code** (or type the 4-letter code), pick a name and a panda, and the host lets them in.
3. **The AI writes a group chat about you.** One player is the *writer* and answers the final question for real.
4. **Everyone else fakes the writer's reply.** Make it sound like them.
5. **Vote for the real one.** The faster you spot it, the more points you get. Watch out: if the hidden AI is on,
   voting for its fake costs you points.
6. **Reveal → leaderboard → next round.** Everyone gets a turn as the writer.

A stranger gets it in the first round without reading anything. It works in English and Spanish.

---

## The AI inside

Typing… runs on **Hermes 3 (Nous Research)** through OpenRouter: **405B** writes the chats, with an automatic
fallback to **70B** if the big model is too slow. Every AI step has a non-AI backup, so the game never stops.

### 1. The chat writer
Writes a fresh group chat every round, starring the real players. It is told, in this order of priority:
- **what the host said is happening right now** (the chat is *about* that),
- **who is playing**: adults or not, spicy or clean, friends or people who just met,
- an **angle** for the round (a secret, a lie, a dare…), a **chat format** (a screenshot, a payment note, a voice
  note, a poll, a message sent to the wrong chat…) and a **comedy structure** (escalation, fake calm, detectives,
  deadpan…), picked at random so no two rounds feel the same.

The writer is always the main character, and the chat always ends with a question only they can really answer.

### 2. Location-aware chats
If everyone is in the same place and the host allows it, the phone's location is turned into **place names** with
OpenStreetMap: the street, the neighbourhood and up to 8 real venues nearby, chosen by the time of day (bars and clubs
late at night). The AI then sets the chat right there: *"who's not getting into Razzmatazz
tonight"*. Only names are stored, never coordinates.

### 3. Texting like real people
We analysed a dataset of **real, anonymised group chats** and measured how people actually text: message length,
how often they use emoji, laughter ("JAJAJA", "lol"), capital letters, commas and full stops. Those numbers are given
to the AI as targets, and a small post-processing step enforces them: bursts of short messages, no opening "¿",
no final full stops, the occasional reaction.

### 4. Humour, tuned by humans
Making an AI *funny* is hard. We got there to a modest degree with a dedicated humour prompt: one specific, absurd
detail instead of a vague situation, friends teasing each other affectionately, no filler, and final questions with
many funny possible answers. We tune it with a **prompt lab** that compares prompts side by side, and a **blind
voting page** where the team rates AI chats as funny / meh / not funny and suggests better final questions.

### 5. Mimic: an AI hiding among the answers
An optional AI player that writes one more fake reply, pretending to be the writer. It studies how that person
really answered in earlier rounds (length, capitals, emoji, slang) and what fooled people before. It's revealed at
the end of each round; whoever voted for it loses points.

### 6. A game that learns your group
After every round the AI keeps notes on how each player really texts, harmless facts they revealed and the running
jokes that got laughs, and uses them in later rounds for callbacks.

### 7. Ready before you press Start
While friends are still joining, the AI writes round 1 in the background, so the game starts instantly.

### Guardrails
- **Language:** the chat is always in the room's language (and Spain Spanish, not Latin American).
- **Content:** clean when minors may be present, nothing flirty when the host says "no spicy", never explicit, and
  never jokes about health, religion, politics, sexuality or looks.
- **Quality checks in code:** nobody says their own name, the writer never speaks in the chat, a maximum of 5
  messages, the final question always goes to the writer, and examples are never copied.
- **Backups:** if the AI is slow or fails, the round uses one of the team's hand-written chats.

*Not AI:* the panda presenter's lines and the end-of-round awards are written rules and templates.

---

## Tech stack

| Layer | What we use |
|---|---|
| Front end | Vite · React 19 · TypeScript · Tailwind CSS v4, hosted on Cloudflare Pages |
| Backend | Supabase: Postgres, anonymous sign-in (no accounts), the whole game as database functions, Realtime private channels, `pg_cron` for timers |
| AI | Supabase Edge Function (Deno) calling Hermes 3 405B / 70B through OpenRouter, triggered from the database with `pg_net` |
| Maps | OpenStreetMap Nominatim (reverse geocoding, no key) |

**Load-tested** with 30 lobbies of 4 players (120 simulated phones) playing full games at once: 30/30 games
finished, 0 errors in about 12,800 server calls, 95% of calls under 400 ms.

---

## Development

```bash
git clone https://github.com/aguadossj/frieren.git && cd frieren
cd app && npm install && npm run dev   # also on your phone: http://<laptop-ip>:5173
```

Without Supabase settings, or with `?mock=1` in the URL, the game runs locally with bots. Prompt tools:
`supabase/functions/generate-round/prompt-lab.mjs` and `prompt-sim.mjs`. More in [SPEC.md](SPEC.md),
[PLAYBOOK.md](PLAYBOOK.md) and [DEPLOY.md](DEPLOY.md). Built in a day by four people, each working with Claude Code.

## Team

- aguadossj
- AndresFerrerURL
- Nnicoleon4
- Paypuu
