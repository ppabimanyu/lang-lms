import { Router } from 'express'
import { eq, desc } from 'drizzle-orm'
import { db } from '../db'
import { studyStats, quizResults } from '../db/schema'
import { requireAuth, optionalAuth } from '../middleware/auth'

const router = Router()

// GET /api/stats - Get user study stats & recent results
router.get('/', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.userId

    if (!userId) {
      // Fallback guest stats
      return res.json({
        stats: {
          xp: 120,
          streak: 3,
          lastActiveDate: new Date().toISOString().slice(0, 10),
          quizzesTaken: 4,
          questionsAnswered: 24,
          correctAnswers: 21,
          recentResults: [],
        }
      })
    }

    let stats = await db.query.studyStats.findFirst({
      where: (s, { eq }) => eq(s.userId, userId),
    })

    if (!stats) {
      const [newStats] = await db.insert(studyStats).values({
        userId,
        xp: 0,
        streak: 1,
        lastActiveDate: new Date().toISOString().slice(0, 10),
        quizzesTaken: 0,
        questionsAnswered: 0,
        correctAnswers: 0,
      }).returning()
      stats = newStats
    }

    const recentResults = await db.query.quizResults.findMany({
      where: (r, { eq }) => eq(r.userId, userId),
      orderBy: (r, { desc }) => [desc(r.completedAt)],
      limit: 20,
    })

    return res.json({
      stats: {
        ...stats,
        recentResults,
      }
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return res.status(500).json({ error: 'Gagal memuat statistik belajar.' })
  }
})

// POST /api/stats/quiz-result - Record quiz completion
router.post('/quiz-result', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId
    const {
      quizId,
      quizTitle,
      totalQuestions,
      correctCount,
      accuracy,
      xpEarned,
      answers
    } = req.body

    // 1. Insert quiz result record
    const [savedResult] = await db.insert(quizResults).values({
      userId,
      quizId,
      quizTitle: quizTitle || 'Latihan Soal',
      totalQuestions: totalQuestions || 0,
      correctCount: correctCount || 0,
      accuracy: accuracy || 0,
      xpEarned: xpEarned || 0,
      answersSnapshot: answers || [],
    }).returning()

    // 2. Update user stats & streak
    let stats = await db.query.studyStats.findFirst({
      where: (s, { eq }) => eq(s.userId, userId),
    })

    const today = new Date().toISOString().slice(0, 10)
    let newStreak = stats?.streak || 1

    if (stats) {
      if (stats.lastActiveDate !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
        if (stats.lastActiveDate === yesterday) {
          newStreak += 1
        } else {
          newStreak = 1
        }
      }

      await db.update(studyStats)
        .set({
          xp: stats.xp + (xpEarned || 0),
          quizzesTaken: stats.quizzesTaken + 1,
          questionsAnswered: stats.questionsAnswered + (totalQuestions || 0),
          correctAnswers: stats.correctAnswers + (correctCount || 0),
          streak: newStreak,
          lastActiveDate: today,
          updatedAt: new Date(),
        })
        .where(eq(studyStats.userId, userId))
    }

    return res.status(201).json({
      message: 'Hasil kuis berhasil dicatat!',
      result: savedResult,
    })
  } catch (error) {
    console.error('Error saving quiz result:', error)
    return res.status(500).json({ error: 'Gagal menyimpan hasil kuis.' })
  }
})

// POST /api/stats/reset - Reset stats to initial
router.post('/reset', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId

    await db.delete(quizResults).where(eq(quizResults.userId, userId))

    await db.update(studyStats)
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

    return res.json({ message: 'Statistik belajar berhasil direset.' })
  } catch (error) {
    console.error('Error resetting stats:', error)
    return res.status(500).json({ error: 'Gagal mereset statistik.' })
  }
})

export default router
