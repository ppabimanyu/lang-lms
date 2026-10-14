import { Router } from 'express'
import { eq, desc, sql, count } from 'drizzle-orm'
import { db } from '../db'
import { users, courses, studyStats, quizResults, courseReviews, questions } from '../db/schema'
import { requireAuth, requireAdmin } from '../middleware/auth'

const router = Router()

// Apply authentication & admin authorization to all admin endpoints
router.use(requireAuth)
router.use(requireAdmin)

// 1. GET /api/admin/stats - System-wide KPIs & Metrics
router.get('/stats', async (req, res) => {
  try {
    const [userStats] = await db
      .select({
        total: count(),
        active: sql<number>`count(*) filter (where ${users.status} = 'active')::int`,
        inactive: sql<number>`count(*) filter (where ${users.status} = 'inactive')::int`,
        students: sql<number>`count(*) filter (where ${users.role} = 'student')::int`,
        partners: sql<number>`count(*) filter (where ${users.role} = 'partner')::int`,
        curriculums: sql<number>`count(*) filter (where ${users.role} = 'curriculum')::int`,
        admins: sql<number>`count(*) filter (where ${users.role} = 'admin')::int`,
      })
      .from(users)

    const [courseStats] = await db
      .select({
        total: count(),
        published: sql<number>`count(*) filter (where ${courses.status} = 'published')::int`,
        takedown: sql<number>`count(*) filter (where ${courses.status} = 'takedown')::int`,
        publicCount: sql<number>`count(*) filter (where ${courses.visibility} = 'public')::int`,
        privateCount: sql<number>`count(*) filter (where ${courses.visibility} = 'private')::int`,
      })
      .from(courses)

    const [quizStats] = await db
      .select({
        totalSessions: count(),
        passedSessions: sql<number>`count(*) filter (where ${quizResults.accuracy} >= 80)::int`,
        totalXpAwarded: sql<number>`coalesce(sum(${quizResults.xpEarned}), 0)::int`,
      })
      .from(quizResults)

    const [reviewStats] = await db
      .select({
        totalReviews: count(),
        avgRating: sql<number>`round(coalesce(avg(${courseReviews.rating}), 5.0), 1)::float`,
      })
      .from(courseReviews)

    return res.json({
      users: userStats || { total: 0, active: 0, inactive: 0, students: 0, curriculums: 0, admins: 0 },
      courses: courseStats || { total: 0, published: 0, takedown: 0, publicCount: 0, privateCount: 0 },
      quizzes: quizStats || { totalSessions: 0, passedSessions: 0, totalXpAwarded: 0 },
      reviews: reviewStats || { totalReviews: 0, avgRating: 5.0 },
    })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return res.status(500).json({ error: 'Gagal memuat statistik admin.' })
  }
})

// 2. GET /api/admin/users - List all users with stats & created course count
router.get('/users', async (req, res) => {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        createdAt: users.createdAt,
        xp: studyStats.xp,
        streak: studyStats.streak,
        quizzesTaken: studyStats.quizzesTaken,
      })
      .from(users)
      .leftJoin(studyStats, eq(users.id, studyStats.userId))
      .orderBy(desc(users.createdAt))

    // Count courses created per user
    const courseCounts = await db
      .select({
        userId: courses.userId,
        count: count(),
      })
      .from(courses)
      .groupBy(courses.userId)

    const courseCountMap = new Map<string, number>()
    for (const c of courseCounts) {
      if (c.userId) courseCountMap.set(c.userId, c.count)
    }

    const result = allUsers.map(u => ({
      ...u,
      coursesCount: courseCountMap.get(u.id) || 0,
      xp: u.xp || 0,
      streak: u.streak || 1,
      quizzesTaken: u.quizzesTaken || 0,
    }))

    return res.json(result)
  } catch (error) {
    console.error('Error fetching admin users:', error)
    return res.status(500).json({ error: 'Gagal memuat daftar pengguna.' })
  }
})

// 3. PATCH /api/admin/users/:id/status - Toggle activate / inactivate user
router.patch('/users/:id/status', async (req, res) => {
  try {
    const targetUserId = req.params.id as string
    const { status } = req.body
    const currentAdminId = req.user!.userId

    if (status !== 'active' && status !== 'inactive') {
      return res.status(400).json({ error: 'Status harus bernilai "active" atau "inactive".' })
    }

    // Guard: Prevent admin from deactivating their own account
    if (targetUserId === currentAdminId && status === 'inactive') {
      return res.status(400).json({ error: 'Anda tidak dapat menonaktifkan akun admin Anda sendiri.' })
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(users.id, targetUserId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
      })

    if (!updatedUser) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' })
    }

    return res.json({
      message: `Status pengguna ${updatedUser.name} berhasil diubah menjadi ${status.toUpperCase()}.`,
      user: updatedUser,
    })
  } catch (error) {
    console.error('Error updating user status:', error)
    return res.status(500).json({ error: 'Gagal mengubah status pengguna.' })
  }
})

// 4. PATCH /api/admin/users/:id/role - Change user role
router.patch('/users/:id/role', async (req, res) => {
  try {
    const targetUserId = req.params.id as string
    const { role } = req.body
    const currentAdminId = req.user!.userId

    if (role !== 'student' && role !== 'partner' && role !== 'curriculum' && role !== 'admin') {
      return res.status(400).json({ error: 'Role tidak valid.' })
    }

    if (targetUserId === currentAdminId && role !== 'admin') {
      return res.status(400).json({ error: 'Anda tidak dapat mencabut role admin Anda sendiri.' })
    }

    const [updatedUser] = await db
      .update(users)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, targetUserId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
      })

    if (!updatedUser) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' })
    }

    return res.json({
      message: `Role pengguna ${updatedUser.name} berhasil diubah menjadi ${role.toUpperCase()}.`,
      user: updatedUser,
    })
  } catch (error) {
    console.error('Error updating user role:', error)
    return res.status(500).json({ error: 'Gagal mengubah role pengguna.' })
  }
})

