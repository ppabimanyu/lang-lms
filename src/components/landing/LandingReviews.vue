<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Star,
  CheckCircle2
} from '@lucide/vue'

const testimonials = [
  {
    name: 'Rian Hidayat',
    role: 'Mahasiswa Sastra Jerman',
    course: 'Tata Bahasa Jerman A1',
    flag: '🇩🇪',
    rating: 5,
    comment: 'Latihan der/die/das biasanya sangat membosankan, tapi di Lingua LMS ada audio langsung dengan tempo lambat yang sangat membantu telinga terbiasa dengan pelafalan asli.'
  },
  {
    name: 'Nadia Salsabila',
    role: 'Pelamar Beasiswa Eropa',
    course: 'Bahasa Prancis A2: Passé Composé',
    flag: '🇫🇷',
    rating: 5,
    comment: 'Sertifikat kelulusannya sangat profesional! Ada QR Code dan ID yang waktu saya tes scan langsung muncul di halaman verifikasi resmi Lingua. Berguna sekali untuk lampiran portofolio.'
  },
  {
    name: 'Budi Santoso',
    role: 'Software Engineer & Polyglot',
    course: 'Percakapan Spanyol Pemula',
    flag: '🇪🇸',
    rating: 5,
    comment: 'Kombinasi teori bacaan Markdown dan variasi kuis CSV (terutama susun kata) membuat saya cepat paham struktur kalimat tanpa harus menghafal rumus tata bahasa secara kaku.'
  }
]
</script>

<template>
  <section class="py-20 md:py-28 bg-muted/20 border-t border-border/60 relative overflow-hidden">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
      <!-- Section Title -->
      <div class="text-center max-w-3xl mx-auto mb-16">
        <Badge variant="outline" class="mb-3 px-3.5 py-1 font-semibold border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10">
          <Star class="size-3.5 mr-1 fill-amber-500" />
          Ulasan Pembelajar
        </Badge>
        <h2 class="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
          Dipercaya oleh Pembelajar Bahasa Mandiri
        </h2>
        <p class="mt-4 text-muted-foreground text-sm sm:text-base leading-relaxed">
          Ulasan otentik dari pengguna yang telah menyelesaikan materi dan lulus ujian evaluasi kompetensi.
        </p>
      </div>

      <!-- Testimonial Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        <Card
          v-for="(t, idx) in testimonials"
          :key="idx"
          class="border-border/70 bg-card hover:border-primary/50 transition-all hover:shadow-lg flex flex-col justify-between"
        >
          <CardContent class="p-6 sm:p-7 space-y-4 flex-1 flex flex-col justify-between">
            <div class="space-y-3">
              <!-- Rating Stars Row -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1 text-amber-500">
                  <Star v-for="s in t.rating" :key="s" class="size-4 fill-amber-500" />
                </div>
                <span class="text-xl leading-none">{{ t.flag }}</span>
              </div>

              <!-- Quote Text -->
              <p class="text-xs sm:text-sm text-muted-foreground leading-relaxed italic">
                "{{ t.comment }}"
              </p>
            </div>

            <!-- Reviewer Author Info -->
            <div class="pt-4 border-t border-border/60 flex items-center justify-between">
              <div>
                <div class="font-bold text-sm text-foreground flex items-center gap-1.5">
                  <span>{{ t.name }}</span>
                  <CheckCircle2 class="size-3.5 text-emerald-500" title="Pembelajar Terverifikasi" />
                </div>
                <div class="text-[11px] text-muted-foreground">{{ t.role }}</div>
              </div>
              <Badge variant="secondary" class="text-[10px] font-mono">
                {{ t.course }}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </section>
</template>
