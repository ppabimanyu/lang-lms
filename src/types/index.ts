export type QuestionType = 'input' | 'choice' | 'sentence'

export interface Question {
  id: string
  type: QuestionType
  question: string
  answer: string
  options?: string[]
  translation: string
  explanation?: string
  quizId?: string
  chapterId?: string | null
  courseId?: string
  isExam?: number
  orderIndex?: number
}

export interface Lesson {
  id: string
  title: string
  level?: string
  category?: string
  description?: string
  markdownContent: string
  quizId?: string
  targetLanguage?: string
  createdAt?: number | string
  updatedAt?: number | string
  sourceFilename?: string
}

export interface Quiz {
  id: string
  title: string
  description?: string
  level?: string
  category?: string
  targetLanguage?: string
  lessonId?: string
  questions: Question[]
  createdAt?: number | string
  updatedAt?: number | string
  sourceFilename?: string
}

export interface CSVQuestionRow {
  type?: string
  question?: string
  answer?: string
  options?: string
  translation?: string
  explanation?: string
  [key: string]: any
}

export interface CourseFlashcard {
  id?: string
  courseId?: string
  chapterId?: string | null
  front: string
  back: string
  hint?: string
  explanation?: string
  orderIndex?: number
  createdAt?: string
}

export interface CSVFlashcardRow {
  front?: string
  back?: string
  hint?: string
  explanation?: string
  [key: string]: any
}

export type CourseVisibility = 'public' | 'private'

export interface ChapterUserProgress {
  isRead: boolean
  flashcardMastered: boolean
  quizCompleted: boolean
  bestQuizScore: number
  bestQuizAccuracy: number
  lastStudiedAt?: string
}

export interface CourseChapter {
  id: string
  courseId: string
  orderIndex: number
  title: string
  description?: string
  markdownContent?: string | null
  sourceFilename?: string
  quizDurationMinutes?: number
  hasMarkdown?: boolean
  questionCount?: number
  flashcardCount?: number
  questions?: Question[]
  flashcards?: CourseFlashcard[]
  userProgress?: ChapterUserProgress | null
  isCompleted?: boolean
  nextChapter?: { id: string; title: string; orderIndex: number } | null
  prevChapter?: { id: string; title: string; orderIndex: number } | null
}

export interface CourseExam {
  totalQuestions: number
  durationMinutes: number
  passingScore: number
  isLocked: boolean
  isPassed: boolean
  bestExamScore: number
  bestExamAccuracy: number
  certificateId: string | null
  examAttemptCount: number
  lastExamAt?: string | null
}

export interface CourseUserProgress {
  completedChaptersCount: number
  totalChapters: number
  progressPercent: number
  isExamPassed: boolean
  certificateId: string | null
  bestExamScore?: number
  bestExamAccuracy?: number
}

export interface CourseReview {
  id: string
  userId?: string
  rating: number
  comment?: string
  createdAt: string
  userName?: string
}

export interface CourseLeaderboardEntry {
  id: string
  userId: string
  userName: string
  accuracy: number
  xpEarned: number
  timeSpentSeconds: number
  completedAt: string
}

export interface CourseAuthor {
  id: string
  name: string
  isOfficial?: boolean
  isPartner?: boolean
  role?: string
}

export interface PublicUserProfile {
  id: string
  name: string
  isOfficial?: boolean
  isPartner?: boolean
  role?: string
  headline?: string
  createdAt: string
  stats: {
    totalPublicCourses: number
    xp: number
    streak: number
    quizzesTaken: number
    questionsAnswered: number
  }
  publicCourses: Course[]
}

