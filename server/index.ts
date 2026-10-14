import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth'
import statsRoutes from './routes/stats'
import coursesRoutes from './routes/courses'
import certificatesRoutes from './routes/certificates'
import downloadsRoutes from './routes/downloads'
import usersRoutes from './routes/users'
import adminRoutes from './routes/admin'
import {
  publicFeatureFlagsRouter,
  adminFeatureFlagsRouter,
  initFeatureFlagsTable,
  isFeatureEnabledServer
} from './routes/featureFlags'
import jwt from 'jsonwebtoken'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: true, limit: '20mb' }))

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Lingua LMS Backend', timestamp: new Date().toISOString() })
})

// Feature Flags Public Route
app.use('/api/feature-flags', publicFeatureFlagsRouter)

// Maintenance Mode Global Middleware for non-admin requests
app.use(async (req, res, next) => {
  if (
    req.path === '/api/health' ||
    req.path === '/api/auth/login' ||
    req.path.startsWith('/api/admin') ||
    req.path.startsWith('/api/feature-flags')
  ) {
    return next()
  }

  const isMaintenance = await isFeatureEnabledServer('maintenance_mode')
  if (isMaintenance) {
    const authHeader = req.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1]
        const decoded = jwt.decode(token) as any
        if (decoded?.role === 'admin') {
          return next()
        }
      } catch {}
    }

    return res.status(503).json({
      error: 'Platform sedang dalam mode pemeliharaan (Maintenance Mode). Silakan coba beberapa saat lagi.',
      maintenance: true,
    })
  }

  next()
})

app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/admin/feature-flags', adminFeatureFlagsRouter)
app.use('/api/users', usersRoutes)
app.use('/api/courses', coursesRoutes)
app.use('/api/certificates', certificatesRoutes)
app.use('/api/download', downloadsRoutes)
app.use('/api/stats', statsRoutes)

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan.' })
})

// Initialize Feature Flags Table & Seed
initFeatureFlagsTable()

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Lingua LMS Backend server is running at http://localhost:${PORT}`)
})

export default app
