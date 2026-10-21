'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { api } from '@/lib/api-client';
import type { ProfileResponse } from '@/types/api';

interface AuthContextValue {
  user: ProfileResponse;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** El usuario llega desde el layout de servidor: no hay parpadeo de carga. */
export function AuthProvider({ user, children }: { user: ProfileResponse; children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const logout = useCallback(async () => {
    await api.post('/auth/logout');
    queryClient.clear();
    router.replace('/login');
    router.refresh();
  }, [queryClient, router]);

  // Cualquier 401 de la API (sesión vencida, cuenta desactivada) manda al ingreso.
  useEffect(() => {
    const handler = (): void => {
      queryClient.clear();
      router.replace('/login');
      router.refresh();
    };
    window.addEventListener('medicitas:unauthenticated', handler);
    return () => window.removeEventListener('medicitas:unauthenticated', handler);
  }, [queryClient, router]);

  const value = useMemo(() => ({ user, logout }), [user, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
