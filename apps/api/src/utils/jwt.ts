import jwt from 'jsonwebtoken'
import { AuthPayload } from '../middleware/auth'

const getAccessSecret = () => {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET environment variable is required')
  return secret
}
const getRefreshSecret = () => {
  const secret = process.env.JWT_REFRESH_SECRET
  if (!secret) throw new Error('JWT_REFRESH_SECRET environment variable is required')
  return secret
}

export function signAccessToken(payload: AuthPayload) {
  return jwt.sign(payload, getAccessSecret(), { expiresIn: '15m' })
}

export function signRefreshToken(payload: AuthPayload) {
  return jwt.sign(payload, getRefreshSecret(), { expiresIn: '7d' })
}

export function verifyRefreshToken(token: string): AuthPayload {
  return jwt.verify(token, getRefreshSecret()) as AuthPayload
}
