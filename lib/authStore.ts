// lib/authStore.ts
// Simple client-side auth store for role-based UI (demo)
// In production this would come from server session

import { create } from 'zustand'
import { Role } from './auth'

interface AuthState {
  user: {
    employeeCode: string
    name: string
    role: Role
  } | null
  setUser: (user: { employeeCode: string; name: string; role: Role } | null) => void
  hasPermission: (requiredRoles: Role[]) => boolean
  canWritePLC: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  setUser: (user) => set({ user }),
  hasPermission: (requiredRoles) => {
    const role = get().user?.role
    return !!role && requiredRoles.includes(role)
  },
  canWritePLC: () => {
    const role = get().user?.role
    return ['CHU_QUAN', 'KY_SU'].includes(role || '')
  },
}))

// Helper to load user after login (call from dashboard or protected pages)
export async function loadCurrentUser() {
  try {
    const res = await fetch('/api/me') // we will create this simple route
    if (res.ok) {
      const user = await res.json()
      useAuthStore.getState().setUser(user)
      return user
    }
  } catch {}
  return null
}
