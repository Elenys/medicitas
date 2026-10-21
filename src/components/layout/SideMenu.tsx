'use client';

import {
  BarChart3,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  Clock,
  LayoutDashboard,
  UserCircle,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import type { UserRole } from '@/lib/appointment-rules';
import { cn } from '@/lib/utils';
import { MenuItem } from './MenuItem';

interface Option {
  href: string;
  label: string;
  icon: LucideIcon;
}

// Toda la lógica de qué ve cada perfil vive aquí (05 §3.1).
const OPTIONS: Record<UserRole, Option[]> = {
  PATIENT: [
    { href: '/paciente', label: 'Inicio', icon: LayoutDashboard },
    { href: '/paciente/agendar', label: 'Agendar cita', icon: CalendarPlus },
    { href: '/paciente/citas', label: 'Mis citas', icon: CalendarDays },
    { href: '/perfil', label: 'Mi perfil', icon: UserCircle },
  ],
  DOCTOR: [
    { href: '/medico', label: 'Mi agenda', icon: CalendarClock },
    { href: '/medico/horarios', label: 'Horarios', icon: Clock },
    { href: '/perfil', label: 'Mi perfil', icon: UserCircle },
  ],
  ADMIN: [
    { href: '/admin', label: 'Panel', icon: LayoutDashboard },
    { href: '/admin/usuarios', label: 'Usuarios', icon: Users },
    { href: '/admin/citas', label: 'Citas', icon: CalendarDays },
    { href: '/admin/reportes', label: 'Reportes', icon: BarChart3 },
    { href: '/perfil', label: 'Mi perfil', icon: UserCircle },
  ],
};

const ROOTS = ['/paciente', '/medico', '/admin'];

function isActivePath(pathname: string, href: string): boolean {
  if (ROOTS.includes(href)) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SideMenu({
  role,
  isOpen,
  onClose,
}: {
  role: UserRole;
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  return (
    <>
      {isOpen && (
        <div
          aria-hidden="true"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
        />
      )}
      <nav
        aria-label="Menú principal"
        className={cn(
          'border-border bg-surface fixed inset-y-0 left-0 z-40 w-64 transform border-r p-4 transition-transform md:static md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <ul className="flex flex-col gap-1 pt-16 md:pt-0">
          {OPTIONS[role].map((option) => (
            <MenuItem
              key={option.href}
              {...option}
              isActive={isActivePath(pathname, option.href)}
              onNavigate={onClose}
            />
          ))}
        </ul>
      </nav>
    </>
  );
}
