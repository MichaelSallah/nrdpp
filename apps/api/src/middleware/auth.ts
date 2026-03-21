import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AppError } from './errorHandler'
import { Role, TeamRole } from '@prisma/client'

export interface AuthPayload {
  userId: string
  role: Role
  teamRole?: TeamRole
  entityId?: string | null
  supplierId?: string | null
  invitedById?: string | null
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) throw new AppError('Unauthorized', 401)

  const token = auth.split(' ')[1]
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload
    req.user = payload
    next()
  } catch {
    throw new AppError('Invalid or expired token', 401)
  }
}

export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new AppError('Unauthorized', 401)
    if (!roles.includes(req.user.role)) throw new AppError('Forbidden', 403)
    next()
  }
}

export function authorizeTeam(...teamRoles: TeamRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new AppError('Unauthorized', 401)
    if (!req.user.teamRole || !teamRoles.includes(req.user.teamRole)) {
      throw new AppError('You do not have permission for this action', 403)
    }
    next()
  }
}
