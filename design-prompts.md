# Prompts de diseño para herramientas de IA

Para Google Stitch, v0, Lovable, Bolt o Figma Make. Están en inglés porque las herramientas responden mejor.

**Cómo usarlos:**
1. Copia el **prompt base** (sección 1).
2. Añade **un bloque de estilo** (sección 2), o el de exploración si aún no sabes qué estilo quieres.
3. Pide **una pantalla cada vez** (sección 3); salen mucho mejor que todas de golpe.
4. Cuando un estilo te guste, pide las demás pantallas **en la misma conversación** para que sean coherentes.

Guarda las capturas que te gusten en `design-refs/`.

---

## 1. Prompt base (pégalo siempre primero)

```
Design a mobile web app (390x844, portrait) for a social party game called "Typing…".

THE GAME
Friends join a room by scanning a QR code. An AI writes a short fake group chat starring
the players (using their real names). The last message belongs to one player, e.g. "Pol is typing…".
- Pol writes what he would REALLY say.
- Everyone else writes what they think Pol would say, imitating him.
- All answers appear as chat bubbles; everyone votes which one is the real Pol.
- Reveal: a "typing…" animation, then the real message appears. Pol scores if friends recognise him;
  impostors score for every vote they fooled. An AI host gives a funny award ("Best Pol impression: Laura").
- Kahoot-style leaderboard after every round. 4–6 rounds, then a final ranking and a shareable card.

AUDIENCE AND TONE
University students and young adults, played in a loud room, phone in one hand. Cheeky, a bit spicy,
funny. Must be understood by a stranger in under 10 seconds with zero instructions.

HARD CONSTRAINTS
- Mobile only, one-hand use, thumb-reachable primary actions at the bottom.
- Tap targets ≥ 44px. No hover states. No tiny text (min 14px for message text).
- UI copy in English: short, punchy, verbs. No paragraphs.
- Each player has a fixed signature colour used on their avatar, bubbles and leaderboard bar.
- High contrast: must be readable under bright venue lights.
- It must feel like a GAME, not a productivity app, and must NOT look like a WhatsApp clone
  (no WhatsApp logo, green or branding).
- Build-friendly: flat colours and borders, achievable with React + Tailwind CSS. Avoid heavy
  blurs, glassmorphism and complex gradients.
```

---

## 2. Bloques de estilo (añade UNO después del prompt base)

### Exploración: si no sabes qué estilo quieres
```
Before choosing a style, show the SAME screen (the "Pol is typing…" chat round) in 6 radically
different visual directions, side by side. Make them genuinely different from each other in
colour, typography, shapes and mood (e.g. one playful, one retro, one editorial, one cute,
one bold-minimal, one unexpected). Name each direction in 2 words.
```

### C · Pop sticker / neo-brutal (el favorito ahora mismo)
```
STYLE: Neo-brutalist pop sticker. Cream background (#FFF4E0), thick 2px black outlines on
everything, chunky bottom border (4px) so elements feel like stickers, flat saturated fills
(mint #B8F2E6, pink #FFD6F0, yellow #FFE14D, orange #FF5C39, lilac #CDB8FF). Key labels look like
stickers slightly rotated (-2° to 3°). Bold grotesque display font (Bricolage Grotesque or
Space Grotesk) for titles, system font for chat messages. Buttons are black with cream text and
"press down" on tap. Gen Z, cheeky, loud but clean.
```

### G · Cuaderno de clase
```
STYLE: School notebook. Off-white lined paper background with a red margin line, handwritten
font (Caveat) ONLY for titles, labels and stickers; clean readable font for messages. Yellow
post-it notes, highlighter marks, doodles, paper-clip and tape details. The game should feel like
passing secret notes in class.
```

### E · Messenger Y2K
```
STYLE: Early-2000s instant messenger nostalgia (MSN-era), modernised. Blue window title bars,
"X says:" message format, buddy list with status dots, a "Nudge!" button that shakes the screen,
playful pixel-ish icons, pale blue and white panels. Nostalgic but readable on modern phones.
```

