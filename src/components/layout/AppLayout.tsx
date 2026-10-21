'use client';

import { useState, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AppFooter } from './AppFooter';
import { SideMenu } from './SideMenu';
import { TopBar } from './TopBar';

export function AppLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>
      <TopBar onToggleMenu={() => setMenuOpen((open) => !open)} />
      <div className="flex flex-1">
        <SideMenu role={user.role} isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        <main id="contenido" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
      <AppFooter />
    </div>
  );
}
