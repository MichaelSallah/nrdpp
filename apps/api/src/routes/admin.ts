import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../utils/prisma'
import { authenticate, authorize } from '../middleware/auth'
import { AppError } from '../middleware/errorHandler'
import { Role } from '@prisma/client'

export const adminRoutes = Router()

// All admin routes require ADMIN role
adminRoutes.use(authenticate, authorize(Role.ADMIN))

// ── Entities ──
adminRoutes.get('/entities', async (_req, res) => {
  const entities = await prisma.entity.findMany({
    include: { _count: { select: { users: true, rfqs: true } } },
    orderBy: { name: 'asc' },
  })
  res.json({ success: true, entities })
})

adminRoutes.post('/entities', async (req, res) => {
  const data = z.object({
    name: z.string(),
    code: z.string().toUpperCase(),
    region: z.string(),
    type: z.string(),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
  }).parse(req.body)

  const entity = await prisma.entity.create({ data })
  res.status(201).json({ success: true, entity })
})

// ── Users ──
adminRoutes.get('/users', async (req, res) => {
  const { role, search, page = '1', limit = '20' } = req.query as Record<string, string>
  const skip = (parseInt(page) - 1) * parseInt(limit)

  const where = {
    ...(role && { role: role as Role }),
    ...(search && {
      OR: [
        { email: { contains: search, mode: 'insensitive' as const } },
        { firstName: { contains: search, mode: 'insensitive' as const } },
        { lastName: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true, entity: { select: { name: true } } },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ])

  res.json({ success: true, users, total })
})

adminRoutes.patch('/users/:id/toggle', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } })
  if (!user) throw new AppError('User not found', 404)
  const updated = await prisma.user.update({ where: { id: req.params.id }, data: { isActive: !user.isActive } })
  res.json({ success: true, isActive: updated.isActive })
})

// ── Platform stats ──
adminRoutes.get('/stats', async (_req, res) => {
  const [users, suppliers, rfqs, quotations, awards] = await Promise.all([
    prisma.user.count(),
    prisma.supplier.groupBy({ by: ['status'], _count: true }),
    prisma.rfq.groupBy({ by: ['status'], _count: true }),
    prisma.quotation.count(),
    prisma.award.count(),
  ])

  res.json({ success: true, users, suppliers, rfqs, quotations, awards })
})
