import { Router, Request, Response } from 'express'
import { eq, asc } from 'drizzle-orm'
import { db, pool } from '../db'
import { featureFlags } from '../db/schema'
import { requireAuth, requireAdmin } from '../middleware/auth'

export interface DefaultFlag {
  key: string
  name: string
  description: string
  category: 'system' | 'learning' | 'interaction' | 'gamification'
  enabled: number
  isCritical: number
}

export const DEFAULT_FEATURE_FLAGS: DefaultFlag[] = [
  {
    key: 'maintenance_mode',
    name: 'Mode Pemeliharaan (Maintenance Mode)',
    description: 'Mengaktifkan mode perawatan platform. Pengguna umum akan melihat layar pemeliharaan, sementara Administrator tetap dapat login dan mengakses sistem.',
    category: 'system',
    enabled: 0,
    isCritical: 1,
  },
  {
    key: 'enable_registration',
    name: 'Pendaftaran Akun Baru',
    description: 'Mengizinkan pengguna baru mendaftar akun di platform Lingua LMS.',
    category: 'system',
    enabled: 1,
    isCritical: 1,
  },
  {
    key: 'enable_course_creation',
    name: 'Pembuatan & Impor Kursus',
    description: 'Mengizinkan pengguna dan pembuat konten menyusun kursus baru serta mengimpor bank soal CSV.',
    category: 'learning',
    enabled: 1,
    isCritical: 0,
  },
  {
    key: 'enable_reviews',
    name: 'Ulasan & Rating Kursus',
    description: 'Mengizinkan pembelajar yang telah lulus memberikan ulasan komentar dan rating 1-5 bintang.',
    category: 'interaction',
    enabled: 1,
    isCritical: 0,
  },
  {
    key: 'enable_certificates',
    name: 'Sertifikat Digital Ber-QR Code',
    description: 'Menerbitkan sertifikat kelulusan resmi ber-QR code dan memfasilitasi verifikasi publik.',
    category: 'learning',
    enabled: 1,
    isCritical: 0,
  },
  {
    key: 'enable_leaderboard',
    name: 'Papan Peringkat & Gamifikasi XP',
    description: 'Menampilkan peringkat leaderboard skor XP dan streak belajar pada antarmuka siswa.',
    category: 'gamification',
    enabled: 1,
    isCritical: 0,
  },
  {
    key: 'enable_tts',
    name: 'Audio Text-to-Speech (TTS)',
    description: 'Mengaktifkan tombol pemutar suara audio pelafalan asli pada materi bacaan dan soal kuis.',
    category: 'learning',
    enabled: 1,
    isCritical: 0,
  },
  {
    key: 'enable_flashcards',
    name: 'Flashcards & Spaced Repetition',
    description: 'Modul latihan kartu hafalan kosakata bolak-balik dengan Spaced Repetition (SRS) dan pelafalan audio TTS.',
    category: 'learning',
    enabled: 1,
    isCritical: 0,
  },
  {
    key: 'enable_demo_features',
    name: 'Fitur Demo & Akses Cepat',
    description: 'Menampilkan tombol login demo 1-klik, jalan pintas kredensial demo pada form login, serta simulasi pengujian ID demo di halaman sertifikat.',
    category: 'system',
    enabled: 0,
    isCritical: 0,
  },
]

// In-memory cache for ultra-fast server lookups
let cachedFlagMap: Record<string, boolean> = {}
let cacheInitialized = false

/**
 * Inisialisasi tabel feature_flags jika belum ada dan seed default rows
 */
