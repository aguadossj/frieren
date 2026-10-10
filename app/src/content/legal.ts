// Páginas legales: /privacy, /ai y /terms (EN/ES). Texto llano, frases cortas.
// Todo lo que se afirma aquí está comprobado en el código (sáb 10 oct): si cambia lo que se guarda, lo que va a la IA
// o cómo se usa la ubicación, actualizar este fichero. Pantalla: screens/Legal.tsx.

import type { Lang } from '../i18n'

export type LegalPage = 'privacy' | 'ai' | 'terms'
export const LEGAL_PAGES: LegalPage[] = ['privacy', 'ai', 'terms']
export const LEGAL_PATHS: Record<LegalPage, string> = { privacy: '/privacy', ai: '/ai', terms: '/terms' }

/** Contacto para ejercer derechos RGPD y dudas. */
export const CONTACT_EMAIL = 'andresferrereb@gmail.com'
export const UPDATED = '2026-10-10'

/** Un párrafo. `[texto](url)` se convierte en enlace (rutas internas o externas). */
export type Line = string
export interface Section {
  id: string // ancla: /privacy#location, /ai#mimic…
  tag?: string // qué es cada subsistema en la página de IA: IA / Reglas / Código + IA
  title: string
  lines: Line[]
}
export interface PageCopy {
  tab: string
  title: string
  lead: string
  summary: string[] // "En corto": 3 frases
  sections: Section[]
}

const mail = `[${CONTACT_EMAIL}](mailto:${CONTACT_EMAIL})`

