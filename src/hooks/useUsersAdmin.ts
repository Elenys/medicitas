'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, toQuery } from '@/lib/api-client';
import type { CreateUserInput } from '@/lib/schemas';
import type { Paginated, UserDto } from '@/types/api';

export interface UserFilters {
  q: string;
  role: string;
  isActive: string;
  page: number;
}

export interface TemporaryCredential {
  password: string;
  email: string;
}

interface Callbacks {
  onCreated: (credential: TemporaryCredential) => void;
  onCreateError: (message: string) => void;
  onToggled: () => void;
  onReset: (credential: TemporaryCredential) => void;
  onError: (message: string) => void;
}

/** Listado y mutaciones de la administración de usuarios (CU-20 a CU-23). */
export function useUsersAdmin(filters: UserFilters, callbacks: Callbacks) {
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: ['users', filters],
    queryFn: () => api.get<Paginated<UserDto>>(`/users${toQuery({ ...filters })}`),
  });
  const invalidate = (): Promise<void> => queryClient.invalidateQueries({ queryKey: ['users'] });

  const create = useMutation({
    mutationFn: (input: CreateUserInput) =>
      api.post<{ user: UserDto; temporaryPassword: string }>('/users', input),
    onSuccess: async (r) => {
      callbacks.onCreated({ password: r.temporaryPassword, email: r.user.email });
      await invalidate();
    },
    onError: (e) => callbacks.onCreateError(e.message),
  });
  const toggle = useMutation({
    mutationFn: (u: UserDto) => api.patch<UserDto>(`/users/${u.id}`, { isActive: !u.isActive }),
    onSuccess: async () => {
      callbacks.onToggled();
      await invalidate();
    },
    onError: (e) => callbacks.onError(e.message),
  });
  const reset = useMutation({
    mutationFn: (u: UserDto) =>
      api.post<{ temporaryPassword: string }>(`/users/${u.id}/reset-password`),
    onSuccess: (r, u) => callbacks.onReset({ password: r.temporaryPassword, email: u.email }),
    onError: (e) => callbacks.onError(e.message),
  });

  return { list, create, toggle, reset };
}