export async function initFeatureFlagsTable(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feature_flags (
        key TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'system',
        enabled INTEGER NOT NULL DEFAULT 1,
        is_critical INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_by TEXT DEFAULT 'System'
      );
    `)

    for (const flag of DEFAULT_FEATURE_FLAGS) {
      await pool.query(
        `
        INSERT INTO feature_flags (key, name, description, category, enabled, is_critical, updated_at, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), 'System')
        ON CONFLICT (key) DO NOTHING;
      `,
        [flag.key, flag.name, flag.description, flag.category, flag.enabled, flag.isCritical]
      )
    }

    // Refresh memory cache
    await refreshMemoryFlagsCache()
    console.log('✅ Feature Flags table initialized & memory cache primed.')
  } catch (error) {
    console.error('⚠️ Error initializing feature flags table:', error)
  }
}

/**
 * Muat seluruh flag dari DB ke memory cache
 */
export async function refreshMemoryFlagsCache(): Promise<Record<string, boolean>> {
  try {
    const rows = await db.select().from(featureFlags)
    const map: Record<string, boolean> = {}
    for (const r of rows) {
      map[r.key] = r.enabled === 1
    }
    cachedFlagMap = map
    cacheInitialized = true
    return map
  } catch (err) {
    console.warn('⚠️ Gagal me-refresh cache feature flags dari DB, menggunakan fallback:', err)
    if (!cacheInitialized) {
      const fallbackMap: Record<string, boolean> = {}
      DEFAULT_FEATURE_FLAGS.forEach(f => {
        fallbackMap[f.key] = f.enabled === 1
      })
      cachedFlagMap = fallbackMap
    }
    return cachedFlagMap
  }
}

/**
 * Helper untuk memeriksa status aktif feature flag di server
 */
export async function isFeatureEnabledServer(key: string): Promise<boolean> {
  if (!cacheInitialized) {
    await refreshMemoryFlagsCache()
  }
  if (key in cachedFlagMap) {
    return cachedFlagMap[key]
  }
  const defaultFlag = DEFAULT_FEATURE_FLAGS.find(f => f.key === key)
  if (defaultFlag) {
    return defaultFlag.enabled === 1
  }
  return key !== 'maintenance_mode'
}

// ==========================================
// 1. PUBLIC ROUTER: /api/feature-flags
// ==========================================
export const publicFeatureFlagsRouter = Router()

publicFeatureFlagsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const rows = await db.select().from(featureFlags).orderBy(asc(featureFlags.category), asc(featureFlags.key))
    const map: Record<string, boolean> = {}
    const list = rows.map(r => {
      const isEnabled = r.enabled === 1
      map[r.key] = isEnabled
      return {
        key: r.key,
        name: r.name,
        description: r.description,
        category: r.category,
        enabled: isEnabled,
        isCritical: r.isCritical === 1,
      }
    })
    cachedFlagMap = map
    cacheInitialized = true

    res.json({
      flags: list,
      map,
    })
  } catch (error: any) {
    // Fallback response jika query error
    const map: Record<string, boolean> = {}
    const list = DEFAULT_FEATURE_FLAGS.map(f => {
      const isEnabled = f.enabled === 1
      map[f.key] = isEnabled
      return {
        key: f.key,
        name: f.name,
        description: f.description,
        category: f.category,
        enabled: isEnabled,
        isCritical: f.isCritical === 1,
      }
    })
    res.json({ flags: list, map })
  }
})

// ==========================================
// 2. ADMIN ROUTER: /api/admin/feature-flags
// ==========================================
export const adminFeatureFlagsRouter = Router()

// Proteksi akses admin
adminFeatureFlagsRouter.use(requireAuth)
adminFeatureFlagsRouter.use(requireAdmin)

// GET /api/admin/feature-flags - List all flags with full audit info
adminFeatureFlagsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const rows = await db.select().from(featureFlags).orderBy(asc(featureFlags.category), asc(featureFlags.key))
    const formatted = rows.map(r => ({
      key: r.key,
      name: r.name,
      description: r.description,
      category: r.category,
      enabled: r.enabled === 1,
      isCritical: r.isCritical === 1,
      updatedAt: r.updatedAt ? r.updatedAt.toISOString() : null,
      updatedBy: r.updatedBy || 'System',
    }))
    res.json(formatted)
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Gagal memuat feature flags.' })
  }
})

// PATCH /api/admin/feature-flags/:key - Update a feature flag's state
adminFeatureFlagsRouter.patch('/:key', async (req: Request, res: Response) => {
  const { key } = req.params
  const { enabled } = req.body

  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'Nilai `enabled` harus berupa boolean (true/false).' })
  }

  try {
    const adminUser = req.user?.email || 'Admin'

    const [existing] = await db.select().from(featureFlags).where(eq(featureFlags.key, key))
    if (!existing) {
      return res.status(404).json({ error: `Feature flag dengan key '${key}' tidak ditemukan.` })
    }

    const newEnabledInt = enabled ? 1 : 0
    await db
      .update(featureFlags)
      .set({
        enabled: newEnabledInt,
        updatedAt: new Date(),
        updatedBy: adminUser,
      })
      .where(eq(featureFlags.key, key))

    // Update memory cache
    cachedFlagMap[key] = enabled

    res.json({
      message: `Feature flag '${existing.name}' berhasil ${enabled ? 'diaktifkan' : 'dinonaktifkan'}.`,
      flag: {
        key,
        name: existing.name,
        enabled,
        updatedAt: new Date().toISOString(),
        updatedBy: adminUser,
      },
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Gagal memperbarui feature flag.' })
  }
})

// POST /api/admin/feature-flags/reset - Reset all feature flags to default values
adminFeatureFlagsRouter.post('/reset', async (req: Request, res: Response) => {
  try {
    const adminUser = req.user?.email || 'Admin'

    for (const flag of DEFAULT_FEATURE_FLAGS) {
      await db
        .insert(featureFlags)
        .values({
          key: flag.key,
          name: flag.name,
          description: flag.description,
          category: flag.category,
          enabled: flag.enabled,
          isCritical: flag.isCritical,
          updatedAt: new Date(),
          updatedBy: adminUser,
        })
        .onConflictDoUpdate({
          target: featureFlags.key,
          set: {
            name: flag.name,
            description: flag.description,
            category: flag.category,
            enabled: flag.enabled,
            isCritical: flag.isCritical,
            updatedAt: new Date(),
            updatedBy: `${adminUser} (Reset)`,
          },
        })
    }

    await refreshMemoryFlagsCache()

    res.json({
      message: 'Seluruh feature flags telah berhasil direset ke konfigurasi bawaan platform.',
    })
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Gagal mereset feature flags.' })
  }
})
