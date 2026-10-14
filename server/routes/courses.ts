import { Router } from 'express'
import { eq, or, and, inArray, sql, asc, desc } from 'drizzle-orm'
import { db } from '../db'
import {
  courses,
  courseChapters,
  questions,
  courseFlashcards,
  chapterProgress,
  courseProgress,
  quizResults,
  courseReviews,
  courseBookmarks,
  users,
  studyStats
} from '../db/schema'
import { optionalAuth, requireAuth } from '../middleware/auth'
import { isFeatureEnabledServer } from './featureFlags'

const router = Router()

/**
 * Helper terpadu: Sebuah bab dianggap selesai (completed) jika:
 * - Jika bab memiliki materi markdown DAN kuis: siswa WAJIB menyelesaikan membaca materi DAN kuis bab.
 * - Jika bab hanya memiliki materi markdown: siswa cukup selesai membaca materi.
 * - Jika bab hanya memiliki kuis: siswa cukup selesai mengerjakan kuis.
 */
function checkIsChapterCompleted(
  chapter: { markdownContent?: string | null },
  questionCount: number,
  progress?: { isRead?: number; quizCompleted?: number } | null
): boolean {
  const isRead = progress?.isRead === 1
  const isQuizDone = progress?.quizCompleted === 1
  const hasMarkdown = !!(chapter.markdownContent && chapter.markdownContent.trim())
  const hasQuestions = questionCount > 0

  if (hasMarkdown && hasQuestions) {
    return isRead && isQuizDone
  } else if (hasMarkdown) {
    return isRead
  } else if (hasQuestions) {
    return isQuizDone
  }
  return isRead || isQuizDone
}

