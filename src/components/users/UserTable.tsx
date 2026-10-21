'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { ROLE_TITLES } from '@/lib/labels';
import { fullName } from '@/lib/utils';
import type { UserDto } from '@/types/api';

export function UserTable({
  users,
  isLoading,
  currentUserId,
  onToggleActive,
  onResetPassword,
}: {
  users: UserDto[];
  isLoading: boolean;
  currentUserId: number;
  onToggleActive: (u: UserDto) => void;
  onResetPassword: (u: UserDto) => void;
}) {
  return (
    <DataTable
      caption="Usuarios del sistema"
      rows={users}
      rowKey={(u) => u.id}
      isLoading={isLoading}
      emptyState={<EmptyState title="Sin resultados" message="Ajuste la búsqueda o los filtros." />}
      columns={[
        {
          key: 'name',
          header: 'Nombre',
          render: (u) => <span className="font-medium">{fullName(u)}</span>,
        },
        { key: 'email', header: 'Correo', render: (u) => u.email },
        { key: 'role', header: 'Rol', render: (u) => ROLE_TITLES[u.role] },
        {
          key: 'specialty',
          header: 'Especialidad',
          render: (u) =>
            u.doctor
              ? `${u.doctor.specialty.name}${u.doctor.scheduleCount === 0 ? ' · sin horarios' : ''}`
              : '—',
        },
        {
          key: 'status',
          header: 'Estado',
          render: (u) => (
            <Badge variant={u.isActive ? 'success' : 'danger'}>
              {u.isActive ? 'Activo' : 'Inactivo'}
            </Badge>
          ),
        },
        {
          key: 'actions',
          header: 'Acciones',
          className: 'text-right',
          render: (u) => (
            <span className="inline-flex flex-wrap justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => onResetPassword(u)}>
                Restablecer contraseña
              </Button>
              <Button
                size="sm"
                variant={u.isActive ? 'danger' : 'primary'}
                disabled={u.id === currentUserId}
                onClick={() => onToggleActive(u)}
              >
                {u.isActive ? 'Desactivar' : 'Activar'}
              </Button>
            </span>
          ),
        },
      ]}
    />
  );
}
