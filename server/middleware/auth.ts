import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthenticatedUser {
  userId: string
  email: string
  role?: string
  status?: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'lang_lms_super_secret_jwt_key_2026_dev'

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token autentikasi tidak ditemukan. Harap login.' })
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser
    if (decoded.status === 'inactive') {
      return res.status(403).json({ error: 'Akun Anda telah dinonaktifkan oleh Administrator.' })
    }
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Token tidak valid atau telah kedaluwarsa.' })
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Akses ditolak. Khusus Administrator.' })
  }
  next()
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser
      if (decoded.status !== 'inactive') {
        req.user = decoded
      }
    } catch {
      // Ignored for optional auth
    }
  }
  next()
}
