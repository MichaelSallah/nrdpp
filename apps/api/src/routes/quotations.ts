import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../utils/prisma'
import { authenticate, authorize } from '../middleware/auth'
import { AppError } from '../middleware/errorHandler'
import { logAudit } from '../middleware/auditLogger'
import { createNotification } from '../services/notificationService'
import { DocumentType, NotificationType, Role, RfqStatus } from '@prisma/client'

const REQUIRED_DOC_TYPES: DocumentType[] = [
  DocumentType.BUSINESS_REGISTRATION,
  DocumentType.VAT_REGISTRATION,
  DocumentType.TAX_CLEARANCE,
  DocumentType.SSNIT_CLEARANCE,
  DocumentType.PPA_REGISTRATION,
]

const DOC_LABELS: Record<string, string> = {
  BUSINESS_REGISTRATION: 'Business Registration Documents',
  VAT_REGISTRATION:      'VAT Registration Certificate',
  TAX_CLEARANCE:         'Tax Clearance Certificate',
  SSNIT_CLEARANCE:       'SSNIT Clearance Certificate',
  PPA_REGISTRATION:      'PPA Registration',
}

export const quotationRoutes = Router()

const submitSchema = z.object({
  currency: z.string().default('GHS'),
  vatAmount: z.coerce.number().optional(),
  deliveryDays: z.coerce.number().optional(),
  validityDays: z.coerce.number().default(30),
  notes: z.string().optional(),
  items: z.array(z.object({
    rfqItemId: z.string(),
    unitPrice: z.coerce.number().positive(),
    notes: z.string().optional(),
  })).min(1),
})

// ── Submit quotation ──
quotationRoutes.post('/:id/quotations', authenticate, authorize(Role.SUPPLIER), async (req, res) => {
  const supplierId = req.user!.supplierId
  if (!supplierId) throw new AppError('Supplier profile required', 403)

  const rfq = await prisma.rfq.findUnique({
    where: { id: req.params.id },
    include: { items: true },
  })
  if (!rfq) throw new AppError('RFQ not found', 404)
  if (rfq.status !== RfqStatus.OPEN) throw new AppError('RFQ is not accepting quotations', 400)
  if (new Date() > rfq.submissionDeadline) throw new AppError('Submission deadline has passed', 400)

  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } })
  if (!supplier || supplier.status !== 'ACTIVE') throw new AppError('Supplier account not active', 403)

  // ── Document compliance check ──
  const supplierDocs = await prisma.supplierDocument.findMany({
    where: { supplierId, type: { in: REQUIRED_DOC_TYPES } },
    orderBy: { createdAt: 'desc' },
  })
  const now = new Date()
  for (const docType of REQUIRED_DOC_TYPES) {
    const doc = supplierDocs.find((d) => d.type === docType)
    if (!doc) {
      throw new AppError(`Cannot bid: missing required document — ${DOC_LABELS[docType]}`, 403)
    }
    if (doc.expiryDate && doc.expiryDate < now) {
      throw new AppError(`Cannot bid: expired document — ${DOC_LABELS[docType]} (expired ${doc.expiryDate.toLocaleDateString()})`, 403)
    }
  }

  const data = submitSchema.parse(req.body)

  // Calculate totals
  const rfqItemMap = new Map(rfq.items.map((i) => [i.id, i]))
  let totalAmount = 0
  const itemData = data.items.map((item) => {
    const rfqItem = rfqItemMap.get(item.rfqItemId)
    if (!rfqItem) throw new AppError(`Invalid RFQ item: ${item.rfqItemId}`, 400)
    const totalPrice = Number(rfqItem.quantity) * item.unitPrice
    totalAmount += totalPrice
    return { rfqItemId: item.rfqItemId, unitPrice: item.unitPrice, totalPrice, notes: item.notes }
  })

  const quotation = await prisma.quotation.create({
    data: {
      rfqId: rfq.id,
      supplierId,
      totalAmount,
      currency: data.currency,
      vatAmount: data.vatAmount,
      deliveryDays: data.deliveryDays,
      validityDays: data.validityDays,
      notes: data.notes,
      items: { createMany: { data: itemData } },
    },
    include: { items: true },
  })

  // Update invitation status
  await prisma.rfqSupplier.updateMany({
    where: { rfqId: rfq.id, supplierId },
    data: { status: 'SUBMITTED' },
  })

  // Notify buyer entity users
  const buyerUsers = await prisma.user.findMany({ where: { entityId: rfq.entityId, role: Role.BUYER } })
  for (const buyer of buyerUsers) {
    await createNotification({
      userId: buyer.id,
      type: NotificationType.QUOTATION_RECEIVED,
      title: 'New Quotation Received',
      body: `${supplier.companyName} submitted a quotation for ${rfq.title}`,
      metadata: { rfqId: rfq.id, quotationId: quotation.id },
    })
  }

  await logAudit({ entityType: 'quotation', entityId: quotation.id, action: 'submitted', actorId: req.user!.userId, rfqId: rfq.id, req })

  res.status(201).json({ success: true, quotation })
})

// ── List quotations for an RFQ (buyer: post-deadline; supplier: own only) ──
quotationRoutes.get('/:id/quotations', authenticate, async (req, res) => {
  const rfq = await prisma.rfq.findUnique({ where: { id: req.params.id } })
  if (!rfq) throw new AppError('RFQ not found', 404)

  const user = req.user!
  let where: Record<string, unknown> = { rfqId: rfq.id }

  if (user.role === Role.SUPPLIER) {
    // Suppliers only see their own
    where = { ...where, supplierId: user.supplierId }
  } else if (user.role === Role.BUYER) {
    // Buyers see all, but only after deadline
    if (new Date() <= rfq.submissionDeadline) {
      throw new AppError('Quotations are locked until submission deadline', 403)
    }
  }

  const quotations = await prisma.quotation.findMany({
    where,
    include: {
      supplier: { select: { companyName: true, riskScore: true } },
      items: { include: { rfqItem: true } },
      evaluation: true,
    },
    orderBy: { totalAmount: 'asc' },
  })

  res.json({ success: true, quotations })
})

// ── Get single quotation ──
quotationRoutes.get('/:id/quotations/:qid', authenticate, async (req, res) => {
  const quotation = await prisma.quotation.findUnique({
    where: { id: req.params.qid },
    include: {
      supplier: { include: { user: { select: { email: true } }, documents: true } },
      items: { include: { rfqItem: true } },
      rfq: { select: { title: true, referenceNo: true, submissionDeadline: true, entityId: true } },
      evaluation: true,
    },
  })
  if (!quotation || quotation.rfqId !== req.params.id) throw new AppError('Quotation not found', 404)

  const user = req.user!
  if (user.role === Role.SUPPLIER && quotation.supplierId !== user.supplierId) throw new AppError('Forbidden', 403)

  res.json({ success: true, quotation })
})
