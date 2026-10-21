'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { InputField } from '@/components/ui/fields';
import { api, ApiError } from '@/lib/api-client';
import { loginSchema, type LoginInput } from '@/lib/schemas';
import type { SessionUser } from '@/types/api';

const HOME_BY_ROLE = { PATIENT: '/paciente', DOCTOR: '/medico', ADMIN: '/admin' } as const;

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (input: LoginInput): Promise<void> => {
    setServerError(undefined);
    try {
      const user = await api.post<SessionUser>('/auth/login', input);
      const next = params.get('next');
      router.replace(next && next.startsWith('/') ? next : HOME_BY_ROLE[user.role]);
      router.refresh();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'No fue posible iniciar sesión.');
    }
  };

  return (
    <Card className="w-full max-w-md">
      <h1 className="mb-1 text-2xl font-bold">Iniciar sesión</h1>
      <p className="text-content-muted mb-6">Ingrese con su correo y contraseña.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {serverError && <Alert variant="error">{serverError}</Alert>}
        <InputField
          label="Correo"
          type="email"
          autoComplete="email"
          required
          {...register('email')}
          error={errors.email?.message}
        />
        <div className="relative">
          <InputField
            label="Contraseña"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            className="pr-12"
            {...register('password')}
            error={errors.password?.message}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="text-content-muted hover:bg-background absolute top-7 right-1 flex h-10 w-10 items-center justify-center rounded-lg"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        <Button type="submit" isLoading={isSubmitting} className="mt-2">
          Ingresar
        </Button>
      </form>
      <p className="text-content-muted mt-6 text-center text-sm">
        ¿No tiene cuenta?{' '}
        <Link href="/registro" className="text-primary-dark font-medium hover:underline">
          Crear cuenta
        </Link>
      </p>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
