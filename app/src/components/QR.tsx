// QR del lobby → `${origin}/?room=CODE` (Home lee ?room y abre directamente "unirse").
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export const joinUrl = (code: string) => `${location.origin}/?room=${code}`

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
