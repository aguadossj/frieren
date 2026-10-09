---
description: Build + deploy a producción + QA móvil + QR
---

Despliega y verifica. En orden, parando si algo falla:

1. `cd app && npm run build`. Si falla, arréglalo (cambio mínimo) y vuelve a empezar.
2. Despliega: `cd app && npx vercel --prod --yes`. Si no hay sesión de Vercel, dilo y para:
   la persona tiene que hacer `npx vercel login` ella misma.
3. Captura la URL de producción y guárdala en la primera línea de `SPEC.md` como `URL: ...` si no está.
4. Lanza el subagente **`mobile-qa`** contra la URL desplegada (no contra localhost).
5. Genera el QR: `npx -y qrcode-terminal "<URL>"` y además guarda `qr.png` en la raíz con
   `npx -y qrcode -o qr.png "<URL>"` (para imprimirlo o ponerlo en pantalla durante la demo).
6. Commit con mensaje `ship: <resumen>` y entrada en `AGENT_LOG.md`.
7. Resume: URL, resultado del QA (bloqueantes primero), y los 3 arreglos más importantes.