export interface Course {
  id: string
  userId?: string | null
  title: string
  level: string
  category: string
  description?: string
  targetLanguage: string
  visibility: CourseVisibility
  status?: 'published' | 'takedown'
  takedownReason?: string
  examDurationMinutes: number
  examPassingScore: number
  thumbnail?: string
  totalChapters?: number
  examQuestionsCount?: number
  questionCount?: number
  quizDurationMinutes?: number
  hasMarkdown?: boolean
  markdownContent?: string | null
  questions?: Question[]
  flashcards?: CourseFlashcard[]
  completedChaptersCount?: number
  isExamPassed?: boolean
  bestExamScore?: number
  certificateId?: string | null
  progressPercent?: number
  createdAt: string | number
  updatedAt: string | number
  isOwner?: boolean
  isBookmarked?: boolean
  avgRating?: number
  totalReviews?: number
  chapters?: CourseChapter[]
  exam?: CourseExam
  userProgress?: CourseUserProgress | null
  reviews?: CourseReview[]
  author?: CourseAuthor
}

export interface UserAnswerRecord {
  questionId: string
  question: Question
  userAnswer: string
  isCorrect: boolean
  timestamp: number
}

export interface QuizSessionResult {
  quizId: string
  courseId?: string
  chapterId?: string
  quizTitle: string
  completedAt: number
  totalQuestions: number
  correctCount: number
  accuracy: number
  xpEarned: number
  timeSpentSeconds?: number
  isExam?: boolean
  isPassed?: boolean
  certificateId?: string | null
  wrongQuestions: Question[]
  answers: UserAnswerRecord[]
}

export interface StudyStats {
  xp: number
  streak: number
  lastActiveDate: string
  quizzesTaken: number
  questionsAnswered: number
  correctAnswers: number
  recentResults: QuizSessionResult[]
}

export interface SupportedLanguage {
  code: string
  name: string
  nativeName: string
  flag: string
  samplePhrase: string
}

export interface VerifiedCertificate {
  certificateId: string
  userName: string
  courseId: string
  courseTitle: string
  level: string
  targetLanguage: string
  category: string
  bestAccuracy: number
  bestScore?: number
  isPassed: boolean
  completedDate: string
  issuer: string
  status: string
  verifiedAt: string
  isDemo?: boolean
}

export interface CertificateVerificationResponse {
  valid: boolean
  certificate?: VerifiedCertificate
  error?: string
}

export type NavigationTab =
  | 'dashboard'
  | 'courses'
  | 'course-detail'
  | 'my-courses'
  | 'manager'
  | 'account'
  | 'verify'
  | 'user-profile'
  | 'admin'

export type AdminNavigationTab = 'dashboard' | 'users' | 'courses' | 'activity' | 'flags'

export type FeatureFlagKey =
  | 'maintenance_mode'
  | 'enable_registration'
  | 'enable_course_creation'
  | 'enable_reviews'
  | 'enable_certificates'
  | 'enable_leaderboard'
  | 'enable_tts'
  | 'enable_flashcards'
  | 'enable_demo_features'

export type FeatureFlagCategory = 'system' | 'learning' | 'interaction' | 'gamification'

export interface FeatureFlagItem {
  key: FeatureFlagKey | string
  name: string
  description: string
  category: FeatureFlagCategory
  enabled: boolean
  isCritical: boolean
  updatedAt?: string | null
  updatedBy?: string | null
}

export interface FeatureFlagsResponse {
  flags: FeatureFlagItem[]
  map: Record<string, boolean>
}

export interface AdminStats {
  users: {
    total: number
    active: number
    inactive: number
    students: number
    partners?: number
    curriculums: number
    admins: number
  }
  courses: {
    total: number
    published: number
    takedown: number
    publicCount: number
    privateCount: number
  }
  quizzes: {
    totalSessions: number
    passedSessions: number
    totalXpAwarded: number
  }
  reviews: {
    totalReviews: number
    avgRating: number
  }
}

export interface AdminUserItem {
  id: string
  name: string
  email: string
  role: string
  status: string
  createdAt: string
  xp: number
  streak: number
  quizzesTaken: number
  coursesCount: number
}

export interface AdminCourseItem extends Course {
  authorEmail?: string
  authorRole?: string
}

export interface AdminQuizActivityItem {
  id: string
  userId: string
  userName: string
  userEmail: string
  courseId: string
  quizTitle: string
  accuracy: number
  correctCount: number
  totalQuestions: number
  xpEarned: number
  timeSpentSeconds?: number
  completedAt: string
}
