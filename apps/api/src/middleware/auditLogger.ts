import { Request } from 'express'
import { prisma } from '../utils/prisma'

export async function logAudit(params: {
  entityType: string
  entityId: string
  action: string
  actorId?: string
  rfqId?: string
  metadata?: Record<string, unknown>
  req?: Request
}) {
  await prisma.auditLog.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      actorId: params.actorId,
      rfqId: params.rfqId,
      metadata: (params.metadata ?? {}) as object,
      ipAddress: params.req?.ip,
    },
  })
}
