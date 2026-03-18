import { Router } from 'express'
import { prisma } from '../utils/prisma'
import { authenticate, authorize } from '../middleware/auth'
import { Role, RfqStatus } from '@prisma/client'

export const reportRoutes = Router()

reportRoutes.get('/rfq-summary', authenticate, authorize(Role.BUYER, Role.ADMIN), async (req, res) => {
  const { entityId } = req.query as Record<string, string>
  const where = entityId ? { entityId } : {}

  const [total, byStatus, avgQuotations] = await Promise.all([
    prisma.rfq.count({ where }),
    prisma.rfq.groupBy({ by: ['status'], where, _count: true }),
    prisma.quotation.groupBy({ by: ['rfqId'], _count: { id: true } }).then((r) => {
      const sum = r.reduce((acc, curr) => acc + curr._count.id, 0)
      return r.length ? (sum / r.length).toFixed(1) : 0
    }),
  ])

  res.json({ success: true, total, byStatus, avgQuotationsPerRfq: avgQuotations })
})

reportRoutes.get('/supplier-participation', authenticate, authorize(Role.BUYER, Role.ADMIN), async (req, res) => {
  const data = await prisma.rfqSupplier.groupBy({
    by: ['status'],
    _count: { supplierId: true },
  })
  const topSuppliers = await prisma.supplier.findMany({
    orderBy: { quotations: { _count: 'desc' } },
    take: 10,
    select: { companyName: true, _count: { select: { quotations: true } } },
  })
  res.json({ success: true, participationByStatus: data, topSuppliers })
})

reportRoutes.get('/pricing-analytics', authenticate, authorize(Role.BUYER, Role.ADMIN), async (req, res) => {
  const { rfqId } = req.query as Record<string, string>
  const where = rfqId ? { rfqId } : {}

  const stats = await prisma.quotation.aggregate({
    where,
    _avg: { totalAmount: true },
    _min: { totalAmount: true },
    _max: { totalAmount: true },
    _count: { id: true },
  })

  const recentAwards = await prisma.award.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      rfq: { select: { title: true, referenceNo: true } },
      supplier: { select: { companyName: true } },
    },
  })

  res.json({
    success: true,
    stats: {
      avgAmount: stats._avg.totalAmount,
      minAmount: stats._min.totalAmount,
      maxAmount: stats._max.totalAmount,
      totalQuotations: stats._count.id,
    },
    recentAwards,
  })
})

reportRoutes.get('/dashboard-stats', authenticate, async (req, res) => {
  const user = req.user!
  const entityFilter = user.role === Role.BUYER ? { entityId: user.entityId! } : {}

  const [openRfqs, closedRfqs, awardedRfqs, pendingSuppliers, totalSuppliers] = await Promise.all([
    prisma.rfq.count({ where: { ...entityFilter, status: RfqStatus.OPEN } }),
    prisma.rfq.count({ where: { ...entityFilter, status: RfqStatus.CLOSED } }),
    prisma.rfq.count({ where: { ...entityFilter, status: RfqStatus.AWARDED } }),
    user.role === Role.ADMIN ? prisma.supplier.count({ where: { status: 'PENDING' } }) : Promise.resolve(0),
    user.role === Role.ADMIN ? prisma.supplier.count() : Promise.resolve(0),
  ])

  res.json({ success: true, openRfqs, closedRfqs, awardedRfqs, pendingSuppliers, totalSuppliers })
})
