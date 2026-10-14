import type {
  Course,
  CourseChapter,
  CourseReview,
  PublicUserProfile,
  StudyStats,
  QuizSessionResult,
  CertificateVerificationResponse,
  FeatureFlagsResponse,
  FeatureFlagItem,
  AdminStats,
  AdminUserItem,
  AdminCourseItem,
  AdminQuizActivityItem,
  Question,
  Lesson,
  Quiz,
} from '@/types'

const API_BASE = '/api'

let authToken: string | null = localStorage.getItem('lingua_auth_token')

export function setToken(token: string | null) {
  authToken = token
  if (token) {
    localStorage.setItem('lingua_auth_token', token)
  } else {
    localStorage.removeItem('lingua_auth_token')
  }
}

export function getToken(): string | null {
  return authToken || localStorage.getItem('lingua_auth_token')
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ error: 'Terjadi kesalahan pada server' }))
    throw new Error(errorBody.error || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export const api = {
  // Auth API
  auth: {
    async register(name: string, email: string, password: string) {
      const data = await request<{ message: string; token: string; user: { id: string; name: string; email: string } }>(
        '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify({ name, email, password }),
        }
      )
      setToken(data.token)
      return data
    },

    async login(email: string, password: string) {
      const data = await request<{ message: string; token: string; user: { id: string; name: string; email: string } }>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        }
      )
      setToken(data.token)
      return data
    },

    async me() {
      return request<{ user: { id: string; name: string; email: string }; stats: StudyStats }>('/auth/me')
    },

    async updateProfile(name: string, email: string) {
      return request<{ message: string; user: { id: string; name: string; email: string; createdAt: string } }>(
        '/auth/profile',
        {
          method: 'PUT',
          body: JSON.stringify({ name, email }),
        }
      )
    },

    async updatePassword(currentPassword: string, newPassword: string) {
      return request<{ message: string }>(
        '/auth/password',
        {
          method: 'PUT',
          body: JSON.stringify({ currentPassword, newPassword }),
        }
      )
    },

    async resetProgress() {
      return request<{ message: string }>(
        '/auth/reset-progress',
        {
          method: 'POST',
        }
      )
    },

    async deleteAccount() {
      const data = await request<{ message: string }>(
        '/auth/account',
        {
          method: 'DELETE',
        }
      )
      setToken(null)
      return data
    },

    logout() {
      setToken(null)
    },
  },

  // Lessons compatibility helper
  lessons: {
    async getAll(): Promise<Lesson[]> {
      return []
    },
    async create(lesson: Partial<Lesson>): Promise<Lesson> {
      return lesson as Lesson
    },
    async delete(_id: string): Promise<{ message: string }> {
      return { message: 'ok' }
    },
  },

  // Quizzes compatibility helper
  quizzes: {
    async getAll(): Promise<Quiz[]> {
      return []
    },
    async create(quiz: Partial<Quiz>): Promise<{ message: string; quiz: Quiz }> {
      return { message: 'ok', quiz: quiz as Quiz }
    },
    async delete(_id: string): Promise<{ message: string }> {
      return { message: 'ok' }
    },
  },

  // Stats API
  stats: {
    async get(): Promise<{ stats: StudyStats }> {
      return request<{ stats: StudyStats }>('/stats')
    },

    async recordResult(result: QuizSessionResult): Promise<{ message: string; result: any }> {
      return request<{ message: string; result: any }>('/stats/quiz-result', {
        method: 'POST',
        body: JSON.stringify(result),
      })
    },

    async reset(): Promise<{ message: string }> {
      return request<{ message: string }>('/stats/reset', {
        method: 'POST',
      })
    },
  },

  // Courses API (Unified Multi-Chapter Track with Modules, Flashcards, Quizzes & Final Exam)
  courses: {
    async getAll(params: {
      search?: string
      language?: string
      level?: string
      tab?: 'all' | 'mine' | 'favorites' | 'history'
      sort?: 'latest' | 'popular' | 'level'
    } = {}): Promise<Course[]> {
      const searchParams = new URLSearchParams()
      if (params.search) searchParams.set('search', params.search)
      if (params.language) searchParams.set('language', params.language)
      if (params.level) searchParams.set('level', params.level)
      if (params.tab) searchParams.set('tab', params.tab)
      if (params.sort) searchParams.set('sort', params.sort)
      const qs = searchParams.toString()
      return request<Course[]>(`/courses${qs ? `?${qs}` : ''}`)
    },

    async getById(id: string): Promise<Course> {
      return request<Course>(`/courses/${id}`)
    },

    async create(course: Partial<Course> & { chapters?: any[]; examQuestions?: any[] }): Promise<Course> {
      return request<Course>('/courses', {
        method: 'POST',
        body: JSON.stringify(course),
      })
    },

    async update(id: string, data: Partial<Course>): Promise<{ message: string; course: Course }> {
      return request<{ message: string; course: Course }>(`/courses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    },

    async updateVisibility(id: string, visibility: 'public' | 'private'): Promise<{ message: string; course: Course }> {
      return request<{ message: string; course: Course }>(`/courses/${id}/visibility`, {
        method: 'PATCH',
        body: JSON.stringify({ visibility }),
      })
    },

    async delete(id: string): Promise<{ message: string }> {
      return request<{ message: string }>(`/courses/${id}`, {
        method: 'DELETE',
      })
    },

    async recordProgress(_id: string, _data?: any): Promise<{ success: boolean }> {
      return { success: true }
    },

    // Chapter Endpoints
    async getChapter(courseId: string, chapterId: string): Promise<CourseChapter> {
      return request<CourseChapter>(`/courses/${courseId}/chapters/${chapterId}`)
    },

    async recordChapterProgress(
      courseId: string,
      chapterId: string,
      data: {
        isRead?: boolean
        flashcardMastered?: boolean
        quizResult?: {
          totalQuestions: number
          correctCount: number
          accuracy: number
          xpEarned: number
          timeSpentSeconds?: number
          answersSnapshot?: any
        }
      }
    ): Promise<{
      success: boolean
      chapterProgress: any
      courseProgress: any
      xpEarned: number
      isExamUnlocked: boolean
    }> {
      return request(`/courses/${courseId}/chapters/${chapterId}/progress`, {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    // Final Exam Endpoints
    async getExam(courseId: string): Promise<{
      courseId: string
      courseTitle: string
      durationMinutes: number
      passingScore: number
      questions: Question[]
    }> {
      return request(`/courses/${courseId}/exam`)
    },

    async submitExam(
      courseId: string,
      data: {
        answers: Record<string, string>
        timeSpentSeconds: number
      }
    ): Promise<{
      isPassed: boolean
      score: number
      accuracy: number
      correctCount: number
      totalQuestions: number
      passingScore: number
      xpEarned: number
      certificateId: string | null
      breakdown: Array<{
        id: string
        type: string
        question: string
        userAnswer: string
        correctAnswer: string
        isCorrect: boolean
        explanation?: string
        translation: string
      }>
    }> {
      return request(`/courses/${courseId}/exam/submit`, {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    async getReviews(id: string): Promise<CourseReview[]> {
      return request<CourseReview[]>(`/courses/${id}/reviews`)
    },

    async addReview(id: string, rating: number, comment?: string): Promise<{ message: string; review: CourseReview }> {
      return request<{ message: string; review: CourseReview }>(`/courses/${id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment }),
      })
    },

    async toggleBookmark(id: string): Promise<{ bookmarked: boolean; message: string }> {
      return request<{ bookmarked: boolean; message: string }>(`/courses/${id}/bookmark`, {
        method: 'POST',
      })
    },
  },

  // Certificates Verification API
  certificates: {
    async verify(certificateId: string): Promise<CertificateVerificationResponse> {
      return request<CertificateVerificationResponse>(`/certificates/verify/${encodeURIComponent(certificateId)}`)
    },

    async getMyCertificates(): Promise<
      Array<{
        id: string
        certificateId: string
        bestAccuracy: number
        bestScore: number
        isPassed: boolean
        completedDate: string
        courseId: string
        courseTitle: string
        level: string
        targetLanguage: string
        category: string
      }>
    > {
      return request('/certificates/my')
    },
  },

  // Users & Public Profile API
  users: {
    async getPublicProfile(userId: string): Promise<PublicUserProfile> {
      return request<PublicUserProfile>(`/users/${encodeURIComponent(userId)}/public-profile`)
    },
  },

  // Admin Management API
  admin: {
    async getStats(): Promise<AdminStats> {
      return request<AdminStats>('/admin/stats')
    },
    async getUsers(): Promise<AdminUserItem[]> {
      return request<AdminUserItem[]>('/admin/users')
    },
    async updateUserStatus(userId: string, status: 'active' | 'inactive'): Promise<{ message: string; user: any }> {
      return request<{ message: string; user: any }>(`/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
    },
    async updateUserRole(
      userId: string,
      role: 'student' | 'partner' | 'curriculum' | 'admin'
    ): Promise<{ message: string; user: any }> {
      return request<{ message: string; user: any }>(`/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      })
    },
    async getCourses(): Promise<AdminCourseItem[]> {
      return request<AdminCourseItem[]>('/admin/courses')
    },
    async toggleCourseTakedown(
      courseId: string,
      status: 'published' | 'takedown',
      reason?: string
    ): Promise<{ message: string; course: any }> {
      return request<{ message: string; course: any }>(`/admin/courses/${courseId}/takedown`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason }),
      })
    },
    async deleteCourse(courseId: string): Promise<{ message: string }> {
      return request<{ message: string }>(`/admin/courses/${courseId}`, {
        method: 'DELETE',
      })
    },
    async getQuizActivity(): Promise<AdminQuizActivityItem[]> {
      return request<AdminQuizActivityItem[]>('/admin/quiz-activity')
    },
    async getFeatureFlags(): Promise<FeatureFlagItem[]> {
      return request<FeatureFlagItem[]>('/admin/feature-flags')
    },
    async updateFeatureFlag(key: string, enabled: boolean): Promise<{ message: string; flag: any }> {
      return request<{ message: string; flag: any }>(`/admin/feature-flags/${key}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled }),
      })
    },
    async resetFeatureFlags(): Promise<{ message: string }> {
      return request<{ message: string }>('/admin/feature-flags/reset', {
        method: 'POST',
      })
    },
  },

  // Feature Flags Public Client API
  featureFlags: {
    async getAll(): Promise<FeatureFlagsResponse> {
      return request<FeatureFlagsResponse>('/feature-flags')
    },
  },
}