// 1. GET /api/courses - List courses with search, filters, chapters count, and student progress
router.get('/', optionalAuth, async (req, res) => {
  try {
    const currentUserId = req.user?.userId
    const { search, language, level, tab, sort } = req.query as {
      search?: string
      language?: string
      level?: string
      tab?: 'all' | 'mine' | 'favorites' | 'history'
      sort?: 'latest' | 'popular' | 'level'
    }

    const isAdmin = req.user?.role === 'admin'

    const statusCondition = isAdmin
      ? sql`1=1`
      : eq(courses.status, 'published')

    const visibilityCondition = isAdmin
      ? sql`1=1`
      : currentUserId
      ? and(statusCondition, or(eq(courses.visibility, 'public'), eq(courses.userId, currentUserId)))
      : and(statusCondition, eq(courses.visibility, 'public'))

    const allCourses = await db.query.courses.findMany({
      where: visibilityCondition,
      orderBy: (c, { desc }) => [desc(c.createdAt)],
    })

    if (allCourses.length === 0) {
      return res.json([])
    }

    const courseIds = allCourses.map(c => c.id)

    // Count chapters per course
    const chaptersCount = await db
      .select({
        courseId: courseChapters.courseId,
        count: sql<number>`count(*)::int`,
      })
      .from(courseChapters)
      .where(inArray(courseChapters.courseId, courseIds))
      .groupBy(courseChapters.courseId)

    const chapCountMap = new Map<string, number>()
    chaptersCount.forEach(c => chapCountMap.set(c.courseId, c.count))

    // Count exam questions per course
    const examQCount = await db
      .select({
        courseId: questions.courseId,
        count: sql<number>`count(*)::int`,
      })
      .from(questions)
      .where(and(inArray(questions.courseId, courseIds), eq(questions.isExam, 1)))
      .groupBy(questions.courseId)

    const examQMap = new Map<string, number>()
    examQCount.forEach(q => examQMap.set(q.courseId, q.count))

    // Review statistics
    const reviewStats = await db
      .select({
        courseId: courseReviews.courseId,
        avgRating: sql<number>`round(avg(${courseReviews.rating}), 1)::float`,
        totalReviews: sql<number>`count(*)::int`,
      })
      .from(courseReviews)
      .where(inArray(courseReviews.courseId, courseIds))
      .groupBy(courseReviews.courseId)

    const reviewMap = new Map<string, { avgRating: number; totalReviews: number }>()
    reviewStats.forEach(r => reviewMap.set(r.courseId, { avgRating: r.avgRating, totalReviews: r.totalReviews }))

    // Bookmarks for current user
    const userBookmarks = new Set<string>()
    if (currentUserId) {
      const bMarks = await db.query.courseBookmarks.findMany({
        where: eq(courseBookmarks.userId, currentUserId),
      })
      bMarks.forEach(b => userBookmarks.add(b.courseId))
    }

    // Course progress & dynamic chapter completion for current user
    const userProgressMap = new Map<string, any>()
    const dynamicCompletedChaptersMap = new Map<string, number>()

    if (currentUserId && courseIds.length > 0) {
      const [progressList, allCourseChapters, allUserProgress] = await Promise.all([
        db.query.courseProgress.findMany({
          where: eq(courseProgress.userId, currentUserId),
        }),
        db.query.courseChapters.findMany({
          where: inArray(courseChapters.courseId, courseIds),
        }),
        db.query.chapterProgress.findMany({
          where: and(
            eq(chapterProgress.userId, currentUserId),
            inArray(chapterProgress.courseId, courseIds)
          ),
        }),
      ])

      progressList.forEach(p => userProgressMap.set(p.courseId, p))

      const chapterIds = allCourseChapters.map(ch => ch.id)
      const qCountMap = new Map<string, number>()
      if (chapterIds.length > 0) {
        const qCounts = await db
          .select({
            chapterId: questions.chapterId,
            count: sql<number>`count(*)::int`,
          })
          .from(questions)
          .where(inArray(questions.chapterId, chapterIds))
          .groupBy(questions.chapterId)
        qCounts.forEach(q => { if (q.chapterId) qCountMap.set(q.chapterId, q.count) })
      }

      const chapProgressMap = new Map<string, any>()
      allUserProgress.forEach(p => chapProgressMap.set(p.chapterId, p))

      for (const ch of allCourseChapters) {
        const qCount = qCountMap.get(ch.id) || 0
        const prog = chapProgressMap.get(ch.id)
        if (checkIsChapterCompleted(ch, qCount, prog)) {
          const cur = dynamicCompletedChaptersMap.get(ch.courseId) || 0
          dynamicCompletedChaptersMap.set(ch.courseId, cur + 1)
        }
      }
    }

    // Authors info
    const authorUserIds = Array.from(new Set(allCourses.map(c => c.userId).filter(Boolean))) as string[]
    const authorsList = authorUserIds.length > 0
      ? await db.query.users.findMany({
          where: inArray(users.id, authorUserIds),
          columns: { id: true, name: true, role: true, email: true },
        })
      : []

    const authorMap = new Map<string, any>()
    authorsList.forEach(a => authorMap.set(a.id, {
      id: a.id,
      name: a.name,
      isOfficial: a.role === 'curriculum' || a.role === 'admin' || a.email.endsWith('@lingua.com'),
      isPartner: a.role === 'partner',
      role: a.role,
    }))

    // Build response items
    let results = allCourses.map(c => {
      const totalChapters = chapCountMap.get(c.id) || 0
      const examQuestions = examQMap.get(c.id) || 0
      const rev = reviewMap.get(c.id) || { avgRating: 5.0, totalReviews: 0 }
      const prog = userProgressMap.get(c.id) || null
      const isBookmarked = userBookmarks.has(c.id)
      const isOwner = currentUserId ? c.userId === currentUserId : false
      const authorInfo = c.userId ? authorMap.get(c.userId) : null
      const author = authorInfo || {
        id: 'official',
        name: 'Tim Kurikulum Lingua',
        isOfficial: true,
        isPartner: false,
        role: 'curriculum',
      }

      // Calculate aggregated progress percentage dynamically from chapters
      const completedChapters = dynamicCompletedChaptersMap.get(c.id) ?? (prog?.completedChaptersCount || 0)
      const isExamPassed = prog?.isExamPassed === 1
      const totalUnits = totalChapters + 1 // chapters + exam
      const completedUnits = completedChapters + (isExamPassed ? 1 : 0)
      const progressPercent = isExamPassed
        ? 100
        : (totalUnits > 0 ? Math.min(100, Math.round((completedUnits / totalUnits) * 100)) : 0)

      // Sync course_progress table in the background if it's outdated or missing
      if (currentUserId && (!prog || prog.completedChaptersCount !== completedChapters)) {
        db.insert(courseProgress)
          .values({
            userId: currentUserId,
            courseId: c.id,
            completedChaptersCount: completedChapters,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [courseProgress.userId, courseProgress.courseId],
            set: {
              completedChaptersCount: completedChapters,
              updatedAt: new Date(),
            },
          })
          .catch(() => {})
      }

      return {
        id: c.id,
        userId: c.userId,
        title: c.title,
        level: c.level,
        category: c.category,
        description: c.description,
        targetLanguage: c.targetLanguage,
        visibility: c.visibility,
        status: c.status,
        takedownReason: c.takedownReason,
        examDurationMinutes: c.examDurationMinutes,
        examPassingScore: c.examPassingScore,
        totalChapters,
        examQuestionsCount: examQuestions,
        completedChaptersCount: completedChapters,
        isExamPassed,
        bestExamScore: prog?.bestExamScore || 0,
        certificateId: prog?.certificateId || null,
        progressPercent,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        isOwner,
        isBookmarked,
        avgRating: rev.avgRating,
        totalReviews: rev.totalReviews,
        author,
      }
    })

    // Filter by tab
    if (tab === 'mine' && currentUserId) {
      results = results.filter(c => c.isOwner)
    } else if (tab === 'favorites' && currentUserId) {
      results = results.filter(c => c.isBookmarked)
    } else if (tab === 'history' && currentUserId) {
      results = results.filter(c => c.progressPercent > 0)
    }

    // Filter by language
    if (language && language !== 'all') {
      results = results.filter(c => c.targetLanguage.toLowerCase() === language.toLowerCase())
    }

    // Filter by level
    if (level && level !== 'all') {
      results = results.filter(c => c.level.toLowerCase() === level.toLowerCase())
    }

    // Filter by search
    if (search && search.trim()) {
      const q = search.trim().toLowerCase()
      results = results.filter(
        c =>
          c.title.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q))
      )
    }

    // Sort
    if (sort === 'popular') {
      results.sort((a, b) => b.totalReviews - a.totalReviews)
    } else if (sort === 'level') {
      results.sort((a, b) => a.level.localeCompare(b.level))
    } else {
      results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }

    return res.json(results)
  } catch (error) {
    console.error('Error fetching courses:', error)
    return res.status(500).json({ error: 'Gagal memuat daftar kursus.' })
  }
})

