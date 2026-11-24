import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type RolUsuario = 'viewer' | 'analista_mdm' | 'operador_etl' | 'admin'

export interface PerfilUsuario {
  nombre_usuario: string
  nombre_display: string
  rol: RolUsuario | string
  email: string | null
}

const JERARQUIA_ROLES: Record<string, number> = {
  viewer: 10,
  analista_mdm: 20,
  operador_etl: 30,
  admin: 40,
}

export function rolCumpleNivel(rolActual: string | undefined, rolMinimo: RolUsuario): boolean {
  if (!rolActual) return false
  const nivelActual = JERARQUIA_ROLES[rolActual.toLowerCase()] ?? 0
  const nivelMinimo = JERARQUIA_ROLES[rolMinimo] ?? 999
  return nivelActual >= nivelMinimo
}

interface AuthState {
  token: string | null
  usuario: PerfilUsuario | null
  setSession: (token: string, usuario: PerfilUsuario) => void
  setUsuario: (usuario: PerfilUsuario) => void
  logout: () => void
  hasRole: (minRole: RolUsuario) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      usuario: null,
      setSession: (token, usuario) => set({ token, usuario }),
      setUsuario: (usuario) => set({ usuario }),
      logout: () => set({ token: null, usuario: null }),
      hasRole: (minRole) => rolCumpleNivel(get().usuario?.rol, minRole),
    }),
    {
      name: 'acp-control-auth',
      partialize: (state) => ({ token: state.token, usuario: state.usuario }),
    },
  ),
)
