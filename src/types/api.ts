// Formas de las respuestas de la API que consume el cliente (especificacion/04-api.md).

import type { AppointmentStatus, UserRole } from '@/lib/appointment-rules';

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface SessionUser {
  id: number;
  role: UserRole;
  firstName: string;
  lastName: string;
  email: string;
}

export interface ProfileResponse extends SessionUser {
  documentType: 'CC' | 'TI' | 'CE' | 'PA';
  documentNumber: string;
  phone: string | null;
  isActive: boolean;
  patient: {
    id: number;
    birthDate: string;
    gender: 'FEMALE' | 'MALE' | 'OTHER';
    address: string | null;
    healthProvider: string | null;
  } | null;
  doctor: {
    id: number;
    specialty: { id: number; name: string };
    licenseNumber: string;
    appointmentDurationMinutes: number;
  } | null;
}

export interface SpecialtyDto {
  id: number;
  name: string;
  description: string | null;
}

export interface DoctorSummary {
  id: number;
  fullName: string;
  specialty: { id: number; name: string };
  appointmentDurationMinutes: number;
  nextAvailableDate: string | null;
}

export interface ScheduleDto {
  id?: number;
  weekday: number;
  startTime: string;
  endTime: string;
}

export interface SchedulesResponse {
  appointmentDurationMinutes: number;
  schedules: ScheduleDto[];
  warning?: { affectedAppointments: number; message: string };
  weeklySlots?: number;
}

export interface AvailabilityResponse {
  month: string;
  days: Array<{ date: string; availableSlots: number }>;
}

export interface SlotDto {
  startsAt: string;
  endsAt: string;
  available: boolean;
}

export interface AvailableSlotsResponse {
  date: string;
  durationMinutes: number;
  slots: SlotDto[];
}

export interface AppointmentDto {
  id: number;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  reason: string | null;
  notes?: string | null;
  cancellationReason: string | null;
  cancelledBy: { id: number; fullName: string; role: UserRole } | null;
  createdAt: string;
  patient: {
    id: number;
    fullName: string;
    documentType?: string;
    documentNumber?: string;
    phone?: string | null;
    birthDate?: string;
    gender?: string;
  };
  doctor: { id: number; fullName: string; specialty: string; appointmentDurationMinutes: number };
  canConfirm: boolean;
  canCancel: boolean;
  canComplete: boolean;
}

export interface UserDto {
  id: number;
  role: UserRole;
  documentType: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  doctor: {
    id: number;
    specialty: { id: number; name: string };
    licenseNumber: string;
    appointmentDurationMinutes: number;
    scheduleCount: number;
  } | null;
}

export interface NotificationDto {
  id: number;
  type: string;
  message: string;
  appointmentId: number | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsResponse extends Paginated<NotificationDto> {
  unreadCount: number;
}

export type DashboardResponse =
  | {
      role: 'PATIENT';
      nextAppointment: AppointmentDto | null;
      upcomingCount: number;
      completedCount: number;
    }
  | {
      role: 'DOCTOR';
      todayCount: number;
      pendingConfirmationCount: number;
      completedTodayCount: number;
      nextAppointment: AppointmentDto | null;
    }
  | {
      role: 'ADMIN';
      appointmentsToday: number;
      appointmentsThisWeek: number;
      cancelledThisMonth: number;
      registeredPatients: number;
    };

export interface SpecialtyReportResponse {
  from: string;
  to: string;
  items: Array<{ specialtyId: number; specialtyName: string; total: number }>;
}
