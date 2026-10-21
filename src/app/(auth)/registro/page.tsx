'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateField, InputField, SelectField } from '@/components/ui/fields';
import { api, ApiError } from '@/lib/api-client';
import { DOCUMENT_TYPE_LABELS, GENDER_LABELS } from '@/lib/labels';
import { registerFormSchema, type RegisterFormInput } from '@/lib/schemas';

const DOCUMENT_OPTIONS = Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));
const GENDER_OPTIONS = Object.entries(GENDER_LABELS).map(([value, label]) => ({ value, label }));

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormInput>({ resolver: zodResolver(registerFormSchema) });

  const onSubmit = async ({
    confirmPassword: _omit,
    ...input
  }: RegisterFormInput): Promise<void> => {
    setServerError(undefined);
    try {
      await api.post('/auth/register', input);
      router.replace('/paciente');
      router.refresh();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'No fue posible crear la cuenta.');
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold">Crear cuenta de paciente</h1>
      <p className="text-content-muted mb-6">Los campos con asterisco (*) son obligatorios.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2" noValidate>
        {serverError && (
          <div className="md:col-span-2">
            <Alert variant="error">{serverError}</Alert>
          </div>
        )}
        <h2 className="text-lg font-semibold md:col-span-2">Identificación</h2>
        <SelectField
          label="Tipo de documento"
          required
          placeholder="Seleccione"
          options={DOCUMENT_OPTIONS}
          {...register('documentType')}
          error={errors.documentType?.message}
        />
        <InputField
          label="Número de documento"
          required
          inputMode="numeric"
          {...register('documentNumber')}
          error={errors.documentNumber?.message}
        />
        <h2 className="text-lg font-semibold md:col-span-2">Datos personales</h2>
        <InputField
          label="Nombres"
          required
          autoComplete="given-name"
          {...register('firstName')}
          error={errors.firstName?.message}
        />
        <InputField
          label="Apellidos"
          required
          autoComplete="family-name"
          {...register('lastName')}
          error={errors.lastName?.message}
        />
        <DateField
          label="Fecha de nacimiento"
          required
          min="1900-01-01"
          max={new Date().toISOString().slice(0, 10)}
          {...register('birthDate')}
          error={errors.birthDate?.message}
        />
        <SelectField
          label="Género"
          required
          placeholder="Seleccione"
          options={GENDER_OPTIONS}
          {...register('gender')}
          error={errors.gender?.message}
        />
        <h2 className="text-lg font-semibold md:col-span-2">Contacto</h2>
        <InputField
          label="Correo"
          type="email"
          required
          autoComplete="email"
          {...register('email')}
          error={errors.email?.message}
        />
        <InputField
          label="Teléfono"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          {...register('phone')}
          error={errors.phone?.message}
        />
        <InputField
          label="Dirección"
          autoComplete="street-address"
          {...register('address')}
          error={errors.address?.message}
        />
        <InputField
          label="EPS"
          {...register('healthProvider')}
          error={errors.healthProvider?.message}
        />
        <h2 className="text-lg font-semibold md:col-span-2">Seguridad</h2>
        <InputField
          label="Contraseña"
          type="password"
          required
          autoComplete="new-password"
          hint="Mínimo 8 caracteres, con mayúscula, minúscula y número"
          {...register('password')}
          error={errors.password?.message}
        />
        <InputField
          label="Confirmar contraseña"
          type="password"
          required
          autoComplete="new-password"
          {...register('confirmPassword')}
          error={errors.confirmPassword?.message}
        />
        <div className="flex flex-col-reverse gap-2 md:col-span-2 md:flex-row md:justify-end">
          <Link
            href="/login"
            className="text-content hover:bg-background inline-flex min-h-12 items-center justify-center rounded-lg px-5 font-medium"
          >
            Cancelar
          </Link>
          <Button type="submit" isLoading={isSubmitting}>
            Registrarme
          </Button>
        </div>
      </form>
    </Card>
  );
}
