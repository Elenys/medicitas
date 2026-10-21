'use client';

import { useState } from 'react';
import { NotificationList } from '@/components/layout/NotificationList';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { PageSpinner } from '@/components/ui/Spinner';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';

const DETAIL_BASE = {
  PATIENT: '/paciente/citas',
  DOCTOR: '/medico/citas',
  ADMIN: '/admin/citas',
} as const;

export default function NotificationsPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const { data, isLoading, unreadCount, markRead, markAllRead } = useNotifications(page);
  return (
    <PageContainer
      title="Avisos"
      actions={
        unreadCount > 0 ? (
          <Button
            variant="secondary"
            onClick={() => markAllRead.mutate()}
            isLoading={markAllRead.isPending}
          >
            Marcar todas como leídas
          </Button>
        ) : undefined
      }
    >
      {isLoading || !data ? (
        <PageSpinner />
      ) : (
        <>
          <NotificationList
            items={data.items}
            detailBase={user.role === 'ADMIN' ? '/admin/citas' : DETAIL_BASE[user.role]}
            onRead={(id) => markRead.mutate(id)}
          />
          <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}
    </PageContainer>
  );
}
