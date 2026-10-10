// Contexto del lugar para personalizar los chats de la IA.
// Solo se usa si el host dice que estáis todos juntos y acepta compartir la ubicación.
// Las coordenadas NO salen del móvil hacia nuestro backend: solo se envían a OpenStreetMap para traducirlas
// a nombres (calle, barrio, sitios cercanos; Nominatim, sin clave) y eso es lo único que se guarda como contexto de la sala.

export interface PlaceContext {
  place: string // "Carrer de Pujades, Poblenou, Barcelona"
  nearby: string[] // ["Razzmatazz (club)", "Bar Pujades (bar)"…] máx. 8, ≤ 40 caracteres cada uno
  local_time: string // "Saturday 00:12, late night"
}

/** Pide la ubicación (aquí aparece el aviso del navegador). null si no hay permiso, falla o tarda. */
export function getPosition(timeoutMs = 10000): Promise<{ lat: number; lon: number } | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(null)
    const timer = setTimeout(() => resolve(null), timeoutMs + 500)
    navigator.geolocation.getCurrentPosition(
      (p) => {
        clearTimeout(timer)
        resolve({ lat: p.coords.latitude, lon: p.coords.longitude })
      },
      () => {
        clearTimeout(timer)
        resolve(null)
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 5 * 60 * 1000 },
    )
  })
}

/**
 * Pedir la ubicación nada más entrar en la web (aviso del navegador al abrirla, no a mitad de crear la sala).
 * Se pide UNA vez y se guarda en memoria; la posición no se envía a ningún sitio hasta que el host dice
 * "estáis juntos" al crear la sala (entonces se traduce a nombres con OpenStreetMap, ver describePlace).
 */
let earlyPosition: Promise<{ lat: number; lon: number } | null> | null = null
export function requestPositionEarly() {
  earlyPosition ??= getPosition()
  return earlyPosition
}
/** La posición pedida al entrar (o la pide ahora si no se pidió). */
export const knownPosition = () => requestPositionEarly()

async function fetchJson(url: string, init: RequestInit = {}, timeoutMs = 7000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

/** Calle, barrio y ciudad (Nominatim, OpenStreetMap). */
async function reverseGeocode(lat: number, lon: number, lang: string): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&addressdetails=1&accept-language=${lang}&lat=${lat}&lon=${lon}`
  const data = await fetchJson(url)
  const a = data?.address ?? {}
  const parts = [
    a.road ?? a.pedestrian ?? a.square,
    a.neighbourhood ?? a.quarter ?? a.suburb ?? a.city_district,
    a.city ?? a.town ?? a.village,
  ].filter((p, i, all): p is string => Boolean(p) && all.indexOf(p) === i)
  return clip(parts.join(', '), 120)
}

// Tipo de sitio (amenity de OSM) → nombre corto para la IA
const KINDS: Record<string, string> = {
  nightclub: 'club',
  bar: 'bar',
  pub: 'pub',
  restaurant: 'restaurant',
  fast_food: 'fast food',
  cafe: 'café',
  cinema: 'cinema',
}

/** Qué buscar según la hora: de noche ocio nocturno, a la hora de comer/cenar restaurantes, de día cafés. */
function kindsFor(hour: number): string[] {
  if (hour >= 22 || hour < 6) return ['nightclub', 'bar', 'pub', 'fast_food']
  if (hour >= 20) return ['restaurant', 'bar', 'nightclub']
  if (hour >= 13 && hour < 16) return ['restaurant', 'cafe', 'bar']
  return ['cafe', 'restaurant', 'bar']
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Sitios con nombre a ~500 m (búsqueda de Nominatim, OpenStreetMap), del tipo que pega a esa hora y por cercanía.
 * Nominatim permite 1 consulta por segundo: van en serie mientras el host contesta el resto de tarjetas.
 */
async function nearbyPlaces(lat: number, lon: number, hour: number): Promise<string[]> {
  const dLat = 0.0045
  const dLon = 0.0045 / Math.cos((lat * Math.PI) / 180)
  const viewbox = `${lon - dLon},${lat + dLat},${lon + dLon},${lat - dLat}`
  const found: { name: string; kind: string; meters: number; rank: number }[] = []
  const kinds = kindsFor(hour)
  for (const [rank, amenity] of kinds.entries()) {
    await sleep(1100)
    const data: { name?: string; lat?: string; lon?: string }[] | null = await fetchJson(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&amenity=${amenity}&viewbox=${viewbox}&bounded=1&limit=8`,
    )
    for (const r of data ?? []) {
      if (!r.name) continue
      const meters = Math.hypot((Number(r.lat) - lat) * 111_000, (Number(r.lon) - lon) * 111_000 * Math.cos((lat * Math.PI) / 180))
      found.push({ name: r.name, kind: KINDS[amenity], meters, rank })
    }
  }
  // Primero el tipo que más pega a esa hora y, dentro, lo más cercano
  const seen = new Set<string>()
  return found
    .sort((a, b) => a.rank + a.meters / 250 - (b.rank + b.meters / 250))
    .filter((p) => !seen.has(p.name) && Boolean(seen.add(p.name)))
    .slice(0, 8)
    .map((p) => clip(`${p.name} (${p.kind})`, 40))
}

function localTime(now = new Date()): string {
  const day = now.toLocaleDateString('en-GB', { weekday: 'long' })
  const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const h = now.getHours()
  const part = h < 5 ? 'late night' : h < 12 ? 'morning' : h < 16 ? 'afternoon' : h < 20 ? 'evening' : 'night'
  return `${day} ${time}, ${part}`
}

/** Traduce la posición a contexto (calle, barrio, sitios cercanos y hora). null si no sale nada útil. */
export async function describePlace(lat: number, lon: number, lang: string): Promise<PlaceContext | null> {
  const now = new Date()
  const place = await reverseGeocode(lat, lon, lang)
  const nearby = await nearbyPlaces(lat, lon, now.getHours())
  if (!place && nearby.length === 0) return null
  return { place, nearby, local_time: localTime(now) }
}
