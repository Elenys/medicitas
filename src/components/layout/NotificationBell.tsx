'use client';

import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useNotifications } from '@/hooks/useNotifications';

const MAX_BADGE = 9;

export function NotificationBell() {
  const { unreadCount } = useNotifications(1, 1);
  const label = unreadCount > 0 ? `Avisos, ${unreadCount} sin leer` : 'Avisos';
  return (
    <Link
      href="/avisos"
      aria-label={label}
      className="hover:bg-background relative flex h-12 w-12 items-center justify-center rounded-lg"
    >
      <Bell aria-hidden="true" className="h-6 w-6" />
      {unreadCount > 0 && (
        <span className="bg-danger-dark absolute top-1.5 right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold text-white">
          {unreadCount > MAX_BADGE ? `${MAX_BADGE}+` : unreadCount}
        </span>
      )}
    </Link>
  );
}
