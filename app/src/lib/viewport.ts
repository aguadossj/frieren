// Teclado del móvil: en iOS Safari el teclado NO encoge la página, la desplaza hacia arriba
// (la cabecera con el nombre del chat se sale de la pantalla y al cerrar "rebota").
// Solución: fijamos #root al área visible real (visualViewport) y anulamos ese desplazamiento.
// Así solo encoge la lista de mensajes; cabecera y barra de escribir quedan fijas.

export function trackVisualViewport() {
  const vv = window.visualViewport
  const root = document.documentElement
  if (!vv) return

  const isField = (el: EventTarget | null) =>
    el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)

  let frame = 0
  const update = () => {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      root.style.setProperty('--vv-h', `${vv.height}px`)
      root.style.setProperty('--vv-top', `${vv.offsetTop}px`)
      // teclado abierto ⇔ el área visible es bastante más baja que la ventana
      root.dataset.keyboard =
        window.innerHeight - vv.height > 120 || isField(document.activeElement) ? 'open' : 'closed'
      // iOS desplaza la página para enseñar el input: lo deshacemos (nuestro layout ya cabe)
      if (window.scrollY !== 0) window.scrollTo(0, 0)
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
