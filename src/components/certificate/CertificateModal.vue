<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import QRCode from 'qrcode'
import {
  Dialog,
  DialogContent,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toPng, toBlob } from 'html-to-image'
import { jsPDF } from 'jspdf'
import { downloadBlob, showDownloadToast } from '@/lib/download'
import {
  Award,
  Printer,
  ShieldCheck,
  Download,
  Loader2,
  Sparkles,
  QrCode,
  ExternalLink,
  Copy,
  Check,
  FileText,
  Share2
} from '@lucide/vue'

const props = defineProps<{
  open: boolean
  userName: string
  courseTitle: string
  level: string
  targetLanguage: string
  accuracy: number
  certificateId: string
  completedDate?: string
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const isDownloadingPng = ref(false)
const isDownloadingPdf = ref(false)
const isPngDownloaded = ref(false)
const isPdfDownloaded = ref(false)
const isPrinting = ref(false)
const isCopied = ref(false)
const isLinkCopied = ref(false)
const qrDataUrl = ref<string>('')

// Direct URL for smartphone QR scanning & online verification
const verificationUrl = computed(() => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
  const certId = props.certificateId || 'CERT-SUCCESS'
  return `${origin}/#verify?id=${encodeURIComponent(certId)}`
})

// Generate crisp, scannable QR code
async function generateQrCode() {
  try {
    qrDataUrl.value = await QRCode.toDataURL(verificationUrl.value, {
      width: 260,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
  } catch (err) {
    console.error('Failed to generate certificate QR code:', err)
  }
}

watch([() => props.certificateId, verificationUrl], generateQrCode, { immediate: true })

async function copyVerificationCode() {
  const code = props.certificateId || 'CERT-SUCCESS'
  try {
    await navigator.clipboard.writeText(code)
    isCopied.value = true
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  } catch (e) {
    console.error('Failed to copy verification code:', e)
  }
}

async function copyVerificationLink() {
  try {
    await navigator.clipboard.writeText(verificationUrl.value)
    isLinkCopied.value = true
    showDownloadToast('Tautan Verifikasi Resmi berhasil disalin ke clipboard!')
    setTimeout(() => {
      isLinkCopied.value = false
    }, 2500)
  } catch (e) {
    console.error('Failed to copy verification link:', e)
  }
}

function shareToLinkedInProfile() {
  const dateObj = props.completedDate ? new Date(props.completedDate) : new Date()
  const issueYear = dateObj.getFullYear()
  const issueMonth = dateObj.getMonth() + 1
  const certId = props.certificateId || 'CERT-SUCCESS'

  const params = new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name: props.courseTitle,
    organizationName: 'Lingua LMS',
    issueYear: String(issueYear),
    issueMonth: String(issueMonth),
    certUrl: verificationUrl.value,
    certId: certId
  })

  const url = `https://www.linkedin.com/profile/add?${params.toString()}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

function shareToLinkedInFeed() {
  const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verificationUrl.value)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

function shareToWhatsApp() {
  const certId = props.certificateId || 'CERT-SUCCESS'
  const message = `🎉 *Sertifikat Resmi Lingua LMS* 🎉\n\nSaya telah berhasil menyelesaikan kursus *"${props.courseTitle}"* dengan skor akurasi *${props.accuracy}%*!\n\nLihat & verifikasi sertifikat saya secara online di:\n🔗 ${verificationUrl.value}\n\nNomor Kredensial: *${certId}*`
  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

function openVerificationPage() {
  if (typeof window !== 'undefined') {
    window.open(verificationUrl.value, '_blank')
  }
}

// 1. Download as High-Resolution PNG
async function downloadCertificateImage() {
  const el = document.getElementById('printable-certificate')
  if (!el) return
  isDownloadingPng.value = true
  try {
    const sanitizedName = (props.userName || 'siswa').replace(/\s+/g, '_').toLowerCase()
    const filename = `sertifikat_${sanitizedName}_${props.certificateId || 'lingua'}.png`

    const blob = await toBlob(el, {
      pixelRatio: 2.2,
      cacheBust: true,
      backgroundColor: '#ffffff',
      skipFonts: true,
    })
    if (!blob) throw new Error('Gagal menghasilkan kanvas sertifikat')
    const success = await downloadBlob(blob, filename)
    if (success) {
      isPngDownloaded.value = true
      setTimeout(() => { isPngDownloaded.value = false }, 2500)
    }
  } catch (e: any) {
    console.error('Failed to export certificate image:', e)
    showDownloadToast(`Gagal mengunduh gambar sertifikat: ${e?.message || 'Error'}`, '', 'error')
  } finally {
    isDownloadingPng.value = false
  }
}

// 2. Download directly as A4 Landscape PDF Document
async function downloadCertificatePdf() {
  const el = document.getElementById('printable-certificate')
  if (!el) return
  isDownloadingPdf.value = true
  try {
    const dataUrl = await toPng(el, {
      pixelRatio: 2.2,
      cacheBust: true,
      backgroundColor: '#ffffff',
      skipFonts: true,
    })
    if (!dataUrl) throw new Error('Gagal merender sertifikat untuk dokumen PDF')

    // Standard A4 landscape dimensions (297mm x 210mm)
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
      compress: true,
    })

    const pageWidth = 297
    const pageHeight = 210
    const margin = 12
    const printWidth = pageWidth - (margin * 2) // 273mm
    const elRect = el.getBoundingClientRect()
    const aspectRatio = elRect.height / elRect.width
    const printHeight = printWidth * aspectRatio
    const posY = Math.max(margin, (pageHeight - printHeight) / 2)

    pdf.addImage(dataUrl, 'PNG', margin, posY, printWidth, printHeight, undefined, 'FAST')
    const sanitizedName = (props.userName || 'siswa').replace(/\s+/g, '_').toLowerCase()
    const filename = `sertifikat_${sanitizedName}_${props.certificateId || 'lingua'}.pdf`
    
    // Output directly as binary Blob
    const pdfBlob = pdf.output('blob')
    const success = await downloadBlob(pdfBlob, filename)
    if (success) {
      isPdfDownloaded.value = true
      setTimeout(() => { isPdfDownloaded.value = false }, 2500)
    }
  } catch (e: any) {
    console.error('Failed to export certificate PDF:', e)
    showDownloadToast(`Gagal mengunduh dokumen PDF: ${e?.message || 'Error'}`, '', 'error')
  } finally {
    isDownloadingPdf.value = false
  }
}

// 2. Print via Isolated Clean Iframe (Guarantees A4 Landscape & No UI bleed-through)
function printCertificate() {
  const el = document.getElementById('printable-certificate')
  if (!el) return
  isPrinting.value = true

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (!doc) {
    isPrinting.value = false
    return
  }

  // Collect styles
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(style => style.outerHTML)
    .join('\n')

  doc.open()
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Sertifikat Kelulusan - ${props.userName || 'Pembelajar'}</title>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        ${styles}
        <style>
          @page {
            size: A4 landscape;
            margin: 0;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff !important;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
          }
          #print-wrapper {
            width: 297mm;
            height: 210mm;
            padding: 10mm;
            box-sizing: border-box;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          #printable-certificate {
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            box-sizing: border-box !important;
          }
        </style>
      </head>
      <body>
        <div id="print-wrapper">
          ${el.outerHTML}
        </div>
      </body>
    </html>
  `)
  doc.close()

  setTimeout(() => {
    isPrinting.value = false
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe)
      }
    }, 2000)
  }, 450)
}
</script>

