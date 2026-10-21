'use client';

import { BellOff } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/EmptyState';
import { UI_TEXT } from '@/lib/labels';
import { formatDateTime } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import type { NotificationDto } from '@/types/api';

export function NotificationList({
  items,
  detailBase,
  onRead,
}: {
  items: NotificationDto[];
  detailBase: string;
  onRead: (id: number) => void;
}) {
  if (items.length === 0) return <EmptyState icon={BellOff} title={UI_TEXT.noNotifications} />;
  return (
    <ul className="flex flex-col gap-2">
      {items.map((n) => {
        const unread = n.readAt === null;
        return (
          <li
            key={n.id}
            className={cn(
              'rounded-card flex flex-wrap items-start justify-between gap-3 border p-4',
              unread ? 'border-primary bg-primary-light' : 'border-border bg-surface',
            )}
          >
            <div className="flex-1">
              <p className={cn(unread && 'font-medium')}>
                {unread && <span className="sr-only">Sin leer: </span>}
                {n.message}
              </p>
              <p className="text-content-muted mt-1 text-xs">{formatDateTime(n.createdAt)}</p>
            </div>
            <div className="flex gap-2">
              {n.appointmentId && (
                <Link
                  href={`${detailBase}/${n.appointmentId}`}
                  onClick={() => unread && onRead(n.id)}
                  className="text-primary-dark text-sm font-medium hover:underline"
                >
                  Ver cita
                </Link>
              )}
              {unread && (
                <button
                  type="button"
                  onClick={() => onRead(n.id)}
                  className="text-content-muted text-sm hover:underline"
                >
                  Marcar leída
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
