import { NotificationType } from '@prisma/client'
import { prisma } from '../utils/prisma'
import { io } from '../index'

interface NotificationInput {
  userId: string
  type: NotificationType
  title: string
  body: string
  metadata?: Record<string, unknown>
}

export async function createNotification(input: NotificationInput) {
  const notification = await prisma.notification.create({ data: input })
  // Push real-time notification
  io.to(`user-${input.userId}`).emit('notification', notification)
  return notification
}

export async function sendBulkNotifications(userIds: string[], input: Omit<NotificationInput, 'userId'>) {
  const created = await prisma.notification.createManyAndReturn({
    data: userIds.map((userId) => ({ ...input, userId })),
  })
  for (const notif of created) {
    io.to(`user-${notif.userId}`).emit('notification', notif)
  }
}