// 2. GET /api/courses/:id - Course Overview & Syllabus Roadmap with Chapters & Exam Status
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const courseId = req.params.id as string
    const currentUserId = req.user?.userId
    const isAdmin = req.user?.role === 'admin'

    const course = await db.query.courses.findFirst({
      where: eq(courses.id, courseId),
    })

    if (!course) {
      return res.status(404).json({ error: 'Kursus tidak ditemukan.' })
    }

    if (!isAdmin && course.visibility === 'private' && course.userId !== currentUserId) {
      return res.status(403).json({ error: 'Kursus ini bersifat privat dan hanya dapat diakses oleh pemiliknya.' })
    }

    if (!isAdmin && course.status === 'takedown') {
      return res.status(403).json({
        error: `Kursus dinonaktifkan: ${course.takedownReason || 'Pelanggaran kebijakan konten.'}`
      })
    }

    // Fetch chapters ordered by orderIndex
    const chaptersList = await db.query.courseChapters.findMany({
      where: eq(courseChapters.courseId, courseId),
      orderBy: [asc(courseChapters.orderIndex), asc(courseChapters.createdAt)],
    })

    const chapterIds = chaptersList.map(ch => ch.id)

    // Count questions per chapter
    const qCountMap = new Map<string, number>()
    if (chapterIds.length > 0) {
      const qCounts = await db
        .select({
          chapterId: questions.chapterId,
          count: sql<number>`count(*)::int`,
        })
        .from(questions)
        .where(inArray(questions.chapterId, chapterIds))
        .groupBy(questions.chapterId)
      qCounts.forEach(q => { if (q.chapterId) qCountMap.set(q.chapterId, q.count) })
    }

    // Count flashcards per chapter
    const fcCountMap = new Map<string, number>()
    if (chapterIds.length > 0) {
      const fcCounts = await db
        .select({
          chapterId: courseFlashcards.chapterId,
          count: sql<number>`count(*)::int`,
        })
        .from(courseFlashcards)
        .where(inArray(courseFlashcards.chapterId, chapterIds))
        .groupBy(courseFlashcards.chapterId)
      fcCounts.forEach(fc => { if (fc.chapterId) fcCountMap.set(fc.chapterId, fc.count) })
    }

    // Fetch chapter progress for current user
    const chapProgressMap = new Map<string, any>()
    if (currentUserId && chapterIds.length > 0) {
      const progressRecords = await db.query.chapterProgress.findMany({
        where: and(
          eq(chapterProgress.userId, currentUserId),
          inArray(chapterProgress.chapterId, chapterIds)
        ),
      })
      progressRecords.forEach(p => chapProgressMap.set(p.chapterId, p))
    }

    // Count exam questions
    const [examCountResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(questions)
      .where(and(eq(questions.courseId, courseId), eq(questions.isExam, 1)))

    const examQuestionsTotal = examCountResult?.count || 0

    // Fetch user course progress (Exam and completion status)
    let userCourseProg: any = null
    if (currentUserId) {
      userCourseProg = await db.query.courseProgress.findFirst({
        where: and(eq(courseProgress.userId, currentUserId), eq(courseProgress.courseId, courseId)),
      })
    }

    // Check bookmarks
    let isBookmarked = false
    if (currentUserId) {
      const bm = await db.query.courseBookmarks.findFirst({
        where: and(eq(courseBookmarks.userId, currentUserId), eq(courseBookmarks.courseId, courseId)),
      })
      isBookmarked = !!bm
    }

    // Enrich chapters
    let completedChaptersCount = 0
    const enrichedChapters = chaptersList.map(ch => {
      const prog = chapProgressMap.get(ch.id)
      const qCount = qCountMap.get(ch.id) || 0
      const isCompleted = checkIsChapterCompleted(ch, qCount, prog)

      if (isCompleted) {
        completedChaptersCount++
      }

      return {
        id: ch.id,
        courseId: ch.courseId,
        orderIndex: ch.orderIndex,
        title: ch.title,
        description: ch.description,
        hasMarkdown: !!(ch.markdownContent && ch.markdownContent.trim()),
        quizDurationMinutes: ch.quizDurationMinutes,
        questionCount: qCount,
        flashcardCount: fcCountMap.get(ch.id) || 0,
        userProgress: prog ? {
          isRead: prog.isRead,
          flashcardMastered: prog.flashcardMastered,
          quizCompleted: prog.quizCompleted,
          bestQuizScore: prog.bestQuizScore,
          bestQuizAccuracy: prog.bestQuizAccuracy,
          lastStudiedAt: prog.lastStudiedAt,
        } : null,
        isCompleted,
      }
    })

    // Exam prerequisite rule: all prior chapters must be read/completed
    const isExamLocked = enrichedChapters.length > 0 && completedChaptersCount < enrichedChapters.length
    const isExamPassed = userCourseProg?.isExamPassed === 1

    const totalUnits = enrichedChapters.length + 1
    const completedUnits = completedChaptersCount + (isExamPassed ? 1 : 0)
    const progressPercent = isExamPassed
      ? 100
      : (totalUnits > 0 ? Math.min(100, Math.round((completedUnits / totalUnits) * 100)) : 0)

    // Author info
    let author: any = {
      id: 'official',
      name: 'Tim Kurikulum Lingua',
      isOfficial: true,
      isPartner: false,
      role: 'curriculum',
    }
    if (course.userId) {
      const authorUser = await db.query.users.findFirst({
        where: eq(users.id, course.userId),
        columns: { id: true, name: true, role: true, email: true },
      })
      if (authorUser) {
        author = {
          id: authorUser.id,
          name: authorUser.name,
          isOfficial: authorUser.role === 'curriculum' || authorUser.role === 'admin' || authorUser.email.endsWith('@lingua.com'),
          isPartner: authorUser.role === 'partner',
          role: authorUser.role,
        }
      }
    }

    return res.json({
      id: course.id,
      userId: course.userId,
      title: course.title,
      level: course.level,
      category: course.category,
      description: course.description,
      targetLanguage: course.targetLanguage,
      visibility: course.visibility,
      status: course.status,
      takedownReason: course.takedownReason,
      examDurationMinutes: course.examDurationMinutes,
      examPassingScore: course.examPassingScore,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
      isOwner: currentUserId ? course.userId === currentUserId : false,
      isBookmarked,
      author,
      isExamPassed,
      progressPercent,
      completedChaptersCount,
      totalChapters: enrichedChapters.length,
      certificateId: userCourseProg?.certificateId || null,
      bestExamScore: userCourseProg?.bestExamScore || 0,
      bestExamAccuracy: userCourseProg?.bestExamAccuracy || 0,
      chapters: enrichedChapters,
      exam: {
        totalQuestions: examQuestionsTotal,
        durationMinutes: course.examDurationMinutes,
        passingScore: course.examPassingScore,
        isLocked: isExamLocked,
        isPassed: isExamPassed,
        bestExamScore: userCourseProg?.bestExamScore || 0,
        bestExamAccuracy: userCourseProg?.bestExamAccuracy || 0,
        certificateId: userCourseProg?.certificateId || null,
        examAttemptCount: userCourseProg?.examAttemptCount || 0,
        lastExamAt: userCourseProg?.lastExamAt || null,
      },
      userProgress: {
        completedChaptersCount,
        totalChapters: enrichedChapters.length,
        progressPercent,
        isExamPassed,
        certificateId: userCourseProg?.certificateId || null,
      },
    })
  } catch (error) {
    console.error('Error fetching course detail:', error)
    return res.status(500).json({ error: 'Gagal memuat silabus kursus.' })
  }
})

