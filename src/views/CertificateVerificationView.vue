<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { api } from '@/lib/api'
import type { VerifiedCertificate } from '@/types'
import { activeTab, currentUser } from '@/lib/storage'
import { isFeatureEnabled } from '@/lib/featureFlags'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import CertificateModal from '@/components/certificate/CertificateModal.vue'
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  Copy,
  Check,
  Award,
  Sparkles,
  ArrowLeft,
  Calendar,
  User,
  GraduationCap,
  Globe2,
  Loader2,
  RotateCcw,
  Sun,
  Moon,
  Printer,
  Share2
} from '@lucide/vue'

const props = defineProps<{
  initialCertId?: string
}>()

const searchInput = ref('')
const isLoading = ref(false)
const verificationResult = ref<VerifiedCertificate | null>(null)
const errorMessage = ref<string | null>(null)
const hasSearched = ref(false)
const isCopied = ref(false)
const isModalPreviewOpen = ref(false)
import { isDarkMode, toggleTheme as toggleDarkMode } from '@/lib/theme'
import { verifyParamId } from '@/lib/router'

// Perform verification request
async function handleVerify(idToVerify?: string) {
  const targetId = (idToVerify || searchInput.value || '').trim()
  if (!targetId) {
    errorMessage.value = 'Silakan masukkan nomor ID sertifikat yang ingin diverifikasi.'
    verificationResult.value = null
    hasSearched.value = true
    return
  }

  searchInput.value = targetId
  isLoading.value = true
  errorMessage.value = null
  verificationResult.value = null
  hasSearched.value = true

  verifyParamId.value = targetId
  if (typeof window !== 'undefined') {
    window.history.replaceState({}, '', `/#verify?id=${encodeURIComponent(targetId)}`)
  }

  try {
    const res = await api.certificates.verify(targetId)
    if (res.valid && res.certificate) {
      verificationResult.value = res.certificate
    } else {
      errorMessage.value = res.error || 'Sertifikat tidak ditemukan atau tidak valid.'
    }
  } catch (err: any) {
    console.error('Verification error:', err)
    errorMessage.value = err.message || `Sertifikat dengan ID "${targetId}" tidak ditemukan dalam pangkalan data resmi.`
  } finally {
    isLoading.value = false
  }
}

function copyShareableLink() {
  if (!verificationResult.value) return
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const link = `${origin}/#verify?id=${encodeURIComponent(verificationResult.value.certificateId)}`
  navigator.clipboard.writeText(link).then(() => {
    isCopied.value = true
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  })
}

function copyCertId() {
  if (!verificationResult.value) return
  navigator.clipboard.writeText(verificationResult.value.certificateId).then(() => {
    isCopied.value = true
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  })
}

function shareToLinkedInProfile() {
  if (!verificationResult.value) return
  const cert = verificationResult.value
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const verificationUrl = `${origin}/#verify?id=${encodeURIComponent(cert.certificateId)}`
  const dateObj = cert.completedDate ? new Date(cert.completedDate) : new Date()

  const params = new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name: cert.courseTitle,
    organizationName: 'Lingua LMS',
    issueYear: String(dateObj.getFullYear()),
    issueMonth: String(dateObj.getMonth() + 1),
    certUrl: verificationUrl,
    certId: cert.certificateId
  })

  window.open(`https://www.linkedin.com/profile/add?${params.toString()}`, '_blank', 'noopener,noreferrer')
}

function shareToLinkedInFeed() {
  if (!verificationResult.value) return
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const verificationUrl = `${origin}/#verify?id=${encodeURIComponent(verificationResult.value.certificateId)}`
  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verificationUrl)}`, '_blank', 'noopener,noreferrer')
}

function shareToWhatsApp() {
  if (!verificationResult.value) return
  const cert = verificationResult.value
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const verificationUrl = `${origin}/#verify?id=${encodeURIComponent(cert.certificateId)}`
  const message = `🎉 *Sertifikat Resmi Lingua LMS* 🎉\n\nVerifikasi kelulusan resmi atas nama *${cert.userName}* untuk kursus *"${cert.courseTitle}"*:\n🔗 ${verificationUrl}\n\nNomor Kredensial: *${cert.certificateId}*`
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
}

