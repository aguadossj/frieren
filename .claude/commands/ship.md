---
description: Build + deploy a producción + QA móvil + QR
---

Despliega y verifica. En orden, parando si algo falla:

1. `cd app && npm run build`. Si falla, arréglalo (cambio mínimo) y vuelve a empezar.
2. Despliega: **haz push a `main`** (`git pull --rebase && git push`). Cloudflare compila y publica solo
   (ver `DEPLOY.md`; config en `app/wrangler.jsonc`). Espera 1–2 min.
3. URL de la demo: **https://frieren-bfq.pages.dev**. Comprueba que responde 200 y que sirve la build
   (el HTML debe referenciar `/assets/*.js`, NO `/src/main.tsx`):
   `curl -s https://frieren-bfq.pages.dev/ | grep -o 'src="[^"]*"'`.
4. Lanza el subagente **`mobile-qa`** contra la URL desplegada (no contra localhost).
5. Genera el QR: `npx -y qrcode-terminal "https://frieren-bfq.pages.dev"` y además guarda `qr.png` en la raíz con
   `npx -y qrcode -o qr.png "<URL>"` (para imprimirlo o ponerlo en pantalla durante la demo).
6. Commit con mensaje `ship: <resumen>` y entrada en `AGENT_LOG.md`.
7. Resume: URL, resultado del QA (bloqueantes primero), y los 3 arreglos más importantes.