// 3. GET /api/courses/:id/chapters/:chapterId - Get single chapter content (Markdown, Quiz, Flashcards)
router.get('/:id/chapters/:chapterId', optionalAuth, async (req, res) => {
  try {
    const { id: courseId, chapterId } = req.params as { id: string; chapterId: string }
    const currentUserId = req.user?.userId

    const chapter = await db.query.courseChapters.findFirst({
      where: and(eq(courseChapters.id, chapterId), eq(courseChapters.courseId, courseId)),
    })

    if (!chapter) {
      return res.status(404).json({ error: 'Bab materi tidak ditemukan.' })
    }

    // Fetch questions for this chapter
    const chapterQuestions = await db.query.questions.findMany({
      where: and(eq(questions.chapterId, chapterId), eq(questions.isExam, 0)),
      orderBy: [asc(questions.orderIndex)],
    })

    // Fetch flashcards for this chapter
    const chapterFlashcards = await db.query.courseFlashcards.findMany({
      where: eq(courseFlashcards.chapterId, chapterId),
      orderBy: [asc(courseFlashcards.orderIndex)],
    })

    // Fetch adjacent chapters for seamless next/prev navigation
    const allChapters = await db.query.courseChapters.findMany({
      where: eq(courseChapters.courseId, courseId),
      columns: { id: true, orderIndex: true, title: true },
      orderBy: [asc(courseChapters.orderIndex), asc(courseChapters.createdAt)],
    })

    const currentIndex = allChapters.findIndex(ch => ch.id === chapterId)
    const prevChapter = currentIndex > 0 ? allChapters[currentIndex - 1] : null
    const nextChapter = currentIndex >= 0 && currentIndex < allChapters.length - 1 ? allChapters[currentIndex + 1] : null
    const isLastChapter = currentIndex === allChapters.length - 1

    // Fetch student progress for this chapter
    let prog: any = null
    if (currentUserId) {
      prog = await db.query.chapterProgress.findFirst({
        where: and(eq(chapterProgress.userId, currentUserId), eq(chapterProgress.chapterId, chapterId)),
      })
    }

    return res.json({
      id: chapter.id,
      courseId: chapter.courseId,
      orderIndex: chapter.orderIndex,
      title: chapter.title,
      description: chapter.description,
      markdownContent: chapter.markdownContent,
      quizDurationMinutes: chapter.quizDurationMinutes,
      questions: chapterQuestions.map(q => ({
        ...q,
        options: q.options ? q.options.split('|') : undefined,
      })),
      flashcards: chapterFlashcards,
      prevChapter,
      nextChapter,
      isLastChapter,
      userProgress: prog ? {
        isRead: prog.isRead,
        flashcardMastered: prog.flashcardMastered,
        quizCompleted: prog.quizCompleted,
        bestQuizScore: prog.bestQuizScore,
        bestQuizAccuracy: prog.bestQuizAccuracy,
      } : null,
    })
  } catch (error) {
    console.error('Error fetching chapter content:', error)
    return res.status(500).json({ error: 'Gagal memuat materi bab.' })
  }
})

