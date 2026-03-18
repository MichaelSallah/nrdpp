import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../utils/prisma'
import { authenticate } from '../middleware/auth'
import { AppError } from '../middleware/errorHandler'
import { io } from '../index'
import { Role } from '@prisma/client'

export const chatRoutes = Router()

// Check if user has access to chatroom (buyer of that RFQ or opted-in supplier)
async function canAccessChat(rfqId: string, userId: string, role: Role, supplierId?: string | null) {
  const rfq = await prisma.rfq.findUnique({ where: { id: rfqId }, select: { createdById: true, entityId: true } })
  if (!rfq) return false

  if (role === Role.ADMIN) return true

  if (role === Role.BUYER) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    return user?.entityId === rfq.entityId
  }

  if (role === Role.SUPPLIER && supplierId) {
    const inv = await prisma.rfqSupplier.findUnique({
      where: { rfqId_supplierId: { rfqId, supplierId } },
    })
    return inv?.optedIn === true
  }

  return false
}

// ── Opt in to RFQ chatroom (supplier) ──
chatRoutes.post('/:id/chat/opt-in', authenticate, async (req, res) => {
  const { id: rfqId } = req.params
  const user = req.user!

  if (user.role !== Role.SUPPLIER || !user.supplierId) throw new AppError('Suppliers only', 403)

  const inv = await prisma.rfqSupplier.findUnique({
    where: { rfqId_supplierId: { rfqId, supplierId: user.supplierId } },
  })
  if (!inv) throw new AppError('Not invited to this RFQ', 403)

  await prisma.rfqSupplier.update({
    where: { rfqId_supplierId: { rfqId, supplierId: user.supplierId } },
    data: { optedIn: true },
  })

  res.json({ success: true, message: 'Opted into chatroom' })
})

// ── Get chat history ──
chatRoutes.get('/:id/chat', authenticate, async (req, res) => {
  const { id: rfqId } = req.params
  const user = req.user!

  const allowed = await canAccessChat(rfqId, user.userId, user.role, user.supplierId)
  if (!allowed) throw new AppError('You do not have access to this chatroom', 403)

  const messages = await prisma.chatMessage.findMany({
    where: { rfqId },
    include: {
      sender: { select: { id: true, firstName: true, lastName: true, role: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: 200,
  })

  res.json({ success: true, messages })
})

// ── Send chat message (REST fallback) ──
chatRoutes.post('/:id/chat', authenticate, async (req, res) => {
  const { id: rfqId } = req.params
  const user = req.user!
  const { message } = z.object({ message: z.string().min(1).max(2000) }).parse(req.body)

  const allowed = await canAccessChat(rfqId, user.userId, user.role, user.supplierId)
  if (!allowed) throw new AppError('You do not have access to this chatroom', 403)

  const rfq = await prisma.rfq.findUnique({ where: { id: rfqId } })
  if (!rfq || rfq.status === 'CANCELLED') throw new AppError('Chatroom unavailable', 400)

  const chatMessage = await prisma.chatMessage.create({
    data: { rfqId, senderId: user.userId, message },
    include: { sender: { select: { id: true, firstName: true, lastName: true, role: true } } },
  })

  // Emit via Socket.io
  io.to(`rfq-${rfqId}`).emit('new_message', chatMessage)

  res.status(201).json({ success: true, message: chatMessage })
})
