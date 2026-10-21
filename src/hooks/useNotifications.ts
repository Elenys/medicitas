'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, toQuery } from '@/lib/api-client';
import type { NotificationsResponse } from '@/types/api';

const POLL_MS = 60_000;

export function useNotifications(page = 1, pageSize = 10) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['notifications', page, pageSize],
    queryFn: () => api.get<NotificationsResponse>(`/notifications${toQuery({ page, pageSize })}`),
    refetchInterval: POLL_MS,
  });
  const invalidate = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  const markRead = useMutation({
    mutationFn: (id: number) => api.patch<void>(`/notifications/${id}/read`),
    onSuccess: invalidate,
  });
  const markAllRead = useMutation({
    mutationFn: () => api.patch<{ updated: number }>('/notifications/read-all'),
    onSuccess: invalidate,
  });
  return { ...query, unreadCount: query.data?.unreadCount ?? 0, markRead, markAllRead };
}