const en: Record<LegalPage, PageCopy> & { ui: Record<string, string> } = {
  ui: {
    back: 'Back to game',
    mimicLink: 'What’s Mimic?',
    short: 'In short',
    updated: 'Updated 10 Oct 2026',
  },
  privacy: {
    tab: 'Privacy',
    title: 'Privacy',
    lead: 'Plain words. No small print.',
    summary: ['No accounts. No email, no phone number.', 'Your coordinates never reach our servers.', 'No ads, no trackers, no tracking cookies.'],
    sections: [
      {
        id: 'data',
        title: 'What we keep',
        lines: [
          'Your name and emoji (16 characters max).',
          'What you write and vote in each round, your 😂 and your points.',
          'What the host tells us about the room: what’s going on, if you know each other, if everyone’s an adult, spicy or not.',
          'Room events like “player joined”, to see how the game is used.',
        ],
      },
      {
        id: 'account',
        title: 'No account',
        lines: [
          'When you create or join a room you get an anonymous ID. No password, no email.',
          'It lives in this browser tab and is gone when you close it.',
        ],
      },
      {
        id: 'location',
        title: 'Ubicación',
        lines: [
          'Pedimos la ubicación al abrir el juego, para tenerla lista si creáis una sala estando juntos. Puedes decir que no: el juego funciona igual.',
          'Se queda en tu móvil. Solo se usa si creas una sala y dices que estáis todos en el mismo sitio. La de los invitados nunca se usa.',
          'Entonces tu móvil pregunta a OpenStreetMap la calle y algunos sitios cercanos, para que la IA ambiente el chat ahí. Solo guardamos esos nombres y la hora local. Nunca coordenadas.',
        ],
      },
      {
        id: 'ai',
        title: 'AI',
        lines: [
          'To write each chat, the AI gets the room’s names, context and past answers. Only what the round needs.',
          'We don’t train models on what you write. Details on the [AI page](/ai).',
        ],
      },
      {
        id: 'providers',
        title: 'Who helps us',
        lines: [
          'Supabase: database and live sync.',
          'Cloudflare: hosts the website.',
          'OpenRouter and DeepInfra: run the AI that writes the chats and plays Mimic.',
          'Groq: runs the AI that writes the first chat while the room fills up.',
          'OpenStreetMap (Nominatim): turns a location into place names.',
          'Some of them process data outside the EU.',
        ],
      },
      {
        id: 'device',
        title: 'On your phone',
        lines: [
          'We store three things: your language, whether you’ve seen “How to play”, and your session (gone when you close the tab).',
          'No analytics, no ads, no tracking cookies. That’s why there’s no cookie banner.',
        ],
      },
      {
        id: 'retention',
        title: 'Cuánto tiempo',
        lines: ['Las salas se cierran tras 3 horas sin actividad.', `¿Quieres que borremos tus datos? Escribe a ${mail} con el código de la sala y tu nombre.`],
      },
      {
        id: 'rights',
        title: 'Your rights',
        lines: [
          `Under the GDPR you can ask to see, fix or delete your data, or object to its use. Write to ${mail} with your room code and name.`,
          'You can also complain to the Spanish data protection authority, the [AEPD](https://www.aepd.es).',
          'Who’s responsible: the Typing… team, Lytvyn.AI Hackathon, Barcelona.',
        ],
      },
    ],
  },
  ai: {
    tab: 'AI',
    title: 'AI & transparency',
    lead: 'What the AI does. And what it doesn’t.',
    summary: [
      'The AI writes the chats. Your friends write the answers.',
      'If an AI joins the vote, you’re told, and it’s unmasked at the end.',
      'We don’t train models on what you write.',
    ],
    sections: [
      {
        id: 'systems',
        title: 'Four systems, one game',
        lines: [
          'Two use a language model, one mixes code and AI, one is plain rules. Each one is tagged below, so you always know what’s AI.',
        ],
      },
      {
        id: 'chat',
        tag: 'AI',
        title: '1. The chat writer',
        lines: [
          'Writes the group chat that opens each round, starring your names, ending on a message for the player who answers.',
          'It uses what the host said is going on, the vibe, your past answers in this room and, if shared, where you are.',
          'The next round is written while you vote, so nobody waits. If the AI is slow or fails, a hand-written chat takes over.',
        ],
      },
      {
        id: 'mimic',
        tag: 'AI',
        title: '2. Mimic, the fake player',
        lines: [
          'An AI that tries to pass as the player who answers, by copying how they really text in this room.',
          'Off unless the host turns it on. When it’s on, the room says “An AI is hiding among the answers”.',
          'On reveal, its answer is marked “MIMIC · the AI”. Picking it costs 100 points.',
          'Its answers are blocked if they mention being an AI or name other players.',
        ],
      },
      {
        id: 'scout',
        tag: 'Code + AI',
        title: '3. The location scout',
        lines: [
          'If the host says you’re all in the same place, it finds the street and up to 8 named spots nearby on OpenStreetMap.',
          'It picks spots by the time: clubs and bars late at night, restaurants at dinner, cafés by day.',
          'The chat writer then sets the chat right there: “meet at the bar on the corner at 2”.',
          'Only names and the local time are kept. Never coordinates. [More on location](/privacy#location).',
        ],
      },
      {
        id: 'panda',
        tag: 'Rules',
        title: '4. The panda host',
        lines: [
          'Cheers you on between rounds: who stole the lead, who fooled everyone, who nobody spotted, who fell for Mimic.',
          'It reads the game and picks its line with rules, not a language model. Instant, free and never off-script.',
        ],
      },
      {
        id: 'never',
        title: 'What the AI never does',
        lines: ['Write the real answer. That’s always the player.', 'Decide votes or points. That’s plain code.', 'Use what you write outside your room.'],
      },
      {
        id: 'memory',
        title: 'How it learns',
        lines: [
          'Inside a room, the AI keeps short notes: how each of you texts, running jokes, and up to 3 harmless things you said about yourself.',
          'Notes stay in that room. They’re never used in other rooms or to train models.',
        ],
      },
      {
        id: 'style',
        title: 'Where the style comes from',
        lines: [
          'To sound like a real group chat, the AI sees short anonymised snippets of real chats: no names, no @mentions, no links, no numbers.',
          'It’s told never to copy them.',
        ],
      },
      {
        id: 'safety',
        title: 'Guardrails',
        lines: [
          'Spicy means the situation, never an attack on a person.',
          'If not everyone is an adult, nothing spicy.',
          'Everything players write reaches the AI as data, not as orders.',
        ],
      },
      {
        id: 'model',
        title: 'The model',
        lines: [
          'Hermes 3 70B, an open-weight model by Nous Research (built on Meta Llama 3.1), run by DeepInfra through OpenRouter: writes the chats and plays Mimic.',
          'gpt-oss-120b, an open-weight model by OpenAI, run by Groq: writes the first chat while the room fills up.',
        ],
      },
      {
        id: 'why',
        title: 'Why we tell you',
        lines: [
          'The EU AI Act (article 50) says people must know when content is AI-made or when an AI acts like a human.',
          'In Typing… that’s the whole game. So we say it out loud.',
        ],
      },
    ],
  },
  terms: {
    tab: 'Terms',
    title: 'Terms',
    lead: 'Short version: be kind, have fun.',
    summary: ['Free. No accounts. No ads.', 'It’s a party game. Don’t hurt anyone with it.', 'Hackathon project: it may break.'],
    sections: [
      {
        id: 'use',
        title: 'Using Typing…',
        lines: ['Play with people who want to play.', 'By playing you accept these terms and our [Privacy page](/privacy).'],
      },
      {
        id: 'rules',
        title: 'Be kind',
        lines: [
          'Joke about situations, not people.',
          'Don’t share anyone’s private stuff: addresses, phone numbers, secrets.',
          'No hate, no harassment, no sexual content about real people.',
          'Hosts can remove players. Removed players can’t come back.',
        ],
      },
      {
        id: 'age',
        title: 'Age',
        lines: ['Under 14? Play with a parent or guardian.', 'If not everyone is an adult, the host must say so. The AI then keeps it clean.'],
      },
      {
        id: 'ai',
        title: 'AI content',
        lines: [
          'The chats are written by an AI and are fiction. They’re not facts about anyone.',
          'AI can get things wrong. Don’t take it seriously. More on the [AI page](/ai).',
        ],
      },
      {
        id: 'warranty',
        title: 'No guarantees',
        lines: [
          'Built in 13 hours at a hackathon. Provided as is. It may change or go offline at any time.',
          'Players are responsible for what they write.',
        ],
      },
      {
        id: 'about',
        title: 'Who we are',
        lines: ['The Typing… team, Lytvyn.AI Hackathon, Barcelona, 9–10 Oct 2026.', `Contact: ${mail}.`, 'Spanish law applies.'],
      },
      {
        id: 'credits',
        title: 'Credits',
        lines: [
          'Place data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), under the Open Database License.',
          'Built with React, Vite, Tailwind CSS and Supabase.',
        ],
      },
    ],
  },
}

