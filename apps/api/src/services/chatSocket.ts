import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { AuthPayload } from '../middleware/auth'
import { prisma } from '../utils/prisma'

export function setupChatSocket(io: Server) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token
    if (!token) return next(new Error('Authentication required'))
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload
      socket.data.user = payload
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    const user = socket.data.user as AuthPayload

    // Join user's personal room for notifications
    socket.join(`user-${user.userId}`)

    // Join RFQ chatroom
    socket.on('join_rfq_chat', async ({ rfqId }: { rfqId: string }) => {
      const rfqSupplier = user.supplierId
        ? await prisma.rfqSupplier.findUnique({
            where: { rfqId_supplierId: { rfqId, supplierId: user.supplierId } },
          })
        : null

      const rfq = await prisma.rfq.findUnique({ where: { id: rfqId } })
      if (!rfq) return

      // Access check: buyer entity or opted-in supplier or admin
      const isBuyer = user.role === 'BUYER'
      const isSupplierOptedIn = user.role === 'SUPPLIER' && rfqSupplier?.optedIn
      const isAdmin = user.role === 'ADMIN'

      if (isBuyer || isSupplierOptedIn || isAdmin) {
        socket.join(`rfq-${rfqId}`)
        socket.emit('joined_chat', { rfqId })
      } else {
        socket.emit('error', { message: 'Not authorized to join this chatroom' })
      }
    })

    socket.on('leave_rfq_chat', ({ rfqId }: { rfqId: string }) => {
      socket.leave(`rfq-${rfqId}`)
    })

    socket.on('send_message', async ({ rfqId, message }: { rfqId: string; message: string }) => {
      if (!message?.trim()) return

      const chatMessage = await prisma.chatMessage.create({
        data: { rfqId, senderId: user.userId, message: message.trim() },
        include: { sender: { select: { id: true, firstName: true, lastName: true, role: true } } },
      })

      io.to(`rfq-${rfqId}`).emit('new_message', chatMessage)
    })

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${user.userId}`)
    })
  })
}
