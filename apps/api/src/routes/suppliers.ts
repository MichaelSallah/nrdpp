import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import { z } from 'zod'
import { prisma } from '../utils/prisma'
import { authenticate, authorize } from '../middleware/auth'
import { AppError } from '../middleware/errorHandler'
import { logAudit } from '../middleware/auditLogger'
import { createNotification } from '../services/notificationService'
import { SupplierStatus, DocumentType, Role, NotificationType } from '@prisma/client'

export const supplierRoutes = Router()

// File upload config
const storage = multer.diskStorage({
  destination: 'uploads/documents',
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, '-')}`),
})
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })

// ── Register supplier profile (linked to existing SUPPLIER user) ──
const supplierSchema = z.object({
  companyName: z.string().min(2),
  registrationNo: z.string().min(3),
  taxId: z.string().min(3),
  ssnitNo: z.string().optional(),
  procurementRegNo: z.string().optional(),
  businessType: z.string(),
  yearEstablished: z.coerce.number().optional(),
  address: z.string(),
  city: z.string(),
  region: z.string(),
  website: z.string().optional(),
  description: z.string().optional(),
  categoryIds: z.array(z.string()).min(1),
})

supplierRoutes.post('/register', authenticate, authorize(Role.SUPPLIER), async (req, res) => {
  const data = supplierSchema.parse(req.body)
  const userId = req.user!.userId

  const existing = await prisma.supplier.findUnique({ where: { userId } })
  if (existing) throw new AppError('Supplier profile already exists', 409)

  const supplier = await prisma.supplier.create({
    data: {
      userId,
      companyName: data.companyName,
      registrationNo: data.registrationNo,
      taxId: data.taxId,
      ssnitNo: data.ssnitNo,
      procurementRegNo: data.procurementRegNo,
      businessType: data.businessType,
      yearEstablished: data.yearEstablished,
      address: data.address,
      city: data.city,
      region: data.region,
      website: data.website,
      description: data.description,
      categories: {
        createMany: {
          data: data.categoryIds.map((categoryId) => ({ categoryId })),
          skipDuplicates: true,
        },
      },
    },
    include: { categories: { include: { category: true } } },
  })

  await logAudit({ entityType: 'supplier', entityId: supplier.id, action: 'registered', actorId: userId, req })

  // Notify all admins that a new supplier is pending approval
  const admins = await prisma.user.findMany({ where: { role: Role.ADMIN } })
  await Promise.all(admins.map((admin) =>
    createNotification({
      userId: admin.id,
      type: NotificationType.SUPPLIER_REGISTERED,
      title: 'New Supplier Pending Approval',
      body: `${data.companyName} has registered and is awaiting verification.`,
    })
  ))

  res.status(201).json({ success: true, supplier, message: 'Registration submitted. Awaiting admin approval.' })
})

// ── Get supplier profile ──
supplierRoutes.get('/:id', authenticate, async (req, res) => {
  const id = String(req.params.id)
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, firstName: true, lastName: true, phone: true } },
      documents: true,
      categories: { include: { category: true } },
    },
  })
  if (!supplier) throw new AppError('Supplier not found', 404)
  res.json({ success: true, supplier })
})

// ── My profile (supplier self) ──
supplierRoutes.get('/me/profile', authenticate, authorize(Role.SUPPLIER), async (req, res) => {
  const supplier = await prisma.supplier.findUnique({
    where: { userId: req.user!.userId },
    include: {
      documents: true,
      categories: { include: { category: true } },
    },
  })
  if (!supplier) throw new AppError('Profile not found', 404)
  res.json({ success: true, supplier })
})

// ── Upload document ──
supplierRoutes.post(
  '/:id/documents',
  authenticate,
  authorize(Role.SUPPLIER),
  upload.single('file'),
  async (req, res) => {
    const id = String(req.params.id)
    const supplier = await prisma.supplier.findUnique({ where: { id } })
    if (!supplier) throw new AppError('Supplier not found', 404)
    if (supplier.userId !== req.user!.userId) throw new AppError('Forbidden', 403)
    if (!req.file) throw new AppError('No file uploaded', 400)

    const { type, expiryDate } = z.object({
      type: z.nativeEnum(DocumentType),
      expiryDate: z.string().optional(),
    }).parse(req.body)

    const doc = await prisma.supplierDocument.create({
      data: {
        supplierId: supplier.id,
        type,
        fileUrl: `/uploads/documents/${req.file.filename}`,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      },
    })

    await logAudit({ entityType: 'supplier_document', entityId: doc.id, action: 'uploaded', actorId: req.user!.userId, req })

    res.status(201).json({ success: true, document: doc })
  }
)

// ── Admin: list all suppliers ──
supplierRoutes.get('/', authenticate, authorize(Role.ADMIN), async (req, res) => {
  const { status, search, page = '1', limit = '20' } = req.query as Record<string, string>
  const skip = (parseInt(page) - 1) * parseInt(limit)

  const where = {
    ...(status && { status: status as SupplierStatus }),
    ...(search && {
      OR: [
        { companyName: { contains: search, mode: 'insensitive' as const } },
        { registrationNo: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        categories: { include: { category: true } },
        _count: { select: { documents: true, quotations: true } },
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.supplier.count({ where }),
  ])

  res.json({ success: true, suppliers, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) })
})

// ── Admin: update supplier status ──
supplierRoutes.patch('/:id/status', authenticate, authorize(Role.ADMIN), async (req, res) => {
  const { status, notes } = z.object({
    status: z.nativeEnum(SupplierStatus),
    notes: z.string().optional(),
  }).parse(req.body)

  const id = String(req.params.id)
  const supplier = await prisma.supplier.update({
    where: { id },
    data: {
      status,
      complianceNotes: notes,
      ...(status === SupplierStatus.ACTIVE && { verifiedAt: new Date(), verifiedBy: req.user!.userId }),
    },
  })

  await logAudit({
    entityType: 'supplier',
    entityId: supplier.id,
    action: `status_changed_to_${status.toLowerCase()}`,
    actorId: req.user!.userId,
    metadata: { notes },
    req,
  })

  await createNotification({
    userId: supplier.userId,
    type: NotificationType.COMPLIANCE_ALERT,
    title: `Account Status: ${status}`,
    body: notes || `Your supplier account status has been updated to ${status}.`,
  })

  res.json({ success: true, supplier })
})

// ── Compliance check ──
supplierRoutes.get('/:id/compliance', authenticate, async (req, res) => {
  const id = String(req.params.id)
  const supplierWithDocs = await prisma.supplier.findUnique({
    where: { id },
    include: { documents: true },
  })
  if (!supplierWithDocs) throw new AppError('Supplier not found', 404)

  const supplier = supplierWithDocs
  const today = new Date()
  const soonThreshold = new Date(today.getTime() + 30 * 86_400_000)
  const issues: string[] = []
  const warnings: string[] = []

  const REQUIRED = [
    { type: DocumentType.BUSINESS_REGISTRATION, label: 'Business Registration Documents' },
    { type: DocumentType.VAT_REGISTRATION,      label: 'VAT Registration Certificate' },
    { type: DocumentType.TAX_CLEARANCE,         label: 'Tax Clearance Certificate' },
    { type: DocumentType.SSNIT_CLEARANCE,       label: 'SSNIT Clearance Certificate' },
    { type: DocumentType.PPA_REGISTRATION,      label: 'PPA Registration' },
  ]

  for (const { type, label } of REQUIRED) {
    const doc = supplier.documents.find((d: { type: DocumentType }) => d.type === type)
    if (!doc) {
      issues.push(`${label} — missing`)
    } else {
      const d = doc as { type: DocumentType; expiryDate: Date | null }
      if (d.expiryDate && d.expiryDate < today) {
        issues.push(`${label} — expired on ${d.expiryDate.toLocaleDateString()}`)
      } else if (d.expiryDate && d.expiryDate < soonThreshold) {
        warnings.push(`${label} — expires on ${d.expiryDate.toLocaleDateString()}`)
      }
    }
  }

  res.json({
    success: true,
    supplierId: supplier.id,
    status: supplier.status,
    riskScore: supplier.riskScore,
    compliant: issues.length === 0,
    canBid: issues.length === 0,
    issues,
    warnings,
  })
})
