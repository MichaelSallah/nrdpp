import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../utils/prisma'
import { authenticate, authorize } from '../middleware/auth'
import { Role } from '@prisma/client'

export const categoryRoutes = Router()

categoryRoutes.get('/', async (_req, res) => {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    include: { children: { where: { isActive: true } } },
    orderBy: { name: 'asc' },
  })
  const roots = categories.filter((c) => !c.parentId)
  res.json({ success: true, categories: roots })
})

categoryRoutes.post('/', authenticate, authorize(Role.ADMIN), async (req, res) => {
  const data = z.object({
    name: z.string().min(2),
    code: z.string().min(2).toUpperCase(),
    description: z.string().optional(),
    parentId: z.string().optional(),
  }).parse(req.body)

  const category = await prisma.category.create({ data })
  res.status(201).json({ success: true, category })
})
