import { Router } from 'express'
import { eq, and, or, desc, sql } from 'drizzle-orm'
import { db } from '../db'
import { users, courses, studyStats, courseReviews, questions } from '../db/schema'
import { optionalAuth } from '../middleware/auth'

const router = Router()

// GET /api/users/:id/public-profile
router.get('/:id/public-profile', optionalAuth, async (req, res) => {
  try {
    const targetId = req.params.id as string
    const isOfficialAlias = targetId === 'official' || targetId === 'null'

    // Look up user: by role/email if official alias, or by targetId
    let user = null
    if (isOfficialAlias) {
      user = await db.query.users.findFirst({
        where: (u, { or, eq }) => or(eq(u.email, 'kurikulum@lingua.com'), eq(u.role, 'curriculum')),
      })
    } else {
      user = await db.query.users.findFirst({
        where: eq(users.id, targetId),
      })
    }

    if (!user && !isOfficialAlias) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' })
    }

    const isOfficial = isOfficialAlias || user?.role === 'curriculum' || user?.role === 'admin' || user?.email === 'kurikulum@lingua.com'
    const isPartner = !isOfficial && user?.role === 'partner'
    const userId = user?.id || null

    // Fetch user study stats
    let statsRecord = userId
      ? await db.query.studyStats.findFirst({
          where: eq(studyStats.userId, userId),
        })
      : null

    // Fetch public courses: for official user, fetch courses where userId matches OR userId IS NULL
    const publicCoursesList = await db.query.courses.findMany({
      where: isOfficial && userId
        ? and(
            or(eq(courses.userId, userId), sql`${courses.userId} IS NULL`),
            eq(courses.visibility, 'public')
          )
        : isOfficial && !userId
        ? and(sql`${courses.userId} IS NULL`, eq(courses.visibility, 'public'))
        : and(eq(courses.userId, userId!), eq(courses.visibility, 'public')),
      orderBy: (c, { desc }) => [desc(c.createdAt)],
    })

    // Fetch questions count per course
    const questionsCount = await db
      .select({
        courseId: questions.courseId,
        count: sql<number>`count(*)::int`,
      })
      .from(questions)
      .groupBy(questions.courseId)

    const qCountMap = new Map<string, number>()
    for (const q of questionsCount) {
      if (q.courseId) qCountMap.set(q.courseId, q.count)
    }

    // Fetch review averages per course
    const reviewStats = await db
      .select({
        courseId: courseReviews.courseId,
        avgRating: sql<number>`round(avg(${courseReviews.rating}), 1)::float`,
        totalReviews: sql<number>`count(*)::int`,
      })
      .from(courseReviews)
      .groupBy(courseReviews.courseId)

    const reviewMap = new Map<string, { avgRating: number; totalReviews: number }>()
    for (const r of reviewStats) {
      reviewMap.set(r.courseId, { avgRating: r.avgRating, totalReviews: r.totalReviews })
    }

    const userName = isOfficial ? (user?.name || 'Tim Kurikulum Lingua') : user!.name
    const authorId = user?.id || (isOfficial ? 'official' : targetId)

    const formattedCourses = publicCoursesList.map(c => ({
      id: c.id,
      userId: c.userId,
      title: c.title,
      level: c.level,
      category: c.category,
      description: c.description,
      targetLanguage: c.targetLanguage,
      visibility: c.visibility,
      quizDurationMinutes: c.quizDurationMinutes || 5,
      hasMarkdown: !!c.markdownContent,
      questionCount: qCountMap.get(c.id) || 0,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      avgRating: reviewMap.get(c.id)?.avgRating || 5.0,
      totalReviews: reviewMap.get(c.id)?.totalReviews || 0,
      author: {
        id: authorId,
        name: userName,
        isOfficial,
        isPartner,
        role: user?.role || (isOfficial ? 'curriculum' : 'student'),
      },
    }))

    return res.json({
      id: authorId,
      name: userName,
      isOfficial,
      isPartner,
      role: user?.role || (isOfficial ? 'curriculum' : 'student'),
      headline: isPartner
        ? 'Mitra Edukasi & Partner Terverifikasi Resmi Lingua LMS'
        : isOfficial
        ? 'Penyusun Resmi Kurikulum & Konten Pembelajaran Bahasa Lingua LMS'
        : undefined,
      createdAt: user?.createdAt || '2024-01-01T00:00:00.000Z',
      stats: {
        totalPublicCourses: formattedCourses.length,
        xp: statsRecord?.xp ?? (isOfficial ? 100000 : 0),
        streak: statsRecord?.streak ?? (isOfficial ? 365 : 1),
        quizzesTaken: statsRecord?.quizzesTaken ?? (isOfficial ? 5000 : 0),
        questionsAnswered: statsRecord?.questionsAnswered ?? (isOfficial ? 25000 : 0),
      },
      publicCourses: formattedCourses,
    })
  } catch (error) {
    console.error('Error fetching public user profile:', error)
    return res.status(500).json({ error: 'Gagal memuat profil publik pengguna.' })
  }
})

export default router
