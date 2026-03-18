import { Router } from 'express'
import { prisma } from '../utils/prisma'
import { authenticate } from '../middleware/auth'

export const notificationRoutes = Router()

notificationRoutes.get('/', authenticate, async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  res.json({ success: true, notifications })
})

notificationRoutes.get('/unread-count', authenticate, async (req, res) => {
  const count = await prisma.notification.count({ where: { userId: req.user!.userId, read: false } })
  res.json({ success: true, count })
})

notificationRoutes.patch('/:id/read', authenticate, async (req, res) => {
  await prisma.notification.updateMany({
    where: { id: req.params.id, userId: req.user!.userId },
    data: { read: true, readAt: new Date() },
  })
  res.json({ success: true })
})

notificationRoutes.patch('/mark-all-read', authenticate, async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.userId, read: false },
    data: { read: true, readAt: new Date() },
  })
  res.json({ success: true })
})
