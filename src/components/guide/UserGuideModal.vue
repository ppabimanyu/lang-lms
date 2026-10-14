<script setup lang="ts">
import { ref } from 'vue'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  FileSpreadsheet,
  FileText,
  Volume2,
  HardDrive,
  Copy,
  Check,
  Sparkles,
  HelpCircle,
  Lightbulb,
  CheckCircle2
} from '@lucide/vue'

defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const activeGuideTab = ref<'csv' | 'markdown' | 'audio' | 'data'>('csv')
const copiedType = ref<string | null>(null)

const sampleCSV = `type,question,answer,options,translation,explanation
choice,Das ist ___ Mann.,"ein","ein|eine|einen|einer",Itu adalah seorang pria.,"Mann adalah kata benda maskulin (Nominativ)."
input,Ich gehe in ___ Schule.,die,,Saya pergi ke sekolah.,"Schule adalah kata benda feminin (die Schule)."
sentence,Ich trinke jeden Morgen Kaffee.,Ich trinke jeden Morgen Kaffee.,,Saya minum kopi setiap pagi.,"Pola kalimat: Subjek + Verba + Waktu + Objek."`

const sampleMarkdown = `---
id: materi-jerman-artikel
title: Mengenal Artikel Der, Die, Das
level: A1
category: Grammatik
targetLanguage: de-DE
description: Panduan memahami gender kata benda bahasa Jerman.
---

# Mengenal Artikel Bahasa Jerman

Setiap kata benda Jerman selalu diawali huruf kapital...`

function copyToClipboard(text: string, type: string) {
  navigator.clipboard.writeText(text)
  copiedType.value = type
  setTimeout(() => {
    copiedType.value = null
  }, 2000)
}
</script>

