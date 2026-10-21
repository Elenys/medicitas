'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

/** Se muestra una sola vez (RN-08.1). */
export function TemporaryPasswordDialog({
  password,
  email,
  onClose,
}: {
  password: string | null;
  email?: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async (): Promise<void> => {
    if (password) {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    }
  };
  return (
    <Modal
      isOpen={password !== null}
      onClose={() => {
        setCopied(false);
        onClose();
      }}
      title="Contraseña temporal"
    >
      <Alert variant="warning">
        Esta contraseña <strong>no volverá a mostrarse</strong>. Entréguela al titular y pídale
        cambiarla al ingresar.
      </Alert>
      {email && (
        <p className="text-content-muted mt-4 text-sm">
          Cuenta: <span className="text-content font-medium">{email}</span>
        </p>
      )}
      <div className="border-border bg-background mt-2 flex items-center gap-2 rounded-lg border p-3">
        <code className="flex-1 text-lg font-semibold tracking-wide">{password}</code>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void copy()}
          icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        >
          {copied ? 'Copiada' : 'Copiar'}
        </Button>
      </div>
      <div className="mt-6 flex justify-end">
        <Button
          onClick={() => {
            setCopied(false);
            onClose();
          }}
        >
          Entendido
        </Button>
      </div>
    </Modal>
  );
}
