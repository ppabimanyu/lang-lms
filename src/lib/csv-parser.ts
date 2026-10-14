import Papa from 'papaparse'
import type { Question, QuestionType, CSVQuestionRow, CourseFlashcard, CSVFlashcardRow } from '@/types'

export interface CSVParseResult {
  questions: Question[]
  errors: string[]
  totalRows: number
}

export function parseQuestionsCSV(csvContent: string, quizId = 'custom-quiz'): CSVParseResult {
  const errors: string[] = []
  const questions: Question[] = []

  const parsed = Papa.parse<CSVQuestionRow>(csvContent.trim(), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim().toLowerCase(),
  })

  parsed.data.forEach((row, index) => {
    const rowNum = index + 2 // 1-based index accounting for header

    const rawType = (row.type || '').trim().toLowerCase()
    const questionText = (row.question || '').trim()
    const rawAnswer = (row.answer || '').trim()
    const rawTranslation = (row.translation || row.translate || row.arti || '').trim()
    const rawExplanation = (row.explanation || row.explain || row.penjelasan || '').trim()
    const rawOptions = (row.options || row.pilihan || '').trim()

    if (!questionText) {
      errors.push(`Baris ${rowNum}: Kolom 'question' kosong.`)
      return
    }

    if (!rawAnswer) {
      errors.push(`Baris ${rowNum}: Kolom 'answer' kosong.`)
      return
    }

    // Determine type
    let questionType: QuestionType = 'input'
    if (['choice', 'pilihan', 'mc', 'multiple_choice'].includes(rawType)) {
      questionType = 'choice'
    } else if (['sentence', 'kalimat', 'arrange', 'unscramble'].includes(rawType)) {
      questionType = 'sentence'
    } else if (['input', 'isian', 'blank'].includes(rawType)) {
      questionType = 'input'
    } else {
      // Auto-detect fallback
      if (rawOptions) {
        questionType = 'choice'
      } else if (questionText.includes('___') || questionText.includes('[blank]')) {
        questionType = 'input'
      } else {
        questionType = 'sentence'
      }
    }

    // Process options for 'choice'
    let optionsList: string[] | undefined = undefined
    if (questionType === 'choice') {
      const opts: string[] = rawOptions
        ? rawOptions.split(/\||,/).map((opt: string) => opt.trim()).filter(Boolean)
        : []

      // Ensure correct answer is in the options
      if (!opts.includes(rawAnswer)) {
        opts.unshift(rawAnswer)
      }
      optionsList = opts
    }

    questions.push({
      id: `${quizId}-q-${index + 1}-${Date.now().toString(36)}`,
      type: questionType,
      question: questionText,
      answer: rawAnswer,
      options: optionsList,
      translation: rawTranslation || 'Tanpa terjemahan',
      explanation: rawExplanation || undefined,
      quizId,
    })
  })

  return {
    questions,
    errors,
    totalRows: parsed.data.length,
  }
}

export function exportQuestionsToCSV(questions: Question[]): string {
  const rows = questions.map(q => ({
    type: q.type,
    question: q.question,
    answer: q.answer,
    options: q.options ? q.options.join('|') : '',
    translation: q.translation,
    explanation: q.explanation || '',
  }))

  return Papa.unparse(rows)
}

