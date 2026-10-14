import { ref, watch } from 'vue'
import type { SupportedLanguage } from '@/types'
import { isFeatureEnabled } from '@/lib/featureFlags'

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'de-DE', name: 'Jerman', nativeName: 'Deutsch', flag: '🇩🇪', samplePhrase: 'Guten Tag! Wie geht es Ihnen?' },
  { code: 'en-US', name: 'Inggris (US)', nativeName: 'English (US)', flag: '🇺🇸', samplePhrase: 'Hello! Welcome to language learning.' },
  { code: 'en-GB', name: 'Inggris (UK)', nativeName: 'English (UK)', flag: '🇬🇧', samplePhrase: 'Good day! Nice to meet you.' },
  { code: 'fr-FR', name: 'Prancis', nativeName: 'Français', flag: '🇫🇷', samplePhrase: 'Bonjour! Enchanté de faire votre connaissance.' },
  { code: 'es-ES', name: 'Spanyol', nativeName: 'Español', flag: '🇪🇸', samplePhrase: '¡Hola! Bienvenidos a la práctica de hoy.' },
  { code: 'it-IT', name: 'Italia', nativeName: 'Italiano', flag: '🇮🇹', samplePhrase: 'Buongiorno! Come va oggi?' },
  { code: 'ja-JP', name: 'Jepang', nativeName: '日本語', flag: '🇯🇵', samplePhrase: 'こんにちは！はじめまして。' },
  { code: 'ko-KR', name: 'Korea', nativeName: '한국어', flag: '🇰🇷', samplePhrase: '안녕하세요! 만나서 반갑습니다.' },
  { code: 'zh-CN', name: 'Mandarin', nativeName: '中文', flag: '🇨🇳', samplePhrase: '你好！欢迎开始学习新语言。' },
  { code: 'nl-NL', name: 'Belanda', nativeName: 'Nederlands', flag: '🇳🇱', samplePhrase: 'Hallo! Welkom bij de taalles.' },
  { code: 'id-ID', name: 'Indonesia', nativeName: 'Bahasa Indonesia', flag: '🇮🇩', samplePhrase: 'Halo! Selamat berlatih bahasa.' },
]

const STORAGE_KEY_LANG = 'lang_lms_tts_lang'
const STORAGE_KEY_RATE = 'lang_lms_tts_rate'

function getInitialLang(): string {
  if (typeof window === 'undefined') return 'de-DE'
  return localStorage.getItem(STORAGE_KEY_LANG) || 'de-DE'
}

function getInitialRate(): number {
  if (typeof window === 'undefined') return 0.85
  const raw = localStorage.getItem(STORAGE_KEY_RATE)
  return raw ? parseFloat(raw) : 0.85
}

export const globalTargetLanguage = ref<string>(getInitialLang())
export const speechRate = ref<number>(getInitialRate())

// Persist settings
if (typeof window !== 'undefined') {
  watch(globalTargetLanguage, (newLang) => {
    localStorage.setItem(STORAGE_KEY_LANG, newLang)
  })

  watch(speechRate, (newRate) => {
    localStorage.setItem(STORAGE_KEY_RATE, newRate.toString())
  })
}

export const isSpeaking = ref(false)
export const activeSpeakingText = ref<string | null>(null)

let synth: SpeechSynthesis | null = null

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  synth = window.speechSynthesis
}

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!synth) return []
  return synth.getVoices()
}

export function findLanguageInfo(langCode: string): SupportedLanguage {
  const found = SUPPORTED_LANGUAGES.find(l => l.code.toLowerCase() === langCode.toLowerCase() || l.code.slice(0, 2) === langCode.slice(0, 2))
  return found || {
    code: langCode,
    name: langCode,
    nativeName: langCode,
    flag: '🌐',
    samplePhrase: 'Hello World',
  }
}

export function speak(text: string, customLang?: string, customRate?: number): Promise<void> {
  return new Promise((resolve) => {
    if (!isFeatureEnabled('enable_tts')) {
      resolve()
      return
    }

    if (!synth) {
      console.warn('SpeechSynthesis is not supported in this browser.')
      resolve()
      return
    }

    // Stop any ongoing speech
    stopSpeech()

    const cleanText = text
      .replace(/_{2,}/g, '') // remove fill blank underscores
      .replace(/[\[\]]/g, '')
      .trim()

    if (!cleanText) {
      resolve()
      return
    }

    const effectiveLang = customLang || globalTargetLanguage.value || 'de-DE'
    const effectiveRate = customRate !== undefined ? customRate : speechRate.value

    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.lang = effectiveLang
    utterance.rate = effectiveRate

    // Find the best voice match from system voices
    const voices = synth.getVoices()
    if (voices.length > 0) {
      // 1. Exact tag match e.g. "de-DE"
      let matchedVoice = voices.find(v => v.lang.toLowerCase() === effectiveLang.toLowerCase())
      
      // 2. Prefix match e.g. "de"
      if (!matchedVoice) {
        const langPrefix = effectiveLang.slice(0, 2).toLowerCase()
        matchedVoice = voices.find(v => v.lang.toLowerCase().startsWith(langPrefix))
      }

      if (matchedVoice) {
        utterance.voice = matchedVoice
      }
    }

    isSpeaking.value = true
    activeSpeakingText.value = cleanText

    utterance.onend = () => {
      isSpeaking.value = false
      activeSpeakingText.value = null
      resolve()
    }

    utterance.onerror = (e) => {
      console.warn('TTS playback error:', e)
      isSpeaking.value = false
      activeSpeakingText.value = null
      resolve()
    }

    synth.speak(utterance)
  })
}

export function stopSpeech(): void {
  if (synth) {
    synth.cancel()
  }
  isSpeaking.value = false
  activeSpeakingText.value = null
}

export function testVoice(langCode?: string): Promise<void> {
  const code = langCode || globalTargetLanguage.value
  const info = findLanguageInfo(code)
  return speak(info.samplePhrase, code)
}
