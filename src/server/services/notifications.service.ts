import type { NotificationType } from '@prisma/client';
import { prisma, type TransactionClient } from '../db';
import { ForbiddenError, NotFoundError } from '../http/errors';
import type { NotificationDto, NotificationsResponse } from '@/types/api';

export interface NewNotification {
  userId: number;
  appointmentId?: number | null;
  type: NotificationType;
  message: string;
}

/** Se crea siempre dentro de la transacción del cambio que la origina (RN-32.1). */
export async function createNotifications(
  tx: TransactionClient,
  items: NewNotification[],
): Promise<void> {
  if (items.length === 0) return;
  await tx.notification.createMany({
    data: items.map((item) => ({
      userId: item.userId,
      appointmentId: item.appointmentId ?? null,
      type: item.type,
      message: item.message,
    })),
  });
}

function serialize(n: {
  id: number;
  type: NotificationType;
  message: string;
  appointmentId: number | null;
  readAt: Date | null;
  createdAt: Date;
}): NotificationDto {
  return {
    id: n.id,
    type: n.type,
    message: n.message,
    appointmentId: n.appointmentId,
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  };
}

export async function listNotifications(
  userId: number,
  query: { page: number; pageSize: number; unreadOnly?: boolean },
): Promise<NotificationsResponse> {
  const where = { userId, ...(query.unreadOnly ? { readAt: null } : {}) };
  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  return {
    items: items.map(serialize),
    unreadCount,
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function markNotificationRead(userId: number, id: number): Promise<void> {
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) throw new NotFoundError();
  if (notification.userId !== userId) throw new ForbiddenError();
  if (!notification.readAt) {
    await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }
}

export async function markAllNotificationsRead(userId: number): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}
