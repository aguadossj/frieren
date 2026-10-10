// Páginas legales: /privacy, /ai y /terms (fuera del router por fase; ver main.tsx). Texto en content/legal.ts.
// Mismo estilo que el resto: fondo rojo con dibujitos, tarjetas blancas, letra grande. Pestañas para saltar entre las 3.
// Anclas (/privacy#location, /ai#mimic…) para enlazar a una sección concreta desde el juego.

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react'
import { useLang } from '../i18n'
import { LEGAL, LEGAL_PAGES, LEGAL_PATHS, legalPageFromPath, type LegalPage } from '../content/legal'
import { Icon, LangToggle, Screen } from '../components/ui'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

// Ruta actual (cambia con las pestañas sin recargar)
const routeListeners = new Set<() => void>()
const subscribeRoute = (cb: () => void) => {
  routeListeners.add(cb)
  window.addEventListener('popstate', cb)
  return () => {
    routeListeners.delete(cb)
    window.removeEventListener('popstate', cb)
  }
}
function go(path: string) {
  // replaceState: "atrás" en el navegador sale de las páginas legales, no recorre las pestañas
  history.replaceState(null, '', path)
  routeListeners.forEach((l) => l())
}

/** Volver: si venimos del juego (misma web), atrás; si se abrió el enlace directo, a la portada. */
function back() {
  const fromHere = document.referrer && new URL(document.referrer).origin === location.origin
  if (fromHere && history.length > 1) history.back()
  else location.assign('/')
}

export default function Legal() {
  const lang = useLang()
  const path = useSyncExternalStore(subscribeRoute, () => location.pathname + location.hash)
  const page: LegalPage = legalPageFromPath(location.pathname) ?? 'privacy'
  const copy = LEGAL[lang]
  const p = copy[page]
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.title = `${p.title} · Typing…`
    // Ancla: ir a la sección; si no hay, arriba del todo
    const id = decodeURIComponent(location.hash.slice(1))
    const el = id ? document.getElementById(id) : null
    if (el) el.scrollIntoView({ block: 'start' })
    else scroller.current?.scrollTo({ top: 0 })
  }, [path, p.title])

  return (
    <Screen>
      <div className="flex h-[56px] shrink-0 items-center justify-between px-3" style={{ marginTop: 'env(safe-area-inset-top)' }}>
        <button onClick={back} className="flex h-[44px] items-center gap-2 px-2 text-[15px] font-black active:scale-95">
          <Icon name="arrowLeft" size={20} />
          {copy.ui.back}
        </button>
        <LangToggle />
      </div>

      {/* Pestañas */}
      <nav className="flex shrink-0 gap-2 px-5 pb-3" aria-label="Legal">
        {LEGAL_PAGES.map((k) => (
          <a
            key={k}
            href={LEGAL_PATHS[k]}
            onClick={(e) => {
              e.preventDefault()
              go(LEGAL_PATHS[k])
            }}
            aria-current={k === page ? 'page' : undefined}
            className={cx(
              'flex h-[44px] flex-1 items-center justify-center rounded-full text-[15px] font-extrabold transition active:scale-95',
              k === page ? 'bg-white text-brand' : 'bg-white/15 text-white',
            )}
          >
            {copy[k].tab}
          </a>
        ))}
      </nav>

      <div ref={scroller} className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 pb-8" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>
        <header key={page} className="animate-rise pt-3 pb-5">
          <h1 className="text-[44px] leading-[0.95] font-black tracking-[-0.035em]">{p.title}</h1>
          <p className="mt-2 text-[18px] font-semibold text-white/85">{p.lead}</p>
        </header>

        {/* En corto */}
        <section className="rounded-[26px] bg-ink p-5">
          <div className="text-[13px] font-extrabold tracking-[0.16em] text-white/60 uppercase">{copy.ui.short}</div>
          <ul className="mt-3 flex flex-col gap-2.5">
            {p.summary.map((s) => (
              <li key={s} className="flex items-start gap-3 text-[17px] leading-snug font-bold">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand">
                  <Icon name="check" size={14} />
                </span>
                {s}
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-3 flex flex-col gap-3">
          {p.sections.map((s) => (
            <section key={`${page}-${s.id}`} id={s.id} className="scroll-mt-3 rounded-[26px] bg-white p-5 text-ink">
              {s.tag && (
                <span
                  className={cx(
                    'mb-2 inline-flex h-[26px] items-center rounded-full px-3 text-[12px] font-extrabold tracking-[0.08em] uppercase',
                    s.tag.includes('+') ? 'bg-ink text-white' : /^(AI|IA)$/.test(s.tag) ? 'bg-brand text-white' : 'bg-neutral-200 text-ink',
                  )}
                >
                  {s.tag}
                </span>
              )}
              <h2 className="text-[21px] leading-tight font-black tracking-[-0.01em]">{s.title}</h2>
              <div className="mt-2 flex flex-col gap-2">
                {s.lines.map((l) => (
                  <p key={l} className="text-[16px] leading-snug font-medium text-neutral-600">
                    {rich(l)}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-5 text-center text-[13px] font-bold text-white/60">{copy.ui.updated}</p>
      </div>
    </Screen>
  )
}

/** `[texto](url)` → enlace. Rutas internas de estas páginas cambian de pestaña sin recargar. */
function rich(text: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /\[([^\]]+)\]\(([^)]+)\)/g
  let last = 0
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const [, label, href] = m
    const internal = legalPageFromPath(href.split('#')[0])
    const external = /^https?:/.test(href)
    out.push(
      <a
        key={m.index}
        href={href}
        className="font-extrabold text-ink underline decoration-brand decoration-2 underline-offset-2"
        {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
        onClick={
          internal
            ? (e) => {
                e.preventDefault()
                go(href)
              }
            : undefined
        }
      >
        {label}
      </a>,
    )
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}
