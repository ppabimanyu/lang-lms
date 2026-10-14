import { ref, reactive, watch, computed } from 'vue'
import type { Lesson, Quiz, StudyStats, QuizSessionResult, NavigationTab, AdminNavigationTab, Course, CourseChapter, PublicUserProfile } from '@/types'
import { STARTER_LESSONS, STARTER_QUIZZES } from './starter-data'
import { api, getToken } from './api'

export interface UserProfile {
  id: string
  name: string
  email: string
  role?: string
  createdAt?: string
}

export const currentUser = ref<UserProfile | null>(null)
export const isAuthLoading = ref(false)

const STORAGE_KEY_LESSONS = 'lang_lms_lessons_v1'
const STORAGE_KEY_QUIZZES = 'lang_lms_quizzes_v1'
const STORAGE_KEY_STATS = 'lang_lms_stats_v1'

function getInitialLessons(): Lesson[] {
  if (typeof window === 'undefined') return STARTER_LESSONS
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LESSONS)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch (e) {
    console.error('Failed to load lessons from storage:', e)
  }
  return [...STARTER_LESSONS]
}

function getInitialQuizzes(): Quiz[] {
  if (typeof window === 'undefined') return STARTER_QUIZZES
  try {
    const raw = localStorage.getItem(STORAGE_KEY_QUIZZES)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch (e) {
    console.error('Failed to load quizzes from storage:', e)
  }
  return [...STARTER_QUIZZES]
}

function getInitialStats(): StudyStats {
  const defaultStats: StudyStats = {
    xp: 120,
    streak: 3,
    lastActiveDate: new Date().toISOString().slice(0, 10),
    quizzesTaken: 4,
    questionsAnswered: 24,
    correctAnswers: 21,
    recentResults: [],
  }

  if (typeof window === 'undefined') return defaultStats
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STATS)
    if (raw) return { ...defaultStats, ...JSON.parse(raw) }
  } catch (e) {
    console.error('Failed to load stats from storage:', e)
  }
  return defaultStats
}

export const lessons = ref<Lesson[]>(getInitialLessons())
export const quizzes = ref<Quiz[]>(getInitialQuizzes())
export const courses = ref<Course[]>([])
export const selectedCourseId = ref<string | null>(null)
export const activeCourse = ref<Course | null>(null)
export const isCourseLoading = ref(false)

export const selectedChapterId = ref<string | null>(null)
export const activeChapter = ref<CourseChapter | null>(null)
export const isChapterLoading = ref(false)
export const isExamActive = ref(false)

export const selectedAuthorId = ref<string | null>(null)
export const activeAuthorProfile = ref<PublicUserProfile | null>(null)
export const isAuthorLoading = ref(false)

export const stats = reactive<StudyStats>(getInitialStats())
export const activeTab = ref<NavigationTab>('dashboard')
export const adminActiveTab = ref<AdminNavigationTab>('dashboard')
export const selectedLessonId = ref<string | null>(null)
export const selectedQuizId = ref<string | null>(null)
export const isServerConnected = ref(false)

// Initialize & sync with Backend API
export async function initializeDataFromBackend() {
  isAuthLoading.value = true
  try {
    // 1. Check existing token & get current user
    const token = getToken()
    if (token) {
      try {
        const { user, stats: userStats } = await api.auth.me()
        currentUser.value = user
        if (userStats) Object.assign(stats, userStats)
      } catch (e) {
        console.warn('Token expired or invalid, logging out:', e)
        api.auth.logout()
        currentUser.value = null
      }
    }

    // 2. Load courses from Backend (Primary Curriculum)
    try {
      const backendCourses = await api.courses.getAll()
      if (Array.isArray(backendCourses)) {
        courses.value = backendCourses
      }
    } catch (e) {
      console.warn('Failed to load courses from backend:', e)
    }

    // 3. Load lessons from Backend
    const backendLessons = await api.lessons.getAll()
    if (Array.isArray(backendLessons) && backendLessons.length > 0) {
      lessons.value = backendLessons
    }

    // 4. Load quizzes from Backend
    const backendQuizzes = await api.quizzes.getAll()
    if (Array.isArray(backendQuizzes) && backendQuizzes.length > 0) {
      quizzes.value = backendQuizzes
    }

    // 5. Load stats if not already loaded from me
    if (!currentUser.value) {
      const statsResp = await api.stats.get()
      if (statsResp?.stats) Object.assign(stats, statsResp.stats)
    }

    isServerConnected.value = true
  } catch (error) {
    console.warn('Backend server not reachable, using offline cache:', error)
    isServerConnected.value = false
  } finally {
    isAuthLoading.value = false
  }
}

