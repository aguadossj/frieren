// Teclado del móvil: en iOS Safari el teclado NO encoge la página, la desplaza hacia arriba
// (la cabecera con el nombre del chat se sale de la pantalla y al cerrar "rebota").
// Solución: fijamos #root al área visible real (visualViewport) y anulamos ese desplazamiento.
// Así solo encoge la lista de mensajes; cabecera y barra de escribir quedan fijas.

export function trackVisualViewport() {
  const vv = window.visualViewport
  const root = document.documentElement
  if (!vv) return

  let frame = 0
  const update = () => {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      root.style.setProperty('--vv-h', `${vv.height}px`)
      root.style.setProperty('--vv-top', `${vv.offsetTop}px`)
      // teclado abierto ⇔ el área visible es bastante más baja que la ventana
      root.dataset.keyboard = window.innerHeight - vv.height > 120 ? 'open' : 'closed'
      // iOS desplaza la página para enseñar el input: lo deshacemos (nuestro layout ya cabe)
      if (window.scrollY !== 0) window.scrollTo(0, 0)
    })
  }

  vv.addEventListener('resize', update)
  vv.addEventListener('scroll', update)
  window.addEventListener('scroll', update, { passive: true })
  update()
}
