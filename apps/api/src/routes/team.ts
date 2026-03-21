import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../utils/prisma'
import { AppError } from '../middleware/errorHandler'
import { authenticate, authorizeTeam } from '../middleware/auth'
import { TeamRole } from '@prisma/client'

export const teamRoutes = Router()

const MAX_TEAM_SIZE = 5 // 1 owner + 4 members

// GET /api/team — list team members
teamRoutes.get('/', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } })
  if (!user) throw new AppError('User not found', 404)

  // Determine the owner: if this user is the owner, it's them. Otherwise, it's their invitedBy.
  const ownerId = user.teamRole === 'OWNER' ? user.id : user.invitedById
  if (!ownerId) throw new AppError('Team not found', 404)

  const members = await prisma.user.findMany({
    where: {
      OR: [
        { id: ownerId },
        { invitedById: ownerId },
      ],
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      teamRole: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: [
      { teamRole: 'asc' }, // OWNER first
      { createdAt: 'asc' },
    ],
  })

  res.json({ success: true, members, maxSize: MAX_TEAM_SIZE })
})

// POST /api/team/invite — invite a new team member (owner only)
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .refine(p => /[A-Z]/.test(p), 'Must contain at least one uppercase letter')
  .refine(p => /[a-z]/.test(p), 'Must contain at least one lowercase letter')
  .refine(p => /[0-9]/.test(p), 'Must contain at least one number')
  .refine(p => /[^A-Za-z0-9]/.test(p), 'Must contain at least one special character (!@#$%^&*)')

const inviteSchema = z.object({
  email: z.string().email('Invalid email'),
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  phone: z.string().optional(),
  password: passwordSchema,
  teamRole: z.enum(['MANAGER', 'VIEWER']),
})

teamRoutes.post('/invite', authenticate, authorizeTeam('OWNER' as TeamRole), async (req, res) => {
  const data = inviteSchema.parse(req.body)
  const owner = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: { supplier: true },
  })
  if (!owner) throw new AppError('User not found', 404)

  // Check seat limit
  const currentCount = await prisma.user.count({
    where: {
      OR: [
        { id: owner.id },
        { invitedById: owner.id },
      ],
    },
  })
  if (currentCount >= MAX_TEAM_SIZE) {
    throw new AppError(`Team is full. Maximum ${MAX_TEAM_SIZE} members allowed.`, 400)
  }

  // Check email not taken
  const existing = await prisma.user.findUnique({ where: { email: data.email } })
  if (existing) throw new AppError('Email already registered', 409)

  const passwordHash = await bcrypt.hash(data.password, 12)

  const member = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      role: owner.role, // Same portal role as owner (BUYER or SUPPLIER)
      teamRole: data.teamRole as TeamRole,
      entityId: owner.entityId, // Same entity for buyers
      invitedById: owner.id,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      teamRole: true,
      isActive: true,
      createdAt: true,
    },
  })

  res.status(201).json({ success: true, member })
})

// PATCH /api/team/:userId/role — change member role (owner only)
teamRoutes.patch('/:userId/role', authenticate, authorizeTeam('OWNER' as TeamRole), async (req, res) => {
  const { userId } = req.params
  const { teamRole } = z.object({ teamRole: z.enum(['MANAGER', 'VIEWER']) }).parse(req.body)

  const member = await prisma.user.findUnique({ where: { id: userId as string } })
  if (!member) throw new AppError('Member not found', 404)
  if (member.invitedById !== req.user!.userId) throw new AppError('Not your team member', 403)
  if (member.teamRole === 'OWNER') throw new AppError('Cannot change owner role', 400)

  const updated = await prisma.user.update({
    where: { id: userId as string },
    data: { teamRole: teamRole as TeamRole },
    select: { id: true, email: true, firstName: true, lastName: true, teamRole: true, isActive: true },
  })

  res.json({ success: true, member: updated })
})

// PATCH /api/team/:userId/toggle — disable/enable member (owner only)
teamRoutes.patch('/:userId/toggle', authenticate, authorizeTeam('OWNER' as TeamRole), async (req, res) => {
  const { userId } = req.params

  const member = await prisma.user.findUnique({ where: { id: userId as string } })
  if (!member) throw new AppError('Member not found', 404)
  if (member.invitedById !== req.user!.userId) throw new AppError('Not your team member', 403)
  if (member.teamRole === 'OWNER') throw new AppError('Cannot disable owner', 400)

  const updated = await prisma.user.update({
    where: { id: userId as string },
    data: { isActive: !member.isActive },
    select: { id: true, email: true, firstName: true, lastName: true, teamRole: true, isActive: true },
  })

  res.json({ success: true, member: updated })
})

// DELETE /api/team/:userId — remove member (owner only)
teamRoutes.delete('/:userId', authenticate, authorizeTeam('OWNER' as TeamRole), async (req, res) => {
  const { userId } = req.params

  const member = await prisma.user.findUnique({ where: { id: userId as string } })
  if (!member) throw new AppError('Member not found', 404)
  if (member.invitedById !== req.user!.userId) throw new AppError('Not your team member', 403)
  if (member.teamRole === 'OWNER') throw new AppError('Cannot remove owner', 400)

  await prisma.user.delete({ where: { id: userId as string } })

  res.json({ success: true })
})
