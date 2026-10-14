<script setup lang="ts">
import { ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  GripVertical,
  RotateCcw,
  Keyboard,
  MousePointerClick,
  Sparkles
} from '@lucide/vue'

interface WordTile {
  id: string
  word: string
}

interface DragPayload {
  from: 'pool' | 'answer'
  index: number
  tile: WordTile
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    answer: string
    disabled?: boolean
  }>(),
  {
    disabled: false,
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

// Component reactive state
const availableWords = ref<WordTile[]>([])
const assembledWords = ref<WordTile[]>([])
const isManualMode = ref(false)
const manualInputText = ref('')

// Dragging state
const activeDrag = ref<DragPayload | null>(null)
const isOverAnswerZone = ref(false)
const isOverPoolZone = ref(false)
const dragOverAnswerIndex = ref<number | null>(null)

// Split answer into words without sentence-ending punctuation
function parseAnswerTokens(rawText: string): string[] {
  if (!rawText) return []
  return rawText
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?„”"']/g, '')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(Boolean)
}

function initializeWords() {
  const tokens = parseAnswerTokens(props.answer)
  // Create unique word objects
  const tiles: WordTile[] = tokens.map((word, index) => ({
    id: `w-${index}-${Math.random().toString(36).slice(2, 7)}`,
    word,
  }))

  // Shuffle without bias
  availableWords.value = [...tiles].sort(() => Math.random() - 0.5)
  assembledWords.value = []
  manualInputText.value = ''
  emitSentenceUpdate()
}

// Watch answer changes to re-init
watch(
  () => props.answer,
  () => {
    initializeWords()
  },
  { immediate: true }
)

// Sync manual mode input with modelValue
watch(manualInputText, (val) => {
  if (isManualMode.value) {
    emit('update:modelValue', val.trim())
  }
})

function emitSentenceUpdate() {
  if (isManualMode.value) {
    emit('update:modelValue', manualInputText.value.trim())
  } else {
    const sentence = assembledWords.value.map(t => t.word).join(' ')
    emit('update:modelValue', sentence)
  }
}

// Click interactions
function handleClickPoolTile(tile: WordTile) {
  if (props.disabled) return
  // Move to end of assembled
  availableWords.value = availableWords.value.filter(t => t.id !== tile.id)
  assembledWords.value.push(tile)
  emitSentenceUpdate()
}

function handleClickAssembledTile(index: number) {
  if (props.disabled) return
  const [removed] = assembledWords.value.splice(index, 1)
  if (removed) {
    availableWords.value.push(removed)
    emitSentenceUpdate()
  }
}

function handleReset() {
  if (props.disabled) return
  initializeWords()
}

function toggleManualMode() {
  if (props.disabled) return
  isManualMode.value = !isManualMode.value
  if (!isManualMode.value) {
    emitSentenceUpdate()
  } else {
    manualInputText.value = assembledWords.value.map(t => t.word).join(' ')
    emit('update:modelValue', manualInputText.value.trim())
  }
}

// HTML5 Drag and Drop Handlers
function handleDragStart(event: DragEvent, from: 'pool' | 'answer', index: number, tile: WordTile) {
  if (props.disabled) return
  activeDrag.value = { from, index, tile }
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', tile.word)
  }
}

function handleDragEnd() {
  activeDrag.value = null
  isOverAnswerZone.value = false
  isOverPoolZone.value = false
  dragOverAnswerIndex.value = null
}

function handleDragOverAnswerZone(event: DragEvent) {
  if (props.disabled || !activeDrag.value) return
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
  isOverAnswerZone.value = true
}

function handleDragLeaveAnswerZone(event: DragEvent) {
  // Only unset if leaving the container itself
  const target = event.currentTarget as HTMLElement
  if (!target.contains(event.relatedTarget as Node)) {
    isOverAnswerZone.value = false
    dragOverAnswerIndex.value = null
  }
}

function handleDragOverTile(event: DragEvent, index: number) {
  if (props.disabled || !activeDrag.value) return
  event.preventDefault()
  event.stopPropagation()
  dragOverAnswerIndex.value = index
}

