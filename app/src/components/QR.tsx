// QR del lobby → `${origin}/?room=CODE` (Home lee ?room y abre directamente "unirse").
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export const joinUrl = (code: string) => `${location.origin}/?room=${code}`

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
  const full = `${text}\n${url}`
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
