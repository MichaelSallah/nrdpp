import { Router } from 'express'
import { z } from 'zod'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { prisma } from '../utils/prisma'
import { authenticate, authorize } from '../middleware/auth'
import { AppError } from '../middleware/errorHandler'
import { logAudit } from '../middleware/auditLogger'
import { Role, DocumentType } from '@prisma/client'

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = 'uploads/documents'
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, '-')}`),
})
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })

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

// ── Supplier detail (admin view) ──
adminRoutes.get('/suppliers/:id', async (req, res) => {
  const supplier = await prisma.supplier.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { email: true, firstName: true, lastName: true, phone: true, createdAt: true } },
      documents: { orderBy: { createdAt: 'desc' } },
      categories: { include: { category: true } },
      _count: { select: { quotations: true } },
    },
  })
  if (!supplier) throw new AppError('Supplier not found', 404)
  res.json({ success: true, supplier })
})

// ── Upload document for a supplier (admin) ──
adminRoutes.post('/suppliers/:id/documents', upload.single('file'), async (req, res) => {
  const supplier = await prisma.supplier.findUnique({ where: { id: req.params.id } })
  if (!supplier) throw new AppError('Supplier not found', 404)
  if (!req.file) throw new AppError('No file uploaded', 400)

  const { type, expiryDate, notes } = z.object({
    type: z.nativeEnum(DocumentType),
    expiryDate: z.string().optional(),
    notes: z.string().optional(),
  }).parse(req.body)

  const doc = await prisma.supplierDocument.create({
    data: {
      supplierId: supplier.id,
      type,
      fileUrl: `/uploads/documents/${req.file.filename}`,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      notes,
      verified: true,
      verifiedAt: new Date(),
    },
  })

  await logAudit({ entityType: 'supplier', entityId: supplier.id, action: 'document_uploaded', actorId: req.user!.userId, req })
  res.status(201).json({ success: true, document: doc })
})

// ── Delete a supplier document (admin) ──
adminRoutes.delete('/suppliers/:id/documents/:docId', async (req, res) => {
  const doc = await prisma.supplierDocument.findFirst({
    where: { id: req.params.docId, supplierId: req.params.id },
  })
  if (!doc) throw new AppError('Document not found', 404)
  await prisma.supplierDocument.delete({ where: { id: doc.id } })
  await logAudit({ entityType: 'supplier', entityId: req.params.id, action: 'document_deleted', actorId: req.user!.userId, req })
  res.json({ success: true })
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
