import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../utils/prisma'
import { authenticate, authorize } from '../middleware/auth'
import { AppError } from '../middleware/errorHandler'
import { logAudit } from '../middleware/auditLogger'
import { createNotification } from '../services/notificationService'
import { NotificationType, Role, RfqStatus } from '@prisma/client'

export const evaluationRoutes = Router()

const evalSchema = z.object({
  quotationId: z.string(),
  supplierId: z.string(),
  priceScore: z.number().min(0).max(40),
  technicalScore: z.number().min(0).max(40),
  deliveryScore: z.number().min(0).max(20),
  recommendation: z.string().optional(),
  notes: z.string().optional(),
})

// ── Submit evaluation scores ──
evaluationRoutes.post('/:id/evaluations', authenticate, authorize(Role.BUYER), async (req, res) => {
  const rfq = await prisma.rfq.findUnique({ where: { id: req.params.id } })
  if (!rfq) throw new AppError('RFQ not found', 404)
  if (rfq.status !== RfqStatus.CLOSED && rfq.status !== RfqStatus.OPEN) throw new AppError('Evaluation not allowed in current status', 400)
  if (new Date() <= rfq.submissionDeadline) throw new AppError('Cannot evaluate before deadline', 400)

  const data = evalSchema.parse(req.body)
  const totalScore = data.priceScore + data.technicalScore + data.deliveryScore

  const evaluation = await prisma.evaluation.upsert({
    where: { rfqId_supplierId: { rfqId: rfq.id, supplierId: data.supplierId } },
    update: {
      priceScore: data.priceScore,
      technicalScore: data.technicalScore,
      deliveryScore: data.deliveryScore,
      totalScore,
      recommendation: data.recommendation,
      notes: data.notes,
      evaluatorId: req.user!.userId,
    },
    create: {
      rfqId: rfq.id,
      supplierId: data.supplierId,
      quotationId: data.quotationId,
      evaluatorId: req.user!.userId,
      priceScore: data.priceScore,
      technicalScore: data.technicalScore,
      deliveryScore: data.deliveryScore,
      totalScore,
      recommendation: data.recommendation,
      notes: data.notes,
    },
  })

  await logAudit({ entityType: 'evaluation', entityId: evaluation.id, action: 'scored', actorId: req.user!.userId, rfqId: rfq.id, req })

  res.status(201).json({ success: true, evaluation })
})

// ── Get evaluation matrix ──
evaluationRoutes.get('/:id/evaluations', authenticate, authorize(Role.BUYER, Role.ADMIN), async (req, res) => {
  const rfq = await prisma.rfq.findUnique({ where: { id: req.params.id } })
  if (!rfq) throw new AppError('RFQ not found', 404)
  if (new Date() <= rfq.submissionDeadline) throw new AppError('Evaluation matrix locked until deadline', 403)

  const evaluations = await prisma.evaluation.findMany({
    where: { rfqId: rfq.id },
    include: {
      supplier: { select: { companyName: true, riskScore: true } },
      quotation: { select: { totalAmount: true, currency: true, deliveryDays: true } },
      evaluator: { select: { firstName: true, lastName: true } },
    },
    orderBy: { totalScore: 'desc' },
  })

  // Auto-rank by total score
  const ranked = evaluations.map((e, idx) => ({ ...e, priceRank: idx + 1 }))

  res.json({ success: true, evaluations: ranked })
})

// ── Award RFQ ──
evaluationRoutes.post('/:id/award', authenticate, authorize(Role.BUYER), async (req, res) => {
  const rfq = await prisma.rfq.findUnique({ where: { id: req.params.id } })
  if (!rfq) throw new AppError('RFQ not found', 404)
  if (rfq.status === RfqStatus.AWARDED) throw new AppError('Already awarded', 400)
  if (rfq.status === RfqStatus.CANCELLED) throw new AppError('Cannot award cancelled RFQ', 400)

  const { supplierId, quotationId, justification } = z.object({
    supplierId: z.string(),
    quotationId: z.string(),
    justification: z.string().min(10),
  }).parse(req.body)

  const quotation = await prisma.quotation.findUnique({ where: { id: quotationId } })
  if (!quotation || quotation.rfqId !== rfq.id) throw new AppError('Invalid quotation', 400)

  const award = await prisma.award.create({
    data: {
      rfqId: rfq.id,
      supplierId,
      quotationId,
      awardedById: req.user!.userId,
      awardAmount: quotation.totalAmount,
      currency: quotation.currency,
      justification,
    },
  })

  await prisma.rfq.update({ where: { id: rfq.id }, data: { status: RfqStatus.AWARDED } })

  await logAudit({ entityType: 'award', entityId: award.id, action: 'awarded', actorId: req.user!.userId, rfqId: rfq.id, metadata: { supplierId, quotationId }, req })

  // Notify awarded supplier
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } })
  if (supplier) {
    await createNotification({
      userId: supplier.userId,
      type: NotificationType.RFQ_AWARDED,
      title: 'Congratulations! RFQ Awarded',
      body: `Your quotation for "${rfq.title}" (${rfq.referenceNo}) has been awarded.`,
      metadata: { rfqId: rfq.id, awardId: award.id },
    })
  }

  // Notify losing suppliers
  const others = await prisma.rfqSupplier.findMany({
    where: { rfqId: rfq.id, supplierId: { not: supplierId }, status: 'SUBMITTED' },
    include: { supplier: true },
  })
  for (const inv of others) {
    await createNotification({
      userId: inv.supplier.userId,
      type: NotificationType.RFQ_CLOSED,
      title: 'RFQ Result Notification',
      body: `RFQ "${rfq.title}" (${rfq.referenceNo}) has been awarded to another supplier.`,
      metadata: { rfqId: rfq.id },
    })
  }

  res.status(201).json({ success: true, award })
})

// ── Get award ──
evaluationRoutes.get('/:id/award', authenticate, async (req, res) => {
  const award = await prisma.award.findUnique({
    where: { rfqId: req.params.id },
    include: {
      supplier: { select: { companyName: true } },
      quotation: { select: { totalAmount: true, currency: true, deliveryDays: true } },
      awardedBy: { select: { firstName: true, lastName: true } },
      rfq: { select: { title: true, referenceNo: true } },
    },
  })
  if (!award) throw new AppError('No award found', 404)
  res.json({ success: true, award })
})
