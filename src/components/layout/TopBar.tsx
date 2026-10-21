'use client';

import { LogOut, Menu, Stethoscope } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_TITLES } from '@/lib/labels';
import { fullName } from '@/lib/utils';
import { NotificationBell } from './NotificationBell';

export function TopBar({ onToggleMenu }: { onToggleMenu: () => void }) {
  const { user, logout } = useAuth();
  return (
    <header className="border-border bg-surface sticky top-0 z-50 flex h-16 items-center gap-2 border-b px-4 md:px-6">
      <button
        type="button"
        onClick={onToggleMenu}
        aria-label="Abrir menú"
        className="hover:bg-background flex h-12 w-12 items-center justify-center rounded-lg md:hidden"
      >
        <Menu className="h-6 w-6" />
      </button>
      <Link href="/" className="text-primary-dark flex items-center gap-2 text-lg font-bold">
        <Stethoscope aria-hidden="true" className="h-6 w-6" />
        MediCitas
      </Link>
      <div className="ml-auto flex items-center gap-1">
        <NotificationBell />
        <div className="hidden flex-col items-end leading-tight sm:flex">
          <span className="text-sm font-medium">{fullName(user)}</span>
          <span className="text-content-muted text-xs">{ROLE_TITLES[user.role]}</span>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          className="hover:bg-background flex h-12 w-12 items-center justify-center rounded-lg"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
