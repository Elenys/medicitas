'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Paginación" className="flex items-center justify-between gap-4 pt-4">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        icon={<ChevronLeft className="h-4 w-4" />}
      >
        Anterior
      </Button>
      <p className="text-content-muted text-sm">
        Página {page} de {totalPages}
      </p>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
      >
        Siguiente
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}
