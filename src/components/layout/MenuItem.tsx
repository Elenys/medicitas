'use client';

import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface MenuItemProps {
  href: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  onNavigate?: () => void;
}

export function MenuItem({ href, icon: Icon, label, isActive, onNavigate }: MenuItemProps) {
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'flex min-h-12 items-center gap-3 rounded-lg px-3 font-medium transition-colors',
          isActive ? 'bg-success-light text-success-dark' : 'text-content hover:bg-background',
        )}
      >
        <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
        <span>{label}</span>
      </Link>
    </li>
  );
}
