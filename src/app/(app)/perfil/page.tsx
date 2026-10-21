'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { InputField } from '@/components/ui/fields';
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api-client';
import { DOCUMENT_TYPE_LABELS } from '@/lib/labels';
import {
  changePasswordFormSchema,
  updateProfileSchema,
  type ChangePasswordFormInput,
  type UpdateProfileInput,
} from '@/lib/schemas';

function ProfileDataTab() {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const isPatient = user.role === 'PATIENT';
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.input<typeof updateProfileSchema>, unknown, UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? '',
      ...(isPatient && {
        address: user.patient?.address ?? '',
        healthProvider: user.patient?.healthProvider ?? '',
      }),
    },
  });
  const save = useMutation({
    mutationFn: (input: UpdateProfileInput) => api.patch('/profile', input),
    onSuccess: () => {
      toast.showSuccess('Datos actualizados.');
      router.refresh();
    },
    onError: (e) => toast.showError(e.message),
  });
  return (
    <form
      onSubmit={handleSubmit((input) => save.mutate(input))}
      className="grid gap-4 sm:grid-cols-2"
      noValidate
    >
      <InputField
        label="Tipo de documento"
        value={DOCUMENT_TYPE_LABELS[user.documentType]}
        disabled
      />
      <InputField
        label="Número de documento"
        value={user.documentNumber}
        disabled
        hint="No es editable porque identifica su historial. Si tiene un error, solicite la corrección al administrador."
      />
      <InputField label="Correo" value={user.email} disabled containerClassName="sm:col-span-2" />
      <InputField
        label="Nombres"
        required
        {...register('firstName')}
        error={errors.firstName?.message}
      />
      <InputField
        label="Apellidos"
        required
        {...register('lastName')}
        error={errors.lastName?.message}
      />
      <InputField
        label="Teléfono"
        type="tel"
        inputMode="numeric"
        {...register('phone')}
        error={errors.phone?.message}
      />
      {isPatient && (
        <InputField label="Dirección" {...register('address')} error={errors.address?.message} />
      )}
      {isPatient && (
        <InputField
          label="EPS"
          {...register('healthProvider')}
          error={errors.healthProvider?.message}
        />
      )}
      {user.doctor && (
        <InputField label="Especialidad" value={user.doctor.specialty.name} disabled />
      )}
      {user.doctor && (
        <InputField label="Licencia profesional" value={user.doctor.licenseNumber} disabled />
      )}
      <div className="flex justify-end sm:col-span-2">
        <Button type="submit" isLoading={save.isPending}>
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}

function SecurityTab() {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormInput>({ resolver: zodResolver(changePasswordFormSchema) });
  const change = useMutation({
    mutationFn: ({ confirmPassword: _omit, ...input }: ChangePasswordFormInput) =>
      api.patch('/profile/password', input),
    onSuccess: () => {
      toast.showSuccess('Contraseña actualizada.');
      reset();
    },
    onError: (e) => toast.showError(e.message),
  });
  return (
    <form
      onSubmit={handleSubmit((input) => change.mutate(input))}
      className="flex max-w-md flex-col gap-4"
      noValidate
    >
      <InputField
        label="Contraseña actual"
        type="password"
        autoComplete="current-password"
        required
        {...register('currentPassword')}
        error={errors.currentPassword?.message}
      />
      <InputField
        label="Nueva contraseña"
        type="password"
        autoComplete="new-password"
        required
        hint="Mínimo 8 caracteres, con mayúscula, minúscula y número"
        {...register('newPassword')}
        error={errors.newPassword?.message}
      />
      <InputField
        label="Confirmar nueva contraseña"
        type="password"
        autoComplete="new-password"
        required
        {...register('confirmPassword')}
        error={errors.confirmPassword?.message}
      />
      <Button type="submit" isLoading={change.isPending} className="self-start">
        Cambiar contraseña
      </Button>
    </form>
  );
}

export default function ProfilePage() {
  const [tab, setTab] = useState('data');
  return (
    <PageContainer title="Mi perfil">
      <Tabs
        tabs={[
          { key: 'data', label: 'Datos personales' },
          { key: 'security', label: 'Seguridad' },
        ]}
        activeKey={tab}
        onChange={setTab}
      />
      <Card className="mt-4">{tab === 'data' ? <ProfileDataTab /> : <SecurityTab />}</Card>
    </PageContainer>
  );
}
