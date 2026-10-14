<script setup lang="ts">
import { ref } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { activeTab } from '@/lib/storage'
import { verifyParamId } from '@/lib/router'
import {
  Award,
  ShieldCheck,
  QrCode,
  Search,
  CheckCircle2
} from '@lucide/vue'

const searchCertId = ref('')

function handleQuickCheck() {
  const query = searchCertId.value.trim()
  if (query) {
    verifyParamId.value = query
  }
  activeTab.value = 'verify'
}
</script>

<template>
  <section id="sertifikat" class="py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-10 lg:p-14 shadow-xl relative overflow-hidden">
      <!-- Glow effect -->
      <div class="absolute -right-20 -bottom-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <!-- Left: Certification Details & Quick Check -->
        <div class="lg:col-span-6 space-y-6">
          <div class="space-y-3">
            <Badge variant="outline" class="px-3.5 py-1 font-semibold border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10">
              <Award class="size-3.5 mr-1.5" />
              Sertifikasi Kelulusan Digital Resmi
            </Badge>

            <h2 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
              Buktikan Pencapaianmu dengan Sertifikat Ber-QR Code
            </h2>

            <p class="text-muted-foreground text-sm sm:text-base leading-relaxed">
              Setiap pembelajar yang menyelesaikan seluruh materi dan lulus kuis evaluasi dengan skor memuaskan berhak memperoleh sertifikat digital resmi.
            </p>
          </div>

          <!-- Feature Bullets -->
          <div class="space-y-3 pt-1 text-sm text-muted-foreground">
            <div class="flex items-start gap-2.5">
              <CheckCircle2 class="size-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>ID Sertifikat Unik:</strong> Setiap dokumen memiliki nomor seri kriptografis yang tersimpan di pangkalan data resmi.</span>
            </div>
            <div class="flex items-start gap-2.5">
              <CheckCircle2 class="size-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Pemindaian QR Instan:</strong> Cukup arahkan kamera ponsel ke QR Code untuk memvalidasi nama, kursus, dan tanggal kelulusan.</span>
            </div>
            <div class="flex items-start gap-2.5">
              <CheckCircle2 class="size-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Ekspor PDF & PNG:</strong> Unduh salinan beresolusi tinggi untuk portofolio CV atau dibagikan ke LinkedIn.</span>
            </div>
          </div>

          <!-- Quick Public Verification Box -->
          <div class="pt-3">
            <div class="p-4 rounded-2xl bg-muted/60 border border-border/80 space-y-2.5">
              <div class="flex items-center justify-between text-xs font-semibold text-foreground">
                <span class="flex items-center gap-1.5">
                  <ShieldCheck class="size-4 text-primary" />
                  Cek Keabsahan Sertifikat Siapapun
                </span>
                <span class="text-[10px] text-muted-foreground">Verifikasi Publik Bebas Akses</span>
              </div>

              <div class="flex items-center gap-2">
                <Input
                  v-model="searchCertId"
                  placeholder="Contoh: LMS-DE-A1-2026-X89K"
                  class="bg-background text-xs h-9 font-mono"
                  @keyup.enter="handleQuickCheck"
                />
                <Button
                  size="sm"
                  @click="handleQuickCheck"
                  class="h-9 px-4 text-xs font-semibold shrink-0 gap-1.5 cursor-pointer"
                >
                  <Search class="size-3.5" />
                  <span>Verifikasi</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Realistic Certificate Visual Card Mockup -->
        <div class="lg:col-span-6 flex justify-center">
          <div class="w-full max-w-md rounded-2xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-card to-background p-6 sm:p-7 shadow-2xl relative select-none">
            <!-- Top Gold Header -->
            <div class="flex items-center justify-between border-b border-border/80 pb-4 mb-5">
              <div class="flex items-center gap-2.5">
                <div class="size-8 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                  🎓
                </div>
                <div>
                  <div class="font-extrabold text-xs tracking-wider uppercase text-foreground">Sertifikat Kelulusan Resmi</div>
                  <div class="text-[10px] text-muted-foreground font-mono">LINGUA LMS ACADEMY</div>
                </div>
              </div>
              <div class="size-9 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center font-serif font-black text-xs">
                ★
              </div>
            </div>

            <!-- Recipient & Course Mockup -->
            <div class="text-center space-y-2 py-3">
              <div class="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Diberikan Kepada:</div>
              <div class="text-xl sm:text-2xl font-black text-foreground font-serif tracking-tight">
                Alexander Pratama
              </div>
              <div class="text-[11px] text-muted-foreground max-w-xs mx-auto">
                Telah berhasil menyelesaikan unit kursus dan ujian evaluasi kompetensi:
              </div>
              <div class="py-1 px-3 rounded-lg bg-primary/10 border border-primary/20 text-primary font-bold text-xs inline-block">
                Tata Bahasa Jerman A1: Der, Die, Das & Jamak
              </div>
            </div>

            <!-- Score & Validation QR Code Footer -->
            <div class="mt-5 pt-4 border-t border-border/80 flex items-center justify-between gap-4">
              <div class="space-y-1 text-left">
                <div class="text-[10px] text-muted-foreground font-mono">NOMOR SERI RESMI</div>
                <div class="text-xs font-mono font-bold text-foreground">LMS-DE-A1-2026-X89K</div>
                <div class="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  <CheckCircle2 class="size-3" />
                  <span>Akurasi 96% • LULUS</span>
                </div>
              </div>

              <!-- QR Code Mockup Element -->
              <div class="size-16 p-1 rounded-xl bg-white text-black flex flex-col items-center justify-center shadow-xs border border-border shrink-0">
                <QrCode class="size-10 text-neutral-900" />
                <span class="text-[7px] font-mono font-black text-neutral-600">SCAN QR</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
