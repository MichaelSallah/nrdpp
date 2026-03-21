import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../utils/prisma'
import { authenticate, authorize } from '../middleware/auth'
import { AppError } from '../middleware/errorHandler'
import { logAudit } from '../middleware/auditLogger'
import { matchAndInviteSuppliers } from '../services/matchingService'
import { generateRfqRef } from '../utils/generateRef'
import { Role, RfqCategory, RfqStatus } from '@prisma/client'

export const rfqRoutes = Router()

const rfqSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(10),
  type: z.nativeEnum(RfqCategory).default(RfqCategory.GOODS),
  categoryId: z.string(),
  budgetEstimate: z.coerce.number().positive().optional(),
  currency: z.string().default('GHS'),
  submissionDeadline: z.string().refine((d) => new Date(d) > new Date(), { message: 'Deadline must be in the future' }),
  deliveryTimeline: z.string().optional(),
  evaluationCriteria: z.string().optional(),
  termsConditions: z.string().optional(),
  minimumQuotations: z.coerce.number().min(1).default(3),
  items: z.array(z.object({
    itemNo: z.coerce.number(),
    description: z.string(),
    unit: z.string(),
    quantity: z.coerce.number().positive(),
    specifications: z.string().optional(),
  })).min(1),
})

// ── Create RFQ (DRAFT) ──
rfqRoutes.post('/', authenticate, authorize(Role.BUYER), async (req, res) => {
  const data = rfqSchema.parse(req.body)
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, include: { entity: true } })
  if (!user?.entityId || !user.entity) throw new AppError('No entity linked to user', 403)

  const referenceNo = await generateRfqRef(user.entity.code)

  const rfq = await prisma.rfq.create({
    data: {
      referenceNo,
      title: data.title,
      description: data.description,
      type: data.type,
      categoryId: data.categoryId,
      entityId: user.entityId,
      createdById: user.id,
      budgetEstimate: data.budgetEstimate,
      currency: data.currency,
      submissionDeadline: new Date(data.submissionDeadline),
      deliveryTimeline: data.deliveryTimeline,
      evaluationCriteria: data.evaluationCriteria,
      termsConditions: data.termsConditions,
      minimumQuotations: data.minimumQuotations,
      items: { createMany: { data: data.items } },
    },
    include: { items: true, category: true, entity: true },
  })

  await logAudit({ entityType: 'rfq', entityId: rfq.id, action: 'created', actorId: user.id, rfqId: rfq.id, req })

  res.status(201).json({ success: true, rfq })
})

// ── Publish RFQ (DRAFT → OPEN) ──
rfqRoutes.post('/:id/publish', authenticate, authorize(Role.BUYER), async (req, res) => {
  const rfq = await prisma.rfq.findUnique({ where: { id: req.params.id }, include: { entity: true, category: true } })
  if (!rfq) throw new AppError('RFQ not found', 404)
  if (rfq.createdById !== req.user!.userId) throw new AppError('Forbidden', 403)
  if (rfq.status !== RfqStatus.DRAFT) throw new AppError('Only DRAFT RFQs can be published', 400)

  const updated = await prisma.rfq.update({
    where: { id: rfq.id },
    data: { status: RfqStatus.OPEN, publishedAt: new Date() },
  })

  // Auto-match suppliers and send invitations
  await matchAndInviteSuppliers(rfq.id, rfq.categoryId)

  await logAudit({ entityType: 'rfq', entityId: rfq.id, action: 'published', actorId: req.user!.userId, rfqId: rfq.id, req })

  res.json({ success: true, rfq: updated })
})

// ── Cancel RFQ ──
rfqRoutes.post('/:id/cancel', authenticate, authorize(Role.BUYER), async (req, res) => {
  const rfq = await prisma.rfq.findUnique({ where: { id: req.params.id } })
  if (!rfq) throw new AppError('RFQ not found', 404)
  if (rfq.createdById !== req.user!.userId) throw new AppError('Forbidden', 403)
  if ([RfqStatus.AWARDED, RfqStatus.CANCELLED].includes(rfq.status)) throw new AppError('Cannot cancel this RFQ', 400)

  const updated = await prisma.rfq.update({ where: { id: rfq.id }, data: { status: RfqStatus.CANCELLED } })
  await logAudit({ entityType: 'rfq', entityId: rfq.id, action: 'cancelled', actorId: req.user!.userId, rfqId: rfq.id, req })

  res.json({ success: true, rfq: updated })
})