export function generateSampleCSVTemplate(): string {
  const sample = [
    {
      type: 'choice',
      question: 'Das ist ___ Mann.',
      answer: 'ein',
      options: 'ein|eine|einen|einer',
      translation: 'Itu adalah seorang pria.',
      explanation: 'Mann adalah maskulin (der Mann) dalam kasus Nominativ subjek tunggal.',
    },
    {
      type: 'input',
      question: 'Ich gehe in ___ Schule.',
      answer: 'die',
      options: '',
      translation: 'Saya pergi ke sekolah.',
      explanation: 'Schule adalah kata benda bergender feminin (die Schule).',
    },
    {
      type: 'sentence',
      question: 'Ich trinke jeden Morgen Kaffee.',
      answer: 'Ich trinke jeden Morgen Kaffee.',
      options: '',
      translation: 'Saya minum kopi setiap pagi.',
      explanation: 'Pola standar kalimat berita Jerman: Subjek (Ich) + Kata kerja (trinke) + Keterangan waktu + Objek.',
    },
    {
      type: 'choice',
      question: 'Er kauft ___ Apfel im Supermarkt.',
      answer: 'einen',
      options: 'ein|eine|einen|einem',
      translation: 'Dia membeli sebuah apel di supermarket.',
      explanation: 'Apfel adalah maskulin (der Apfel). Menjadi "einen" saat berfungsi sebagai objek Akkusativ.',
    },
    {
      type: 'input',
      question: 'Wir ___ heute zusammen Deutsch.',
      answer: 'lernen',
      options: '',
      translation: 'Kami belajar bahasa Jerman bersama hari ini.',
      explanation: 'Konjugasi kata kerja lernen untuk subjek "wir" adalah bentuk infinitif (lernen).',
    },
  ]

  return Papa.unparse(sample)
}

export interface FlashcardParseResult {
  flashcards: CourseFlashcard[]
  errors: string[]
  totalRows: number
}

export function parseFlashcardsCSV(csvContent: string, courseId = 'custom-course'): FlashcardParseResult {
  const errors: string[] = []
  const flashcards: CourseFlashcard[] = []

  const parsed = Papa.parse<CSVFlashcardRow>(csvContent.trim(), {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim().toLowerCase(),
  })

  parsed.data.forEach((row, index) => {
    const rowNum = index + 2

    const front = (row.front || row.depan || row.target || row.kata || row.word || '').trim()
    const back = (row.back || row.belakang || row.arti || row.terjemahan || row.meaning || '').trim()
    const hint = (row.hint || row.petunjuk || row.clue || '').trim()
    const explanation = (row.explanation || row.penjelasan || row.notes || row.catatan || '').trim()

    if (!front) {
      errors.push(`Baris ${rowNum}: Kolom 'front' (kata/sisi depan) kosong.`)
      return
    }

    if (!back) {
      errors.push(`Baris ${rowNum}: Kolom 'back' (arti/sisi belakang) kosong.`)
      return
    }

    flashcards.push({
      id: `${courseId}-fc-${index + 1}-${Date.now().toString(36)}`,
      courseId,
      front,
      back,
      hint: hint || undefined,
      explanation: explanation || undefined,
      orderIndex: index,
    })
  })

  return {
    flashcards,
    errors,
    totalRows: parsed.data.length,
  }
}

export function generateSampleFlashcardCSVTemplate(): string {
  const sample = [
    {
      front: 'Guten Morgen',
      back: 'Selamat pagi',
      hint: 'Salam pagi hari hingga sekitar pukul 11:00',
      explanation: 'Digunakan sebagai sapaan formal maupun kasual saat pagi hari di Jerman.',
    },
    {
      front: 'der Apfel, die Äpfel',
      back: 'Apel (maskulin)',
      hint: 'Buah yang renyah dan manis/asam',
      explanation: 'Artikel maskulin "der". Bentuk jamaknya mengalami umlaut menjadi "die Äpfel".',
    },
    {
      front: 'sprechen',
      back: 'Berbicara / mengobrol',
      hint: 'Kata kerja ireguler dengan perubahan vokal e -> i',
      explanation: 'Konjugasi: ich spreche, du sprichst, er/sie/es spricht, wir sprechen.',
    },
    {
      front: 'Entschuldigung!',
      back: 'Permisi! / Maaf!',
      hint: 'Permohonan maaf sopan atau menarik perhatian seseorang',
      explanation: 'Ungkapan sopan universal saat ingin bertanya jalan atau meminta maaf ringan.',
    },
    {
      front: 'die Reise, die Reisen',
      back: 'Perjalanan / travelling',
      hint: 'Aktivitas berpergian ke luar kota atau luar negeri',
      explanation: 'Kata benda feminin berakhiran -e (die Reise). Bentuk jamaknya ditambah -n.',
    },
  ]

  return Papa.unparse(sample)
}
