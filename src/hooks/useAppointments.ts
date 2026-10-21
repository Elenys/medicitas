'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, toQuery } from '@/lib/api-client';
import type { AppointmentDto, Paginated } from '@/types/api';

export interface AppointmentFilters {
  scope?: 'upcoming' | 'history';
  date?: string;
  status?: string;
  from?: string;
  to?: string;
  doctorId?: number;
  patientId?: number;
  includeCancelled?: boolean;
  page?: number;
  pageSize?: number;
}

export const appointmentKeys = {
  all: ['appointments'] as const,
  list: (filters: AppointmentFilters) => ['appointments', 'list', filters] as const,
  detail: (id: number) => ['appointments', 'detail', id] as const,
};

export function useAppointments(filters: AppointmentFilters) {
  return useQuery({
    queryKey: appointmentKeys.list(filters),
    queryFn: () => api.get<Paginated<AppointmentDto>>(`/appointments${toQuery({ ...filters })}`),
  });
}

export function useAppointment(id: number) {
  return useQuery({
    queryKey: appointmentKeys.detail(id),
    queryFn: () => api.get<AppointmentDto>(`/appointments/${id}`),
    enabled: Number.isInteger(id) && id > 0,
  });
}

/** Mutaciones con invalidación de todo lo que depende de las citas (05 §4). */
export function useAppointmentActions() {
  const queryClient = useQueryClient();
  const invalidate = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all }),
      queryClient.invalidateQueries({ queryKey: ['availability'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    ]);
  };
  const confirm = useMutation({
    mutationFn: (id: number) => api.patch<AppointmentDto>(`/appointments/${id}/confirm`),
    onSuccess: invalidate,
  });
  const cancel = useMutation({
    mutationFn: (v: { id: number; reason: string }) =>
      api.patch<AppointmentDto>(`/appointments/${v.id}/cancel`, { reason: v.reason }),
    onSuccess: invalidate,
  });
  const complete = useMutation({
    mutationFn: (v: { id: number; notes?: string }) =>
      api.patch<AppointmentDto>(`/appointments/${v.id}/complete`, { notes: v.notes }),
    onSuccess: invalidate,
  });
  const book = useMutation({
    mutationFn: (v: { doctorId: number; startsAt: string; reason?: string }) =>
      api.post<AppointmentDto>('/appointments', v),
    onSuccess: invalidate,
  });
  return { confirm, cancel, complete, book };
}