<template>
  <Dialog :open="open" @update:open="(val: boolean) => emit('update:open', val)">
    <DialogContent class="w-[95vw] max-w-[95vw] sm:max-w-4xl lg:max-w-5xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 min-w-0 scrollbar-thin">
      <DialogHeader class="space-y-1.5 min-w-0">
        <div class="flex items-center gap-2 text-primary font-semibold text-xs tracking-wide uppercase">
          <HelpCircle class="w-4 h-4 shrink-0" />
          <span>Pusat Bantuan & Panduan</span>
        </div>
        <DialogTitle class="text-xl md:text-2xl font-bold">Panduan Penggunaan Lingua LMS</DialogTitle>
        <DialogDescription class="text-xs md:text-sm text-muted-foreground leading-relaxed">
          Pelajari cara menyiapkan file materi Markdown, membuat bank soal CSV, dan memanfaatkan fitur belajar interaktif.
        </DialogDescription>
      </DialogHeader>

      <div class="py-2 w-full min-w-0">
        <Tabs v-model="activeGuideTab" class="space-y-4 w-full min-w-0">
          <TabsList class="w-full h-auto p-2 bg-muted/70">
            <TabsTrigger value="csv" class="h-auto text-xs gap-2 font-medium min-w-0 flex items-center justify-center">
              <FileSpreadsheet class="w-4 h-4 text-emerald-600 shrink-0" />
              <span class="truncate">Format CSV</span>
            </TabsTrigger>
            <TabsTrigger value="markdown" class="h-auto text-xs gap-2 font-medium min-w-0 flex items-center justify-center">
              <FileText class="w-4 h-4 text-primary shrink-0" />
              <span class="truncate">Format Markdown</span>
            </TabsTrigger>
            <TabsTrigger value="audio" class="h-auto text-xs gap-2 font-medium min-w-0 flex items-center justify-center">
              <Volume2 class="w-4 h-4 text-amber-500 shrink-0" />
              <span class="truncate">Audio & Kuis</span>
            </TabsTrigger>
            <TabsTrigger value="data" class="h-auto text-xs gap-2 font-medium min-w-0 flex items-center justify-center">
              <HardDrive class="w-4 h-4 text-blue-500 shrink-0" />
              <span class="truncate">Cadangan Data</span>
            </TabsTrigger>
          </TabsList>

          <!-- TAB 1: CSV FORMAT -->
          <TabsContent value="csv" class="space-y-4 text-xs leading-relaxed min-w-0 w-full">
            <!-- 6 Columns Schema Banner -->
            <div class="p-4 md:p-5 rounded-xl bg-muted/50 border border-border space-y-3.5 w-full min-w-0">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                  <span class="font-bold text-foreground text-sm">Skema 6 Kolom Standar CSV</span>
                </div>
                <span class="text-[11px] text-muted-foreground font-medium bg-background px-2.5 py-1 rounded-md border border-border/80 self-start sm:self-auto">
                  Wajib pada Baris Pertama (Header)
                </span>
              </div>

              <!-- 6 Column Chips Grid -->
              <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 w-full min-w-0">
                <div class="p-2.5 rounded-lg bg-background border border-border/80 text-center space-y-0.5">
                  <div class="font-bold font-mono text-xs text-primary">type</div>
                  <div class="text-[10px] text-muted-foreground">Tipe format soal</div>
                </div>
                <div class="p-2.5 rounded-lg bg-background border border-border/80 text-center space-y-0.5">
                  <div class="font-bold font-mono text-xs text-primary">question</div>
                  <div class="text-[10px] text-muted-foreground">Teks soal / kalimat</div>
                </div>
                <div class="p-2.5 rounded-lg bg-background border border-border/80 text-center space-y-0.5">
                  <div class="font-bold font-mono text-xs text-primary">answer</div>
                  <div class="text-[10px] text-muted-foreground">Kunci jawaban benar</div>
                </div>
                <div class="p-2.5 rounded-lg bg-background border border-border/80 text-center space-y-0.5">
                  <div class="font-bold font-mono text-xs text-primary">options</div>
                  <div class="text-[10px] text-muted-foreground">Opsi pilihan ganda (|)</div>
                </div>
                <div class="p-2.5 rounded-lg bg-background border border-border/80 text-center space-y-0.5">
                  <div class="font-bold font-mono text-xs text-primary">translation</div>
                  <div class="text-[10px] text-muted-foreground">Arti / Terjemahan</div>
                </div>
                <div class="p-2.5 rounded-lg bg-background border border-border/80 text-center space-y-0.5">
                  <div class="font-bold font-mono text-xs text-primary">explanation</div>
                  <div class="text-[10px] text-muted-foreground">Pembahasan jawaban</div>
                </div>
              </div>

              <p class="text-muted-foreground text-xs leading-relaxed">
                Baris pertama wajib berisi 6 nama kolom di atas sesuai urutan. File dapat disimpan dengan ekstensi <code class="font-mono font-semibold text-foreground">.csv</code> menggunakan Excel, Google Sheets, atau Text Editor (pastikan encoding <strong>UTF-8</strong>).
              </p>
            </div>

            <!-- 3 Format Cards Breakdown -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5 w-full min-w-0">
              <!-- Card 1 -->
              <div class="p-4 rounded-xl border border-border bg-card hover:border-emerald-500/40 transition-colors space-y-3 flex flex-col justify-between min-w-0 w-full shadow-xs">
                <div class="space-y-2">
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-bold text-foreground text-sm">1. Isian Manual</span>
                    <Badge variant="outline" class="font-mono text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">input</Badge>
                  </div>
                  <p class="text-muted-foreground text-xs leading-relaxed">
                    Tulis kalimat rumpang dengan tiga garis bawah <code class="bg-muted px-1.5 py-0.5 rounded font-mono font-semibold text-foreground">___</code> pada kolom <code class="font-semibold text-foreground">question</code>. Kolom <code class="font-semibold text-foreground">options</code> dikosongkan.
                  </p>
                </div>
                <div class="space-y-1 pt-2 border-t border-border/60 text-[11px]">
                  <span class="text-muted-foreground font-medium text-[10px] uppercase tracking-wider">Contoh Soal:</span>
                  <div class="font-mono bg-muted/60 p-2 rounded-lg border border-border/60 text-foreground break-all">
                    Ich gehe in ___ Schule.
                  </div>
                  <div class="text-[10px] text-muted-foreground flex items-center justify-between">
                    <span>Kunci: <strong class="font-mono text-foreground">die</strong></span>
                    <span class="text-emerald-600 font-medium">Input teks manual</span>
                  </div>
                </div>
              </div>

              <!-- Card 2 -->
              <div class="p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors space-y-3 flex flex-col justify-between min-w-0 w-full shadow-xs">
                <div class="space-y-2">
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-bold text-foreground text-sm">2. Pilihan Ganda</span>
                    <Badge variant="outline" class="font-mono text-[10px] bg-primary/10 text-primary border-primary/30">choice</Badge>
                  </div>
                  <p class="text-muted-foreground text-xs leading-relaxed">
                    Tulis opsi pilihan jawaban pada kolom <code class="font-semibold text-foreground">options</code> dipisahkan tanda pipa <code class="bg-muted px-1.5 py-0.5 rounded font-mono font-semibold text-foreground">|</code> tanpa spasi tambahan antar tanda.
                  </p>
                </div>
                <div class="space-y-1 pt-2 border-t border-border/60 text-[11px]">
                  <span class="text-muted-foreground font-medium text-[10px] uppercase tracking-wider">Contoh Opsi:</span>
                  <div class="font-mono bg-muted/60 p-2 rounded-lg border border-border/60 text-foreground break-all">
                    ein|eine|einen|einer
                  </div>
                  <div class="text-[10px] text-muted-foreground flex items-center justify-between">
                    <span>Kunci: <strong class="font-mono text-foreground">ein</strong></span>
                    <span class="text-primary font-medium">Pilih 1 dari opsi</span>
                  </div>
                </div>
              </div>

              <!-- Card 3 -->
              <div class="p-4 rounded-xl border border-border bg-card hover:border-amber-500/40 transition-colors space-y-3 flex flex-col justify-between min-w-0 w-full shadow-xs">
                <div class="space-y-2">
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-bold text-foreground text-sm">3. Susun Kalimat</span>
                    <Badge variant="outline" class="font-mono text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">sentence</Badge>
                  </div>
                  <p class="text-muted-foreground text-xs leading-relaxed">
                    Tulis kalimat lengkap yang sama pada kolom <code class="font-semibold text-foreground">question</code> dan <code class="font-semibold text-foreground">answer</code>. Kata otomatis diacak menjadi kepingan tombol interaktif.
                  </p>
                </div>
                <div class="space-y-1 pt-2 border-t border-border/60 text-[11px]">
                  <span class="text-muted-foreground font-medium text-[10px] uppercase tracking-wider">Contoh Kalimat:</span>
                  <div class="font-mono bg-muted/60 p-2 rounded-lg border border-border/60 text-foreground break-all">
                    Ich trinke jeden Morgen Kaffee.
                  </div>
                  <div class="text-[10px] text-muted-foreground flex items-center justify-between">
                    <span>Options: <em class="text-muted-foreground">Kosongkan</em></span>
                    <span class="text-amber-600 font-medium">Klik susun kata</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Snippet Box with Copy Button -->
            <div class="space-y-2 w-full min-w-0">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <span class="font-semibold text-foreground text-xs">Contoh Isi CSV Siap Pakai:</span>
                  <span class="text-[10px] text-muted-foreground hidden sm:inline">(3 baris contoh mewakili ketiga tipe soal)</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  class="h-7 text-xs gap-1.5 shrink-0 hover:bg-primary/10 hover:text-primary transition-colors"
                  @click="copyToClipboard(sampleCSV, 'csv')"
                >
                  <Check v-if="copiedType === 'csv'" class="w-3.5 h-3.5 text-emerald-600" />
                  <Copy v-else class="w-3.5 h-3.5" />
                  <span>{{ copiedType === 'csv' ? 'Tersalin!' : 'Salin Contoh CSV' }}</span>
                </Button>
              </div>
              <div class="relative w-full min-w-0 rounded-xl overflow-hidden border border-border bg-muted/70">
                <pre class="p-3.5 font-mono text-[11px] leading-relaxed overflow-x-auto text-foreground/90 whitespace-pre max-w-full block">{{ sampleCSV }}</pre>
              </div>
            </div>
          </TabsContent>

          <!-- TAB 2: MARKDOWN FORMAT -->
          <TabsContent value="markdown" class="space-y-4 text-xs leading-relaxed min-w-0 w-full">
            <div class="p-4 md:p-5 rounded-xl bg-muted/50 border border-border space-y-2 w-full min-w-0">
              <h4 class="font-bold text-foreground text-sm flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-primary shrink-0"></span>
                <span>Header Metadata (YAML Frontmatter)</span>
              </h4>
              <p class="text-muted-foreground text-xs leading-relaxed">
                Tuliskan informasi modul pembelajaran di baris paling atas file Markdown diapit tanda <code class="font-mono font-semibold text-foreground">---</code>.
              </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5 w-full min-w-0">
              <div class="p-4 rounded-xl border border-border bg-card space-y-2.5 min-w-0 w-full">
                <span class="font-bold text-foreground text-sm">Menghubungkan ke Kuis Latihan:</span>
                <p class="text-muted-foreground text-xs leading-relaxed">
                  Isi nilai <code class="font-mono text-primary font-semibold bg-primary/10 px-1 rounded">quizId: id-kuis</code> pada header. Tombol <strong>"Mulai Latihan Topik Ini"</strong> akan otomatis muncul di bagian atas bacaan materi!
                </p>
              </div>

              <div class="p-4 rounded-xl border border-border bg-card space-y-2.5 min-w-0 w-full">
                <span class="font-bold text-foreground text-sm">Kode Warna Gender Bahasa Jerman:</span>
                <div class="flex flex-wrap gap-2 text-xs">
                  <span class="px-2.5 py-1 rounded-md bg-blue-500/15 text-blue-600 font-semibold border border-blue-500/20">der (Maskulin)</span>
                  <span class="px-2.5 py-1 rounded-md bg-rose-500/15 text-rose-600 font-semibold border border-rose-500/20">die (Feminin)</span>
                  <span class="px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-600 font-semibold border border-emerald-500/20">das (Netral)</span>
                </div>
              </div>
            </div>

            <!-- Snippet Box with Copy Button -->
            <div class="space-y-2 w-full min-w-0">
              <div class="flex items-center justify-between gap-2">
                <span class="font-semibold text-foreground text-xs">Contoh Header Markdown:</span>
                <Button
                  size="sm"
                  variant="outline"
                  class="h-7 text-xs gap-1.5 shrink-0 hover:bg-primary/10 hover:text-primary transition-colors"
                  @click="copyToClipboard(sampleMarkdown, 'md')"
                >
                  <Check v-if="copiedType === 'md'" class="w-3.5 h-3.5 text-emerald-600" />
                  <Copy v-else class="w-3.5 h-3.5" />
                  <span>{{ copiedType === 'md' ? 'Tersalin!' : 'Salin Header' }}</span>
                </Button>
              </div>
              <div class="relative w-full min-w-0 rounded-xl overflow-hidden border border-border bg-muted/70">
                <pre class="p-3.5 font-mono text-[11px] leading-relaxed overflow-x-auto text-foreground/90 whitespace-pre max-w-full block">{{ sampleMarkdown }}</pre>
              </div>
            </div>
          </TabsContent>

          <!-- TAB 3: AUDIO & QUIZ FEATURES -->
          <TabsContent value="audio" class="space-y-4 text-xs leading-relaxed min-w-0 w-full">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5 w-full min-w-0">
              <div class="p-4 rounded-xl border border-border bg-card space-y-2 min-w-0 w-full">
                <div class="font-bold text-foreground text-sm flex items-center gap-2">
                  <Volume2 class="w-4 h-4 text-primary shrink-0" />
                  <span>Audio Suara TTS (11 Bahasa Bawaan)</span>
                </div>
                <p class="text-muted-foreground text-xs leading-relaxed">
                  Mendukung pelafalan Jerman (de-DE), Inggris (US/UK), Prancis, Spanyol, Italia, Jepang, Korea, Mandarin, Belanda, dan Indonesia.
                </p>
                <p class="text-muted-foreground text-xs leading-relaxed">
                  Klik badge bahasa di bilah atas materi atau kuis untuk membuka dialog pengaturan aksen suara dan kecepatan bicara (0.75x, 0.85x, 1.0x).
                </p>
              </div>

              <div class="p-4 rounded-xl border border-border bg-card space-y-2 min-w-0 w-full">
                <div class="font-bold text-foreground text-sm flex items-center gap-2">
                  <Sparkles class="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Mode Review Soal Salah</span>
                </div>
                <p class="text-muted-foreground text-xs leading-relaxed">
                  Jika ada soal yang keliru dijawab, tombol khusus di layar hasil akan mengumpulkan soal yang salah dan memberi kesempatan mengulang hingga menguasainya 100%.
                </p>
                <div class="flex items-center gap-1.5 text-emerald-600 font-medium text-xs pt-1">
                  <CheckCircle2 class="w-3.5 h-3.5" />
                  <span>Dilengkapi animasi confetti saat mencapai skor sempurna!</span>
                </div>
              </div>
            </div>

            <div class="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-1.5 w-full min-w-0">
              <div class="font-semibold text-primary flex items-center gap-2 text-xs">
                <Lightbulb class="w-4 h-4 shrink-0" />
                <span>Pemeriksaan Jawaban Cerdas & Toleran</span>
              </div>
              <p class="text-muted-foreground text-xs leading-relaxed">
                Sistem tidak langsung menyalahkan jika hanya berbeda huruf besar/kecil (case-insensitive) atau perbedaan tanda titik penutup.
              </p>
            </div>
          </TabsContent>

          <!-- TAB 4: DATA & BACKUP -->
          <TabsContent value="data" class="space-y-4 text-xs leading-relaxed min-w-0 w-full">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5 w-full min-w-0">
              <div class="p-4 rounded-xl border border-border bg-card space-y-2 min-w-0 w-full">
                <div class="font-bold text-foreground text-sm flex items-center gap-2">
                  <HardDrive class="w-4 h-4 text-blue-500 shrink-0" />
                  <span>Cadangkan Data (Export JSON)</span>
                </div>
                <p class="text-muted-foreground text-xs leading-relaxed">
                  Klik tombol <strong>"Cadangkan Data"</strong> di halaman Impor File untuk mengunduh seluruh materi, kuis, dan riwayat belajar ke satu file cadangan terenkapsulasi.
                </p>
              </div>

              <div class="p-4 rounded-xl border border-border bg-card space-y-2 min-w-0 w-full">
                <div class="font-bold text-foreground text-sm flex items-center gap-2">
                  <Sparkles class="w-4 h-4 text-primary shrink-0" />
                  <span>Reset ke Starter Data Jerman A1</span>
                </div>
                <p class="text-muted-foreground text-xs leading-relaxed">
                  Jika ingin mengembalikan pustaka ke materi bawaan Jerman A1, Anda dapat mengklik tombol reset di tab <em>Template & Opsi</em> pada menu Pengelola File.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <DialogFooter class="sm:justify-end pt-3 border-t border-border">
        <Button size="sm" @click="emit('update:open', false)">
          Tutup Panduan
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
