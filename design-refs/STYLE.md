# Typing… — Guía de estilo "Chat de colores"

Decisión del equipo (sáb 10 oct, ~01:00): **un chat normal y corriente, con fondo de color intenso por ronda (sin pasteles).**
Esta guía es la fuente de verdad visual. Cualquier pantalla nueva sale de aquí.

## Idea
Parece una app de mensajería de verdad (cabecera, burbujas, "escribiendo…", barra de mensaje),
así que se entiende al instante. El color viene del **fondo, que cambia en cada ronda**; todo lo demás es blanco y limpio.

## Reglas
1. **Nada de pasteles** (se ve infantil). El fondo de cada ronda es un **color saturado e intenso**.
2. **Sobre el fondo de color, el texto va en blanco** (nombres, titulares, instrucciones).
3. **Burbujas, cabecera, barra de entrada y filas en blanco** con texto casi negro `#111`.
4. **El negro `#111` es el segundo acento:** píldora del temporizador, indicación de rol, botón secundario, opción votada (`outline` 3px).
   El botón principal sobre el fondo de color es **blanco con texto del color de la ronda**.
5. El color de cada jugador va en su **avatar** (círculo con borde blanco de 2px para que destaque sobre cualquier fondo). Los nombres sobre el fondo, en blanco.
6. Sin contornos decorativos, sin sombras, sin degradados, sin texturas, sin pegatinas inclinadas. Limpio.
7. Esquinas: burbujas 18px, botones 18px, filas/tarjetas 14–16px, píldoras 12px.
8. Mucho aire, letra grande. Mensajes ≥ 15px en el producto real. Botón principal abajo, a ancho completo.

## Colores de ronda (fondo saturado; texto blanco encima)
| Ronda | Fondo | Uso del color sobre blanco (estado, puntos) |
|---|---|---|
| 1 · Hot pink | `#FF2E74` | `#FF2E74` |
| 2 · Green | `#00B060` | `#00A055` |
| 3 · Violet | `#6B3BFF` | `#6B3BFF` |
| 4 · Orange | `#FF8A00` | `#E07000` |
| 5 · Blue | `#1E6BFF` | `#1E6BFF` |
Inicio = Hot pink. Sala = Blue. Las rondas rotan en este orden; el ranking usa el color de la ronda que acaba de terminar.
Los puntos positivos (+400) siempre en verde `#00A055` sobre las filas blancas.

## Colores de jugador (fijos por orden de entrada; solo avatar)
`#FF2E74` pink · `#00B060` green · `#FF8A00` orange · `#6B3BFF` violet · `#1E6BFF` blue ·
`#00B8A9` teal · `#E5243B` red · `#111111` black.
Si el avatar coincide con el color de fondo de la ronda, el borde blanco lo separa. En la votación **todas** las burbujas llevan el avatar de Pol.

## Tipografía
Fuente del sistema (`system-ui, -apple-system, "Segoe UI", Roboto`). Se siente nativo y carga al instante.
Logo y titulares grandes: peso 800–900 con `letter-spacing: -1px`. Botones: 700. Nombres en burbujas: 600, 10–11px.

## Componentes clave
- **Cabecera de chat (blanca):** avatar del grupo + nombre ("Piso 3B") + estado en el color de la ronda ("Pol is typing…") + temporizador en píldora negra.
- **Burbuja:** blanca, nombre encima en el color del jugador. "Escribiendo…" = burbuja blanca con tres puntos que saltan.
- **Indicación de rol:** píldora negra `#111` centrada encima de la barra de entrada, texto blanco:
  "You're Pol. Say it for real." / "Write what Pol would say. Fool them."
- **Barra de entrada:** fondo blanco; campo gris claro `#F2F2F5`; botón de enviar circular del color de la ronda. Máx. 80 caracteres.
- **Votación:** filas con el avatar de Pol + burbuja + 😂 a la derecha. La elegida lleva un `outline` de 3px negro. Botón "Lock vote" negro.
- **Revelación:** el mensaje real grande y centrado, titular "Fooled 2! 🎭", filas blancas con +puntos en verde, tarjeta del premio negra con 🏆.
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
  --color-r1: #FF2E74;
  --color-r2: #00B060;
  --color-r3: #6B3BFF;
  --color-r4: #FF8A00;
  --color-r5: #1E6BFF;
  --color-ink: #111111;
}
```
En la práctica: el color de la ronda vive en dos variables CSS en la raíz de la pantalla
(`--round`) y los componentes usan `bg-[var(--round)]` / `text-[var(--round)]`.
Cambiar de ronda = cambiar esa variable.
