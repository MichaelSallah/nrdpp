import { Request, Response, NextFunction } from 'express'

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(err)

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
    })
  }

  // Prisma unique constraint
  if (err.message?.includes('Unique constraint')) {
    return res.status(409).json({ success: false, error: 'Record already exists' })
  }

  return res.status(500).json({ success: false, error: 'Internal server error' })
}
