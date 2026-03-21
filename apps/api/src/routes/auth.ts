import { Router } from 'express'
import bcrypt from 'bcryptjs'
import multer from 'multer'
import { z } from 'zod'
import { prisma } from '../utils/prisma'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt'
import { AppError } from '../middleware/errorHandler'
import { authenticate } from '../middleware/auth'
import { Role, DocumentType, NotificationType } from '@prisma/client'
import { logAudit } from '../middleware/auditLogger'
import { createNotification } from '../services/notificationService'

// File upload config for supplier registration
const storage = multer.diskStorage({
  destination: 'uploads/documents',
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, '-')}`),
})
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })

export const authRoutes = Router()

// ── OWASP Password Policy ──
// Min 8 chars, max 128, at least 1 uppercase, 1 lowercase, 1 digit, 1 special char
// No common passwords, no email-based passwords
const COMMON_PASSWORDS = new Set([
  'password', 'password1', '12345678', '123456789', 'qwerty123', 'admin123',
  'letmein', 'welcome', 'monkey', 'dragon', 'master', 'abc12345', 'password123',
  'iloveyou', 'trustno1', 'sunshine', 'princess', 'football', 'shadow', 'superman',
])

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .refine(p => /[A-Z]/.test(p), 'Must contain at least one uppercase letter')
  .refine(p => /[a-z]/.test(p), 'Must contain at least one lowercase letter')
  .refine(p => /[0-9]/.test(p), 'Must contain at least one number')
  .refine(p => /[^A-Za-z0-9]/.test(p), 'Must contain at least one special character (!@#$%^&*)')

function validatePasswordStrength(password: string, email: string) {
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    throw new AppError('Password is too common. Choose a stronger password.', 400)
  }
  const emailPrefix = email.split('@')[0].toLowerCase()
  if (emailPrefix.length >= 4 && password.toLowerCase().includes(emailPrefix)) {
    throw new AppError('Password must not contain your email address.', 400)
  }
}

// ── Account Lockout (OWASP brute force protection) ──
const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes
const loginAttempts = new Map<string, { count: number; lockedUntil: number | null }>()

function checkLockout(email: string) {
  const record = loginAttempts.get(email)
  if (!record) return
  if (record.lockedUntil && Date.now() < record.lockedUntil) {
    const minutesLeft = Math.ceil((record.lockedUntil - Date.now()) / 60000)
    throw new AppError(`Account temporarily locked. Try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`, 429)
  }
  if (record.lockedUntil && Date.now() >= record.lockedUntil) {
    loginAttempts.delete(email) // Reset after lockout expires
  }
}

function recordFailedAttempt(email: string) {
  const record = loginAttempts.get(email) || { count: 0, lockedUntil: null }
  record.count += 1
  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = Date.now() + LOCKOUT_DURATION_MS
  }
  loginAttempts.set(email, record)
}

function clearFailedAttempts(email: string) {
  loginAttempts.delete(email)
}

const registerSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  role: z.enum(['BUYER', 'SUPPLIER']),
  entityCode: z.string().optional(), // required for BUYER
})

authRoutes.post('/register', async (req, res) => {
  const data = registerSchema.parse(req.body)
  validatePasswordStrength(data.password, data.email)

  const existing = await prisma.user.findUnique({ where: { email: data.email } })
  if (existing) throw new AppError('Email already registered', 409)

  let entityId: string | undefined
  if (data.role === 'BUYER') {
    if (!data.entityCode) throw new AppError('Entity code required for buyer', 400)
    const entity = await prisma.entity.findUnique({ where: { code: data.entityCode } })
    if (!entity) throw new AppError('Entity not found', 404)
    entityId = entity.id
  }

  const passwordHash = await bcrypt.hash(data.password, 12)
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      role: data.role as Role,
      entityId,
    },
  })

  const payload = { userId: user.id, role: user.role, entityId: user.entityId }
  res.status(201).json({
    success: true,
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName },
  })
})

// ── Unified Buyer Registration (Entity + Admin User in one step) ──
const buyerRegisterSchema = z.object({
  // Entity fields
  entityName: z.string().min(2, 'Organisation name required'),
  entityCode: z.string().min(2, 'Organisation code required').transform(v => v.toUpperCase()),
  entityType: z.string().min(1, 'Organisation type required'),
  sector: z.enum(['GOVERNMENT', 'PRIVATE']).default('GOVERNMENT'),
  region: z.string().min(2, 'Region required'),
  entityAddress: z.string().optional(),
  digitalAddress: z.string().optional(),
  entityPhone: z.string().optional(),
  entityEmail: z.string().email().optional().or(z.literal('')),
  entityWebsite: z.string().optional(),
  headOfEntity: z.string().optional(),
  headTitle: z.string().optional(),
  // Admin user fields
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  password: passwordSchema,
})

authRoutes.post('/register-buyer', async (req, res) => {
  const data = buyerRegisterSchema.parse(req.body)
  validatePasswordStrength(data.password, data.email)

  // Check email not taken
  const existingUser = await prisma.user.findUnique({ where: { email: data.email } })
  if (existingUser) throw new AppError('Email already registered', 409)

  // Check entity code not taken
  const existingEntity = await prisma.entity.findUnique({ where: { code: data.entityCode } })
  if (existingEntity) throw new AppError('Organisation code already in use', 409)

  const passwordHash = await bcrypt.hash(data.password, 12)

  // Atomic transaction: create entity + admin user
  const result = await prisma.$transaction(async (tx) => {
    const entity = await tx.entity.create({
      data: {
        name: data.entityName,
        code: data.entityCode,
        type: data.entityType,
        sector: data.sector,
        region: data.region,
        address: data.entityAddress || null,
        digitalAddress: data.digitalAddress || null,
        phone: data.entityPhone || null,
        email: data.entityEmail || null,
        website: data.entityWebsite || null,
        headOfEntity: data.headOfEntity || null,
        headTitle: data.headTitle || null,
      },
    })

    const user = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: Role.BUYER,
        entityId: entity.id,
      },
    })

    return { entity, user }
  })

  // Audit log
  await logAudit({
    entityType: 'entity',
    entityId: result.entity.id,
    action: 'registered',
    actorId: result.user.id,
    req,
  })

  // Notify admins
  const admins = await prisma.user.findMany({ where: { role: Role.ADMIN } })
  await Promise.all(admins.map((admin) =>
    createNotification({
      userId: admin.id,
      type: NotificationType.GENERAL,
      title: 'New Buying Organisation Registered',
      body: `${data.entityName} (${data.entityCode}) has registered as a buying organisation.`,
    })
  ))

  const payload = { userId: result.user.id, role: result.user.role, entityId: result.entity.id }
  res.status(201).json({
    success: true,
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    user: {
      id: result.user.id,
      email: result.user.email,
      role: result.user.role,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      entityId: result.entity.id,
    },
  })
})

// ── Unified Supplier Registration (User + Company + Documents in one step) ──
const supplierRegisterSchema = z.object({
  // Account fields
  email: z.string().email(),
  password: passwordSchema,
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  // Company fields
  companyName: z.string().min(2, 'Company name required'),
  registrationNo: z.string().min(3, 'Registration number required'),
  taxId: z.string().min(3, 'Tax ID required'),
  ssnitNo: z.string().optional(),
  procurementRegNo: z.string().optional(),
  businessType: z.string().min(1, 'Business type required'),
  yearEstablished: z.coerce.number().optional(),
  // Location fields
  address: z.string().min(3, 'Address required'),
  city: z.string().min(2, 'City required'),
  region: z.string().min(2, 'Region required'),
  website: z.string().optional(),
  description: z.string().optional(),
  // Categories (JSON string from form)
  categoryIds: z.string().transform(v => JSON.parse(v) as string[]).pipe(z.array(z.string()).min(1, 'At least one category required')),
})

// Document metadata sent as JSON string array from the form
const docMetaSchema = z.array(z.object({
  type: z.nativeEnum(DocumentType),
  expiryDate: z.string().optional(),
}))

authRoutes.post('/register-supplier', upload.array('documents', 10), async (req, res) => {
  const data = supplierRegisterSchema.parse(req.body)
  validatePasswordStrength(data.password, data.email)

  // Parse document metadata
  const docMetaRaw = req.body.documentMeta ? JSON.parse(req.body.documentMeta) : []
  const docMeta = docMetaSchema.parse(docMetaRaw)
  const files = (req.files as Express.Multer.File[]) || []

  if (docMeta.length !== files.length) {
    throw new AppError('Document metadata count must match uploaded files', 400)
  }

  // Check email not taken
  const existing = await prisma.user.findUnique({ where: { email: data.email } })
  if (existing) throw new AppError('Email already registered', 409)

  // Check unique supplier fields
  const existingReg = await prisma.supplier.findUnique({ where: { registrationNo: data.registrationNo } })
  if (existingReg) throw new AppError('Registration number already in use', 409)
  const existingTax = await prisma.supplier.findUnique({ where: { taxId: data.taxId } })
  if (existingTax) throw new AppError('Tax ID already in use', 409)

  const passwordHash = await bcrypt.hash(data.password, 12)

  // Atomic transaction: create user + supplier + documents
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: Role.SUPPLIER,
      },
    })

    const supplier = await tx.supplier.create({
      data: {
        userId: user.id,
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
            data: data.categoryIds.map((categoryId: string) => ({ categoryId })),
            skipDuplicates: true,
          },
        },
      },
      include: { categories: { include: { category: true } } },
    })

    // Create documents
    const documents = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const meta = docMeta[i]
      const doc = await tx.supplierDocument.create({
        data: {
          supplierId: supplier.id,
          type: meta.type,
          fileUrl: `/uploads/documents/${file.filename}`,
          fileName: file.originalname,
          fileSize: file.size,
          expiryDate: meta.expiryDate ? new Date(meta.expiryDate) : undefined,
        },
      })
      documents.push(doc)
    }

    return { user, supplier, documents }
  })

  // Audit log
  await logAudit({
    entityType: 'supplier',
    entityId: result.supplier.id,
    action: 'registered',
    actorId: result.user.id,
    metadata: { documentsUploaded: result.documents.length },
    req,
  })

  // Notify all admins
  const admins = await prisma.user.findMany({ where: { role: Role.ADMIN } })
  await Promise.all(admins.map((admin) =>
    createNotification({
      userId: admin.id,
      type: NotificationType.SUPPLIER_REGISTERED,
      title: 'New Supplier Pending Approval',
      body: `${data.companyName} has registered with ${result.documents.length} document(s) and is awaiting verification.`,
    })
  ))

  const payload = { userId: result.user.id, role: result.user.role, entityId: result.user.entityId }
  res.status(201).json({
    success: true,
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
    user: {
      id: result.user.id,
      email: result.user.email,
      role: result.user.role,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
    },
    supplier: result.supplier,
    documentsUploaded: result.documents.length,
  })
})

authRoutes.post('/login', async (req, res) => {
  const { email, password } = z.object({ email: z.string().email(), password: z.string() }).parse(req.body)

  // OWASP: Check account lockout before attempting authentication
  checkLockout(email.toLowerCase())

  const user = await prisma.user.findUnique({
    where: { email },
    include: { supplier: { select: { id: true } }, invitedBy: { include: { supplier: { select: { id: true } } } } },
  })
  if (!user || !user.isActive) {
    recordFailedAttempt(email.toLowerCase())
    throw new AppError('Invalid credentials', 401)
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    recordFailedAttempt(email.toLowerCase())
    const record = loginAttempts.get(email.toLowerCase())
    const remaining = MAX_FAILED_ATTEMPTS - (record?.count || 0)
    if (remaining > 0 && remaining <= 2) {
      throw new AppError(`Invalid credentials. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining before lockout.`, 401)
    }
    throw new AppError('Invalid credentials', 401)
  }

  // OWASP: Clear lockout on successful login
  clearFailedAttempts(email.toLowerCase())

  // For supplier team members, use the owner's supplierId
  const supplierId = user.supplier?.id ?? user.invitedBy?.supplier?.id ?? null

  const payload = {
    userId: user.id,
    role: user.role,
    teamRole: user.teamRole,
    entityId: user.entityId,
    supplierId,
    invitedById: user.invitedById,
  }

  const refreshToken = signRefreshToken(payload)
  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7 * 86400_000) },
  })

  res.json({
    success: true,
    accessToken: signAccessToken(payload),
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      teamRole: user.teamRole,
      firstName: user.firstName,
      lastName: user.lastName,
      entityId: user.entityId,
      supplierId,
    },
  })
})

authRoutes.post('/refresh', async (req, res) => {
  const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body)

  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } })
  if (!stored || stored.expiresAt < new Date()) throw new AppError('Invalid refresh token', 401)

  const payload = verifyRefreshToken(refreshToken)
  const newAccess = signAccessToken(payload)
  const newRefresh = signRefreshToken(payload)

  // Rotate refresh token
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { token: newRefresh, expiresAt: new Date(Date.now() + 7 * 86400_000) } })

  res.json({ success: true, accessToken: newAccess, refreshToken: newRefresh })
})

authRoutes.post('/logout', authenticate, async (req, res) => {
  const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body)
  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } })
  res.json({ success: true })
})

authRoutes.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true, email: true, firstName: true, lastName: true, phone: true,
      role: true, teamRole: true, entityId: true, invitedById: true, isActive: true, createdAt: true,
      entity: { select: { id: true, name: true, code: true } },
      supplier: { select: { id: true, companyName: true, status: true, riskScore: true } },
    },
  })
  if (!user) throw new AppError('User not found', 404)
  res.json({ success: true, user })
})
