# Deploy automático: Cloudflare (Workers con static assets)

**URL de producción: https://frieren.maguadomartinez.workers.dev**

> El proyecto se creó como **Worker** (no Pages). La configuración vive en `app/wrangler.jsonc`: compila con
> `npm run build` y publica `app/dist` (SPA). En el dashboard del Worker → **Settings → Build** debe estar:
> Root directory `app`, Deploy command `npx wrangler deploy` (build command puede quedar vacío: lo hace wrangler),
> y en **Build variables and secrets** (¡no en las variables de runtime!): `VITE_SUPABASE_URL`,
> `VITE_SUPABASE_PUBLISHABLE_KEY` y `NODE_VERSION=22`. Las VITE_* se incrustan al compilar.

(Instrucciones originales para Pages, por si se rehace como proyecto de Pages:)

Cada push a `main` publica la web sola. Cada rama tiene además su propia URL de prueba.
Gratis, sin límite de ancho de banda y sin bloquear commits de colaboradores.

## Configuración (una sola vez, la hace el dueño del repo: aguadossj)

1. Entra en https://dash.cloudflare.com (crea una cuenta gratis si no tienes).
2. **Workers & Pages** → **Create** → pestaña **Pages** → **Connect to Git**.
3. Autoriza la app de Cloudflare en GitHub **solo para el repo `aguadossj/frieren`** y selecciónalo.
4. Ajustes de build:

   | Campo | Valor |
   |---|---|
   | Project name | `frieren` (será la URL: `frieren.pages.dev`; si está cogido, `typing-frieren`) |
   | Production branch | `main` |
   | Framework preset | `Vite` (o `None`) |
   | Root directory (advanced) | `app` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |

5. **Environment variables (advanced)** → añade (las dos son públicas por diseño):

   | Variable | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://xociawfbjmccevhjcfiu.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | la clave `sb_publishable_…` (la de `app/.env.local`) |
   | `NODE_VERSION` | `22` |

   No pongas aquí `AI_API_KEY`: la IA corre en la Edge Function de Supabase, no en la web.

6. **Save and Deploy**. En 1–2 min está en `https://<project>.pages.dev`.

## Comprobar

- Abre la URL en el móvil → Create room → el código y el QR deben apuntar a `https://<project>.pages.dev/?room=XXXX`.
- `curl -s -o /dev/null -w "%{http_code}" https://<project>.pages.dev` → `200`.
- Plan B en la demo: `https://<project>.pages.dev/?mock=1` (juega con bots, sin backend).

## Día a día

- `git push` a `main` → despliegue de producción automático (ver estado en Cloudflare → el proyecto → Deployments).
- Push a otra rama → URL de preview `https://<rama>.<project>.pages.dev`.
- Si un deploy rompe algo: Cloudflare → Deployments → el anterior → **Rollback**.