// ── Update RFQ (DRAFT only) ──
rfqRoutes.put('/:id', authenticate, authorize(Role.BUYER), async (req, res) => {
  const rfq = await prisma.rfq.findUnique({ where: { id: req.params.id } })
  if (!rfq) throw new AppError('RFQ not found', 404)
  if (rfq.status !== RfqStatus.DRAFT) throw new AppError('Cannot edit non-DRAFT RFQ', 400)
  if (rfq.createdById !== req.user!.userId) throw new AppError('Forbidden', 403)

  const data = rfqSchema.partial().parse(req.body)
  const updated = await prisma.rfq.update({
    where: { id: rfq.id },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.description && { description: data.description }),
      ...(data.budgetEstimate && { budgetEstimate: data.budgetEstimate }),
      ...(data.submissionDeadline && { submissionDeadline: new Date(data.submissionDeadline) }),
      ...(data.deliveryTimeline && { deliveryTimeline: data.deliveryTimeline }),
      ...(data.evaluationCriteria && { evaluationCriteria: data.evaluationCriteria }),
    },
  })

  res.json({ success: true, rfq: updated })
})

// ── List RFQs (marketplace) ──
rfqRoutes.get('/', authenticate, async (req, res) => {
  const user = req.user!
  const { status, category, search, page = '1', limit = '20' } = req.query as Record<string, string>
  const skip = (parseInt(page) - 1) * parseInt(limit)

  const where: Record<string, unknown> = {
    ...(status ? { status } : { status: { in: [RfqStatus.OPEN, RfqStatus.CLOSED, RfqStatus.AWARDED] } }),
    ...(category && { categoryId: category }),
    ...(search && { OR: [{ title: { contains: search, mode: 'insensitive' } }, { referenceNo: { contains: search, mode: 'insensitive' } }] }),
    // Buyers only see their entity's RFQs
    ...(user.role === Role.BUYER && { entityId: user.entityId }),
    // Suppliers only see open RFQs
    ...(user.role === Role.SUPPLIER && { status: RfqStatus.OPEN }),
  }

  const [rfqs, total] = await Promise.all([
    prisma.rfq.findMany({
      where,
      include: {
        category: true,
        entity: { select: { name: true, code: true, region: true, sector: true } },
        _count: { select: { quotations: true, suppliers: true } },
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.rfq.count({ where }),
  ])

  // Strip quotation count from suppliers — they shouldn't see how many bids exist
  if (user.role === Role.SUPPLIER) {
    const sanitized = rfqs.map((rfq) => {
      const plain = JSON.parse(JSON.stringify(rfq))
      if (plain._count) { delete plain._count.quotations }
      return plain
    })
    return res.json({ success: true, rfqs: sanitized, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) })
  }

  res.json({ success: true, rfqs, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) })
})

// ── Get single RFQ ──
rfqRoutes.get('/:id', authenticate, async (req, res) => {
  const rfq = await prisma.rfq.findUnique({
    where: { id: req.params.id },
    include: {
      items: { orderBy: { itemNo: 'asc' } },
      category: true,
      entity: { select: { name: true, code: true, region: true, sector: true, email: true } },
      createdBy: { select: { firstName: true, lastName: true, email: true } },
      award: { include: { supplier: { select: { companyName: true } } } },
      _count: { select: { quotations: true, suppliers: true, chatMessages: true } },
    },
  })
  if (!rfq) throw new AppError('RFQ not found', 404)

  // Mark as viewed for suppliers
  if (req.user!.role === Role.SUPPLIER && req.user!.supplierId) {
    await prisma.rfqSupplier.updateMany({
      where: { rfqId: rfq.id, supplierId: req.user!.supplierId, viewedAt: null },
      data: { viewedAt: new Date() },
    })
  }

  // Strip quotation/supplier counts and createdBy from suppliers
  if (req.user!.role === Role.SUPPLIER) {
    const plain = JSON.parse(JSON.stringify(rfq))
    if (plain._count) { delete plain._count.quotations; delete plain._count.suppliers }
    delete plain.createdBy
    return res.json({ success: true, rfq: plain })
  }

  res.json({ success: true, rfq })
})

// ── Invite suppliers manually ──
rfqRoutes.post('/:id/invite', authenticate, authorize(Role.BUYER), async (req, res) => {
  const { supplierIds } = z.object({ supplierIds: z.array(z.string()).min(1) }).parse(req.body)
  const rfq = await prisma.rfq.findUnique({ where: { id: req.params.id } })
  if (!rfq) throw new AppError('RFQ not found', 404)
  if (rfq.status !== RfqStatus.OPEN) throw new AppError('RFQ is not open', 400)

  await prisma.rfqSupplier.createMany({
    data: supplierIds.map((supplierId) => ({ rfqId: rfq.id, supplierId })),
    skipDuplicates: true,
  })

  res.json({ success: true, invited: supplierIds.length })
})

// ── Get invited suppliers ──
rfqRoutes.get('/:id/suppliers', authenticate, authorize(Role.BUYER, Role.ADMIN), async (req, res) => {
  const rfqSuppliers = await prisma.rfqSupplier.findMany({
    where: { rfqId: req.params.id },
    include: {
      supplier: {
        include: {
          user: { select: { email: true, firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { invitedAt: 'desc' },
  })

  res.json({ success: true, suppliers: rfqSuppliers })
})