// 4. POST /api/courses/:id/chapters/:chapterId/progress - Record chapter study progress & quiz results
router.post('/:id/chapters/:chapterId/progress', requireAuth, async (req, res) => {
  try {
    const { id: courseId, chapterId } = req.params as { id: string; chapterId: string }
    const currentUserId = req.user!.userId
    const { isRead, flashcardMastered, quizResult } = req.body

    // Ensure chapter exists
    const chapter = await db.query.courseChapters.findFirst({
      where: and(eq(courseChapters.id, chapterId), eq(courseChapters.courseId, courseId)),
    })
    if (!chapter) {
      return res.status(404).json({ error: 'Bab materi tidak ditemukan.' })
    }

    // Upsert chapter progress
    const existingProg = await db.query.chapterProgress.findFirst({
      where: and(eq(chapterProgress.userId, currentUserId), eq(chapterProgress.chapterId, chapterId)),
    })

    const updateFields: any = {
      lastStudiedAt: new Date(),
    }
    if (isRead !== undefined) updateFields.isRead = isRead ? 1 : 0
    if (flashcardMastered !== undefined) updateFields.flashcardMastered = flashcardMastered ? 1 : 0

    if (quizResult) {
      updateFields.quizCompleted = 1
      const newScore = Number(quizResult.correctCount) || 0
      const newAccuracy = Number(quizResult.accuracy) || 0
      updateFields.bestQuizScore = Math.max(existingProg?.bestQuizScore || 0, newScore)
      updateFields.bestQuizAccuracy = Math.max(existingProg?.bestQuizAccuracy || 0, newAccuracy)

      // Award XP to user study stats
      const xpEarned = Number(quizResult.xpEarned) || 0
      if (xpEarned > 0) {
        await db
          .update(studyStats)
          .set({
            xp: sql`${studyStats.xp} + ${xpEarned}`,
            quizzesTaken: sql`${studyStats.quizzesTaken} + 1`,
            questionsAnswered: sql`${studyStats.questionsAnswered} + ${Number(quizResult.totalQuestions) || 0}`,
            correctAnswers: sql`${studyStats.correctAnswers} + ${newScore}`,
            updatedAt: new Date(),
          })
          .where(eq(studyStats.userId, currentUserId))

        // Record quiz result entry
        await db.insert(quizResults).values({
          userId: currentUserId,
          courseId,
          chapterId,
          isExam: 0,
          quizTitle: `${chapter.title} - Latihan Kuis`,
          totalQuestions: Number(quizResult.totalQuestions) || 0,
          correctCount: newScore,
          accuracy: newAccuracy,
          xpEarned,
          timeSpentSeconds: Number(quizResult.timeSpentSeconds) || 0,
          answersSnapshot: quizResult.answersSnapshot || null,
        })
      }
    }

    if (existingProg) {
      await db
        .update(chapterProgress)
        .set(updateFields)
        .where(eq(chapterProgress.id, existingProg.id))
    } else {
      await db.insert(chapterProgress).values({
        userId: currentUserId,
        courseId,
        chapterId,
        isRead: updateFields.isRead || 0,
        flashcardMastered: updateFields.flashcardMastered || 0,
        quizCompleted: updateFields.quizCompleted || 0,
        bestQuizScore: updateFields.bestQuizScore || 0,
        bestQuizAccuracy: updateFields.bestQuizAccuracy || 0,
        lastStudiedAt: new Date(),
      })
    }

    // Recalculate completed chapters count for course progress
    const allChapters = await db.query.courseChapters.findMany({
      where: eq(courseChapters.courseId, courseId),
    })
    const chIds = allChapters.map(c => c.id)

    const qCounts = chIds.length > 0 ? await db
      .select({
        chapterId: questions.chapterId,
        count: sql<number>`count(*)::int`,
      })
      .from(questions)
      .where(inArray(questions.chapterId, chIds))
      .groupBy(questions.chapterId) : []
    const qMap = new Map<string, number>()
    qCounts.forEach(q => { if (q.chapterId) qMap.set(q.chapterId, q.count) })

    const progs = chIds.length > 0 ? await db.query.chapterProgress.findMany({
      where: and(
        eq(chapterProgress.userId, currentUserId),
        eq(chapterProgress.courseId, courseId),
      ),
    }) : []
    const progMap = new Map<string, any>()
    progs.forEach(p => progMap.set(p.chapterId, p))

    let completedCount = 0
    for (const ch of allChapters) {
      if (checkIsChapterCompleted(ch, qMap.get(ch.id) || 0, progMap.get(ch.id))) {
        completedCount++
      }
    }

    // Upsert course progress
    await db
      .insert(courseProgress)
      .values({
        userId: currentUserId,
        courseId,
        completedChaptersCount: completedCount,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [courseProgress.userId, courseProgress.courseId],
        set: {
          completedChaptersCount: completedCount,
          updatedAt: new Date(),
        },
      })

    return res.json({ success: true, completedChaptersCount: completedCount })
  } catch (error) {
    console.error('Error saving chapter progress:', error)
    return res.status(500).json({ error: 'Gagal mencatat progres belajar bab.' })
  }
})

// 5. GET /api/courses/:id/exam - Load Course Final Exam (Protected by prerequisite lock)
router.get('/:id/exam', requireAuth, async (req, res) => {
  try {
    const courseId = req.params.id as string
    const currentUserId = req.user!.userId

    const course = await db.query.courses.findFirst({
      where: eq(courses.id, courseId),
    })
    if (!course) {
      return res.status(404).json({ error: 'Kursus tidak ditemukan.' })
    }

    // Check prerequisite: all chapters must be completed
    const chaptersList = await db.query.courseChapters.findMany({
      where: eq(courseChapters.courseId, courseId),
    })

    if (chaptersList.length > 0) {
      const chapterIds = chaptersList.map(ch => ch.id)
      const qCounts = await db
        .select({
          chapterId: questions.chapterId,
          count: sql<number>`count(*)::int`,
        })
        .from(questions)
        .where(inArray(questions.chapterId, chapterIds))
        .groupBy(questions.chapterId)
      const qMap = new Map<string, number>()
      qCounts.forEach(q => { if (q.chapterId) qMap.set(q.chapterId, q.count) })

      const chapterProgs = await db.query.chapterProgress.findMany({
        where: and(
          eq(chapterProgress.userId, currentUserId),
          inArray(chapterProgress.chapterId, chapterIds)
        ),
      })
      const progMap = new Map<string, any>()
      chapterProgs.forEach(p => progMap.set(p.chapterId, p))

      let completedCount = 0
      for (const ch of chaptersList) {
        if (checkIsChapterCompleted(ch, qMap.get(ch.id) || 0, progMap.get(ch.id))) {
          completedCount++
        }
      }

      if (completedCount < chaptersList.length) {
        return res.status(403).json({
          error: 'Ujian Akhir masih terkunci. Anda harus menyelesaikan seluruh bab materi dan kuis latihan pada setiap bab sebelum dapat mengikuti ujian kelulusan.',
          isLocked: true,
          completedCount,
          totalCount: chaptersList.length,
        })
      }
    }

    // Fetch exam questions
    const examQuestions = await db.query.questions.findMany({
      where: and(eq(questions.courseId, courseId), eq(questions.isExam, 1)),
      orderBy: [asc(questions.orderIndex)],
    })

    if (examQuestions.length === 0) {
      return res.status(400).json({ error: 'Belum ada bank soal ujian akhir yang disiapkan untuk kursus ini.' })
    }

    // Fetch existing exam attempt
    const courseProg = await db.query.courseProgress.findFirst({
      where: and(eq(courseProgress.userId, currentUserId), eq(courseProgress.courseId, courseId)),
    })

    return res.json({
      courseId: course.id,
      courseTitle: course.title,
      durationMinutes: course.examDurationMinutes,
      passingScore: course.examPassingScore,
      questions: examQuestions.map(q => ({
        id: q.id,
        type: q.type,
        question: q.question,
        options: q.options ? q.options.split('|') : undefined,
        translation: q.translation,
        explanation: q.explanation,
      })),
      isPassed: courseProg?.isExamPassed === 1,
      certificateId: courseProg?.certificateId || null,
      bestScore: courseProg?.bestExamScore || 0,
      bestAccuracy: courseProg?.bestExamAccuracy || 0,
    })
  } catch (error) {
    console.error('Error loading exam:', error)
    return res.status(500).json({ error: 'Gagal memuat ujian akhir.' })
  }
})

