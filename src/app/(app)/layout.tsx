import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthProvider } from '@/hooks/useAuth';
import { prisma } from '@/server/db';
import { getProfile } from '@/server/services/auth.service';
import { readSessionFromCookies } from '@/server/session';

// Layout de servidor: resuelve la sesión sin pasar por HTTP y entrega el usuario al cliente.
export default async function AppGroupLayout({ children }: { children: ReactNode }) {
  const session = await readSessionFromCookies();
  if (!session) redirect('/login');
  const account = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { isActive: true },
  });
  if (!account?.isActive) redirect('/login');
  const user = await getProfile(session.userId);
  return (
    <AuthProvider user={user}>
      <AppLayout>{children}</AppLayout>
    </AuthProvider>
  );
}
