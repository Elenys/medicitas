'use client';

import { Button } from '@/components/ui/Button';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold">Ocurrió un error inesperado</h1>
      <p className="text-content-muted">
        Reintente en unos minutos; si persiste, informe a soporte.
      </p>
      <Button onClick={reset}>Reintentar</Button>
    </main>
  );
}
