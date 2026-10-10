// QR del lobby → `${origin}/?room=CODE` (Home lee ?room y abre directamente "unirse").
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export const joinUrl = (code: string) => `${location.origin}/?room=${code}`

/** Enlace público del juego (lo que se comparte al acabar). En local seguiría siendo la web pública, no tu IP. */
export const PUBLIC_URL = ((import.meta.env.VITE_PUBLIC_URL as string | undefined) ?? 'https://frieren-bfq.pages.dev').replace(/\/$/, '')

/**
 * Comparte un texto ya completo (con el enlace dentro): menú nativo → portapapeles → copia a la antigua.
 * El enlace va dentro del texto (y no en `url`) para que WhatsApp/Mensajes respeten los saltos de línea.
 */
export async function shareText(text: string): Promise<'shared' | 'copied' | 'cancelled'> {
  if (navigator.share) {
    try {
      await navigator.share({ text })
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
    }
  }
  return copyText(text)
}

async function copyText(full: string): Promise<'copied' | 'cancelled'> {
  try {
    await navigator.clipboard.writeText(full)
    return 'copied'
  } catch {
    // http (móvil por la IP local) no tiene navigator.clipboard: copia a la antigua
    const ta = document.createElement('textarea')
    ta.value = full
    ta.setAttribute('readonly', '')
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok ? 'copied' : 'cancelled'
  }
}

/**
 * Compartir la invitación: abre el menú nativo de compartir (WhatsApp, Mensajes…) con el texto y el enlace.
 * Si el navegador no puede compartir, copia "texto + enlace" al portapapeles.
 * Devuelve 'shared' | 'copied' | 'cancelled' para que la UI muestre (o no) "copiado".
 */
export async function shareInvite(code: string, text: string): Promise<'shared' | 'copied' | 'cancelled'> {
  const url = joinUrl(code)
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Typing…', text, url })
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled' // el usuario cerró el menú
    }
  }
  return copyText(`${text}\n${url}`)
}

export default function QR({ code, size = 168 }: { code: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    QRCode.toDataURL(joinUrl(code), { margin: 0, width: size * 2, color: { dark: '#111111', light: '#ffffff' } })
      .then(setSrc)
      .catch(() => setSrc(null))
  }, [code, size])
  return (
    <div className="mx-auto shrink-0 animate-pop rounded-[32px] bg-white p-5" style={{ width: size + 40 }}>
      {src ? <img src={src} alt={`Scan to join room ${code}`} width={size} height={size} /> : <div style={{ height: size }} />}
    </div>
  )
}