function handleDropOnAnswerZone(event: DragEvent) {
  if (props.disabled || !activeDrag.value) return
  event.preventDefault()
  const payload = activeDrag.value
  const targetIndex = dragOverAnswerIndex.value

  if (payload.from === 'pool') {
    // Remove from pool
    availableWords.value = availableWords.value.filter(t => t.id !== payload.tile.id)
    // Insert into assembled
    if (targetIndex !== null && targetIndex >= 0 && targetIndex <= assembledWords.value.length) {
      assembledWords.value.splice(targetIndex, 0, payload.tile)
    } else {
      assembledWords.value.push(payload.tile)
    }
  } else if (payload.from === 'answer') {
    // Reordering inside assembled
    if (targetIndex !== null && targetIndex !== payload.index) {
      const [moved] = assembledWords.value.splice(payload.index, 1)
      assembledWords.value.splice(targetIndex, 0, moved)
    }
  }

  handleDragEnd()
  emitSentenceUpdate()
}

function handleDragOverPoolZone(event: DragEvent) {
  if (props.disabled || !activeDrag.value) return
  if (activeDrag.value.from === 'answer') {
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
    isOverPoolZone.value = true
  }
}

function handleDragLeavePoolZone(event: DragEvent) {
  const target = event.currentTarget as HTMLElement
  if (!target.contains(event.relatedTarget as Node)) {
    isOverPoolZone.value = false
  }
}

function handleDropOnPoolZone(event: DragEvent) {
  if (props.disabled || !activeDrag.value) return
  event.preventDefault()
  const payload = activeDrag.value

  if (payload.from === 'answer') {
    // Remove from assembled and add back to pool
    const [removed] = assembledWords.value.splice(payload.index, 1)
    if (removed) {
      availableWords.value.push(removed)
    }
  }

  handleDragEnd()
  emitSentenceUpdate()
}
</script>

