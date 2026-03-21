import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../utils/prisma'
import { authenticate, authorize } from '../middleware/auth'
import { AppError } from '../middleware/errorHandler'
import { logAudit } from '../middleware/auditLogger'
import { createNotification } from '../services/notificationService'
import { DocumentType, NotificationType, Role, RfqStatus } from '@prisma/client'

// ── Document compliance tiers (based on Ghana's legal framework) ──
// UNIVERSAL: Always required for all bidding (Companies Act 2019, Act 992)
const UNIVERSAL_DOC_TYPES: DocumentType[] = [
  DocumentType.BUSINESS_REGISTRATION,
]
// GOVERNMENT: Required only for Government Entity RFQs (public procurement)
const GOVERNMENT_DOC_TYPES: DocumentType[] = [
  DocumentType.TAX_CLEARANCE,    // Income Tax Act 2015, Act 896
  DocumentType.SSNIT_CLEARANCE,  // National Pensions Act 2008, Act 766
  DocumentType.PPA_REGISTRATION, // Public Procurement Act 2003, Act 663
]
// RECOMMENDED: Not blocking — VAT is threshold-dependent (VAT Act 2013, Act 870)

const DOC_LABELS: Record<string, string> = {
  BUSINESS_REGISTRATION: 'Business Registration Documents (Act 992)',
  VAT_REGISTRATION:      'VAT Registration Certificate (Act 870)',
  TAX_CLEARANCE:         'Tax Clearance Certificate (Act 896)',
  SSNIT_CLEARANCE:       'SSNIT Clearance Certificate (Act 766)',
  PPA_REGISTRATION:      'PPA Registration (Act 663)',
}

// ── Ghana Tax Rates ──
// COVID-19 Health Recovery Levy (Act 1068) abolished — removed
const GHANA_TAX_RATES = {
  VAT:        0.15,   // 15% — Value Added Tax Act 2013 (Act 870)
  NHIL:       0.025,  // 2.5% — National Health Insurance Act 2012 (Act 852)
  GETFUND:    0.025,  // 2.5% — GETFund Act 2000 (Act 581)
} as const
// Combined effective rate: 20%

function computeGhanaTaxes(subtotal: number) {
  const vat       = Math.round(subtotal * GHANA_TAX_RATES.VAT * 100) / 100
  const nhil      = Math.round(subtotal * GHANA_TAX_RATES.NHIL * 100) / 100
  const getfund   = Math.round(subtotal * GHANA_TAX_RATES.GETFUND * 100) / 100
  const totalTax  = Math.round((vat + nhil + getfund) * 100) / 100
  const grandTotal = Math.round((subtotal + totalTax) * 100) / 100
  return { vatAmount: vat, nhilAmount: nhil, getfundAmount: getfund, totalTax, grandTotal }
}

export const quotationRoutes = Router()

const submitSchema = z.object({
  currency: z.string().default('GHS'),
  taxMode: z.enum(['AUTO', 'MANUAL']).default('AUTO'),
  manualTaxAmount: z.coerce.number().min(0).optional(),
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
    include: { items: true, entity: { select: { sector: true } } },
  })
  if (!rfq) throw new AppError('RFQ not found', 404)
  if (rfq.status !== RfqStatus.OPEN) throw new AppError('RFQ is not accepting quotations', 400)
  if (new Date() > rfq.submissionDeadline) throw new AppError('Submission deadline has passed', 400)

  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } })
  if (!supplier || supplier.status !== 'ACTIVE') throw new AppError('Supplier account not active', 403)

  // ── Document compliance check (Ghana legal framework) ──
  // Universal docs: always required (Business Registration — Act 992)
  // Government docs: Tax Clearance (Act 896), SSNIT (Act 766), PPA (Act 663) — only for public procurement
  // VAT (Act 870): threshold-dependent, recommended but never blocks bidding
  const isGovernment = rfq.entity.sector === 'GOVERNMENT'
  const requiredDocs = isGovernment
    ? [...UNIVERSAL_DOC_TYPES, ...GOVERNMENT_DOC_TYPES]
    : UNIVERSAL_DOC_TYPES

  const supplierDocs = await prisma.supplierDocument.findMany({
    where: { supplierId, type: { in: requiredDocs } },
    orderBy: { createdAt: 'desc' },
  })
  const now = new Date()
  for (const docType of requiredDocs) {
    const doc = supplierDocs.find((d) => d.type === docType)
    if (!doc) {
      throw new AppError(`Cannot bid: missing required document — ${DOC_LABELS[docType]}`, 403)
    }
    if (doc.expiryDate && doc.expiryDate < now) {
      throw new AppError(`Cannot bid: expired document — ${DOC_LABELS[docType]} (expired ${doc.expiryDate.toLocaleDateString()})`, 403)
    }
  }

  const data = submitSchema.parse(req.body)

  // Calculate line totals
  const rfqItemMap = new Map(rfq.items.map((i) => [i.id, i]))
  let subtotal = 0
  const itemData = data.items.map((item) => {
    const rfqItem = rfqItemMap.get(item.rfqItemId)
    if (!rfqItem) throw new AppError(`Invalid RFQ item: ${item.rfqItemId}`, 400)
    const totalPrice = Math.round(Number(rfqItem.quantity) * item.unitPrice * 100) / 100
    subtotal += totalPrice
    return { rfqItemId: item.rfqItemId, unitPrice: item.unitPrice, totalPrice, notes: item.notes }
  })
  subtotal = Math.round(subtotal * 100) / 100

  // Compute taxes based on selected mode
  let taxData: Record<string, unknown>
  if (data.taxMode === 'MANUAL') {
    // Manual: supplier enters total tax figure directly
    const manualTax = Math.round((data.manualTaxAmount || 0) * 100) / 100
    taxData = {
      taxMode: 'MANUAL',
      vatAmount: null,
      nhilAmount: null,
      getfundAmount: null,
      totalTax: manualTax,
      grandTotal: Math.round((subtotal + manualTax) * 100) / 100,
    }
  } else {
    // Auto: system calculates Ghana taxes (VAT + NHIL + GETFund = 20%)
    const taxes = computeGhanaTaxes(subtotal)
    taxData = {
      taxMode: 'AUTO',
      vatAmount: taxes.vatAmount,
      nhilAmount: taxes.nhilAmount,
      getfundAmount: taxes.getfundAmount,
      totalTax: taxes.totalTax,
      grandTotal: taxes.grandTotal,
    }
  }

  const quotation = await prisma.quotation.create({
    data: {
      rfqId: rfq.id,
      supplierId,
      totalAmount: subtotal,
      currency: data.currency,
      ...taxData,
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
      supplier: { select: { id: true, companyName: true, riskScore: true } },
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
