'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { InputField, SelectField } from '@/components/ui/fields';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import { TemporaryPasswordDialog } from '@/components/users/TemporaryPasswordDialog';
import { UserForm } from '@/components/users/UserForm';
import { UserTable } from '@/components/users/UserTable';
import { useAuth } from '@/hooks/useAuth';
import { useUsersAdmin, type TemporaryCredential } from '@/hooks/useUsersAdmin';
import type { UserDto } from '@/types/api';

type Pending = { kind: 'toggle' | 'reset'; user: UserDto } | null;

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [isActive, setIsActive] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const [tempPassword, setTempPassword] = useState<TemporaryCredential | null>(null);
  const [serverError, setServerError] = useState<string>();

  const { list, create, toggle, reset } = useUsersAdmin(
    { q, role, isActive, page },
    {
      onCreated: (credential) => {
        setCreating(false);
        setServerError(undefined);
        setTempPassword(credential);
      },
      onCreateError: setServerError,
      onToggled: () => {
        setPending(null);
        toast.showSuccess('Estado actualizado.');
      },
      onReset: (credential) => {
        setPending(null);
        setTempPassword(credential);
      },
      onError: toast.showError,
    },
  );
  const { data, isLoading } = list;

  return (
    <PageContainer
      title="Usuarios"
      actions={
        <Button onClick={() => setCreating(true)} icon={<Plus className="h-5 w-5" />}>
          Nuevo usuario
        </Button>
      }
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <InputField
          label="Buscar"
          placeholder="Nombre, correo o documento"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <SelectField
          label="Rol"
          placeholder="Todos"
          options={[
            { value: 'PATIENT', label: 'Paciente' },
            { value: 'DOCTOR', label: 'Médico' },
            { value: 'ADMIN', label: 'Administrador' },
          ]}
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
        />
        <SelectField
          label="Estado"
          placeholder="Todos"
          options={[
            { value: 'true', label: 'Activo' },
            { value: 'false', label: 'Inactivo' },
          ]}
          value={isActive}
          onChange={(e) => {
            setIsActive(e.target.value);
            setPage(1);
          }}
        />
      </div>
      <UserTable
        users={data?.items ?? []}
        isLoading={isLoading}
        currentUserId={me.id}
        onToggleActive={(u) => setPending({ kind: 'toggle', user: u })}
        onResetPassword={(u) => setPending({ kind: 'reset', user: u })}
      />
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}
      <p className="text-content-muted mt-4 text-xs">
        Los usuarios no se eliminan: para retirar el acceso, desactive la cuenta. Así las citas
        conservan su trazabilidad.
      </p>

      <Modal
        isOpen={creating}
        onClose={() => {
          setCreating(false);
          setServerError(undefined);
        }}
        title="Nuevo usuario"
        className="max-w-2xl"
      >
        <UserForm
          onSubmit={(input) => create.mutate(input)}
          isSubmitting={create.isPending}
          serverError={serverError}
        />
      </Modal>
      <ConfirmDialog
        isOpen={pending?.kind === 'toggle'}
        title={pending?.user.isActive ? 'Desactivar cuenta' : 'Activar cuenta'}
        message={
          pending?.user.isActive
            ? `${pending.user.firstName} ${pending.user.lastName} no podrá iniciar sesión hasta que se reactive la cuenta.`
            : `${pending?.user.firstName ?? ''} podrá volver a iniciar sesión.`
        }
        confirmLabel={pending?.user.isActive ? 'Desactivar' : 'Activar'}
        variant={pending?.user.isActive ? 'danger' : 'primary'}
        isLoading={toggle.isPending}
        onClose={() => setPending(null)}
        onConfirm={() => pending && toggle.mutate(pending.user)}
      />
      <ConfirmDialog
        isOpen={pending?.kind === 'reset'}
        title="Restablecer contraseña"
        message={`Se generará una contraseña temporal para ${pending?.user.email ?? ''}. La actual dejará de funcionar.`}
        confirmLabel="Generar contraseña"
        isLoading={reset.isPending}
        onClose={() => setPending(null)}
        onConfirm={() => pending && reset.mutate(pending.user)}
      />
      <TemporaryPasswordDialog
        password={tempPassword?.password ?? null}
        email={tempPassword?.email}
        onClose={() => setTempPassword(null)}
      />
    </PageContainer>
  );
}
