'use client';

import { useQuery } from '@tanstack/react-query';
import { api, toQuery } from '@/lib/api-client';
import type {
  AvailabilityResponse,
  AvailableSlotsResponse,
  DoctorSummary,
  Paginated,
  SpecialtyDto,
} from '@/types/api';

const CATALOG_STALE_MS = 3_600_000;
const DOCTORS_STALE_MS = 300_000;

export function useSpecialties() {
  return useQuery({
    queryKey: ['specialties'],
    queryFn: () => api.get<SpecialtyDto[]>('/specialties'),
    staleTime: CATALOG_STALE_MS,
  });
}

export function useDoctors(specialtyId?: number) {
  return useQuery({
    queryKey: ['doctors', specialtyId ?? 'all'],
    queryFn: () =>
      api.get<Paginated<DoctorSummary>>(`/doctors${toQuery({ specialtyId, pageSize: 50 })}`),
    staleTime: DOCTORS_STALE_MS,
    enabled: specialtyId !== undefined,
  });
}

/** La disponibilidad envejece rápido: staleTime 0 y se refresca al invalidar citas. */
export function useAvailability(doctorId: number | undefined, month: string) {
  return useQuery({
    queryKey: ['availability', doctorId, month],
    queryFn: () =>
      api.get<AvailabilityResponse>(`/doctors/${doctorId}/availability${toQuery({ month })}`),
    staleTime: 0,
    enabled: doctorId !== undefined,
  });
}

export function useAvailableSlots(doctorId: number | undefined, date: string | undefined) {
  return useQuery({
    queryKey: ['availability', 'slots', doctorId, date],
    queryFn: () =>
      api.get<AvailableSlotsResponse>(`/doctors/${doctorId}/available-slots${toQuery({ date })}`),
    staleTime: 0,
    enabled: doctorId !== undefined && date !== undefined,
  });
}