function goBack() {
  verifyParamId.value = ''
  if (typeof window !== 'undefined') {
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.delete('verify')
    window.history.replaceState({}, '', '/#dashboard')
  }
  activeTab.value = 'dashboard'
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    const urlCert = params.get('verify') || props.initialCertId || verifyParamId.value
    if (urlCert && urlCert.trim()) {
      searchInput.value = urlCert.trim()
      handleVerify(urlCert.trim())
    }
  }
})

watch(() => props.initialCertId, (newVal) => {
  if (newVal && newVal.trim() && newVal !== searchInput.value) {
    searchInput.value = newVal.trim()
    handleVerify(newVal.trim())
  }
})

watch(verifyParamId, (newVal) => {
  if (newVal && newVal.trim() && newVal !== searchInput.value) {
    searchInput.value = newVal.trim()
    handleVerify(newVal.trim())
  }
})
</script>

<template>
  <div class="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary flex flex-col font-sans">
    <!-- Top Navigation Header -->
    <header class="border-b border-border/70 bg-card/80 backdrop-blur-md sticky top-0 z-30">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            @click="goBack"
            class="gap-1.5 text-xs text-muted-foreground hover:text-foreground -ml-2"
          >
            <ArrowLeft class="size-4" />
            <span>{{ currentUser ? 'Kembali ke Dashboard' : 'Kembali ke Beranda' }}</span>
          </Button>
          <div class="h-4 w-px bg-border hidden sm:block"></div>
          <div class="flex items-center gap-2">
            <div class="size-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold text-xs">
              <ShieldCheck class="size-4" />
            </div>
            <span class="font-bold text-sm tracking-tight text-foreground">
              Lingua <span class="text-primary">LMS</span>
              <span class="text-xs font-normal text-muted-foreground hidden md:inline ml-1.5">| Verifikasi Sertifikat Resmi</span>
            </span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Dark mode toggle -->
          <Button
            variant="ghost"
            size="icon"
            @click="toggleDarkMode"
            class="size-8 text-muted-foreground hover:text-foreground"
            :title="isDarkMode ? 'Mode Terang' : 'Mode Gelap'"
          >
            <Sun v-if="isDarkMode" class="size-4 text-amber-400" />
            <Moon v-else class="size-4" />
          </Button>
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col items-center">
      <!-- Hero Headline & Description -->
      <div class="text-center max-w-2xl mx-auto space-y-3 mb-8">
        <Badge variant="outline" class="px-3 py-1 font-mono text-[11px] border-primary/30 text-primary bg-primary/5 uppercase tracking-wider">
          <Sparkles class="size-3 mr-1" />
          Basis Data Terakreditasi Lingua LMS
        </Badge>
        <h1 class="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground font-serif">
          Verifikasi Keaslian Sertifikat
        </h1>
        <p class="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Pindai kode QR pada lembar sertifikat fisik atau masukkan ID registrasi unik untuk memvalidasi keaslian, nama penerima, nilai evaluasi, dan tanggal penerbitan.
        </p>
      </div>

      <!-- Search Input Box -->
      <Card class="w-full max-w-2xl shadow-lg border-border/80 bg-card mb-8">
        <CardContent class="p-4 sm:p-5">
          <form @submit.prevent="handleVerify()" class="flex flex-col sm:flex-row gap-2.5">
            <div class="relative flex-1">
              <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                v-model="searchInput"
                placeholder="Contoh: CERT-SUCCESS atau CERT-USATIV-MV57K2JI"
                class="pl-10 h-11 text-xs sm:text-sm font-mono uppercase tracking-wide"
                :disabled="isLoading"
              />
            </div>
            <Button
              type="submit"
              class="h-11 px-6 font-semibold gap-2 shadow-xs shrink-0"
              :disabled="isLoading"
            >
              <Loader2 v-if="isLoading" class="size-4 animate-spin" />
              <ShieldCheck v-else class="size-4" />
              <span>{{ isLoading ? 'Memeriksa...' : 'Verifikasi ID' }}</span>
            </Button>
          </form>

          <!-- Quick Test Chips (Toggled via feature flag) -->
          <div
            v-if="isFeatureEnabled('enable_demo_features')"
            class="flex items-center gap-2 mt-3 pt-3 border-t border-border/60 text-xs text-muted-foreground flex-wrap"
          >
            <span class="text-[11px] font-medium">Contoh Uji Coba:</span>
            <button
              type="button"
              @click="handleVerify('CERT-SUCCESS')"
              class="px-2 py-0.5 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors font-mono text-[11px] border border-border/60"
            >
              CERT-SUCCESS
            </button>
            <button
              type="button"
              @click="handleVerify('CERT-USATIV-MV57K2JI')"
              class="px-2 py-0.5 rounded bg-muted hover:bg-primary/10 hover:text-primary transition-colors font-mono text-[11px] border border-border/60"
            >
              CERT-USATIV-MV57K2JI
            </button>
          </div>
        </CardContent>
      </Card>

      <!-- Loading State Shimmer -->
      <div v-if="isLoading" class="w-full max-w-2xl text-center py-12 space-y-4">
        <div class="inline-flex items-center justify-center size-14 rounded-full bg-primary/10 text-primary border border-primary/20 shadow-sm animate-pulse">
          <Loader2 class="size-7 animate-spin" />
        </div>
        <div class="space-y-1">
          <div class="text-sm font-semibold text-foreground">Menghubungkan ke Pangkalan Data Akademik...</div>
          <div class="text-xs text-muted-foreground font-mono">Memvalidasi sertifikat: {{ searchInput }}</div>
        </div>
      </div>

      <!-- Result 1: VERIFIED VALID STATE -->
      <div v-else-if="verificationResult" class="w-full max-w-2xl space-y-6 animate-in fade-in-50 duration-300">
        <!-- Verification Banner Badge -->
        <div class="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-transparent border border-emerald-500/30 flex items-start sm:items-center gap-3.5 shadow-xs">
          <div class="size-11 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/25">
            <CheckCircle2 class="size-6" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-extrabold text-sm sm:text-base text-emerald-600 dark:text-emerald-400 tracking-tight">
                SERTIFIKAT RESMI TERVERIFIKASI
              </span>
              <Badge class="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] uppercase font-mono tracking-wider">
                VALID & AKTIF
              </Badge>
            </div>
            <p class="text-xs text-muted-foreground mt-0.5">
              Data sertifikat ini valid dan terdaftar secara sah dalam pangkalan data kelulusan Lingua LMS.
            </p>
          </div>
        </div>

        <!-- Verified Credential Details Card -->
        <Card class="border-border/80 shadow-lg bg-card overflow-hidden">
          <CardHeader class="pb-3 border-b border-border/60 bg-muted/20">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle class="text-base font-bold flex items-center gap-2">
                  <Award class="size-4 text-amber-500" />
                  Rincian Dokumen Sertifikat
                </CardTitle>
                <CardDescription class="text-xs">
                  Diterbitkan oleh {{ verificationResult.issuer }}
                </CardDescription>
              </div>
              <div class="flex items-center gap-2 font-mono text-xs bg-card px-2.5 py-1 rounded-md border border-border/80">
                <span class="text-muted-foreground text-[10px]">ID:</span>
                <span class="font-bold text-primary">{{ verificationResult.certificateId }}</span>
                <button
                  type="button"
                  @click="copyCertId"
                  class="text-muted-foreground hover:text-foreground transition-colors ml-1"
                  :title="isCopied ? 'Tersalin!' : 'Salin ID'"
                >
                  <Check v-if="isCopied" class="size-3 text-emerald-600" />
                  <Copy v-else class="size-3" />
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent class="p-5 sm:p-6 space-y-4">
            <!-- Details Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Nama Penerima -->
              <div class="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                <div class="text-[10px] text-muted-foreground font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <User class="size-3" />
                  Nama Penerima
                </div>
                <div class="text-base font-bold text-foreground font-serif">
                  {{ verificationResult.userName }}
                </div>
              </div>

              <!-- Judul Kursus -->
              <div class="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                <div class="text-[10px] text-muted-foreground font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap class="size-3" />
                  Program Kursus
                </div>
                <div class="text-sm font-bold text-foreground truncate" :title="verificationResult.courseTitle">
                  {{ verificationResult.courseTitle }}
                </div>
              </div>

              <!-- Tingkat CEFR & Bahasa -->
              <div class="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                <div class="text-[10px] text-muted-foreground font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <Globe2 class="size-3" />
                  Tingkat & Bahasa
                </div>
                <div class="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Badge variant="outline" class="font-mono text-[10px] border-primary/40 text-primary bg-primary/5">
                    Level {{ verificationResult.level }}
                  </Badge>
                  <span>•</span>
                  <span>{{ verificationResult.targetLanguage }}</span>
                </div>
              </div>

              <!-- Skor / Akurasi Kelulusan -->
              <div class="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1">
                <div class="text-[10px] text-muted-foreground font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles class="size-3 text-amber-500" />
                  Akurasi Evaluasi
                </div>
                <div class="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span>{{ verificationResult.bestAccuracy }}%</span>
                  <Badge variant="secondary" class="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    LULUS EVALUASI
                  </Badge>
                </div>
              </div>

              <!-- Tanggal Penerbitan -->
              <div class="p-3.5 rounded-xl bg-muted/40 border border-border/60 space-y-1 sm:col-span-2">
                <div class="text-[10px] text-muted-foreground font-mono uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar class="size-3" />
                  Tanggal Kelulusan / Penerbitan
                </div>
                <div class="text-xs font-semibold text-foreground">
                  {{ new Date(verificationResult.completedDate).toLocaleDateString('id-ID', { dateStyle: 'full' }) }}
                </div>
              </div>
            </div>

            <!-- Demo Certificate Notice -->
            <div v-if="verificationResult.isDemo" class="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
              <Sparkles class="size-4 shrink-0" />
              <span>Sertifikat ini adalah percontohan demo bawaan sistem (Starter Pack Akreditasi).</span>
            </div>
          </CardContent>

          <!-- Action Footer Buttons -->
          <CardFooter class="p-4 bg-muted/30 border-t border-border/60 flex flex-col md:flex-row items-center justify-between gap-3">
            <div class="flex items-center gap-2 w-full md:w-auto flex-wrap">
              <!-- Salin Tautan -->
              <Button
                variant="outline"
                size="sm"
                @click="copyShareableLink"
                class="gap-1.5 text-xs cursor-pointer"
                :class="isCopied ? 'border-emerald-500 text-emerald-600 bg-emerald-500/10' : ''"
              >
                <Check v-if="isCopied" class="size-3.5 text-emerald-600" />
                <Copy v-else class="size-3.5 text-muted-foreground" />
                <span>{{ isCopied ? 'Tersalin!' : 'Salin Tautan' }}</span>
              </Button>

              <!-- LinkedIn Profile Add -->
              <Button
                variant="outline"
                size="sm"
                class="gap-1.5 text-xs cursor-pointer border-[#0A66C2]/40 text-[#0A66C2] hover:bg-[#0A66C2]/10 dark:text-[#70B5F9]"
                @click="shareToLinkedInProfile"
                title="Tambahkan sertifikat ini ke profil LinkedIn Anda"
              >
                <svg class="size-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                </svg>
                <span>Profil LinkedIn</span>
              </Button>

              <!-- LinkedIn Feed Share -->
              <Button
                variant="outline"
                size="sm"
                class="gap-1.5 text-xs cursor-pointer text-muted-foreground hover:text-foreground"
                @click="shareToLinkedInFeed"
                title="Posting ke Feed LinkedIn"
              >
                <Share2 class="size-3.5" />
                <span class="hidden sm:inline">Feed</span>
              </Button>

              <!-- WhatsApp Share -->
              <Button
                variant="outline"
                size="sm"
                class="gap-1.5 text-xs cursor-pointer border-[#25D366]/40 text-[#128C7E] dark:text-[#25D366] hover:bg-[#25D366]/10"
                @click="shareToWhatsApp"
                title="Bagikan sertifikat ke WhatsApp"
              >
                <svg class="size-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.41a8.204 8.204 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.54 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.24-.75-.67-1.25-1.49-1.4-1.74-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43-.14-.01-.31-.01-.47-.01-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1s.9 2.43 1.03 2.6c.13.17 1.77 2.7 4.29 3.78.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.18-.47-.31"/>
                </svg>
                <span>WhatsApp</span>
              </Button>
            </div>

            <div class="flex items-center gap-2 w-full md:w-auto justify-end">
              <Button
                size="sm"
                @click="isModalPreviewOpen = true"
                class="w-full sm:w-auto gap-2 text-xs font-semibold bg-primary cursor-pointer"
              >
                <Printer class="size-3.5" />
                <span>Lihat Sertifikat Asli / Cetak</span>
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>

      <!-- Result 2: ERROR / INVALID STATE -->
      <div v-else-if="errorMessage && hasSearched" class="w-full max-w-2xl space-y-4 animate-in fade-in-50 duration-300">
        <div class="p-5 rounded-2xl bg-destructive/10 border border-destructive/30 flex items-start gap-4">
          <div class="size-11 rounded-xl bg-destructive text-destructive-foreground flex items-center justify-center shrink-0 shadow-md shadow-destructive/25">
            <ShieldAlert class="size-6" />
          </div>
          <div class="space-y-1.5 flex-1 min-w-0">
            <div class="font-bold text-sm sm:text-base text-destructive tracking-tight">
              SERTIFIKAT TIDAK TERVERIFIKASI
            </div>
            <p class="text-xs text-muted-foreground leading-relaxed">
              {{ errorMessage }}
            </p>
            <div class="pt-2 text-xs text-muted-foreground space-y-1">
              <div>Kemungkinan penyebab:</div>
              <ul class="list-disc list-inside text-[11px] space-y-0.5 text-muted-foreground/90 pl-1">
                <li>Kesalahan pengetikan nomor ID sertifikat.</li>
                <li>Sertifikat belum pernah diterbitkan secara resmi oleh Lingua LMS.</li>
                <li>Sertifikat telah dicabut atau masa berlaku kedaluwarsa.</li>
              </ul>
            </div>
            <div v-if="isFeatureEnabled('enable_demo_features')" class="pt-2">
              <Button
                variant="outline"
                size="sm"
                @click="handleVerify('CERT-SUCCESS')"
                class="text-xs gap-1.5"
              >
                <RotateCcw class="size-3" />
                <span>Coba Uji Coba ID Demo (CERT-SUCCESS)</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- Initial Guidance (When Not Searched Yet) -->
      <div v-else class="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-3 gap-4 text-center mt-2">
        <div class="p-4 rounded-xl bg-card border border-border/70 space-y-2 shadow-2xs">
          <div class="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <ShieldCheck class="size-5" />
          </div>
          <div class="font-bold text-xs text-foreground">Anti-Pemalsuan</div>
          <p class="text-[11px] text-muted-foreground leading-relaxed">
            Setiap sertifikat memiliki identitas unik yang dicatat permanen dalam basis data PostgreSQL.
          </p>
        </div>

        <div class="p-4 rounded-xl bg-card border border-border/70 space-y-2 shadow-2xs">
          <div class="size-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <Sparkles class="size-5" />
          </div>
          <div class="font-bold text-xs text-foreground">QR Code Dinamis</div>
          <p class="text-[11px] text-muted-foreground leading-relaxed">
            Pindai langsung dari smartphone untuk menampilkan data kelulusan tanpa perlu login.
          </p>
        </div>

        <div class="p-4 rounded-xl bg-card border border-border/70 space-y-2 shadow-2xs">
          <div class="size-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <Award class="size-5" />
          </div>
          <div class="font-bold text-xs text-foreground">Akreditasi CEFR</div>
          <p class="text-[11px] text-muted-foreground leading-relaxed">
            Mencantumkan skor evaluasi akurasi, tingkat kemampuan CEFR, dan tanggal kelulusan resmi.
          </p>
        </div>
      </div>
    </main>

    <!-- Modal to View / Print / Download Certificate directly from verification view -->
    <CertificateModal
      v-if="verificationResult"
      v-model:open="isModalPreviewOpen"
      :user-name="verificationResult.userName"
      :course-title="verificationResult.courseTitle"
      :level="verificationResult.level"
      :target-language="verificationResult.targetLanguage"
      :accuracy="verificationResult.bestAccuracy"
      :certificate-id="verificationResult.certificateId"
      :completed-date="verificationResult.completedDate"
    />
  </div>
</template>
