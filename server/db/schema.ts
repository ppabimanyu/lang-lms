import { pgTable, text, integer, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core'

// 1. Users Table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').default('student').notNull(), // 'student' | 'curriculum' | 'admin'
  status: text('status').default('active').notNull(), // 'active' | 'inactive'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// 2. Study Stats Table (1 per user)
export const studyStats = pgTable('study_stats', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  xp: integer('xp').default(0).notNull(),
  streak: integer('streak').default(1).notNull(),
  lastActiveDate: text('last_active_date').notNull(),
  quizzesTaken: integer('quizzes_taken').default(0).notNull(),
  questionsAnswered: integer('questions_answered').default(0).notNull(),
  correctAnswers: integer('correct_answers').default(0).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// 3. Courses Table (Top-Level Learning Track Course)
export const courses = pgTable('courses', {
  id: text('id').primaryKey(), // e.g. 'course-german-a1'
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  level: text('level').default('A1').notNull(),
  category: text('category').default('Umum').notNull(),
  description: text('description'),
  targetLanguage: text('target_language').default('de-DE').notNull(),
  visibility: text('visibility').default('public').notNull(), // 'public' | 'private'
  status: text('status').default('published').notNull(), // 'published' | 'takedown'
  takedownReason: text('takedown_reason'),
  examDurationMinutes: integer('exam_duration_minutes').default(15).notNull(), // Batas waktu ujian akhir (menit)
  examPassingScore: integer('exam_passing_score').default(80).notNull(), // Minimal skor ujian untuk sertifikat (%)
  thumbnail: text('thumbnail'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// 4. Course Chapters Table (Daftar Bab Terurut dalam Course)
export const courseChapters = pgTable('course_chapters', {
  id: text('id').primaryKey(), // e.g. 'chap-german-a1-1'
  courseId: text('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  orderIndex: integer('order_index').default(1).notNull(), // 1, 2, 3...
  title: text('title').notNull(),
  description: text('description'),
  markdownContent: text('markdown_content'), // Teks materi pembelajaran (opsional jika bab hanya kuis/flashcard)
  sourceFilename: text('source_filename'),
  quizDurationMinutes: integer('quiz_duration_minutes').default(5).notNull(), // Waktu kuis latihan bab
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// 5. Questions Table (Soal Kuis Bab atau Soal Ujian Akhir)
export const questions = pgTable('questions', {
  id: text('id').primaryKey(),
  courseId: text('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  chapterId: text('chapter_id')
    .references(() => courseChapters.id, { onDelete: 'cascade' }), // Null jika isExam = 1
  isExam: integer('is_exam').default(0).notNull(), // 1 = Soal Ujian Akhir Kelulusan, 0 = Soal Kuis Bab
  type: text('type').notNull(), // 'input' | 'choice' | 'sentence'
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  options: text('options'), // pipe separated: 'ein|eine|einen|einer'
  translation: text('translation').notNull(),
  explanation: text('explanation'),
  orderIndex: integer('order_index').default(0).notNull(),
})

// 6. Course Flashcards (Kartu Hafalan Kosakata per Bab / Course)
export const courseFlashcards = pgTable('course_flashcards', {
  id: text('id').primaryKey(),
  courseId: text('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  chapterId: text('chapter_id')
    .references(() => courseChapters.id, { onDelete: 'cascade' }),
  front: text('front').notNull(),
  back: text('back').notNull(),
  hint: text('hint'),
  explanation: text('explanation'),
  orderIndex: integer('order_index').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// 7. Chapter Progress (Pelacakan Progres Bab: Materi, Kuis, Flashcard)
export const chapterProgress = pgTable('chapter_progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  courseId: text('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  chapterId: text('chapter_id')
    .notNull()
    .references(() => courseChapters.id, { onDelete: 'cascade' }),
  isRead: integer('is_read').default(0).notNull(), // 1 = materi sudah dibaca
  flashcardMastered: integer('flashcard_mastered').default(0).notNull(), // 1 = flashcard selesai
  quizCompleted: integer('quiz_completed').default(0).notNull(), // 1 = kuis bab selesai
  bestQuizScore: integer('best_quiz_score').default(0).notNull(),
  bestQuizAccuracy: integer('best_quiz_accuracy').default(0).notNull(),
  lastStudiedAt: timestamp('last_studied_at').defaultNow().notNull(),
})

// 8. Course Progress (Pelacakan Kelulusan Course & Ujian Akhir)
export const courseProgress = pgTable('course_progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  courseId: text('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  completedChaptersCount: integer('completed_chapters_count').default(0).notNull(),
  isExamPassed: integer('is_exam_passed').default(0).notNull(), // 1 jika ujian akhir >= examPassingScore
  bestExamScore: integer('best_exam_score').default(0).notNull(),
  bestExamAccuracy: integer('best_exam_accuracy').default(0).notNull(),
  certificateId: text('certificate_id'), // Nomor sertifikat jika lulus ujian
  examAttemptCount: integer('exam_attempt_count').default(0).notNull(),
  lastExamAt: timestamp('last_exam_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// 9. Quiz Results (Riwayat Evaluasi Kuis Bab & Ujian Akhir)
export const quizResults = pgTable('quiz_results', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  courseId: text('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  chapterId: text('chapter_id')
    .references(() => courseChapters.id, { onDelete: 'set null' }),
  isExam: integer('is_exam').default(0).notNull(), // 1 jika sesi ujian akhir
  quizTitle: text('quiz_title').notNull(),
  totalQuestions: integer('total_questions').notNull(),
  correctCount: integer('correct_count').notNull(),
  accuracy: integer('accuracy').notNull(),
  xpEarned: integer('xp_earned').notNull(),
  timeSpentSeconds: integer('time_spent_seconds').default(0),
  answersSnapshot: jsonb('answers_snapshot'),
  completedAt: timestamp('completed_at').defaultNow().notNull(),
})

// 10. Course Reviews (Rating 1-5 Bintang & Ulasan Komentar)
export const courseReviews = pgTable('course_reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  courseId: text('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(), // 1 sampai 5
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// 11. Course Bookmarks (Daftar Kursus Favorit)
export const courseBookmarks = pgTable('course_bookmarks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  courseId: text('course_id')
    .notNull()
    .references(() => courses.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// 12. Feature Flags Table (Sistem Kontrol Fitur Platform)
export const featureFlags = pgTable('feature_flags', {
  key: text('key').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  category: text('category').default('system').notNull(), // 'system' | 'learning' | 'interaction' | 'gamification'
  enabled: integer('enabled').default(1).notNull(), // 1 = aktif, 0 = nonaktif
  isCritical: integer('is_critical').default(0).notNull(), // 1 jika butuh konfirmasi modal
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  updatedBy: text('updated_by').default('System'),
})
