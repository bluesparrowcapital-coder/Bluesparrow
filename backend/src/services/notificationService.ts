import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Create Notification ──────────────────────────────────

export async function createNotification(data: {
  userId:  string;
  title:   string;
  body:    string;
  type:    string; // TXN | SIP | KYC | GENERAL
}) {
  return prisma.notification.create({ data });
}

// ─── Get user notifications ───────────────────────────────

export async function getUserNotifications(userId: string, page = 1, limit = 20) {
  const skip  = (page - 1) * limit;
  const [rows, total, unread] = await Promise.all([
    prisma.notification.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take:    limit,
    }),
    prisma.notification.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return {
    notifications: rows,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
    unread,
  };
}

// ─── Mark single notification read ───────────────────────

export async function markAsRead(id: string, userId: string) {
  const n = await prisma.notification.findFirst({ where: { id, userId } });
  if (!n) throw new Error('Notification not found');
  if (n.isRead) return n;

  return prisma.notification.update({
    where: { id },
    data:  { isRead: true, readAt: new Date() },
  });
}

// ─── Mark all read ────────────────────────────────────────

export async function markAllRead(userId: string) {
  const { count } = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data:  { isRead: true, readAt: new Date() },
  });
  return { marked: count };
}

// ─── Delete notification ──────────────────────────────────

export async function deleteNotification(id: string, userId: string) {
  const n = await prisma.notification.findFirst({ where: { id, userId } });
  if (!n) throw new Error('Notification not found');
  return prisma.notification.delete({ where: { id } });
}
