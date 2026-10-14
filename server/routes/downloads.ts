import { Router } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const router = Router()
const TEMP_DIR = path.join(process.cwd(), 'scratch', 'downloads')

// Ensure scratch/downloads directory exists
try {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true })
  }
} catch (err) {
  console.error('Failed to create scratch/downloads directory:', err)
}

// Cleanup temporary files older than 30 minutes
function cleanupOldTempFiles() {
  try {
    if (!fs.existsSync(TEMP_DIR)) return
    const files = fs.readdirSync(TEMP_DIR)
    const now = Date.now()
    const maxAge = 30 * 60 * 1000 // 30 minutes

    for (const file of files) {
      const filePath = path.join(TEMP_DIR, file)
      try {
        const stats = fs.statSync(filePath)
        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filePath)
        }
      } catch (e) {
        // ignore
      }
    }
  } catch (err) {
    console.error('Error during temp files cleanup:', err)
  }
}

setInterval(cleanupOldTempFiles, 5 * 60 * 1000)

/**
 * Phase 1: Prepare file for native HTTP download
 * Writes payload to a disk-backed temporary file and returns a direct download URL
 * that ends with the exact target filename.
 */
router.post('/prepare', (req, res) => {
  try {
    const rawFilename = (req.body.filename || 'download.bin').trim()
    const safeFilename = rawFilename.replace(/[\r\n"\\/]/g, '_') || 'file_download'
    const mimeType = req.body.mimeType || 'application/octet-stream'

    let buffer: Buffer

    if (req.body.base64) {
      const cleanBase64 = req.body.base64.replace(/^data:[^;]+;base64,/, '')
      buffer = Buffer.from(cleanBase64, 'base64')
    } else {
      let content = req.body.content || ''
      if (safeFilename.toLowerCase().endsWith('.csv') && !content.startsWith('\uFEFF')) {
        content = '\uFEFF' + content
      }
      buffer = Buffer.from(content, 'utf-8')
    }

    const token = crypto.randomUUID()
    const dataFilePath = path.join(TEMP_DIR, `${token}.bin`)
    const metaFilePath = path.join(TEMP_DIR, `${token}.json`)

    fs.writeFileSync(dataFilePath, buffer)
    fs.writeFileSync(metaFilePath, JSON.stringify({
      filename: safeFilename,
      mimeType,
      size: buffer.length,
      createdAt: Date.now()
    }))

    // The downloadUrl explicitly ends with the real filename!
    // Example: /api/download/file/05ebebcc-2489.../sertifikat_kelulusan.png
    const downloadUrl = `/api/download/file/${token}/${encodeURIComponent(safeFilename)}`

    return res.json({
      success: true,
      token,
      downloadUrl,
      size: buffer.length,
      filename: safeFilename,
    })
  } catch (error: any) {
    console.error('Error preparing download:', error)
    return res.status(500).json({ error: 'Gagal mempersiapkan berkas unduhan di server.' })
  }
})

/**
 * Phase 2: Serve the prepared file with Express's native res.download()
 * URL explicitly ends with /:filename so that browsers NEVER default to a UUID name.
 */
router.get(['/file/:token/:filename', '/file/:token'], (req, res) => {
  try {
    const token = req.params.token
    const dataFilePath = path.join(TEMP_DIR, `${token}.bin`)
    const metaFilePath = path.join(TEMP_DIR, `${token}.json`)

    if (!fs.existsSync(dataFilePath) || !fs.existsSync(metaFilePath)) {
      return res.status(404).send('Tautan unduhan telah kedaluwarsa atau tidak valid. Silakan unduh kembali.')
    }

    const meta = JSON.parse(fs.readFileSync(metaFilePath, 'utf-8'))
    const safeFilename = meta.filename || req.params.filename || 'download.bin'

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')

    // Express res.download sets RFC Content-Disposition and streams file directly
    return res.download(dataFilePath, safeFilename, (err) => {
      if (err) {
        console.error('res.download stream error:', err)
      }
    })
  } catch (error: any) {
    console.error('Error streaming download:', error)
    return res.status(500).send('Gagal mengunduh berkas.')
  }
})

export default router
