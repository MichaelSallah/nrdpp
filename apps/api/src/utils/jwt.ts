import jwt from 'jsonwebtoken'
import { AuthPayload } from '../middleware/auth'

const getAccessSecret = () => process.env.JWT_SECRET || 'nrdpp_access_secret_key_minimum_32_chars'
const getRefreshSecret = () => process.env.JWT_REFRESH_SECRET || 'nrdpp_refresh_secret_key_minimum_32_chars'

export function signAccessToken(payload: AuthPayload) {
  return jwt.sign(payload, getAccessSecret(), { expiresIn: '15m' })
}

export function signRefreshToken(payload: AuthPayload) {
  return jwt.sign(payload, getRefreshSecret(), { expiresIn: '7d' })
}

export function verifyRefreshToken(token: string): AuthPayload {
  return jwt.verify(token, getRefreshSecret()) as AuthPayload
}
