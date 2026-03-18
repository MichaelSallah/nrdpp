import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../utils/prisma'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt'
import { AppError } from '../middleware/errorHandler'
import { authenticate } from '../middleware/auth'
import { Role } from '@prisma/client'

export const authRoutes = Router()

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  role: z.enum(['BUYER', 'SUPPLIER']),
  entityCode: z.string().optional(), // required for BUYER
})

authRoutes.post('/register', async (req, res) => {
  const data = registerSchema.parse(req.body)

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

authRoutes.post('/login', async (req, res) => {
  const { email, password } = z.object({ email: z.string().email(), password: z.string() }).parse(req.body)

  const user = await prisma.user.findUnique({
    where: { email },
    include: { supplier: { select: { id: true } } },
  })
  if (!user || !user.isActive) throw new AppError('Invalid credentials', 401)

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) throw new AppError('Invalid credentials', 401)

  const payload = {
    userId: user.id,
    role: user.role,
    entityId: user.entityId,
    supplierId: user.supplier?.id ?? null,
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
      firstName: user.firstName,
      lastName: user.lastName,
      entityId: user.entityId,
      supplierId: user.supplier?.id,
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
      role: true, entityId: true, isActive: true, createdAt: true,
      entity: { select: { id: true, name: true, code: true } },
      supplier: { select: { id: true, companyName: true, status: true, riskScore: true } },
    },
  })
  if (!user) throw new AppError('User not found', 404)
  res.json({ success: true, user })
})