// 6. POST /api/courses/:id/exam/submit - Submit Final Exam and issue certificate if passed
router.post('/:id/exam/submit', requireAuth, async (req, res) => {
  try {
    const courseId = req.params.id as string
    const currentUserId = req.user!.userId
    const { answers, timeSpentSeconds } = req.body as {
      answers: Array<{ questionId: string; selectedAnswer: string }>
      timeSpentSeconds?: number
    }

    const course = await db.query.courses.findFirst({
      where: eq(courses.id, courseId),
    })
    if (!course) {
      return res.status(404).json({ error: 'Kursus tidak ditemukan.' })
    }

    const examQuestions = await db.query.questions.findMany({
      where: and(eq(questions.courseId, courseId), eq(questions.isExam, 1)),
      orderBy: [asc(questions.orderIndex)],
    })

    if (examQuestions.length === 0) {
      return res.status(400).json({ error: 'Soal ujian tidak tersedia.' })
    }

    const answersMap = new Map<string, string>()
    if (Array.isArray(answers)) {
      answers.forEach(a => answersMap.set(a.questionId, (a.selectedAnswer || '').trim().toLowerCase()))
    }

    let correctCount = 0
    const detailedResults = examQuestions.map(q => {
      const userAnswer = answersMap.get(q.id) || ''
      const isCorrect = userAnswer === q.answer.trim().toLowerCase()
      if (isCorrect) correctCount++
      return {
        questionId: q.id,
        userAnswer,
        correctAnswer: q.answer,
        isCorrect,
      }
    })

    const totalQuestions = examQuestions.length
    const accuracy = Math.round((correctCount / totalQuestions) * 100)
    const isPassed = accuracy >= course.examPassingScore

    const existingCourseProg = await db.query.courseProgress.findFirst({
      where: and(eq(courseProgress.userId, currentUserId), eq(courseProgress.courseId, courseId)),
    })

    let certificateId = existingCourseProg?.certificateId || null
    if (isPassed && !certificateId) {
      certificateId = `CERT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
    }

    const xpEarned = isPassed ? (correctCount * 15 + 100) : (correctCount * 10)

    // Update study stats
    await db
      .update(studyStats)
      .set({
        xp: sql`${studyStats.xp} + ${xpEarned}`,
        quizzesTaken: sql`${studyStats.quizzesTaken} + 1`,
        questionsAnswered: sql`${studyStats.questionsAnswered} + ${totalQuestions}`,
        correctAnswers: sql`${studyStats.correctAnswers} + ${correctCount}`,
        updatedAt: new Date(),
      })
      .where(eq(studyStats.userId, currentUserId))

    // Record exam result
    await db.insert(quizResults).values({
      userId: currentUserId,
      courseId,
      chapterId: null,
      isExam: 1,
      quizTitle: `${course.title} - Ujian Akhir Kelulusan`,
      totalQuestions,
      correctCount,
      accuracy,
      xpEarned,
      timeSpentSeconds: Number(timeSpentSeconds) || 0,
      answersSnapshot: detailedResults,
    })

    // Upsert course progress
    await db
      .insert(courseProgress)
      .values({
        userId: currentUserId,
        courseId,
        isExamPassed: isPassed ? 1 : 0,
        bestExamScore: correctCount,
        bestExamAccuracy: accuracy,
        certificateId,
        examAttemptCount: 1,
        lastExamAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [courseProgress.userId, courseProgress.courseId],
        set: {
          isExamPassed: isPassed ? 1 : (existingCourseProg?.isExamPassed || 0),
          bestExamScore: Math.max(existingCourseProg?.bestExamScore || 0, correctCount),
          bestExamAccuracy: Math.max(existingCourseProg?.bestExamAccuracy || 0, accuracy),
          certificateId,
          examAttemptCount: sql`${courseProgress.examAttemptCount} + 1`,
          lastExamAt: new Date(),
          updatedAt: new Date(),
        },
      })

    return res.json({
      isPassed,
      accuracy,
      correctCount,
      totalQuestions,
      passingScore: course.examPassingScore,
      xpEarned,
      certificateId,
      detailedResults,
    })
  } catch (error) {
    console.error('Error submitting exam:', error)
    return res.status(500).json({ error: 'Gagal memproses hasil ujian akhir.' })
  }
})

// 7. POST /api/courses - Create Multi-Chapter Course with Final Exam
router.post('/', optionalAuth, async (req, res) => {
  try {
    const isCreationEnabled = await isFeatureEnabledServer('enable_course_creation')
    if (!isCreationEnabled && req.user?.role !== 'admin') {
      return res.status(403).json({
        error: 'Fitur pembuatan kursus sedang dinonaktifkan sementara oleh Administrator.'
      })
    }

    const {
      id,
      title,
      level,
      category,
      description,
      targetLanguage,
      visibility,
      examDurationMinutes,
      examPassingScore,
      chapters: rawChapters,
      examQuestions: rawExamQuestions,
    } = req.body

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Judul kursus wajib diisi.' })
    }

    const courseId = id || `course-${Date.now().toString(36)}`
    const userId = req.user?.userId || null

    const [savedCourse] = await db
      .insert(courses)
      .values({
        id: courseId,
        userId,
        title: title.trim(),
        level: level || 'A1',
        category: category || 'Umum',
        description: description ? description.trim() : '',
        targetLanguage: targetLanguage || 'de-DE',
        visibility: visibility === 'private' ? 'private' : 'public',
        examDurationMinutes: Number(examDurationMinutes) || 15,
        examPassingScore: Number(examPassingScore) || 80,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: courses.id,
        set: {
          title: title.trim(),
          level: level || 'A1',
          category: category || 'Umum',
          description: description ? description.trim() : '',
          targetLanguage: targetLanguage || 'de-DE',
          visibility: visibility === 'private' ? 'private' : 'public',
          examDurationMinutes: Number(examDurationMinutes) || 15,
          examPassingScore: Number(examPassingScore) || 80,
          updatedAt: new Date(),
        },
      })
      .returning()

    // Process chapters if provided
    if (Array.isArray(rawChapters) && rawChapters.length > 0) {
      // Clear old chapters
      await db.delete(courseChapters).where(eq(courseChapters.courseId, courseId))

      for (let i = 0; i < rawChapters.length; i++) {
        const ch = rawChapters[i]
        const chapId = ch.id || `chap-${courseId}-${i + 1}`

        await db.insert(courseChapters).values({
          id: chapId,
          courseId,
          orderIndex: i + 1,
          title: ch.title || `Bab ${i + 1}`,
          description: ch.description || '',
          markdownContent: ch.markdownContent || null,
          quizDurationMinutes: Number(ch.quizDurationMinutes) || 5,
        })

        // Questions for this chapter
        if (Array.isArray(ch.questions) && ch.questions.length > 0) {
          for (let qIdx = 0; qIdx < ch.questions.length; qIdx++) {
            const q = ch.questions[qIdx]
            await db.insert(questions).values({
              id: q.id || `q-${chapId}-${qIdx + 1}`,
              courseId,
              chapterId: chapId,
              isExam: 0,
              type: q.type || 'choice',
              question: q.question,
              answer: q.answer,
              options: Array.isArray(q.options) ? q.options.join('|') : q.options || null,
              translation: q.translation || '',
              explanation: q.explanation || null,
              orderIndex: qIdx,
            })
          }
        }

        // Flashcards for this chapter
        if (Array.isArray(ch.flashcards) && ch.flashcards.length > 0) {
          for (let fcIdx = 0; fcIdx < ch.flashcards.length; fcIdx++) {
            const fc = ch.flashcards[fcIdx]
            await db.insert(courseFlashcards).values({
              id: fc.id || `fc-${chapId}-${fcIdx + 1}`,
              courseId,
              chapterId: chapId,
              front: fc.front,
              back: fc.back,
              hint: fc.hint || null,
              explanation: fc.explanation || null,
              orderIndex: fcIdx,
            })
          }
        }
      }
    }

    // Process Final Exam questions
    if (Array.isArray(rawExamQuestions) && rawExamQuestions.length > 0) {
      await db.delete(questions).where(and(eq(questions.courseId, courseId), eq(questions.isExam, 1)))

      for (let eIdx = 0; eIdx < rawExamQuestions.length; eIdx++) {
        const eqItem = rawExamQuestions[eIdx]
        await db.insert(questions).values({
          id: eqItem.id || `eq-${courseId}-${eIdx + 1}`,
          courseId,
          chapterId: null,
          isExam: 1,
          type: eqItem.type || 'choice',
          question: eqItem.question,
          answer: eqItem.answer,
          options: Array.isArray(eqItem.options) ? eqItem.options.join('|') : eqItem.options || null,
          translation: eqItem.translation || '',
          explanation: eqItem.explanation || null,
          orderIndex: eIdx,
        })
      }
    }

    return res.status(201).json(savedCourse)
  } catch (error) {
    console.error('Error creating course:', error)
    return res.status(500).json({ error: 'Gagal membuat kursus multi-bab.' })
  }
})

// 8. PATCH /api/courses/:id - Update Course Metadata
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const courseId = req.params.id as string
    const currentUserId = req.user!.userId
    const isAdmin = req.user!.role === 'admin'
    const { title, description, level, category, visibility, examDurationMinutes, examPassingScore } = req.body

    const course = await db.query.courses.findFirst({
      where: eq(courses.id, courseId),
    })

    if (!course) {
      return res.status(404).json({ error: 'Kursus tidak ditemukan.' })
    }

    if (!isAdmin && course.userId !== currentUserId) {
      return res.status(403).json({ error: 'Hanya pemilik yang dapat mengubah kursus ini.' })
    }

    const updateData: Partial<typeof courses.$inferInsert> = {
      updatedAt: new Date(),
    }

    if (title && typeof title === 'string') updateData.title = title.trim()
    if (description !== undefined) updateData.description = description
    if (level && typeof level === 'string') updateData.level = level
    if (category && typeof category === 'string') updateData.category = category
    if (visibility === 'public' || visibility === 'private') updateData.visibility = visibility
    if (examDurationMinutes !== undefined) updateData.examDurationMinutes = Number(examDurationMinutes) || 15
    if (examPassingScore !== undefined) updateData.examPassingScore = Number(examPassingScore) || 80

    const [updated] = await db
      .update(courses)
      .set(updateData)
      .where(eq(courses.id, courseId))
      .returning()

    return res.json({ message: 'Metadata kursus berhasil diperbarui.', course: updated })
  } catch (error) {
    console.error('Error updating course metadata:', error)
    return res.status(500).json({ error: 'Gagal memperbarui kursus.' })
  }
})

// 9. DELETE /api/courses/:id - Delete Course
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const courseId = req.params.id as string
    const currentUserId = req.user!.userId
    const isAdmin = req.user!.role === 'admin'

    const course = await db.query.courses.findFirst({
      where: eq(courses.id, courseId),
    })

    if (!course) {
      return res.status(404).json({ error: 'Kursus tidak ditemukan.' })
    }

    if (!isAdmin && course.userId !== currentUserId) {
      return res.status(403).json({ error: 'Hanya pemilik yang dapat menghapus kursus ini.' })
    }

    await db.delete(courses).where(eq(courses.id, courseId))

    return res.json({ message: 'Kursus berhasil dihapus.' })
  } catch (error) {
    console.error('Error deleting course:', error)
    return res.status(500).json({ error: 'Gagal menghapus kursus.' })
  }
})

// 10. POST /api/courses/:id/bookmark - Toggle Bookmark
router.post('/:id/bookmark', requireAuth, async (req, res) => {
  try {
    const courseId = req.params.id as string
    const currentUserId = req.user!.userId

    const existing = await db.query.courseBookmarks.findFirst({
      where: and(eq(courseBookmarks.userId, currentUserId), eq(courseBookmarks.courseId, courseId)),
    })

    if (existing) {
      await db.delete(courseBookmarks).where(eq(courseBookmarks.id, existing.id))
      return res.json({ bookmarked: false, message: 'Dihapus dari kursus favorit.' })
    } else {
      await db.insert(courseBookmarks).values({
        userId: currentUserId,
        courseId,
      })
      return res.json({ bookmarked: true, message: 'Ditambahkan ke kursus favorit.' })
    }
  } catch (error) {
    console.error('Error toggling bookmark:', error)
    return res.status(500).json({ error: 'Gagal mengubah status favorit.' })
  }
})

// 11. GET /api/courses/:id/reviews & POST reviews
router.get('/:id/reviews', async (req, res) => {
  try {
    const courseId = req.params.id as string
    const reviewsList = await db.query.courseReviews.findMany({
      where: eq(courseReviews.courseId, courseId),
      orderBy: (r, { desc }) => [desc(r.createdAt)],
    })

    const userIds = reviewsList.map(r => r.userId)
    const usersMap = new Map<string, string>()
    if (userIds.length > 0) {
      const uList = await db.query.users.findMany({
        where: inArray(users.id, userIds),
        columns: { id: true, name: true },
      })
      uList.forEach(u => usersMap.set(u.id, u.name))
    }

    const results = reviewsList.map(r => ({
      ...r,
      userName: usersMap.get(r.userId) || 'Pembelajar Bahasa',
    }))

    return res.json(results)
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return res.status(500).json({ error: 'Gagal memuat ulasan kursus.' })
  }
})

router.post('/:id/reviews', requireAuth, async (req, res) => {
  try {
    const courseId = req.params.id as string
    const currentUserId = req.user!.userId
    const { rating, comment } = req.body

    const isReviewsEnabled = await isFeatureEnabledServer('enable_course_reviews')
    if (!isReviewsEnabled) {
      return res.status(403).json({ error: 'Fitur ulasan kursus sedang dinonaktifkan sementara oleh Administrator.' })
    }

    const parsedRating = Number(rating)
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ error: 'Rating harus antara 1 sampai 5 bintang.' })
    }

    // 1. Periksa kursus & Larang Pembuat Kursus (Creator) mengulas kursus miliknya sendiri
    const course = await db.query.courses.findFirst({
      where: eq(courses.id, courseId),
      columns: { id: true, userId: true, title: true },
    })
    if (!course) {
      return res.status(404).json({ error: 'Kursus tidak ditemukan.' })
    }

    if (course.userId === currentUserId) {
      return res.status(403).json({
        error: 'Pembuat kursus (creator) tidak dapat memberikan ulasan ke kursus miliknya sendiri.'
      })
    }

    // 2. User hanya bisa memberi ulasan setelah menyelesaikan course (lulus Ujian Akhir)
    const progress = await db.query.courseProgress.findFirst({
      where: and(
        eq(courseProgress.courseId, courseId),
        eq(courseProgress.userId, currentUserId)
      ),
    })

    if (!progress || progress.isExamPassed !== 1) {
      return res.status(403).json({
        error: 'Anda harus menyelesaikan seluruh bab materi dan lulus Ujian Akhir kursus ini sebelum dapat memberikan ulasan.'
      })
    }

    // 3. User hanya bisa memberi ulasan sekali
    const existingReview = await db.query.courseReviews.findFirst({
      where: and(
        eq(courseReviews.courseId, courseId),
        eq(courseReviews.userId, currentUserId)
      ),
    })

    if (existingReview) {
      return res.status(400).json({
        error: 'Anda sudah pernah memberikan ulasan untuk kursus ini. Setiap pembelajar hanya dapat memberikan ulasan satu kali.'
      })
    }

    const [newReview] = await db
      .insert(courseReviews)
      .values({
        userId: currentUserId,
        courseId,
        rating: parsedRating,
        comment: comment ? String(comment).trim() : null,
      })
      .returning()

    // Ambil nama user untuk feedback instan di frontend
    const userRow = await db.query.users.findFirst({
      where: eq(users.id, currentUserId),
      columns: { name: true },
    })

    return res.status(201).json({
      message: 'Ulasan berhasil dikirim. Terima kasih atas masukan Anda!',
      review: {
        ...newReview,
        userName: userRow?.name || 'Siswa Lingua',
      },
    })
  } catch (error) {
    console.error('Error adding review:', error)
    return res.status(500).json({ error: 'Gagal mengirim ulasan.' })
  }
})

export default router
