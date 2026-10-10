import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { trackVisualViewport } from './lib/viewport'
import { requestPositionEarly } from './lib/place'
import App from './App.tsx'

trackVisualViewport()
// Ubicación al entrar en la web (el aviso del navegador sale aquí, no al crear la sala). Queda en el móvil.
// No en el modo de prueba (?mock) ni si el navegador no la soporta.
if (!new URLSearchParams(location.search).has('mock')) void requestPositionEarly()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
