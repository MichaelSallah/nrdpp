import { Router } from 'express'
import { prisma } from '../utils/prisma'
import { authenticate, authorize } from '../middleware/auth'
import { AppError } from '../middleware/errorHandler'
import { Role } from '@prisma/client'

export const auditRoutes = Router()

auditRoutes.get('/rfq/:id', authenticate, authorize(Role.BUYER, Role.ADMIN), async (req, res) => {
  const logs = await prisma.auditLog.findMany({
    where: { rfqId: req.params.id },
    include: { actor: { select: { firstName: true, lastName: true, email: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  })
  res.json({ success: true, logs })
})

auditRoutes.get('/entity/:type/:id', authenticate, authorize(Role.ADMIN), async (req, res) => {
  const logs = await prisma.auditLog.findMany({
    where: { entityType: req.params.type, entityId: req.params.id },
    include: { actor: { select: { firstName: true, lastName: true, email: true } } },
    orderBy: { createdAt: 'asc' },
  })
  res.json({ success: true, logs })
})

auditRoutes.get('/', authenticate, authorize(Role.ADMIN), async (req, res) => {
  const { page = '1', limit = '50', entityType } = req.query as Record<string, string>
  const skip = (parseInt(page) - 1) * parseInt(limit)

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: entityType ? { entityType } : {},
      include: { actor: { select: { firstName: true, lastName: true, role: true } } },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.count({ where: entityType ? { entityType } : {} }),
  ])

  res.json({ success: true, logs, total })
})
