import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// host: true -> accesible desde el móvil en la misma wifi (http://<ip-del-portátil>:5173)
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: true },
  preview: { host: true },
})