// Auto-run initialization in browser
if (typeof window !== 'undefined') {
  initializeDataFromBackend()

  watch(lessons, (newVal) => {
    try {
      localStorage.setItem(STORAGE_KEY_LESSONS, JSON.stringify(newVal))
    } catch (e) {
      console.error('Failed to persist lessons:', e)
    }
  }, { deep: true })

  watch(quizzes, (newVal) => {
    try {
      localStorage.setItem(STORAGE_KEY_QUIZZES, JSON.stringify(newVal))
    } catch (e) {
      console.error('Failed to persist quizzes:', e)
    }
  }, { deep: true })

  watch(stats, (newVal) => {
    try {
      localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(newVal))
    } catch (e) {
      console.error('Failed to persist stats:', e)
    }
  }, { deep: true })
}

// Action handlers with backend persistence
export async function saveLesson(lesson: Lesson): Promise<void> {
  const existingIdx = lessons.value.findIndex(l => l.id === lesson.id)
  if (existingIdx >= 0) {
    lessons.value[existingIdx] = { ...lesson, updatedAt: Date.now() }
  } else {
    lessons.value.unshift(lesson)
  }

  try {
    await api.lessons.create(lesson)
  } catch (e) {
    console.warn('Saved lesson locally, but failed to sync to server:', e)
  }
}

export async function deleteLesson(id: string): Promise<void> {
  lessons.value = lessons.value.filter(l => l.id !== id)
  try {
    await api.lessons.delete(id)
  } catch (e) {
    console.warn('Deleted lesson locally, but failed to sync to server:', e)
  }
}

export async function saveQuiz(quiz: Quiz): Promise<void> {
  const existingIdx = quizzes.value.findIndex(q => q.id === quiz.id)
  if (existingIdx >= 0) {
    quizzes.value[existingIdx] = { ...quiz, updatedAt: Date.now() }
  } else {
    quizzes.value.unshift(quiz)
  }

  try {
    await api.quizzes.create(quiz)
  } catch (e) {
    console.warn('Saved quiz locally, but failed to sync to server:', e)
  }
}

export async function deleteQuiz(id: string): Promise<void> {
  quizzes.value = quizzes.value.filter(q => q.id !== id)
  try {
    await api.quizzes.delete(id)
  } catch (e) {
    console.warn('Deleted quiz locally, but failed to sync to server:', e)
  }
}

export async function recordQuizCompletion(result: QuizSessionResult): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)
  
  // Streak calculation
  if (stats.lastActiveDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    if (stats.lastActiveDate === yesterday) {
      stats.streak += 1
    } else {
      stats.streak = 1
    }
    stats.lastActiveDate = today
  }

  stats.xp += result.xpEarned
  stats.quizzesTaken += 1
  stats.questionsAnswered += result.totalQuestions
  stats.correctAnswers += result.correctCount

  stats.recentResults.unshift(result)
  if (stats.recentResults.length > 20) {
    stats.recentResults.pop()
  }

  if (currentUser.value) {
    try {
      await api.stats.recordResult(result)
    } catch (e) {
      console.warn('Saved quiz result locally, but failed to sync to server:', e)
    }
  }
}

export async function resetToStarterData(): Promise<void> {
  lessons.value = [...STARTER_LESSONS]
  quizzes.value = [...STARTER_QUIZZES]
  stats.xp = 0
  stats.streak = 1
  stats.quizzesTaken = 0
  stats.questionsAnswered = 0
  stats.correctAnswers = 0
  stats.recentResults = []

  if (currentUser.value) {
    try {
      await api.stats.reset()
    } catch (e) {
      console.warn('Reset locally, but failed to sync to server:', e)
    }
  }
}

export function exportFullDataBackup(): string {
  return JSON.stringify({
    version: '1.0',
    exportedAt: new Date().toISOString(),
    lessons: lessons.value,
    quizzes: quizzes.value,
    stats,
  }, null, 2)
}

export function importFullDataBackup(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString)
    if (Array.isArray(data.lessons)) lessons.value = data.lessons
    if (Array.isArray(data.quizzes)) quizzes.value = data.quizzes
    if (data.stats) Object.assign(stats, data.stats)
    return true
  } catch (e) {
    console.error('Invalid backup file:', e)
    return false
  }
}

// User Authentication methods
export async function loginUser(email: string, password: string) {
  const resp = await api.auth.login(email, password)
  currentUser.value = resp.user
  await initializeDataFromBackend()
  return resp
}

export async function registerUser(name: string, email: string, password: string) {
  const resp = await api.auth.register(name, email, password)
  currentUser.value = resp.user
  await initializeDataFromBackend()
  return resp
}

