import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { trackVisualViewport } from './lib/viewport'
import App from './App.tsx'

trackVisualViewport()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
