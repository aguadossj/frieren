# Typing… — Guía de estilo "Jelly Party"

Inspiración: Fall Guys (gominolas y jelly beans, colores saturados, todo "blandito" y que rebota).
Esta guía es la fuente de verdad visual. Cualquier pantalla nueva sale de aquí.

## Sensación
Divertido, saturado, gomoso. Cada botón parece una gominola que se hunde al tocarla.
Nada plano y gris, nada corporativo, nada de degradados ni glassmorphism.

## Colores (tokens)
| Token | Hex | Borde inferior ("jelly edge") | Uso |
|---|---|---|---|
| `sky` | `#4FB8FF` | — | Fondo principal |
| `grape` | `#B07CFF` | `#7E4FD6` | Fondo de la revelación / momentos especiales |
| `orange` | `#FF8A1F` | `#C55F00` | CTA principal (Send, Create room) |
| `lime` | `#7BE07B` | `#45A845` | Éxito, Start, "FOOLED!" (texto `#1F5A1F`) |
| `banana` | `#FFD12E` | `#D49A00` | Temporizador, destacados (texto `#7A4A00`) |
| `bubblegum` | `#FF5FA2` | `#C9367A` | Picante, jugador rosa |
| `cloud` | `#FFFFFF` | `#B9DDF7` | Inputs, botones secundarios (texto `#2A7FD4`) |
| `glass` | `rgba(255,255,255,.2)` | — | Filas de listas sobre fondo de color |

**Colores de los jugadores** (fijos por orden de entrada, en avatar, burbujas y ranking):
bubblegum `#FF5FA2` · lime `#7BE07B` · banana `#FFD12E` · grape `#B07CFF` · orange `#FF8A1F` ·
mint `#4FE3C1` · coral `#FF6B6B` · cloud `#FFFFFF`.
Sobre colores claros (banana, lime, cloud, mint) el texto va en el tono oscuro de su familia, nunca negro puro.

## Tipografía
- **Títulos, botones, números:** `Lilita One` (Google Fonts), en MAYÚSCULAS para botones y estados.
- **Mensajes y texto:** `Fredoka` 400/600. Los mensajes del chat ≥ 14px en el producto real.

## La regla "jelly"
Todo elemento tocable o destacado lleva:
- `border-radius` grande (16–24px; círculos para el temporizador).
- **Borde inferior grueso** del tono oscuro de su color: 4px en burbujas y chips, 6px en botones.
- Al tocar: `translateY(3px)` y el borde inferior baja a 2px (se "hunde"). Transición de 80–120ms.

## Jugadores = jelly beans
Cápsula del color del jugador (unos 22×30px en listas, 40×56px en el podio), visera blanca y dos ojos.
Hecha solo con CSS, sin imágenes. Expresiones en la revelación: ojos felices si engañó, ojos de sorpresa si lo pillaron.

## Movimiento
- Entradas con rebote (`cubic-bezier(.34,1.56,.64,1)`, 250–400ms).
- Pegatinas y estados ligeramente girados (-5° a 3°): "POL IS TYPING…", "FOOLED 2!".
- "Escribiendo…": tres puntos que saltan.
- La revelación: zoom del mensaje real, sello "FOOLED X!" o "CAUGHT!", confeti.
- Ranking: los beans suben o bajan y las barras crecen. Pasa solo a los 3s.
- Respetar `prefers-reduced-motion`.

## Sonido (en iPhone no hay vibración, el sonido da el feedback)
Pop corto al enviar, "boing" al votar, fanfarria corta en la revelación. Volumen bajo; botón de silenciar.

## Copy
Inglés, corto, gamberro, en MAYÚSCULAS en botones: `CREATE ROOM`, `SEND!`, `START!`, `FOOLED 2!`, `CAUGHT!`.
Microcopy en minúsculas y con humor: "that's you, bean! be real".

## Tailwind v4 (`app/src/index.css`)
```css
@theme {
  --color-sky: #4FB8FF;
  --color-grape: #B07CFF;   --color-grape-edge: #7E4FD6;
  --color-orange: #FF8A1F;  --color-orange-edge: #C55F00;
  --color-lime: #7BE07B;    --color-lime-edge: #45A845;   --color-lime-ink: #1F5A1F;
  --color-banana: #FFD12E;  --color-banana-edge: #D49A00; --color-banana-ink: #7A4A00;
  --color-bubblegum: #FF5FA2; --color-bubblegum-edge: #C9367A;
  --color-cloud-edge: #B9DDF7; --color-cloud-ink: #2A7FD4;
  --font-display: "Lilita One", system-ui, sans-serif;
  --font-body: "Fredoka", system-ui, sans-serif;
  --ease-jelly: cubic-bezier(.34,1.56,.64,1);
}
```
Botón tipo: `rounded-[20px] bg-orange border-b-[6px] border-orange-edge font-display text-white active:translate-y-[3px] active:border-b-2 transition`.