<template>
  <Dialog :open="open" @update:open="(val) => emit('update:open', val)">
    <DialogContent class="sm:max-w-4xl max-w-4xl w-[95vw] p-0 border-border/80 shadow-2xl bg-card max-h-[95vh] flex flex-col overflow-hidden">
      <!-- Scrollable Certificate Canvas Container -->
      <div class="p-2 sm:p-5 overflow-y-auto flex-1 flex items-center justify-center bg-muted/20">
        <!-- Certificate Visual Container (Printable Area - Proportionate A4 Landscape) -->
        <div
          id="printable-certificate"
          class="w-full max-w-[800px] relative p-5 sm:p-8 bg-gradient-to-br from-amber-500/[0.04] via-background to-emerald-500/[0.04] text-foreground border-[6px] border-double border-amber-600/35 rounded-xl flex flex-col justify-between overflow-hidden shadow-xs select-none"
        >
        <!-- Vintage Corner Filigree Ornaments -->
        <div class="absolute top-2 left-2 size-8 border-t-2 border-l-2 border-amber-600/60 flex items-start justify-start p-0.5">
          <div class="size-2 bg-amber-500/30 rounded-xs"></div>
        </div>
        <div class="absolute top-2 right-2 size-8 border-t-2 border-r-2 border-amber-600/60 flex items-start justify-end p-0.5">
          <div class="size-2 bg-amber-500/30 rounded-xs"></div>
        </div>
        <div class="absolute bottom-2 left-2 size-8 border-b-2 border-l-2 border-amber-600/60 flex items-end justify-start p-0.5">
          <div class="size-2 bg-amber-500/30 rounded-xs"></div>
        </div>
        <div class="absolute bottom-2 right-2 size-8 border-b-2 border-r-2 border-amber-600/60 flex items-end justify-end p-0.5">
          <div class="size-2 bg-amber-500/30 rounded-xs"></div>
        </div>

        <!-- Subtle Inner Border Frame -->
        <div class="absolute inset-4 border border-dashed border-amber-600/20 pointer-events-none rounded-lg"></div>

        <!-- Header Section -->
        <div class="text-center space-y-1 pt-1 z-10">
          <div class="inline-flex items-center justify-center size-12 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 text-white shadow-md shadow-amber-500/25 mx-auto mb-1">
            <Award class="size-7" />
          </div>
          <div class="text-[11px] font-mono font-bold tracking-[0.25em] text-primary uppercase">
            Lingua LMS • Official Certificate of Completion
          </div>
          <h2 class="text-2xl sm:text-3xl font-serif font-black tracking-tight text-foreground uppercase pt-0.5">
            Sertifikat Kelulusan Resmi
          </h2>
          <p class="text-[11px] text-muted-foreground italic">
            Diberikan sebagai pengakuan resmi atas penguasaan modul pembelajaran dan kelulusan evaluasi interaktif
          </p>
        </div>

        <!-- Body Section -->
        <div class="text-center space-y-3 my-4 z-10">
          <div class="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
            Dengan bangga dianugerahkan kepada:
          </div>
          <div class="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary font-serif border-b-2 border-amber-600/30 pb-1 max-w-lg mx-auto">
            {{ userName || 'Pembelajar Bahasa' }}
          </div>
          <p class="text-xs text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Telah berhasil mempelajari seluruh materi tata bahasa dan dinyatakan <strong class="text-foreground">LULUS</strong> pada evaluasi komprehensif program kursus:
          </p>

          <!-- Course Highlight Box -->
          <div class="p-3 rounded-xl bg-card/90 border border-border/80 max-w-lg mx-auto shadow-xs">
            <div class="text-base sm:text-lg font-bold text-foreground">
              {{ courseTitle }}
            </div>
            <div class="flex items-center justify-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
              <Badge variant="outline" class="font-mono text-[10px] border-primary/40 text-primary bg-primary/5">
                Tingkat {{ level }}
              </Badge>
              <span>•</span>
              <span class="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Sparkles class="size-3" />
                Akurasi Evaluasi: {{ accuracy }}%
              </span>
            </div>
          </div>
        </div>

        <!-- Footer Section (3 Columns: Digital Signature, Embossed Seal, Verification QR) -->
        <div class="pt-4 border-t border-amber-600/20 grid grid-cols-3 items-end text-xs z-10 gap-2">
          <!-- 1. Digital Signature -->
          <div class="space-y-1 text-left">
            <div class="h-8 flex items-end">
              <!-- Stylized SVG Handwritten Signature -->
              <svg class="h-7 w-28 text-foreground/80" viewBox="0 0 140 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 25C20 15 35 30 50 18C65 6 75 35 90 20C105 5 115 28 135 15" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                <path d="M25 28C45 27 85 24 125 26" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
              </svg>
            </div>
            <div class="border-t border-border/80 pt-1">
              <div class="font-bold text-[11px] text-foreground leading-tight">Dr. Helena Vance, M.Ed.</div>
              <div class="text-[9px] text-muted-foreground">Direktur Kurikulum Akademik</div>
            </div>
          </div>

          <!-- 2. Embossed Gold Official Seal -->
          <div class="flex flex-col items-center justify-center text-center">
            <div class="size-16 rounded-full border-2 border-amber-500/80 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/30 flex flex-col items-center justify-center p-1 relative">
              <div class="absolute inset-0.5 rounded-full border border-dashed border-white/60 pointer-events-none"></div>
              <ShieldCheck class="size-5 mb-0.5 text-white drop-shadow-xs" />
              <span class="text-[8px] font-black uppercase tracking-tighter leading-none text-white">RESMI</span>
              <span class="text-[6px] tracking-widest uppercase opacity-90 leading-tight">LINGUA</span>
            </div>
          </div>

          <!-- 3. Verification Details & Real Scannable QR Code -->
          <div class="space-y-1.5 text-right flex flex-col items-end">
            <div class="flex items-center gap-2.5">
              <div class="text-right flex flex-col items-end">
                <div class="text-[9px] text-muted-foreground font-mono flex items-center gap-1">
                  <span>ID Verifikasi:</span>
                  <button
                    type="button"
                    @click="copyVerificationCode"
                    class="hover:text-primary transition-colors cursor-pointer inline-flex items-center"
                    :title="isCopied ? 'Tersalin ke papan klip!' : 'Salin Kode Verifikasi'"
                  >
                    <Check v-if="isCopied" class="size-2.5 text-emerald-600 dark:text-emerald-400" />
                    <Copy v-else class="size-2.5 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
                <div
                  class="font-mono font-bold text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 tracking-wider select-all"
                  :title="props.certificateId || 'CERT-SUCCESS'"
                >
                  {{ props.certificateId || 'CERT-SUCCESS' }}
                </div>
                <div class="text-[8px] text-muted-foreground/80 pt-0.5">
                  Pindai QR untuk validasi
                </div>
              </div>

              <!-- Real Scannable QR Code Box -->
              <a
                :href="verificationUrl"
                target="_blank"
                rel="noopener noreferrer"
                title="Pindai dengan kamera smartphone atau klik untuk membuka verifikasi"
                class="size-11 sm:size-12 bg-white border border-border/80 p-0.5 rounded-lg shadow-xs flex items-center justify-center shrink-0 hover:ring-2 hover:ring-primary/40 transition-all cursor-pointer group"
              >
                <img
                  v-if="qrDataUrl"
                  :src="qrDataUrl"
                  alt="QR Verifikasi Resmi"
                  class="size-full object-contain"
                />
                <QrCode v-else class="size-7 text-foreground" />
              </a>
            </div>
            <div class="text-[9px] text-muted-foreground pt-0.5">
              Diterbitkan: {{ completedDate ? new Date(completedDate).toLocaleDateString('id-ID', { dateStyle: 'long' }) : new Date().toLocaleDateString('id-ID', { dateStyle: 'long' }) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SOCIAL & VERIFICATION SHARING STRIP -->
    <div class="px-5 py-3.5 bg-card/90 border-t border-border/70 flex flex-col md:flex-row items-center justify-between gap-3">
      <div class="flex items-center gap-2.5 w-full md:w-auto">
        <div class="size-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
          <Share2 class="size-4" />
        </div>
        <div>
          <div class="text-xs font-bold text-foreground flex items-center gap-1.5">
            <span>Bagikan Prestasi Kelulusan</span>
            <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-normal">Resmi</span>
          </div>
          <div class="text-[11px] text-muted-foreground">Tunjukkan pencapaian sertifikasi resmi Anda ke publik & jejaring profesional.</div>
        </div>
      </div>

      <div class="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
        <!-- 1-Click Copy Link -->
        <Button
          variant="outline"
          size="sm"
          class="h-8 text-xs gap-1.5 cursor-pointer"
          :class="isLinkCopied ? 'border-emerald-500 text-emerald-600 bg-emerald-500/10' : 'text-foreground'"
          @click="copyVerificationLink"
          title="Salin tautan verifikasi online ke clipboard"
        >
          <Check v-if="isLinkCopied" class="size-3.5 text-emerald-600" />
          <Copy v-else class="size-3.5 text-muted-foreground" />
          <span>{{ isLinkCopied ? 'Tautan Tersalin!' : 'Salin Tautan Resmi' }}</span>
        </Button>

        <!-- LinkedIn Add to Profile / Certifications -->
        <Button
          variant="outline"
          size="sm"
          class="h-8 text-xs gap-1.5 cursor-pointer border-[#0A66C2]/40 text-[#0A66C2] hover:bg-[#0A66C2]/10 dark:text-[#70B5F9]"
          @click="shareToLinkedInProfile"
          title="Tambahkan sertifikat ini ke bagian 'Licenses & Certifications' profil LinkedIn Anda"
        >
          <svg class="size-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
          </svg>
          <span>Profil LinkedIn</span>
        </Button>

        <!-- LinkedIn Share Feed -->
        <Button
          variant="outline"
          size="sm"
          class="h-8 text-xs gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
          @click="shareToLinkedInFeed"
          title="Buat postingan pengumuman kelulusan di Feed LinkedIn"
        >
          <ExternalLink class="size-3.5" />
          <span class="hidden sm:inline">Feed LinkedIn</span>
        </Button>

        <!-- WhatsApp Share -->
        <Button
          variant="outline"
          size="sm"
          class="h-8 text-xs gap-1.5 cursor-pointer border-[#25D366]/40 text-[#128C7E] dark:text-[#25D366] hover:bg-[#25D366]/10"
          @click="shareToWhatsApp"
          title="Kirim pesan kelulusan ke WhatsApp"
        >
          <svg class="size-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.41a8.204 8.204 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.54 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.24-.75-.67-1.25-1.49-1.4-1.74-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43-.14-.01-.31-.01-.47-.01-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1s.9 2.43 1.03 2.6c.13.17 1.77 2.7 4.29 3.78.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.18-.47-.31"/>
          </svg>
          <span>WhatsApp</span>
        </Button>
      </div>
    </div>

    <!-- Action Footer -->
    <DialogFooter class="p-4 sm:p-5 bg-muted/30 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3">
        <span class="text-xs text-muted-foreground hidden sm:inline">
          Format sertifikat resmi A4 Landscape dengan QR verifikasi autentik.
        </span>
        <div class="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          <Button
            variant="outline"
            size="sm"
            @click="openVerificationPage"
            class="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/5"
            title="Buka halaman verifikasi sertifikat publik"
          >
            <ExternalLink class="size-3.5" />
            <span>Verifikasi Online</span>
          </Button>

          <!-- Unduh HD (PNG) -->
          <Button
            variant="outline"
            size="sm"
            @click="downloadCertificateImage"
            class="gap-1.5 text-xs"
            :disabled="isDownloadingPng"
            :title="isPngDownloaded ? 'Gambar PNG Tersimpan!' : 'Unduh Gambar HD (PNG)'"
          >
            <Loader2 v-if="isDownloadingPng" class="size-3.5 animate-spin text-primary" />
            <Check v-else-if="isPngDownloaded" class="size-3.5 text-emerald-600" />
            <Download v-else class="size-3.5 text-primary" />
            <span>{{ isDownloadingPng ? 'Menyimpan...' : isPngDownloaded ? 'Tersimpan (PNG)!' : 'Unduh HD (PNG)' }}</span>
          </Button>

          <!-- Unduh PDF Langsung -->
          <Button
            variant="outline"
            size="sm"
            @click="downloadCertificatePdf"
            class="gap-1.5 text-xs border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
            :disabled="isDownloadingPdf"
            :title="isPdfDownloaded ? 'Dokumen PDF Tersimpan!' : 'Unduh Dokumen PDF Resmi'"
          >
            <Loader2 v-if="isDownloadingPdf" class="size-3.5 animate-spin text-emerald-600" />
            <Check v-else-if="isPdfDownloaded" class="size-3.5 text-emerald-600" />
            <FileText v-else class="size-3.5 text-emerald-600" />
            <span>{{ isDownloadingPdf ? 'Membuat PDF...' : isPdfDownloaded ? 'Tersimpan (PDF)!' : 'Unduh PDF' }}</span>
          </Button>

          <!-- Cetak / Browser Print -->
          <Button
            size="sm"
            @click="printCertificate"
            class="gap-1.5 bg-primary font-semibold text-xs"
            :disabled="isPrinting"
          >
            <Loader2 v-if="isPrinting" class="size-3.5 animate-spin" />
            <Printer v-else class="size-3.5" />
            <span>{{ isPrinting ? 'Menyiapkan...' : 'Cetak / Print' }}</span>
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