// 5. GET /api/admin/courses - List all courses including takedown and private
router.get('/courses', async (req, res) => {
  try {
    const allCourses = await db
      .select({
        id: courses.id,
        title: courses.title,
        level: courses.level,
        category: courses.category,
        description: courses.description,
        targetLanguage: courses.targetLanguage,
        visibility: courses.visibility,
        status: courses.status,
        takedownReason: courses.takedownReason,
        createdAt: courses.createdAt,
        updatedAt: courses.updatedAt,
        userId: courses.userId,
        authorName: users.name,
        authorRole: users.role,
        authorEmail: users.email,
      })
      .from(courses)
      .leftJoin(users, eq(courses.userId, users.id))
      .orderBy(desc(courses.createdAt))

    // Count questions per course
    const qCounts = await db
      .select({
        courseId: questions.courseId,
        count: count(),
      })
      .from(questions)
      .groupBy(questions.courseId)

    const qCountMap = new Map<string, number>()
    for (const q of qCounts) {
      if (q.courseId) qCountMap.set(q.courseId, q.count)
    }

    // Reviews per course
    const revStats = await db
      .select({
        courseId: courseReviews.courseId,
        avgRating: sql<number>`round(coalesce(avg(${courseReviews.rating}), 5.0), 1)::float`,
        totalReviews: count(),
      })
      .from(courseReviews)
      .groupBy(courseReviews.courseId)

    const revMap = new Map<string, { avgRating: number; totalReviews: number }>()
    for (const r of revStats) {
      revMap.set(r.courseId, { avgRating: r.avgRating, totalReviews: r.totalReviews })
    }

    const results = allCourses.map(c => {
      const isOfficial = !c.userId || c.authorRole === 'curriculum' || c.authorRole === 'admin'
      const isPartner = c.authorRole === 'partner'
      return {
        ...c,
        author: {
          id: c.userId || 'official',
          name: c.userId ? (c.authorName || 'Pengguna Komunitas') : 'Tim Kurikulum Lingua',
          isOfficial,
          isPartner,
        },
        questionCount: qCountMap.get(c.id) || 0,
        avgRating: revMap.get(c.id)?.avgRating || 5.0,
        totalReviews: revMap.get(c.id)?.totalReviews || 0,
      }
    })

    return res.json(results)
  } catch (error) {
    console.error('Error fetching admin courses:', error)
    return res.status(500).json({ error: 'Gagal memuat daftar kursus admin.' })
  }
})

// 6. PATCH /api/admin/courses/:id/takedown - Takedown or restore a course
router.patch('/courses/:id/takedown', async (req, res) => {
  try {
    const courseId = req.params.id as string
    const { status, reason } = req.body

    if (status !== 'published' && status !== 'takedown') {
      return res.status(400).json({ error: 'Status harus bernilai "published" atau "takedown".' })
    }

    const course = await db.query.courses.findFirst({
      where: eq(courses.id, courseId),
    })

    if (!course) {
      return res.status(404).json({ error: 'Kursus tidak ditemukan.' })
    }

    const [updatedCourse] = await db
      .update(courses)
      .set({
        status,
        takedownReason: status === 'takedown' ? (reason || 'Pelanggaran pedoman komunitas atau konten tidak pantas.') : null,
        updatedAt: new Date(),
      })
      .where(eq(courses.id, courseId))
      .returning()

    const actionText = status === 'takedown' ? 'berhasil ditakedown' : 'berhasil diaktifkan kembali'
    return res.json({
      message: `Kursus "${course.title}" ${actionText}.`,
      course: updatedCourse,
    })
  } catch (error) {
    console.error('Error toggling course takedown:', error)
    return res.status(500).json({ error: 'Gagal mengubah status takedown kursus.' })
  }
})

// 7. DELETE /api/admin/courses/:id - Force delete a course
router.delete('/courses/:id', async (req, res) => {
  try {
    const courseId = req.params.id as string

    const course = await db.query.courses.findFirst({
      where: eq(courses.id, courseId),
    })

    if (!course) {
      return res.status(404).json({ error: 'Kursus tidak ditemukan.' })
    }

    await db.delete(courses).where(eq(courses.id, courseId))

    return res.json({
      message: `Kursus "${course.title}" berhasil dihapus secara permanen.`,
    })
  } catch (error) {
    console.error('Error force deleting course:', error)
    return res.status(500).json({ error: 'Gagal menghapus kursus.' })
  }
})

// 8. GET /api/admin/quiz-activity - Live monitor recent quiz sessions
router.get('/quiz-activity', async (req, res) => {
  try {
    const recentActivities = await db
      .select({
        id: quizResults.id,
        userId: quizResults.userId,
        userName: users.name,
        userEmail: users.email,
        courseId: quizResults.courseId,
        quizTitle: quizResults.quizTitle,
        accuracy: quizResults.accuracy,
        correctCount: quizResults.correctCount,
        totalQuestions: quizResults.totalQuestions,
        xpEarned: quizResults.xpEarned,
        timeSpentSeconds: quizResults.timeSpentSeconds,
        completedAt: quizResults.completedAt,
      })
      .from(quizResults)
      .leftJoin(users, eq(quizResults.userId, users.id))
      .orderBy(desc(quizResults.completedAt))
      .limit(25)

    return res.json(recentActivities)
  } catch (error) {
    console.error('Error fetching quiz activity:', error)
    return res.status(500).json({ error: 'Gagal memuat aktivitas kuis.' })
  }
})

export default router
