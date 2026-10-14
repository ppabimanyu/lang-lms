import { ref, computed } from 'vue'
import { api } from '@/lib/api'
import type { FeatureFlagItem, FeatureFlagKey } from '@/types'

const STORAGE_KEY = 'lingua_feature_flags_cache_v1'

const DEFAULT_FLAGS_MAP: Record<string, boolean> = {
  maintenance_mode: false,
  enable_registration: true,
  enable_course_creation: true,
  enable_reviews: true,
  enable_certificates: true,
  enable_leaderboard: true,
  enable_tts: true,
  enable_demo_features: false,
}

// Load cached flags from localStorage if available
function loadCachedFlags(): Record<string, boolean> {
  if (typeof window === 'undefined') return { ...DEFAULT_FLAGS_MAP }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...DEFAULT_FLAGS_MAP, ...parsed }
    }
  } catch {}
  return { ...DEFAULT_FLAGS_MAP }
}

export const flagsMap = ref<Record<string, boolean>>(loadCachedFlags())
export const flagsList = ref<FeatureFlagItem[]>([])
export const isLoadingFlags = ref(false)
export const flagsError = ref<string | null>(null)

export const isMaintenanceActive = computed(() => {
  return flagsMap.value['maintenance_mode'] === true
})

/**
 * Fetch feature flags from public API and update cache
 */
export async function fetchFeatureFlags(): Promise<void> {
  isLoadingFlags.value = true
  flagsError.value = null
  try {
    const data = await api.featureFlags.getAll()
    if (data?.map) {
      flagsMap.value = { ...DEFAULT_FLAGS_MAP, ...data.map }
      flagsList.value = data.flags || []
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(flagsMap.value))
      } catch {}
    }
  } catch (err: any) {
    console.warn('Gagal memuat feature flags dari server, menggunakan cache lokal:', err)
    flagsError.value = err.message || 'Gagal memuat feature flags'
  } finally {
    isLoadingFlags.value = false
  }
}

/**
 * Periksa apakah sebuah fitur tertentu sedang aktif (default: true jika flag tidak terdaftar)
 */
export function isFeatureEnabled(key: FeatureFlagKey | string): boolean {
  if (key in flagsMap.value) {
    return flagsMap.value[key] === true
  }
  return true
}

/**
 * Update nilai flag di memory cache secara lokal
 */
export function setLocalFlag(key: string, enabled: boolean): void {
  flagsMap.value[key] = enabled
  const item = flagsList.value.find(f => f.key === key)
  if (item) {
    item.enabled = enabled
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flagsMap.value))
  } catch {}
}
