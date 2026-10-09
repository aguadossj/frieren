# Typing… — Guía de estilo "Chat de colores"

Decisión del equipo (sáb 10 oct, ~01:00): **un chat normal y corriente, con fondo de color por ronda.**
Esta guía es la fuente de verdad visual. Cualquier pantalla nueva sale de aquí.

## Idea
Parece una app de mensajería de verdad (cabecera, burbujas, "escribiendo…", barra de mensaje),
así que se entiende al instante. El color viene del **fondo, que cambia en cada ronda**; todo lo demás es blanco y limpio.

## Reglas
1. **Un color protagonista por pantalla:** el de la ronda actual. Fondo = su tono claro; acentos (botón, temporizador, enviar) = su tono fuerte.
2. **Burbujas blancas** sobre el fondo de color. El color de cada jugador va en su **nombre** y su **avatar**, no en la burbuja.
3. **Cabecera, barra de entrada y botones inferiores en blanco.**
4. Sin contornos, sin sombras, sin degradados, sin texturas, sin pegatinas inclinadas. Limpio.
5. Esquinas: burbujas 18px, botones 18px, filas/tarjetas 14–16px, píldoras 12px.
6. Mucho aire, letra grande. Mensajes ≥ 15px en el producto real. Botón principal abajo, a ancho completo.

## Colores de ronda (fondo claro / acento fuerte)
| Ronda | Fondo | Acento | Texto suave sobre fondo |
|---|---|---|---|
| 1 · Pink | `#FFE3EF` | `#FF4F8B` | `#B0577C` |
| 2 · Mint | `#DDF7EA` | `#16A34A` | `#3E8A62` |
| 3 · Lilac | `#ECE6FF` | `#7C5CFF` | `#6B5BB0` |
| 4 · Butter | `#FFF3C9` | `#F5A300` (texto `#B57700`) | `#8A6A1F` |
| 5 · Sky | `#DDF0FF` | `#2F8CFF` | `#3D6E9E` |
Inicio = Pink. Sala = Sky. Las rondas rotan en este orden; el ranking entre rondas usa el color de la ronda que acaba de terminar.

## Colores de jugador (fijos por orden de entrada; avatar + nombre)
`#FF4F8B` pink · `#16A34A` green · `#F5A300` amber · `#7C5CFF` violet · `#2F8CFF` blue ·
`#14B8A6` teal · `#F97316` orange · `#E11D48` red.
Avatar = círculo con la inicial en blanco. En la votación **todas** las burbujas llevan el avatar de Pol para que sean indistinguibles.

## Tipografía
Fuente del sistema (`system-ui, -apple-system, "Segoe UI", Roboto`). Se siente nativo y carga al instante.
Logo y titulares grandes: peso 800 con `letter-spacing: -1px`. Botones: 700. Nombres en burbujas: 600, 10–11px.

## Componentes clave
- **Cabecera de chat:** avatar del grupo + nombre ("Piso 3B") + estado en el color de acento ("Pol is typing…") + temporizador en píldora de acento.
- **Burbuja:** blanca, nombre encima en el color del jugador. "Escribiendo…" = burbuja blanca con tres puntos que saltan.
- **Indicación de rol:** píldora blanca centrada encima de la barra de entrada, texto en acento:
  "You're Pol. Say it for real." / "Write what Pol would say. Fool them."
- **Barra de entrada:** fondo blanco; campo en tono muy claro del color de ronda; botón de enviar circular en acento. Máx. 80 caracteres.
- **Votación:** filas con el avatar de Pol + burbuja + 😂 a la derecha. La elegida lleva un `outline` de 3px en acento. Botón "Lock vote".
- **Revelación:** el mensaje real grande y centrado, titular "Fooled 2! 🎭", filas blancas con +puntos en verde, tarjeta del premio con 🏆.
- **Ranking:** filas blancas con posición, avatar, nombre, barra del color del jugador, puntos y ▲▼. Pasa solo a los 3s.

## Movimiento y sonido
- El fondo cambia de color con una transición de 400ms al empezar cada ronda (el momento "nueva ronda").
- Las burbujas entran como mensajes nuevos (subir 8px + fade, 200ms, de una en una).
- Revelación: tres puntos ~1,2s y luego aparece el mensaje real con un pequeño "pop" (scale 0.9→1) + confeti.
- Ranking: las barras crecen y las filas se reordenan con animación.
- Sonidos cortos: "mensaje enviado", "voto", "revelación". En iPhone no hay vibración. Respetar `prefers-reduced-motion`.

## Copy
Inglés, corto y natural, en minúsculas como un chat real ("who ate my yogurt 😤").
Botones con mayúscula inicial: "Create room", "Join with code", "Start game", "Lock vote".

## Tailwind v4 (`app/src/index.css`)
```css
@theme {
  --color-r1-bg: #FFE3EF; --color-r1: #FF4F8B;
  --color-r2-bg: #DDF7EA; --color-r2: #16A34A;
  --color-r3-bg: #ECE6FF; --color-r3: #7C5CFF;
  --color-r4-bg: #FFF3C9; --color-r4: #F5A300;
  --color-r5-bg: #DDF0FF; --color-r5: #2F8CFF;
}
```
En la práctica: el color de la ronda vive en dos variables CSS en la raíz de la pantalla
(`--round-bg`, `--round-accent`) y los componentes usan `bg-[var(--round-bg)]`, `bg-[var(--round-accent)]`.
Cambiar de ronda = cambiar esas dos variables.
