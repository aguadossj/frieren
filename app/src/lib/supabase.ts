// Cliente Supabase del navegador (T1). Solo la clave publicable: nunca la service_role.
// La sesión anónima vive en sessionStorage: muere al cerrar la pestaña y sobrevive a recargas.

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const supabaseConfigured = Boolean(url && key)

function sessionStore(): Storage | undefined {
  try {
    return window.sessionStorage
  } catch {
    return undefined // modo privado / almacenamiento bloqueado: sesión solo en memoria
  }
}

export const supabase = supabaseConfigured
  ? createClient(url!, key!, {
      auth: { storage: sessionStore(), persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null
