---
description: Build + deploy a producción + QA móvil + QR
---

Despliega y verifica. En orden, parando si algo falla:

1. `cd app && npm run build`. Si falla, arréglalo (cambio mínimo) y vuelve a empezar.
2. Despliega: `cd app && npx vercel --prod --yes`. Si no hay sesión de Vercel, dilo y para:
   la persona tiene que hacer `npx vercel login` ella misma.
3. URL de la demo: usa SIEMPRE el **alias de producción** (`https://app-azure-sigma-64.vercel.app`, o el
   alias con el nombre del producto si ya existe), NUNCA la URL única del deploy (`app-<hash>-ferrer-labs...`):
   esa tiene Deployment Protection y pide login de Vercel a los desconocidos.
   Cuando el producto tenga nombre, crea un alias bonito una vez:
   `npx vercel alias set <url-del-deploy> <nombre>.vercel.app` (si está cogido, prueba variantes).
   Comprueba con `curl -s -o /dev/null -w "%{http_code}" <URL>` que devuelve 200, no 302/401.
   Guárdala en la primera línea de `SPEC.md` como `URL: ...` si no está.
4. Lanza el subagente **`mobile-qa`** contra la URL desplegada (no contra localhost).
5. Genera el QR: `npx -y qrcode-terminal "<URL>"` y además guarda `qr.png` en la raíz con
   `npx -y qrcode -o qr.png "<URL>"` (para imprimirlo o ponerlo en pantalla durante la demo).
6. Commit con mensaje `ship: <resumen>` y entrada en `AGENT_LOG.md`.
7. Resume: URL, resultado del QA (bloqueantes primero), y los 3 arreglos más importantes.
