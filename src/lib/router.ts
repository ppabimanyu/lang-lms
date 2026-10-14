import { ref, watch, nextTick } from 'vue'
import {
  activeTab,
  adminActiveTab,
  selectedCourseId,
  selectedChapterId,
  isExamActive,
  selectedAuthorId,
  currentUser,
  openCourse,
  openUserProfile,
  activeCourse,
  activeAuthorProfile,
} from './storage'
import type { AdminNavigationTab } from '@/types'

export const verifyParamId = ref<string>('')

let isSyncingFromUrl = false
let isRouterInitialized = false

/**
 * Parse current browser URL (hash and search query parameters)
 */
export function parseCurrentRoute(): { path: string; params: Record<string, string> } {
  if (typeof window === 'undefined') return { path: 'dashboard', params: {} }

  // 1. Check legacy or standalone query param ?verify=
  const searchParams = new URLSearchParams(window.location.search)
  const queryVerify = searchParams.get('verify')
  if (queryVerify !== null) {
    return {
      path: 'verify',
      params: { id: queryVerify },
    }
  }

  // 2. Parse hash: supports #/courses, /#courses, #courses, #/course?id=123, etc.
  const rawHash = window.location.hash || ''
  const cleanHash = rawHash.replace(/^[#/]+/, '')

  if (!cleanHash) {
    return { path: 'dashboard', params: {} }
  }

  const [pathPart, queryPart] = cleanHash.split('?')
  const params: Record<string, string> = {}
  if (queryPart) {
    const hashParams = new URLSearchParams(queryPart)
    hashParams.forEach((val, key) => {
      params[key] = val
    })
  }

  return {
    path: pathPart.trim(),
    params,
  }
}

/**
 * Compute the target URL hash corresponding to current application state
 */
export function computeCurrentHash(): string {
  // If user is admin, their whole interface is under AdminLayout:
  if (currentUser.value?.role === 'admin') {
    const validTabs: AdminNavigationTab[] = ['dashboard', 'users', 'courses', 'activity', 'flags']
    const subTab = validTabs.includes(adminActiveTab.value) ? adminActiveTab.value : 'dashboard'
    return `/#admin?tab=${subTab}`
  }

  // Regular user or guest views
  switch (activeTab.value) {
    case 'courses':
      return '/#courses'
    case 'course-detail': {
      if (!selectedCourseId.value) return '/#courses'
      let hash = `/#course?id=${encodeURIComponent(selectedCourseId.value)}`
      if (isExamActive.value) {
        hash += '&exam=1'
      } else if (selectedChapterId.value) {
        hash += `&chapter=${encodeURIComponent(selectedChapterId.value)}`
      }
      return hash
    }
    case 'my-courses':
      return '/#my-courses'
    case 'manager':
      return '/#manager'
    case 'account':
      return '/#account'
    case 'user-profile':
      return selectedAuthorId.value ? `/#profile?id=${encodeURIComponent(selectedAuthorId.value)}` : '/#courses'
    case 'verify':
      return verifyParamId.value ? `/#verify?id=${encodeURIComponent(verifyParamId.value)}` : '/#verify'
    case 'admin':
      return `/#admin?tab=${adminActiveTab.value || 'dashboard'}`
    case 'dashboard':
    default:
      return '/#dashboard'
  }
}

/**
 * Synchronize application state to browser URL history
 */
export function syncStateToUrl(replace = false) {
  if (typeof window === 'undefined') return
  if (isSyncingFromUrl) return

  const targetUrl = computeCurrentHash()
  const targetHashIndex = targetUrl.indexOf('#')
  const targetHash = targetHashIndex >= 0 ? targetUrl.substring(targetHashIndex) : ''

  const currentHash = window.location.hash || ''
  const normCurrent = currentHash.replace(/^#\/?/, '')
  const normTarget = targetHash.replace(/^#\/?/, '')

  if (normCurrent !== normTarget) {
    if (replace) {
      window.history.replaceState(null, '', targetUrl)
    } else {
      window.history.pushState(null, '', targetUrl)
    }
  }
}

/**
 * Synchronize browser URL into application state (on initial load or popstate/hashchange)
 */
export async function applyRouteToState(replaceUrl = false) {
  if (typeof window === 'undefined') return

  const { path, params } = parseCurrentRoute()
  isSyncingFromUrl = true

  try {
    if (path === 'course' || path === 'course-detail') {
      const courseId = params.id
      if (courseId) {
        selectedCourseId.value = courseId
        activeTab.value = 'course-detail'
        if (params.exam === '1') {
          isExamActive.value = true
          selectedChapterId.value = null
        } else if (params.chapter) {
          selectedChapterId.value = params.chapter
          isExamActive.value = false
        } else {
          selectedChapterId.value = null
          isExamActive.value = false
        }

        if (activeCourse.value?.id !== courseId) {
          try {
            await openCourse(courseId, params.chapter)
          } catch (err) {
            console.error('Failed to load course from route:', err)
            activeTab.value = 'courses'
            syncStateToUrl(true)
          }
        }
      } else {
        activeTab.value = 'courses'
        syncStateToUrl(true)
      }
    } else if (path === 'profile' || path === 'user-profile') {
      const authorId = params.id
      if (authorId) {
        selectedAuthorId.value = authorId
        activeTab.value = 'user-profile'
        if (activeAuthorProfile.value?.id !== authorId) {
          try {
            await openUserProfile(authorId)
          } catch (err) {
            console.error('Failed to load user profile from route:', err)
            activeTab.value = 'courses'
            syncStateToUrl(true)
          }
        }
      } else {
        activeTab.value = 'courses'
        syncStateToUrl(true)
      }
    } else if (path === 'verify') {
      verifyParamId.value = params.id || ''
      activeTab.value = 'verify'
    } else if (path === 'admin') {
      activeTab.value = 'admin'
      const validAdminTabs: AdminNavigationTab[] = ['dashboard', 'users', 'courses', 'activity', 'flags']
      const targetAdminTab = params.tab as AdminNavigationTab
      if (validAdminTabs.includes(targetAdminTab)) {
        adminActiveTab.value = targetAdminTab
      } else {
        adminActiveTab.value = 'dashboard'
      }
    } else if (path === 'courses') {
      activeTab.value = 'courses'
    } else if (path === 'my-courses') {
      activeTab.value = 'my-courses'
    } else if (path === 'manager') {
      activeTab.value = 'manager'
    } else if (path === 'account') {
      activeTab.value = 'account'
    } else {
      activeTab.value = 'dashboard'
    }

    if (replaceUrl) {
      syncStateToUrl(true)
    }
  } finally {
    // Release the syncing lock after the DOM / watchers have processed state change
    await nextTick()
    isSyncingFromUrl = false
  }
}

/**
 * Initialize URL-Hash Router and event listeners
 */
export function initRouter() {
  if (typeof window === 'undefined' || isRouterInitialized) return
  isRouterInitialized = true

  // 1. Initial route sync on application boot
  applyRouteToState(true)

  // 2. Handle browser Back and Forward history buttons
  const onPopState = () => {
    applyRouteToState(false)
  }

  window.addEventListener('popstate', onPopState)
  window.addEventListener('hashchange', onPopState)

  // 3. Watch application state changes and sync to URL hash
  watch(
    [
      activeTab,
      adminActiveTab,
      selectedCourseId,
      selectedChapterId,
      isExamActive,
      selectedAuthorId,
      currentUser,
      verifyParamId,
    ],
    () => {
      if (isSyncingFromUrl) return
      syncStateToUrl(false)
    },
    { deep: true }
  )
}
