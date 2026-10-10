// Teclado del móvil: en iOS Safari el teclado NO encoge la página, la desplaza hacia arriba
// (la cabecera con el nombre del chat se sale de la pantalla y al cerrar "rebota").
// Solución: fijamos #root al área visible real (visualViewport) y anulamos ese desplazamiento.
// Así solo encoge la lista de mensajes; cabecera y barra de escribir quedan fijas.

/** Desplaza SOLO el contenedor con scroll más cercano (nunca la página) para que el campo quede visible. */
function revealField(el: HTMLElement) {
  let box: HTMLElement | null = el.parentElement
  while (box && box !== document.body) {
    const oy = getComputedStyle(box).overflowY
    if ((oy === 'auto' || oy === 'scroll') && box.scrollHeight > box.clientHeight) break
    box = box.parentElement
  }
  if (!box || box === document.body) return
  const b = box.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  const margin = 16
  if (r.bottom > b.bottom - margin) box.scrollTop += r.bottom - b.bottom + margin
  else if (r.top < b.top + margin) box.scrollTop -= b.top + margin - r.top
}

export function trackVisualViewport() {
  const vv = window.visualViewport
  const root = document.documentElement
  if (!vv) return

  const isField = (el: EventTarget | null) =>
    el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)

  // Solo escribir si cambia: escribir el mismo valor en cada evento provoca relayouts en cadena (parpadeo)
  const setVar = (name: string, value: string) => {
    if (root.style.getPropertyValue(name) !== value) root.style.setProperty(name, value)
  }

  let frame = 0
  const update = () => {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      // Zoom con los dedos (pinch): el área visible encoge y se mueve al desplazarte. Si siguiéramos ajustando
      // #root a ella, cada ajuste cambia el área visible otra vez → bucle → TODO parpadea. Con zoom, layout normal.
      if (Math.abs(vv.scale - 1) > 0.01) {
        setVar('--vv-h', `${window.innerHeight}px`)
        setVar('--vv-top', '0px')
        return
      }
      // 1) Primero deshacemos el scroll que iOS hace para enseñar el input (nuestro layout ya cabe)…
      //    SOLO mientras se escribe en un campo. Si no, dejamos el rebote nativo de iOS en paz: corregirlo
      //    "peleaba" con el gesto (pantalla que se movía) y rompía "deslizar hacia abajo para recargar".
      const typing = isField(document.activeElement)
      if (typing && window.scrollY > 0) window.scrollTo(0, 0)
      // 2) …y DESPUÉS leemos la posición del área visible. Antes se leía antes de deshacer el scroll:
      //    #root se quedaba desplazado hacia abajo y la pantalla se veía en blanco (pantalla del nombre).
      setVar('--vv-h', `${Math.round(vv.height)}px`)
      setVar('--vv-top', `${Math.max(0, Math.round(vv.offsetTop))}px`)
      // teclado abierto ⇔ el área visible es bastante más baja que la ventana
      const kb = window.innerHeight - vv.height > 120 || isField(document.activeElement) ? 'open' : 'closed'
      if (root.dataset.keyboard !== kb) root.dataset.keyboard = kb
      // Con el teclado ya arriba, que el campo activo quede a la vista dentro de su zona con scroll
      if (isField(document.activeElement)) revealField(document.activeElement as HTMLElement)
    })
  }

  // Marcamos el teclado en cuanto un campo de texto recibe el foco (antes de que el teclado termine de subir),
  // para que el fondo blanco ya esté ahí durante la animación y no se vea una franja roja.
  document.addEventListener('focusin', (e) => {
    if (isField(e.target)) root.dataset.keyboard = 'open'
  })
  document.addEventListener('focusout', (e) => {
    if (isField(e.target)) setTimeout(update, 50)
  })

  // En TODAS las pantallas: al tocar un campo de texto, darle el foco sin que iOS desplace la página
  // (es lo que ya hacía el chat con focusWithoutScroll). Evita el salto y la pantalla en blanco.
  document.addEventListener(
    'touchend',
    (e) => {
      const el = e.target
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return
      if (el.disabled || el.readOnly || document.activeElement === el) return
      e.preventDefault()
      el.focus({ preventScroll: true })
    },
    { capture: true, passive: false },
  )

  vv.addEventListener('resize', update)
  vv.addEventListener('scroll', update)
  window.addEventListener('scroll', update, { passive: true })
  update()
}

/**
 * Enfoca un campo SIN que iOS desplace la página (la causa del "salto" al abrir el teclado).
 * Usar en onTouchEnd del input: `onTouchEnd={focusWithoutScroll}`.
 */
export function focusWithoutScroll(e: { currentTarget: HTMLInputElement | HTMLTextAreaElement; preventDefault: () => void }) {
  const el = e.currentTarget
  if (document.activeElement === el) return // ya tiene foco: dejar mover el cursor con normalidad
  e.preventDefault() // evita el foco "nativo" que hace scroll
  el.focus({ preventScroll: true })
}

/**
 * Safari (iOS 26) solo recalcula el color de sus barras cuando la página hace scroll. En una SPA el cambio de
 * pantalla no hace scroll, así que la barra se queda con el color de la pantalla anterior (rojo de Home) hasta
 * que el usuario desliza. Esto simula ese scroll: alarga la página 2px un instante, baja 2px y vuelve arriba.
 * Invisible para el usuario. Llamar al entrar/salir de una pantalla con otros colores en los bordes.
 */
export function retintSafariBars() {
  const spacer = document.createElement('div')
  spacer.setAttribute('aria-hidden', 'true')
  spacer.dataset.retint = ''
  spacer.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:calc(100vh + 4px);pointer-events:none;visibility:hidden'
  document.body.appendChild(spacer)
  void spacer.offsetHeight // forzar layout para que la página sea "scrolleable" ya
  window.scrollTo(0, 2)
  // Timers y no requestAnimationFrame: rAF se pausa en pestañas ocultas y dejaría el espaciador puesto
  setTimeout(() => {
    window.scrollTo(0, 0)
    spacer.remove()
  }, 60)
}

