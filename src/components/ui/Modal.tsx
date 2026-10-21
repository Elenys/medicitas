'use client';

import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

/** Usa <dialog> nativo: trampa de foco, cierre con Esc y devolución del foco sin código extra. */
export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      aria-labelledby="modal-title"
      className={cn(
        'rounded-card bg-surface text-content shadow-modal m-auto w-[calc(100%-2rem)] max-w-lg p-0 backdrop:bg-black/45',
        className,
      )}
    >
      <div className="p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="modal-title" className="text-xl font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="hover:bg-background rounded-lg p-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {isOpen && children}
      </div>
    </dialog>
  );
}
