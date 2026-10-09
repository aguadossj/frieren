# Typing… — Guía de estilo "Chat rojo"

Decisión del equipo (sáb 10 oct, ~01:30): **un chat normal y corriente, con fondo rojo intenso fijo `#EE2B2B` en todas las pantallas**
(sin pasteles). La revelación usa fondo negro `#111` para que el momento clave destaque.
Esta guía es la fuente de verdad visual. Cualquier pantalla nueva sale de aquí.

## Idea
Parece una app de mensajería de verdad (cabecera, burbujas, "escribiendo…", barra de mensaje),
así que se entiende al instante. El color viene del **fondo rojo**; todo lo demás es blanco y limpio, con negro como segundo acento.

## Reglas
1. **Nada de pasteles** (se ve infantil). Fondo **rojo `#EE2B2B`** en todas las pantallas; **negro `#111`** solo en la revelación.
2. **Sobre el fondo de color, el texto va en blanco** (nombres, titulares, instrucciones).
3. **Burbujas, cabecera, barra de entrada y filas en blanco** con texto casi negro `#111`.
4. **El negro `#111` es el segundo acento:** píldora del temporizador, indicación de rol, botón secundario, opción votada (`outline` 3px).
   El botón principal sobre el rojo es **blanco con texto rojo**.
5. El color de cada jugador va en su **avatar** (círculo con borde blanco de 2px para que destaque sobre cualquier fondo). Los nombres sobre el fondo, en blanco.
6. Sin contornos decorativos, sin sombras, sin degradados, sin texturas, sin pegatinas inclinadas. Limpio.
7. Esquinas: burbujas 18px, botones 18px, filas/tarjetas 14–16px, píldoras 12px.
8. Mucho aire, letra grande. Mensajes ≥ 15px en el producto real. Botón principal abajo, a ancho completo.

## Color
| Token | Hex | Uso |
|---|---|---|
| `brand` | `#EE2B2B` | Fondo de todas las pantallas; texto de estado y del botón principal sobre blanco |
| `ink` | `#111111` | Fondo de la revelación; temporizador, indicación de rol, botón secundario, opción votada |
| `good` | `#00A055` | Puntos positivos (+400) sobre filas blancas |
| blanco | `#FFFFFF` | Cabeceras, burbujas, barra de entrada, filas, botón principal |

**El rojo se asocia a "error":** nunca uses rojo para avisos. Los errores van en blanco/negro (texto en negrita).
El temporizador no se pone rojo al final (no se vería): parpadea en negro.

## Colores de jugador (fijos por orden de entrada; solo avatar) — sin rojos
`#1E6BFF` blue · `#00B060` green · `#6B3BFF` violet · `#111111` black · `#FF8A00` orange ·
`#00B8A9` teal · `#F5B700` yellow · `#FF4FA3` pink. (Definidos en `app/src/game/types.ts` → `PLAYER_COLORS`.)
Avatar = círculo con la inicial en blanco y borde blanco de 2px. En la votación **todas** las burbujas llevan el avatar de Pol.

## Tipografía
Fuente del sistema (`system-ui, -apple-system, "Segoe UI", Roboto`). Se siente nativo y carga al instante.
Logo y titulares grandes: peso 800–900 con `letter-spacing: -1px`. Botones: 700. Nombres en burbujas: 600, 10–11px.

## Componentes clave
- **Cabecera de chat (blanca):** nombre del grupo ("Piso 3B") + estado en rojo ("Pol is typing…") + temporizador en píldora negra.
- **Burbuja:** blanca, nombre encima en blanco sobre el rojo. "Escribiendo…" = burbuja blanca con tres puntos que saltan.
- **Indicación de rol:** píldora negra `#111` centrada encima de la barra de entrada, texto blanco:
  "You're Pol. Say it for real." / "Write what Pol would say. Fool them."
- **Barra de entrada:** fondo blanco; campo gris claro `#F2F2F5`; botón de enviar circular rojo. Máx. 80 caracteres.
- **Votación:** filas con el avatar de Pol + burbuja + 😂 a la derecha. La elegida lleva un `outline` de 3px negro. Botón "Lock vote" negro.
- **Revelación (fondo negro):** el mensaje real grande y centrado, titular "Fooled 2! 🎭", filas blancas con +puntos en verde, tarjeta del premio roja con 🏆.
- **Ranking:** filas blancas con posición, avatar, nombre, barra del color del jugador, puntos y ▲▼. Pasa solo a los 3s.

## Movimiento y sonido
- Al empezar cada ronda: el chat entra de cero (burbujas una a una) y un rótulo "ROUND 2 OF 5" aparece con fade.
- Rojo → negro en la revelación con una transición de 300ms.
- Las burbujas entran como mensajes nuevos (subir 8px + fade, 200ms, de una en una).
- Revelación: tres puntos ~1,2s y luego aparece el mensaje real con un pequeño "pop" (scale 0.9→1) + confeti.
- Ranking: las barras crecen y las filas se reordenan con animación.
- Sonidos cortos: "mensaje enviado", "voto", "revelación". En iPhone no hay vibración. Respetar `prefers-reduced-motion`.

## Copy
Inglés, corto y natural, en minúsculas como un chat real ("who ate my yogurt 😤").
Botones con mayúscula inicial: "Create room", "Join with code", "Start game", "Lock vote".

## Tailwind v4 (`app/src/index.css`, ya aplicado)
```css
@theme {
  --color-brand: #EE2B2B;
  --color-ink: #111111;
  --color-good: #00A055;
}
```
Clases: `bg-brand`, `text-brand`, `bg-ink`, `text-good`. Componentes base en `app/src/components/ui.tsx`.
