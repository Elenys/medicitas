'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import type { z } from 'zod';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { InputField, SelectField } from '@/components/ui/fields';
import { useSpecialties } from '@/hooks/useAvailability';
import { DOCUMENT_TYPE_LABELS } from '@/lib/labels';
import { createUserSchema, type CreateUserInput } from '@/lib/schemas';

type CreateUserFormValues = z.input<typeof createUserSchema>;

const DOCUMENT_OPTIONS = Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

/** Alta de médico o administrador; concentra las validaciones de documento, correo y licencia. */
export function UserForm({
  onSubmit,
  isSubmitting,
  serverError,
}: {
  onSubmit: (input: CreateUserInput) => void;
  isSubmitting: boolean;
  serverError?: string;
}) {
  const { data: specialties } = useSpecialties();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateUserFormValues, unknown, CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'DOCTOR', appointmentDurationMinutes: 30 },
  });
  const role = useWatch({ control, name: 'role' });
  const doctorErrors = errors as Partial<
    Record<'specialtyId' | 'licenseNumber' | 'appointmentDurationMinutes', { message?: string }>
  >;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
      {serverError && (
        <div className="sm:col-span-2">
          <Alert variant="error">{serverError}</Alert>
        </div>
      )}
      <SelectField
        label="Rol"
        required
        options={[
          { value: 'DOCTOR', label: 'Médico' },
          { value: 'ADMIN', label: 'Administrador' },
        ]}
        {...register('role')}
        error={errors.role?.message}
        containerClassName="sm:col-span-2"
      />
      <SelectField
        label="Tipo de documento"
        required
        options={DOCUMENT_OPTIONS}
        placeholder="Seleccione"
        {...register('documentType')}
        error={errors.documentType?.message}
      />
      <InputField
        label="Número de documento"
        required
        {...register('documentNumber')}
        error={errors.documentNumber?.message}
      />
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
        label="Correo"
        type="email"
        required
        {...register('email')}
        error={errors.email?.message}
      />
      <InputField
        label="Teléfono"
        type="tel"
        inputMode="numeric"
        {...register('phone')}
        error={errors.phone?.message}
      />
      {role === 'DOCTOR' && (
        <>
          <SelectField
            label="Especialidad"
            required
            placeholder="Seleccione"
            options={(specialties ?? []).map((s) => ({ value: s.id, label: s.name }))}
            {...register('specialtyId')}
            error={doctorErrors.specialtyId?.message}
          />
          <InputField
            label="Licencia profesional"
            required
            {...register('licenseNumber')}
            error={doctorErrors.licenseNumber?.message}
          />
          <InputField
            label="Duración de consulta (min)"
            type="number"
            min={10}
            max={120}
            step={5}
            required
            {...register('appointmentDurationMinutes')}
            error={doctorErrors.appointmentDurationMinutes?.message}
          />
        </>
      )}
      <p className="text-content-muted text-sm sm:col-span-2">
        El sistema generará una contraseña temporal y la mostrará una sola vez.
      </p>
      <div className="flex justify-end sm:col-span-2">
        <Button type="submit" isLoading={isSubmitting}>
          Crear usuario
        </Button>
      </div>
    </form>
  );
}
