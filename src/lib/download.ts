import { ref } from 'vue'

export interface DownloadToastState {
  id: number
  message: string
  filename?: string
  type: 'success' | 'error' | 'info'
}

export const activeDownloadToast = ref<DownloadToastState | null>(null)
let toastTimeout: any = null

/**
 * Display global floating toast for download feedback
 */
export function showDownloadToast(message: string, filename?: string, type: 'success' | 'error' | 'info' = 'success') {
  if (toastTimeout) clearTimeout(toastTimeout)
  activeDownloadToast.value = {
    id: Date.now(),
    message,
    filename,
    type,
  }
  toastTimeout = setTimeout(() => {
    activeDownloadToast.value = null
  }, 4500)
}

/**
 * Helper to close toast manually
 */
export function dismissDownloadToast() {
  if (toastTimeout) clearTimeout(toastTimeout)
  activeDownloadToast.value = null
}

/**
 * Helper to convert Base64 Data URL to a native binary Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',')
  const mimeMatch = parts[0].match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
  const bstr = atob(parts[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

/**
 * Get MIME & extension mapping for File System Access API
 */
function getPickerTypes(filename: string): Array<{ description: string; accept: Record<string, string[]> }> {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  if (ext === 'png') {
    return [{ description: 'PNG Image (*.png)', accept: { 'image/png': ['.png'] } }]
  } else if (ext === 'pdf') {
    return [{ description: 'PDF Document (*.pdf)', accept: { 'application/pdf': ['.pdf'] } }]
  } else if (ext === 'csv') {
    return [{ description: 'CSV Spreadsheet (*.csv)', accept: { 'text/csv': ['.csv'] } }]
  } else if (ext === 'md') {
    return [{ description: 'Markdown Document (*.md)', accept: { 'text/markdown': ['.md'] } }]
  } else if (ext === 'json') {
    return [{ description: 'JSON Document (*.json)', accept: { 'application/json': ['.json'] } }]
  }
  return [{ description: 'File Unduhan', accept: { 'application/octet-stream': [`.${ext}`] } }]
}

/**
 * 100% Pure Client-Side Downloader (Extension-Proof)
 * 
 * Works reliably across BOTH Google Chrome and Safari on macOS:
 * 1. Priority in Chromium/Chrome: Web File System Access API (`window.showSaveFilePicker`).
 *    Writes directly to macOS file system with zero URL creation, making it 100% immune to
 *    download manager / adblocker extensions that intercept blob URLs and corrupt them to ~1KB UUIDs!
 * 2. Silent cancel: If the user presses "Cancel", returns false without error toast.
 * 3. Fallback for Safari & non-Chromium: Bulletproof Blob anchor tag with native `a.click()`
 *    and 60-second delayed revocation.
 */
export async function downloadBlob(blob: Blob, filename: string): Promise<boolean> {
  try {
    if (typeof window === 'undefined') return false

    // 1. EXTENSION-PROOF PRIORITY: File System Access API (Native in Chromium/Chrome)
    if ('showSaveFilePicker' in window && typeof (window as any).showSaveFilePicker === 'function') {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: getPickerTypes(filename),
        })
        const writable = await handle.createWritable()
        await writable.write(blob)
        await writable.close()

        showDownloadToast(`File "${filename}" berhasil disimpan.`, filename, 'success')
        return true
      } catch (pickerErr: any) {
        // User deliberately clicked "Cancel" on macOS save dialog
        if (pickerErr?.name === 'AbortError') {
          return false
        }
        console.warn('showSaveFilePicker failed or blocked, falling back to anchor download:', pickerErr)
        // Fall through to anchor fallback
      }
    }

    // 2. FALLBACK: Native Blob Anchor (Safari & browsers without File System Access API)
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = blobUrl
    a.download = filename
    a.setAttribute('download', filename)
    a.rel = 'noopener'
    a.target = '_self'

    document.body.appendChild(a)
    a.click()

    setTimeout(() => {
      try {
        if (document.body.contains(a)) {
          document.body.removeChild(a)
        }
      } catch (e) {
        // ignore
      }
    }, 300)

    // Keep Object URL alive for 60s so background OS file writer can finish
    setTimeout(() => {
      try {
        URL.revokeObjectURL(blobUrl)
      } catch (e) {
        // ignore
      }
    }, 60000)

    showDownloadToast(`File "${filename}" berhasil diunduh.`, filename, 'success')
    return true
  } catch (err: any) {
    console.error('Pure client-side downloadBlob error:', err)
    showDownloadToast(`Gagal mengunduh berkas: ${err?.message || 'Error'}`, filename, 'error')
    return false
  }
}

/**
 * Pure Client-Side Text Downloader (Markdown, CSV, JSON)
 * Creates a native UTF-8 Blob and triggers downloadBlob.
 * Adds UTF-8 BOM for CSV files so Excel & Apple Numbers display international characters correctly.
 */
export async function downloadText(content: string, filename: string, customMimeType?: string): Promise<boolean> {
  try {
    let mime = customMimeType || 'text/plain;charset=utf-8'
    let payload = content

    if (filename.toLowerCase().endsWith('.csv')) {
      mime = 'text/csv;charset=utf-8'
      if (!payload.startsWith('\uFEFF')) {
        payload = '\uFEFF' + payload
      }
    } else if (filename.toLowerCase().endsWith('.md')) {
      mime = 'text/markdown;charset=utf-8'
    } else if (filename.toLowerCase().endsWith('.json')) {
      mime = 'application/json;charset=utf-8'
    }

    const blob = new Blob([payload], { type: mime })
    return await downloadBlob(blob, filename)
  } catch (err: any) {
    console.error('downloadText error:', err)
    showDownloadToast(`Gagal mengunduh teks: ${err?.message || 'Error'}`, filename, 'error')
    return false
  }
}

/**
 * Pure Client-Side Data URL Downloader
 * Converts Data URL to a native binary Blob first to avoid Chrome's ~2MB URL limits.
 */
export async function downloadDataUrl(dataUrl: string, filename: string): Promise<boolean> {
  try {
    const blob = dataUrlToBlob(dataUrl)
    return await downloadBlob(blob, filename)
  } catch (err: any) {
    console.error('downloadDataUrl error:', err)
    showDownloadToast(`Gagal mengunduh berkas: ${err?.message || 'Error'}`, filename, 'error')
    return false
  }
}