export function logoutUser() {
  api.auth.logout()
  currentUser.value = null
  activeTab.value = 'dashboard'
  adminActiveTab.value = 'dashboard'
  stats.xp = 0
  stats.streak = 1
  stats.quizzesTaken = 0
  stats.questionsAnswered = 0
  stats.correctAnswers = 0
  stats.recentResults = []
}

export async function updateUserProfile(name: string, email: string) {
  const resp = await api.auth.updateProfile(name, email)
  if (currentUser.value) {
    currentUser.value = {
      ...currentUser.value,
      name: resp.user.name,
      email: resp.user.email,
    }
  }
  return resp
}

export async function updateUserPassword(currentPassword: string, newPassword: string) {
  return await api.auth.updatePassword(currentPassword, newPassword)
}

export async function resetUserProgress() {
  const resp = await api.auth.resetProgress()
  stats.xp = 0
  stats.streak = 1
  stats.quizzesTaken = 0
  stats.questionsAnswered = 0
  stats.correctAnswers = 0
  stats.recentResults = []
  return resp
}

export async function deleteUserAccount() {
  const resp = await api.auth.deleteAccount()
  currentUser.value = null
  stats.xp = 0
  stats.streak = 1
  stats.quizzesTaken = 0
  stats.questionsAnswered = 0
  stats.correctAnswers = 0
  stats.recentResults = []
  return resp
}

// Course action handlers
export async function refreshCourses(params: any = {}) {
  try {
    const list = await api.courses.getAll(params)
    courses.value = list
  } catch (e) {
    console.error('Failed to refresh courses:', e)
  }
}

export async function openCourse(courseId: string, chapterId?: string) {
  selectedCourseId.value = courseId
  isCourseLoading.value = true
  activeTab.value = 'course-detail'
  try {
    const detail = await api.courses.getById(courseId)
    activeCourse.value = detail

    // Synchronize catalog list item reactively
    const idx = courses.value.findIndex((c) => c.id === courseId)
    if (idx >= 0 && detail) {
      courses.value[idx] = {
        ...courses.value[idx],
        isExamPassed: detail.isExamPassed,
        progressPercent: detail.progressPercent,
        completedChaptersCount: detail.completedChaptersCount,
        totalChapters: detail.totalChapters,
        certificateId: detail.certificateId,
      }
    }

    if (chapterId) {
      selectedChapterId.value = chapterId
    } else {
      selectedChapterId.value = null
    }
    isExamActive.value = false
  } catch (e) {
    console.error('Failed to open course:', e)
    throw e
  } finally {
    isCourseLoading.value = false
  }
}

export async function openUserProfile(authorId: string) {
  selectedAuthorId.value = authorId
  isAuthorLoading.value = true
  activeTab.value = 'user-profile'
  try {
    const profile = await api.users.getPublicProfile(authorId)
    activeAuthorProfile.value = profile
  } catch (e) {
    console.error('Failed to open user public profile:', e)
    throw e
  } finally {
    isAuthorLoading.value = false
  }
}

export async function toggleCourseVisibility(courseId: string, newVisibility: 'public' | 'private') {
  const resp = await api.courses.updateVisibility(courseId, newVisibility)
  const idx = courses.value.findIndex(c => c.id === courseId)
  if (idx >= 0) {
    courses.value[idx].visibility = newVisibility
  }
  if (activeCourse.value && activeCourse.value.id === courseId) {
    activeCourse.value.visibility = newVisibility
  }
  return resp
}

export async function toggleCourseBookmark(courseId: string) {
  const resp = await api.courses.toggleBookmark(courseId)
  const idx = courses.value.findIndex(c => c.id === courseId)
  if (idx >= 0) {
    courses.value[idx].isBookmarked = resp.bookmarked
  }
  if (activeCourse.value && activeCourse.value.id === courseId) {
    activeCourse.value.isBookmarked = resp.bookmarked
  }
  return resp
}

export const myCourses = computed(() => courses.value.filter(c => c.isOwner))

export async function updateCourseMetadata(courseId: string, data: Partial<Course>) {
  const resp = await api.courses.update(courseId, data)
  const idx = courses.value.findIndex(c => c.id === courseId)
  if (idx >= 0) {
    courses.value[idx] = {
      ...courses.value[idx],
      ...resp.course,
    }
  }
  if (activeCourse.value && activeCourse.value.id === courseId) {
    activeCourse.value = {
      ...activeCourse.value,
      ...resp.course,
    }
  }
  return resp
}

export async function removeCourse(courseId: string) {
  const resp = await api.courses.delete(courseId)
  courses.value = courses.value.filter(c => c.id !== courseId)
  if (activeCourse.value && activeCourse.value.id === courseId) {
    activeCourse.value = null
    activeTab.value = 'my-courses'
  }
  return resp
}


