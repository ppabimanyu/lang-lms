import { Router } from 'express'
import { eq, sql } from 'drizzle-orm'
import { db } from '../db'
import { courses, courseProgress, users } from '../db/schema'
import { requireAuth } from '../middleware/auth'

const router = Router()

/**
 * GET /api/certificates/verify/:certificateId
 * Public endpoint to verify certificate authenticity by ID
 */
router.get('/verify/:certificateId', async (req, res) => {
  try {
    const rawId = req.params.certificateId || ''
    const cleanId = rawId.trim().toUpperCase()

    if (!cleanId) {
      return res.status(400).json({
        valid: false,
        error: 'Nomor ID sertifikat wajib disertakan.'
      })
    }

    // 1. Query database for certificate record
    const records = await db
      .select({
        id: courseProgress.id,
        certificateId: courseProgress.certificateId,
        bestAccuracy: courseProgress.bestExamAccuracy,
        bestScore: courseProgress.bestExamScore,
        isPassed: courseProgress.isExamPassed,
        completedDate: courseProgress.lastExamAt,
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        courseId: courses.id,
        courseTitle: courses.title,
        level: courses.level,
        targetLanguage: courses.targetLanguage,
        category: courses.category,
      })
      .from(courseProgress)
      .innerJoin(users, eq(courseProgress.userId, users.id))
      .innerJoin(courses, eq(courseProgress.courseId, courses.id))
      .where(sql`UPPER(${courseProgress.certificateId}) = ${cleanId}`)
      .limit(1)

    if (records.length > 0) {
      const rec = records[0]
      return res.json({
        valid: true,
        certificate: {
          certificateId: rec.certificateId || cleanId,
          userName: rec.userName,
          courseId: rec.courseId,
          courseTitle: rec.courseTitle,
          level: rec.level,
          targetLanguage: rec.targetLanguage,
          category: rec.category,
          bestAccuracy: rec.bestAccuracy,
          bestScore: rec.bestScore,
          isPassed: rec.isPassed === 1,
          completedDate: rec.completedDate,
          issuer: 'Lingua LMS Academic Council & Curriculum Board',
          status: 'Resmi & Terverifikasi',
          verifiedAt: new Date().toISOString(),
          isDemo: false
        }
      })
    }

    // 2. Demo & Initial Starter Pack Fallback Certificate
    if (
      cleanId === 'CERT-SUCCESS' ||
      cleanId === 'CERT-LINGUA-SUCCESS' ||
      cleanId.startsWith('CERT-DEMO')
    ) {
      return res.json({
        valid: true,
        certificate: {
          certificateId: cleanId,
          userName: 'Pembelajar Teladan Lingua',
          courseId: 'demo-starter-curriculum',
          courseTitle: 'Jerman Dasar A1: Tata Bahasa & Percakapan Mandiri',
          level: 'A1',
          targetLanguage: 'de-DE',
          category: 'Grammatik & Dialog',
          bestAccuracy: 95,
          bestScore: 19,
          isPassed: true,
          completedDate: new Date().toISOString(),
          issuer: 'Lingua LMS Academic Council & Curriculum Board',
          status: 'Resmi & Terverifikasi (Sertifikat Demo Akreditasi)',
          verifiedAt: new Date().toISOString(),
          isDemo: true
        }
      })
    }

    // 3. Not found
    return res.status(404).json({
      valid: false,
      error: `Sertifikat dengan ID "${cleanId}" tidak ditemukan atau belum pernah diterbitkan secara resmi.`
    })
  } catch (error: any) {
    console.error('Error verifying certificate:', error)
    return res.status(500).json({
      valid: false,
      error: 'Terjadi kesalahan sistem saat memverifikasi sertifikat.'
    })
  }
})

/**
 * GET /api/certificates/my
 * Get all certificates earned by currently logged-in user
 */
router.get('/my', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId
    const userCerts = await db
      .select({
        id: courseProgress.id,
        certificateId: courseProgress.certificateId,
        bestAccuracy: courseProgress.bestExamAccuracy,
        bestScore: courseProgress.bestExamScore,
        isPassed: courseProgress.isExamPassed,
        completedDate: courseProgress.lastExamAt,
        courseId: courses.id,
        courseTitle: courses.title,
        level: courses.level,
        targetLanguage: courses.targetLanguage,
        category: courses.category,
      })
      .from(courseProgress)
      .innerJoin(courses, eq(courseProgress.courseId, courses.id))
      .where(
        sql`${courseProgress.userId} = ${userId} AND ${courseProgress.certificateId} IS NOT NULL AND ${courseProgress.isExamPassed} = 1`
      )
      .orderBy(sql`${courseProgress.lastExamAt} DESC`)

    return res.json(userCerts)
  } catch (error: any) {
    console.error('Error fetching user certificates:', error)
    return res.status(500).json({ error: 'Gagal mengambil daftar sertifikat Anda.' })
  }
})

export default router