const es: typeof en = {
  ui: {
    back: 'Volver al juego',
    mimicLink: '¿Qué es Mimic?',
    short: 'En corto',
    updated: 'Actualizado el 10 oct 2026',
  },
  privacy: {
    tab: 'Privacidad',
    title: 'Privacidad',
    lead: 'Claro y sin letra pequeña.',
    summary: ['Sin cuentas. Ni email ni teléfono.', 'Tus coordenadas nunca llegan a nuestros servidores.', 'Sin anuncios, sin rastreadores, sin cookies de seguimiento.'],
    sections: [
      {
        id: 'data',
        title: 'Qué guardamos',
        lines: [
          'Tu nombre y tu emoji (16 caracteres como mucho).',
          'Lo que escribes y votas en cada ronda, tus 😂 y tus puntos.',
          'Lo que el host nos cuenta de la sala: qué está pasando, si os conocéis, si sois todos adultos, picante o no.',
          'Eventos de la sala como “alguien se ha unido”, para ver cómo se usa el juego.',
        ],
      },
      {
        id: 'account',
        title: 'Sin cuenta',
        lines: [
          'Al crear o unirte a una sala recibes un ID anónimo. Sin contraseña ni email.',
          'Vive en esta pestaña del navegador y desaparece al cerrarla.',
        ],
      },
      {
        id: 'location',
        title: 'Ubicación',
        lines: [
          'Puede que el móvil te pida la ubicación al abrir el juego. Puedes decir que no: el juego funciona igual.',
          'Solo se usa si el host dice que estáis todos en el mismo sitio. La de los invitados nunca se usa.',
          'Entonces el móvil del host pregunta a OpenStreetMap la calle y algunos sitios cercanos. Solo guardamos esos nombres y la hora local. Nunca coordenadas.',
        ],
      },
      {
        id: 'ai',
        title: 'IA',
        lines: [
          'Para escribir cada chat, la IA recibe los nombres de la sala, el contexto y las respuestas anteriores. Solo lo que la ronda necesita.',
          'No entrenamos modelos con lo que escribes. Más detalles en la [página de IA](/ai).',
        ],
      },
      {
        id: 'providers',
        title: 'Quién nos ayuda',
        lines: [
          'Supabase: base de datos y sincronización en directo.',
          'Cloudflare: aloja la web.',
          'OpenRouter y DeepInfra: ejecutan la IA que escribe los chats y hace de Mimic.',
          'Groq: ejecuta la IA que escribe el primer chat mientras se llena la sala.',
          'OpenStreetMap (Nominatim): convierte una ubicación en nombres de sitios.',
          'Algunos tratan datos fuera de la UE.',
        ],
      },
      {
        id: 'device',
        title: 'En tu móvil',
        lines: [
          'Guardamos tres cosas: tu idioma, si ya has visto “Cómo jugar” y tu sesión (se borra al cerrar la pestaña).',
          'Sin analítica, sin anuncios, sin cookies de seguimiento. Por eso no hay banner de cookies.',
        ],
      },
      {
        id: 'retention',
        title: 'Cuánto tiempo',
        lines: ['Las salas se cierran tras 3 horas sin actividad.', 'Borramos todos los datos de las partidas en los 30 días siguientes al evento, antes del 10 nov 2026.'],
      },
      {
        id: 'rights',
        title: 'Tus derechos',
        lines: [
          `Según el RGPD puedes pedir ver, corregir o borrar tus datos, u oponerte a su uso. Escríbenos a ${mail} con el código de la sala y tu nombre.`,
          'También puedes reclamar ante la [AEPD](https://www.aepd.es), la autoridad española de protección de datos.',
          'Responsable: el equipo de Typing…, Lytvyn.AI Hackathon, Barcelona.',
        ],
      },
    ],
  },
  ai: {
    tab: 'IA',
    title: 'IA y transparencia',
    lead: 'Qué hace la IA. Y qué no.',
    summary: [
      'La IA escribe los chats. Tus amigos escriben las respuestas.',
      'Si una IA entra en la votación, se avisa y se desenmascara al final.',
      'No entrenamos modelos con lo que escribes.',
    ],
    sections: [
      {
        id: 'systems',
        title: 'Cuatro sistemas, un juego',
        lines: [
          'Dos usan un modelo de lenguaje, uno mezcla código e IA y otro son reglas. Cada uno lleva su etiqueta, para que siempre sepas qué es IA.',
        ],
      },
      {
        id: 'chat',
        tag: 'IA',
        title: '1. El guionista del chat',
        lines: [
          'Escribe el chat de grupo que abre cada ronda, protagonizado por vuestros nombres y terminando con un mensaje para quien contesta.',
          'Usa lo que el host dijo que está pasando, el rollo de la sala, vuestras respuestas anteriores y, si se comparte, dónde estáis.',
          'La siguiente ronda se escribe mientras votáis, así nadie espera. Si la IA tarda o falla, entra un chat escrito a mano.',
        ],
      },
      {
        id: 'mimic',
        tag: 'IA',
        title: '2. Mimic, el jugador falso',
        lines: [
          'Una IA que intenta hacerse pasar por quien contesta, copiando cómo escribe de verdad en esta sala.',
          'Apagada salvo que el host la active. Si está activa, la sala avisa: “Hay una IA escondida entre las respuestas”.',
          'En la revelación, su respuesta sale marcada como “MIMIC · la IA”. Votarla resta 100 puntos.',
          'Se bloquean sus respuestas si dicen que es una IA o nombran a otros jugadores.',
        ],
      },
      {
        id: 'scout',
        tag: 'Código + IA',
        title: '3. El explorador de la zona',
        lines: [
          'Si el host dice que estáis todos en el mismo sitio, busca en OpenStreetMap la calle y hasta 8 sitios con nombre cerca.',
          'Elige según la hora: clubs y bares de madrugada, restaurantes a la hora de cenar, cafés de día.',
          'El guionista ambienta el chat justo ahí: “quedamos en el bar de la esquina a las 2”.',
          'Solo se guardan nombres y la hora local. Nunca coordenadas. [Más sobre la ubicación](/privacy#location).',
        ],
      },
      {
        id: 'panda',
        tag: 'Reglas',
        title: '4. El panda presentador',
        lines: [
          'Os anima entre rondas: quién ha robado el liderato, quién ha engañado a todos, a quién no ha pillado nadie, quién ha caído con Mimic.',
          'Lee la partida y elige su frase con reglas, no con un modelo de lenguaje. Al instante, gratis y sin salirse del guion.',
        ],
      },
      {
        id: 'never',
        title: 'Qué no hace nunca la IA',
        lines: ['Escribir la respuesta real. Esa siempre es del jugador.', 'Decidir votos o puntos. Eso es código normal.', 'Usar lo que escribes fuera de tu sala.'],
      },
      {
        id: 'memory',
        title: 'Cómo aprende',
        lines: [
          'Dentro de una sala, la IA guarda notas cortas: cómo escribe cada uno, las bromas que se repiten y hasta 3 cosas inofensivas que hayas contado de ti.',
          'Las notas se quedan en esa sala. Nunca se usan en otras salas ni para entrenar modelos.',
        ],
      },
      {
        id: 'style',
        title: 'De dónde sale el estilo',
        lines: [
          'Para sonar a chat de verdad, la IA ve fragmentos cortos y anonimizados de chats reales: sin nombres, sin @menciones, sin enlaces, sin números.',
          'Tiene prohibido copiarlos.',
        ],
      },
      {
        id: 'safety',
        title: 'Límites',
        lines: [
          'Picante es la situación, nunca un ataque a una persona.',
          'Si no sois todos adultos, nada picante.',
          'Lo que escriben los jugadores llega a la IA como datos, no como órdenes.',
        ],
      },
      {
        id: 'model',
        title: 'El modelo',
        lines: [
          'Hermes 3 70B, un modelo de pesos abiertos de Nous Research (basado en Meta Llama 3.1), ejecutado por DeepInfra a través de OpenRouter: escribe los chats y hace de Mimic.',
          'gpt-oss-120b, un modelo de pesos abiertos de OpenAI, ejecutado por Groq: escribe el primer chat mientras se llena la sala.',
        ],
      },
      {
        id: 'why',
        title: 'Por qué te lo contamos',
        lines: [
          'La Ley de IA de la UE (artículo 50) pide que sepas cuándo un contenido lo ha hecho una IA o cuándo una IA se hace pasar por humano.',
          'En Typing… eso es justo el juego. Así que lo decimos bien alto.',
        ],
      },
    ],
  },
  terms: {
    tab: 'Términos',
    title: 'Términos',
    lead: 'Resumen: buen rollo y a jugar.',
    summary: ['Gratis. Sin cuentas. Sin anuncios.', 'Es un juego de fiesta. No lo uses para hacer daño.', 'Proyecto de hackathon: puede fallar.'],
    sections: [
      {
        id: 'use',
        title: 'Usar Typing…',
        lines: ['Juega con gente que quiera jugar.', 'Al jugar aceptas estos términos y nuestra [página de privacidad](/privacy).'],
      },
      {
        id: 'rules',
        title: 'Buen rollo',
        lines: [
          'Bromea sobre situaciones, no sobre personas.',
          'No compartas cosas privadas de nadie: direcciones, teléfonos, secretos.',
          'Nada de odio, acoso ni contenido sexual sobre personas reales.',
          'El host puede echar a jugadores. Quien es echado no puede volver.',
        ],
      },
      {
        id: 'age',
        title: 'Edad',
        lines: ['¿Menos de 14 años? Juega con tu madre, padre o tutor.', 'Si no sois todos adultos, el host debe indicarlo. La IA entonces no pica.'],
      },
      {
        id: 'ai',
        title: 'Contenido de IA',
        lines: [
          'Los chats los escribe una IA y son ficción. No son hechos sobre nadie.',
          'La IA se puede equivocar. No te lo tomes en serio. Más en la [página de IA](/ai).',
        ],
      },
      {
        id: 'warranty',
        title: 'Sin garantías',
        lines: [
          'Hecho en 13 horas en una hackathon. Se ofrece tal cual. Puede cambiar o dejar de funcionar en cualquier momento.',
          'Cada jugador responde de lo que escribe.',
        ],
      },
      {
        id: 'about',
        title: 'Quiénes somos',
        lines: ['El equipo de Typing…, Lytvyn.AI Hackathon, Barcelona, 9–10 oct 2026.', `Contacto: ${mail}.`, 'Se aplica la ley española.'],
      },
      {
        id: 'credits',
        title: 'Créditos',
        lines: [
          'Datos de lugares © [colaboradores de OpenStreetMap](https://www.openstreetmap.org/copyright), bajo la Open Database License.',
          'Hecho con React, Vite, Tailwind CSS y Supabase.',
        ],
      },
    ],
  },
}

export const LEGAL: Record<Lang, typeof en> = { en, es }

/** /privacy → 'privacy'; cualquier otra ruta → null (el juego). */
export function legalPageFromPath(path: string): LegalPage | null {
  const p = path.replace(/\/+$/, '').toLowerCase()
  return LEGAL_PAGES.find((k) => LEGAL_PATHS[k] === p) ?? null
}
