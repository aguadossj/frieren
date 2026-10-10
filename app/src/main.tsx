import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { trackVisualViewport } from './lib/viewport'
import { requestPositionEarly } from './lib/place'
import App from './App.tsx'
import Legal from './screens/Legal'
import { legalPageFromPath } from './content/legal'

trackVisualViewport()
// Ubicación al entrar en la web (el aviso del navegador sale aquí, no al crear la sala). Queda en el móvil.
// No en el modo de prueba (?mock), ni en las páginas legales (/privacy, /ai, /terms), ni si el navegador no la soporta.
const legal = legalPageFromPath(location.pathname) !== null
if (!legal && !new URLSearchParams(location.search).has('mock')) void requestPositionEarly()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {legal ? <Legal /> : <App />}
  </StrictMode>,
)