### F · Tabloide (ideal para la revelación y la tarjeta final)
```
STYLE: Gossip tabloid newspaper. Off-white newsprint, black serif headlines (DM Serif Display),
red "BREAKING" banners, columns, pull quotes, halftone dots. Every reveal is a scandalous headline:
"BREAKING: Laura does the best Pol impression".
```

### H · Candy
```
STYLE: Soft candy UI. Pastel pink and lilac background, very rounded pill shapes, chunky
"inflated" buttons with a darker bottom edge, bouncy and friendly, playful rounded font.
```

### Comodín: estilos raros para inspirarse
```
STYLE: Surprise me. Propose 3 unexpected visual directions for this game that no other
hackathon team would think of (e.g. inspired by a retro TV game show, a crime evidence board,
a vaporwave dating app, a trading card game). Keep them readable and buildable with Tailwind.
```

---

## 3. Pantallas (pide una cada vez)

**3.1 Inicio**
```
Screen: Home. Game logo "Typing…" with a typing-dots animation. Two big buttons:
"Create room" and "Join room" (with a 4-letter code input). Nothing else.
```

**3.2 Sala (quien la crea)**
```
Screen: Lobby (host view). Big QR code + 4-letter room code (e.g. "KRSP"). List of joined players
appearing one by one with their colour avatar and name. One row of tappable topic chips:
Uni · Spicy · Dating · Moral dilemmas. One row of "Who's playing?" chips: Students · Friends ·
Coworkers · Family. Big "Start game" button at the bottom (min 3 players).
```

**3.3 Ronda: te toca escribir (tú eres Pol)**
```
Screen: Chat round — writer view. A fake group chat (4 short messages from players, colour-coded).
The last bubble shows "Pol is typing…" with animated dots, plus a sticker label "That's you. Say it
for real." Countdown timer (25s). Message input (max 80 chars) and Send button at the bottom.
```

**3.4 Ronda: imitas a Pol (impostor)**
```
Screen: Chat round — impostor view. Same chat, but the label says "Pol is typing… Write what Pol
would say. Fool everyone." Same timer and input.
```

**3.5 Votación**
```
Screen: Voting. The chat context collapsed at the top. 3–5 answer bubbles shown as cards,
all in Pol's colour so they look identical. Tap one to vote "This is the real Pol".
Small "😂" reaction button on each bubble to vote the funniest. Timer 15s.
```

**3.6 Revelación**
```
Screen: Reveal. Big "typing…" animation, then the real message pops in with confetti.
Under each fake answer: the author's avatar and "+200 · fooled 2 players". An AI host sticker
with a funny award: "Best Pol impression: Laura 🎭".
```

**3.7 Ranking entre rondas**
```
Screen: Leaderboard between rounds (Kahoot-style). Horizontal bars in each player's colour,
animated growing, position changes with arrows, "+300" floating labels. Auto-advances in 3s.
```

**3.8 Final y tarjeta para compartir**
```
Screen: Final results. Podium for top 3, funny AI-written titles per player
("Most unhinged", "Literally always Pol"). A shareable card (9:16, Instagram-story ready)
with the winner and best quote. Buttons: "Share" and "Play again".
```

---

## 4. Específico para v0 / Lovable / Bolt (cuando ya quieras código)

```
Build this as a single React + TypeScript + Tailwind CSS v4 component tree, mobile-first
(max-width 430px, centered), using only Tailwind utilities and CSS variables for the palette.
Use mock data (4 players: Marta, Laura, Pol, You) and local state to click through all screens:
Home → Lobby → Writer round → Voting → Reveal → Leaderboard → Final.
No backend, no external UI kit. Include the typing-dots, bubble pop-in and leaderboard bar
animations with CSS/Framer Motion. Keep components small and named by screen.
```

Truco: cuando tengas un resultado que te guste, pídele a la herramienta **"Extract the design system:
colours, fonts, border radius, borders, shadows, spacing and component rules as a list"**,
pégalo en `design-refs/STYLE.md`, y nuestros agentes construirán con exactamente ese estilo.