<template>
  <div class="space-y-4 select-none">
    <!-- Header with instructions & mode toggle -->
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Sparkles class="size-3.5 text-primary" />
        <span>{{ isManualMode ? 'Ketik kalimat lengkap:' : 'Susun kata menjadi kalimat utuh:' }}</span>
      </div>

      <div class="flex items-center gap-1.5">
        <!-- Reset Button -->
        <Button
          v-if="!isManualMode && assembledWords.length > 0"
          type="button"
          variant="ghost"
          size="sm"
          class="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
          :disabled="disabled"
          @click="handleReset"
          title="Kembalikan semua kata ke posisi awal"
        >
          <RotateCcw class="size-3" />
          <span>Reset</span>
        </Button>

        <!-- Toggle Manual Input -->
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="h-7 text-xs gap-1 border-border/80 text-muted-foreground hover:text-foreground"
          :disabled="disabled"
          @click="toggleManualMode"
        >
          <Keyboard v-if="!isManualMode" class="size-3" />
          <MousePointerClick v-else class="size-3" />
          <span>{{ isManualMode ? 'Kepingan Kata' : 'Ketik Manual' }}</span>
        </Button>
      </div>
    </div>

    <!-- Mode 1: Manual typing input -->
    <div v-if="isManualMode" class="space-y-1">
      <Input
        v-model="manualInputText"
        placeholder="Ketik kalimat lengkap di sini..."
        :disabled="disabled"
        class="text-sm py-4 bg-background font-medium"
      />
    </div>

    <!-- Mode 2: Interactive Word Tiles with Hybrid Click + Drag & Drop -->
    <div v-else class="space-y-4">
      <!-- 1. Assembled Answer Drop Slot (Zona Kalimat Tersusun) -->
      <div
        @dragover="handleDragOverAnswerZone"
        @dragleave="handleDragLeaveAnswerZone"
        @drop="handleDropOnAnswerZone"
        :class="[
          'min-h-[72px] p-3 rounded-2xl border-2 transition-all duration-200 flex flex-wrap gap-2 items-center relative',
          isOverAnswerZone
            ? 'border-primary bg-primary/10 border-solid shadow-sm'
            : assembledWords.length > 0
            ? 'border-primary/40 bg-card border-solid shadow-2xs'
            : 'border-dashed border-border/80 bg-muted/20'
        ]"
      >
        <!-- Empty Placeholder -->
        <div
          v-if="assembledWords.length === 0"
          class="text-xs text-muted-foreground italic px-3 py-2 flex items-center gap-2 pointer-events-none"
        >
          <span>Klik atau seret (drag) kepingan kata ke kotak ini...</span>
        </div>

        <!-- Assembled Word Tiles -->
        <template v-for="(tile, idx) in assembledWords" :key="tile.id">
          <!-- Drop Indicator Line Before Tile -->
          <div
            v-if="dragOverAnswerIndex === idx && activeDrag"
            class="w-1 self-stretch bg-primary rounded-full animate-pulse my-0.5"
          />

          <!-- The Tile Itself -->
          <button
            type="button"
            :draggable="!disabled"
            @dragstart="handleDragStart($event, 'answer', idx, tile)"
            @dragend="handleDragEnd"
            @dragover="handleDragOverTile($event, idx)"
            @click="handleClickAssembledTile(idx)"
            :disabled="disabled"
            :class="[
              'group/tile relative inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 shadow-xs border',
              disabled
                ? 'bg-primary/80 text-primary-foreground border-transparent cursor-default'
                : 'bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:shadow cursor-grab active:cursor-grabbing hover:-translate-y-0.5 active:scale-95'
            ]"
            :title="disabled ? '' : 'Klik untuk kembalikan, atau seret untuk atur urutan'"
          >
            <GripVertical
              v-if="!disabled"
              class="size-3 opacity-60 group-hover/tile:opacity-100 shrink-0"
            />
            <span>{{ tile.word }}</span>
          </button>
        </template>

        <!-- Drop Indicator Line at End of List -->
        <div
          v-if="dragOverAnswerIndex === assembledWords.length && activeDrag"
          class="w-1 self-stretch bg-primary rounded-full animate-pulse my-0.5"
        />
      </div>

      <!-- Hint under answer slot -->
      <div class="flex items-center justify-between text-[11px] text-muted-foreground px-1">
        <span>💡 Klik kepingan untuk kembalikan, atau seret kepingan untuk menukar urutan kata.</span>
        <span class="font-mono">{{ assembledWords.length }} / {{ availableWords.length + assembledWords.length }} kata</span>
      </div>

      <!-- 2. Available Word Pool (Zona Kepingan Kata Tersedia) -->
      <div
        @dragover="handleDragOverPoolZone"
        @dragleave="handleDragLeavePoolZone"
        @drop="handleDropOnPoolZone"
        :class="[
          'p-3.5 rounded-2xl border transition-all duration-200 flex flex-wrap gap-2.5 items-center min-h-[58px]',
          isOverPoolZone
            ? 'border-amber-500 bg-amber-500/10 border-dashed'
            : 'border-border/70 bg-muted/30'
        ]"
      >
        <div
          v-if="availableWords.length === 0"
          class="text-xs text-muted-foreground/70 italic px-2 py-1"
        >
          Semua kata sudah ditempatkan pada kalimat.
        </div>

        <button
          v-for="(tile, pIdx) in availableWords"
          :key="tile.id"
          type="button"
          :draggable="!disabled"
          @dragstart="handleDragStart($event, 'pool', pIdx, tile)"
          @dragend="handleDragEnd"
          @click="handleClickPoolTile(tile)"
          :disabled="disabled"
          :class="[
            'group/pool relative inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border shadow-2xs transition-all duration-150',
            disabled
              ? 'bg-card text-muted-foreground border-border/80 cursor-default'
              : 'bg-card text-foreground border-border/80 hover:border-primary/60 hover:bg-primary/5 hover:text-primary cursor-grab active:cursor-grabbing hover:-translate-y-0.5 active:scale-95 shadow-xs'
          ]"
          :title="disabled ? '' : 'Klik untuk menambahkan, atau seret ke kotak atas'"
        >
          <GripVertical
            v-if="!disabled"
            class="size-3 text-muted-foreground/50 group-hover/pool:text-primary/70 shrink-0"
          />
          <span>{{ tile.word }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
