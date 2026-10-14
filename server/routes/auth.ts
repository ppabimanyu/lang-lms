import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { users, studyStats } from '../db/schema'
import { requireAuth } from '../middleware/auth'
import { isFeatureEnabledServer } from './featureFlags'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'lang_lms_super_secret_jwt_key_2026_dev'

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const isRegistrationEnabled = await isFeatureEnabledServer('enable_registration')
    if (!isRegistrationEnabled) {
      return res.status(403).json({
        error: 'Pendaftaran akun baru sedang ditutup sementara oleh Administrator.'
      })
    }

    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nama, email, dan kata sandi wajib diisi.' })
    }

    const cleanEmail = email.toLowerCase().trim()

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, cleanEmail),
    })

    if (existingUser) {
      return res.status(409).json({ error: 'Email ini sudah terdaftar. Silakan login.' })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    // Insert user
    const [newUser] = await db.insert(users).values({
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
    }).returning()

    // Initialize study stats
    await db.insert(studyStats).values({
      userId: newUser.id,
      xp: 0,
      streak: 1,
      lastActiveDate: new Date().toISOString().slice(0, 10),
      quizzesTaken: 0,
      questionsAnswered: 0,
      correctAnswers: 0,
    })

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    )

    return res.status(201).json({
      message: 'Pendaftaran berhasil!',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    })
  } catch (error) {
    console.error('Error during register:', error)
    return res.status(500).json({ error: 'Terjadi kesalahan saat pendaftaran.' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' })
    }

    const cleanEmail = email.toLowerCase().trim()

    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, cleanEmail),
    })

    if (!user) {
      return res.status(401).json({ error: 'Email atau kata sandi tidak cocok.' })
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (!isMatch) {
      return res.status(401).json({ error: 'Email atau kata sandi tidak cocok.' })
    }

    if (user.status === 'inactive') {
      return res.status(403).json({
        error: 'Akun Anda telah dinonaktifkan oleh Administrator. Hubungi bantuan untuk informasi lebih lanjut.',
      })
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, status: user.status },
      JWT_SECRET,
      { expiresIn: '30d' }
    )

    return res.json({
      message: 'Login berhasil!',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    })
  } catch (error) {
    console.error('Error during login:', error)
    return res.status(500).json({ error: 'Terjadi kesalahan saat masuk akun.' })
  }
})

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, req.user!.userId),
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    })

    if (!user) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' })
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ error: 'Akun Anda telah dinonaktifkan.' })
    }

    const stats = await db.query.studyStats.findFirst({
      where: (s, { eq }) => eq(s.userId, user.id),
    })

    return res.json({
      user,
      stats: stats || {
        xp: 0,
        streak: 1,
        quizzesTaken: 0,
        questionsAnswered: 0,
        correctAnswers: 0,
      },
    })
  } catch (error) {
    console.error('Error in /me:', error)
    return res.status(500).json({ error: 'Gagal memuat profil pengguna.' })
  }
})

// PUT /api/auth/profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { name, email } = req.body
    const userId = req.user!.userId

    if (!name || !email) {
      return res.status(400).json({ error: 'Nama dan email wajib diisi.' })
    }

    const cleanEmail = email.toLowerCase().trim()

    // Check if another user uses this email
    const existing = await db.query.users.findFirst({
      where: (u, { eq, and, ne }) => and(eq(u.email, cleanEmail), ne(u.id, userId)),
    })

    if (existing) {
      return res.status(409).json({ error: 'Email ini telah digunakan oleh akun lain.' })
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        name: name.trim(),
        email: cleanEmail,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
      })

    return res.json({
      message: 'Profil berhasil diperbarui.',
      user: updatedUser,
    })
  } catch (error) {
    console.error('Error updating profile:', error)
    return res.status(500).json({ error: 'Gagal memperbarui profil pengguna.' })
  }
})

// PUT /api/auth/password
router.put('/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const userId = req.user!.userId

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Kata sandi saat ini dan kata sandi baru wajib diisi.' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Kata sandi baru minimal 6 karakter.' })
    }

    const user = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, userId),
    })

    if (!user) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' })
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isMatch) {
      return res.status(401).json({ error: 'Kata sandi saat ini salah.' })
    }

    const newHash = await bcrypt.hash(newPassword, 10)

    await db
      .update(users)
      .set({
        passwordHash: newHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))

    return res.json({ message: 'Kata sandi berhasil diperbarui.' })
  } catch (error) {
    console.error('Error changing password:', error)
    return res.status(500).json({ error: 'Gagal memperbarui kata sandi.' })
  }
})

// POST /api/auth/reset-progress
router.post('/reset-progress', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId

    await db
      .update(studyStats)
      .set({
        xp: 0,
        streak: 1,
        quizzesTaken: 0,
        questionsAnswered: 0,
        correctAnswers: 0,
        lastActiveDate: new Date().toISOString().slice(0, 10),
        updatedAt: new Date(),
      })
      .where(eq(studyStats.userId, userId))

    return res.json({ message: 'Progres belajar berhasil direset.' })
  } catch (error) {
    console.error('Error resetting progress:', error)
    return res.status(500).json({ error: 'Gagal mereset progres belajar.' })
  }
})

// DELETE /api/auth/account
router.delete('/account', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId

    await db.delete(users).where(eq(users.id, userId))

    return res.json({ message: 'Akun berhasil dihapus.' })
  } catch (error) {
    console.error('Error deleting account:', error)
    return res.status(500).json({ error: 'Gagal menghapus akun.' })
  }
})

export default router
