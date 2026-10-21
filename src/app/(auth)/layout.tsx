import { Stethoscope } from 'lucide-react';
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="text-primary-dark mb-6 flex items-center gap-2 text-3xl font-bold">
        <Stethoscope aria-hidden="true" className="h-8 w-8" />
        MediCitas
      </div>
      {children}
      <p className="text-content-muted mt-6 text-xs">Sistema de gestión de citas médicas</p>
    </main>
  );
}
