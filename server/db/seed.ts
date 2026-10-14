import { db, pool } from './index'
import {
  users,
  studyStats,
  courses,
  courseChapters,
  questions,
  courseFlashcards,
  chapterProgress,
  courseProgress,
  courseReviews,
  courseBookmarks,
  featureFlags,
} from './schema'
import bcrypt from 'bcryptjs'

async function seed() {
  console.log('🌱 Memulai proses seeding database bersih...')

  try {
    // 1. Bersihkan seluruh tabel
    console.log('🧹 Membersihkan tabel...')
    await db.delete(courseBookmarks)
    await db.delete(courseReviews)
    await db.delete(chapterProgress)
    await db.delete(courseProgress)
    await db.delete(courseFlashcards)
    await db.delete(questions)
    await db.delete(courseChapters)
    await db.delete(courses)
    await db.delete(featureFlags)
    await db.delete(studyStats)
    await db.delete(users)

    // 2. Buat Pengguna
    console.log('👤 Membuat pengguna default...')
    const salt = await bcrypt.genSalt(10)
    const defaultPasswordHash = await bcrypt.hash('password123', salt)
    const adminPasswordHash = await bcrypt.hash('admin123', salt)

    const [adminUser] = await db
      .insert(users)
      .values({
        name: 'Administrator LMS',
        email: 'admin@lingua.com',
        passwordHash: adminPasswordHash,
        role: 'admin',
        status: 'active',
      })
      .returning()

    const [curriculumUser] = await db
      .insert(users)
      .values({
        name: 'Dra. Heidi Weber (Tim Kurikulum)',
        email: 'kurikulum@lingua.com',
        passwordHash: defaultPasswordHash,
        role: 'curriculum',
        status: 'active',
      })
      .returning()

    const [demoStudent] = await db
      .insert(users)
      .values({
        name: 'Budi Santoso',
        email: 'demo@lingua.com',
        passwordHash: defaultPasswordHash,
        role: 'student',
        status: 'active',
      })
      .returning()

    // Backup alias users
    await db.insert(users).values([
      { name: 'Demo Siswa (Local)', email: 'demo@lms.local', passwordHash: defaultPasswordHash, role: 'student', status: 'active' },
      { name: 'Tim Kurikulum (Local)', email: 'curriculum@lms.local', passwordHash: defaultPasswordHash, role: 'curriculum', status: 'active' },
      { name: 'Admin (Local)', email: 'admin@lms.local', passwordHash: defaultPasswordHash, role: 'admin', status: 'active' },
    ])

    // 3. Buat Study Stats
    console.log('📊 Inisialisasi statistik belajar...')
    const todayStr = new Date().toISOString().split('T')[0]
    for (const u of [adminUser, curriculumUser, demoStudent]) {
      await db.insert(studyStats).values({
        userId: u.id,
        xp: u.role === 'student' ? 120 : 500,
        streak: 3,
        lastActiveDate: todayStr,
        quizzesTaken: 2,
        questionsAnswered: 8,
        correctAnswers: 7,
      })
    }

    // 4. Feature Flags
    console.log('🚩 Menambahkan konfigurasi Feature Flags...')
    await db.insert(featureFlags).values([
      {
        key: 'maintenance_mode',
        name: 'Mode Pemeliharaan (Maintenance Mode)',
        description: 'Mengaktifkan mode perawatan platform.',
        category: 'system',
        enabled: 0,
        isCritical: 1,
      },
      {
        key: 'enable_registration',
        name: 'Pendaftaran Akun Baru',
        description: 'Mengizinkan pengguna baru mendaftar akun di platform Lingua LMS.',
        category: 'system',
        enabled: 1,
        isCritical: 1,
      },
      {
        key: 'enable_exam_timer',
        name: 'Timer Ujian Akhir',
        description: 'Menampilkan hitung mundur waktu otomatis saat siswa mengerjakan Ujian Akhir.',
        category: 'learning',
        enabled: 1,
        isCritical: 0,
      },
      {
        key: 'enable_gamification',
        name: 'Sistem XP & Streak',
        description: 'Menganugerahi XP kelulusan bab dan ujian untuk memotivasi siswa.',
        category: 'gamification',
        enabled: 1,
        isCritical: 0,
      },
      {
        key: 'enable_course_reviews',
        name: 'Ulasan & Rating Siswa',
        description: 'Memungkinkan siswa yang telah belajar memberi penilaian bintang dan komentar.',
        category: 'interaction',
        enabled: 1,
        isCritical: 0,
      },
      {
        key: 'enable_flashcards',
        name: 'Modul Flashcard Hafalan',
        description: 'Menyediakan kartu flash interaktif di setiap bab pelajaran.',
        category: 'learning',
        enabled: 1,
        isCritical: 0,
      },
    ])

    // 5. Kursus Flagship: Bahasa Jerman A1
    console.log('📚 Membuat Kursus Bahasa Jerman A1...')
    const germanCourseId = 'course-german-a1'
    await db.insert(courses).values({
      id: germanCourseId,
      userId: curriculumUser.id,
      title: 'Kursus Intensif Bahasa Jerman A1: Tata Bahasa & Percakapan',
      level: 'A1',
      category: 'Grammatik & Percakapan',
      description:
        'Kuasai fondasi utama bahasa Jerman tingkat pemula A1! Dari pemahaman gender kata benda (Der, Die, Das), konjugasi kata kerja penting Präsens, hingga kasus Akkusativ untuk percakapan sehari-hari. Dilengkapi materi interaktif per bab, flashcards kosakata, kuis latihan, dan Ujian Akhir kelulusan resmi bersertifikat.',
      targetLanguage: 'de-DE',
      visibility: 'public',
      status: 'published',
      examDurationMinutes: 15,
      examPassingScore: 80,
    })

    // Bab 1
    const chap1Id = 'chap-german-a1-1'
    await db.insert(courseChapters).values({
      id: chap1Id,
      courseId: germanCourseId,
      orderIndex: 1,
      title: 'Bab 1: Mengenal Artikel Kata Benda (Der, Die, Das)',
      description:
        'Pahami gender gramatikal kata benda Jerman (maskulin, feminin, netral) serta penggunaan artikel tentu & tak tentu pada kasus Nominativ.',
      sourceFilename: '01_artikel_der_die_das.md',
      quizDurationMinutes: 5,
      markdownContent: `# Bab 1: Mengenal Artikel Bahasa Jerman (Der, Die, Das)

Dalam bahasa Jerman, setiap kata benda (*Substantiv*) selalu ditulis dengan **huruf kapital** di awalnya dan memiliki jenis kelamin gramatikal (*Genus*). Terdapat tiga jenis artikel tertentu (*bestimmter Artikel*):

- **der** : Maskulin (*männlich*)
- **die** : Feminin (*weiblich*)
- **das** : Netral (*sächlich*)
- **die** : Jamak (*Plural* untuk semua gender)

---

## Tabel Artikel Tentu & Tak Tentu (Kasus Nominativ)

| Gender | Artikel Tentu | Artikel Tak Tentu | Negasi (Kein) | Contoh Kosakata |
|---|---|---|---|---|
| **Maskulin** | **der** Mann *(pria)* | **ein** Mann | **kein** Mann | der Tisch, der Apfel, der Hund |
| **Feminin** | **die** Frau *(wanita)* | **eine** Frau | **keine** Frau | die Lampe, die Schule, die Katze |
| **Netral** | **das** Kind *(anak)* | **ein** Kind | **kein** Kind | das Buch, das Auto, das Haus |
| **Jamak** | **die** Kinder *(anak-anak)* | *(tidak ada)* | **keine** Kinder | die Bücher, die Tische, die Autos |

---

## Tips Mengenali Gender Kata Benda

Meskipun sebagian besar artikel harus dihafal bersama katanya, ada beberapa akhiran kata (*Suffix*) yang dapat dijadikan pedoman:

> **Selalu Feminin (*die*)**: Kata benda yang berakhiran **-ung** (*die Wohnung*), **-heit** (*die Freiheit*), **-keit** (*die Möglichkeit*), **-schaft** (*die Freundschaft*), dan **-tät** (*die Universität*).

> **Selalu Netral (*das*)**: Kata benda yang berakhiran bentuk pengecil **-chen** (*das Mädchen*) atau **-lein** (*das Fräulein*), serta kata kerja yang dibendakan (*das Essen*, *das Leben*).

> **Sering Maskulin (*der*)**: Nama hari (*der Montag*), bulan (*der Januar*), musim (*der Sommer*), arah mata angin (*der Norden*), serta kata yang berakhiran **-or** (*der Motor*) atau **-er** penunjuk orang (*der Lehrer*).

Selesaikan kuis latihan dan flashcard di bawah untuk menguasai bab ini sebelum melanjutkan ke Bab 2!`,
    })

    // Soal Kuis Bab 1 (isExam = 0)
    await db.insert(questions).values([
      {
        id: 'q-chap1-1',
        courseId: germanCourseId,
        chapterId: chap1Id,
        isExam: 0,
        type: 'choice',
        question: 'Apakah artikel tertentu untuk kata benda "Tisch" (meja)?',
        answer: 'der',
        options: 'der|die|das|dem',
        translation: 'Meja bergender maskulin dalam bahasa Jerman.',
        explanation: 'Kata "Tisch" bergender maskulin sehingga menggunakan artikel "der Tisch".',
        orderIndex: 1,
      },
      {
        id: 'q-chap1-2',
        courseId: germanCourseId,
        chapterId: chap1Id,
        isExam: 0,
        type: 'choice',
        question: 'Apakah artikel tak tentu untuk kata benda feminin "Frau"?',
        answer: 'eine',
        options: 'ein|eine|einen|einer',
        translation: 'Seorang wanita.',
        explanation: 'Artikel tak tentu untuk gender feminin dalam kasus Nominativ adalah "eine".',
        orderIndex: 2,
      },
      {
        id: 'q-chap1-3',
        courseId: germanCourseId,
        chapterId: chap1Id,
        isExam: 0,
        type: 'input',
        question: 'Lengkapi artikel tertentu netral untuk kata "Buch" (buku): ___ Buch',
        answer: 'das',
        options: null,
        translation: 'Buku itu.',
        explanation: 'Buku dalam bahasa Jerman bergender netral: das Buch.',
        orderIndex: 3,
      },
      {
        id: 'q-chap1-4',
        courseId: germanCourseId,
        chapterId: chap1Id,
        isExam: 0,
        type: 'choice',
        question: 'Kata benda yang berakhiran "-ung" seperti "Wohnung" selalu memiliki artikel apa?',
        answer: 'die',
        options: 'der|die|das|den',
        translation: 'Apartemen / Tempat tinggal.',
        explanation: 'Semua kata benda berakhiran -ung pasti bergender feminin (die Wohnung).',
        orderIndex: 4,
      },
    ])

    // Flashcards Bab 1
    await db.insert(courseFlashcards).values([
      {
        id: 'fc-chap1-1',
        courseId: germanCourseId,
        chapterId: chap1Id,
        front: 'der Mann',
        back: 'Pria / Laki-laki (Maskulin)',
        hint: 'Maskulin, jamak: die Männer',
        explanation: 'Kata benda maskulin dasar berartikel der.',
        orderIndex: 1,
      },
      {
        id: 'fc-chap1-2',
        courseId: germanCourseId,
        chapterId: chap1Id,
        front: 'die Frau',
        back: 'Wanita / Perempuan (Feminin)',
        hint: 'Feminin, jamak: die Frauen',
        explanation: 'Kata benda feminin berartikel die.',
        orderIndex: 2,
      },
      {
        id: 'fc-chap1-3',
        courseId: germanCourseId,
        chapterId: chap1Id,
        front: 'das Kind',
        back: 'Anak kecil (Netral)',
        hint: 'Netral, jamak: die Kinder',
        explanation: 'Kata benda netral berartikel das.',
        orderIndex: 3,
      },
      {
        id: 'fc-chap1-4',
        courseId: germanCourseId,
        chapterId: chap1Id,
        front: 'die Wohnung',
        back: 'Apartemen / Hunian',
        hint: 'Akhiran -ung selalu feminin',
        explanation: 'Suffix -ung menandakan gender feminin.',
        orderIndex: 4,
      },
    ])

    // Bab 2
    const chap2Id = 'chap-german-a1-2'
    await db.insert(courseChapters).values({
      id: chap2Id,
      courseId: germanCourseId,
      orderIndex: 2,
      title: 'Bab 2: Konjugasi Kata Kerja Präsens (Waktu Sekarang)',
      description:
        'Pelajari aturan perubahan bentuk kata kerja beraturan (regelmäßige Verben) serta kata kerja esensial sein (adalah) dan haben (mempunyai).',
      sourceFilename: '02_konjugation_praesens.md',
      quizDurationMinutes: 5,
      markdownContent: `# Bab 2: Konjugasi Kata Kerja Präsens (Waktu Sekarang)

Dalam bahasa Jerman, kata kerja berubah bentuk (*konjugieren*) mengikuti subjeknya. Bentuk dasar kata kerja berakhiran **-en** disebut *Infinitiv* (contoh: *lernen*, *wohnen*, *machen*).

---

## Pola Akhiran Kata Kerja Beraturan (Regelmäßig)

Ambil akar kata (*Verbstamm*) dengan menghilangkan akhiran **-en**, lalu tambahkan akhiran subjek:

| Subjek (Personalpronomen) | Akhiran | Contoh: lernen *(belajar)* | Contoh: kommen *(datang)* |
|---|---|---|---|
| **ich** *(saya)* | **-e** | ich lern**e** | ich komm**e** |
| **du** *(kamu)* | **-st** | du lern**st** | du komm**st** |
| **er / sie / es** *(dia)* | **-t** | er lern**t** | er komm**t** |
| **wir** *(kami/kita)* | **-en** | wir lern**en** | wir komm**en** |
| **ihr** *(kalian)* | **-t** | ihr lern**t** | ihr komm**t** |
| **sie / Sie** *(mereka / Anda)* | **-en** | sie lern**en** | sie komm**en** |

---

## Dua Kata Kerja Paling Penting: sein dan haben

Kedua kata kerja ini adalah kata kerja tidak beraturan (*unregelmäßige Verben*) yang wajib dihafal:

| Subjek | sein *(adalah/ada)* | haben *(mempunyai)* |
|---|---|---|
| **ich** | bin | habe |
| **du** | bist | hast |
| **er / sie / es** | ist | hat |
| **wir** | sind | haben |
| **ihr** | seid | habt |
| **sie / Sie** | sind | haben |

Uji pemahaman konjugasi Anda melalui kuis latihan Bab 2!`,
    })

    // Soal Kuis Bab 2 (isExam = 0)
    await db.insert(questions).values([
      {
        id: 'q-chap2-1',
        courseId: germanCourseId,
        chapterId: chap2Id,
        isExam: 0,
        type: 'choice',
        question: 'Konjugasi kata kerja "lernen" untuk subjek "ich" adalah...?',
        answer: 'lerne',
        options: 'lerne|lernst|lernt|lernen',
        translation: 'Saya belajar.',
        explanation: 'Subjek "ich" selalu berakhiran -e pada kata kerja beraturan (ich lerne).',
        orderIndex: 1,
      },
      {
        id: 'q-chap2-2',
        courseId: germanCourseId,
        chapterId: chap2Id,
        isExam: 0,
        type: 'choice',
        question: 'Bentuk kata kerja "sein" untuk subjek "wir" adalah...?',
        answer: 'sind',
        options: 'bin|bist|ist|sind',
        translation: 'Kami / kita adalah...',
        explanation: 'Konjugasi kata kerja sein untuk wir adalah "wir sind".',
        orderIndex: 2,
      },
      {
        id: 'q-chap2-3',
        courseId: germanCourseId,
        chapterId: chap2Id,
        isExam: 0,
        type: 'input',
        question: 'Lengkapi konjugasi: Du ___ (haben) ein Buch.',
        answer: 'hast',
        options: null,
        translation: 'Kamu mempunyai sebuah buku.',
        explanation: 'Konjugasi kata kerja haben untuk "du" adalah "du hast".',
        orderIndex: 3,
      },
      {
        id: 'q-chap2-4',
        courseId: germanCourseId,
        chapterId: chap2Id,
        isExam: 0,
        type: 'sentence',
        question: 'Susun kalimat: "Wir lernen Deutsch" (Kami belajar bahasa Jerman)',
        answer: 'Wir lernen Deutsch',
        options: 'Deutsch|lernen|Wir',
        translation: 'Kami belajar bahasa Jerman.',
        explanation: 'Urutan kata: Subjek (Wir) + Kata Kerja posisi ke-2 (lernen) + Objek (Deutsch).',
        orderIndex: 4,
      },
    ])

    // Flashcards Bab 2
    await db.insert(courseFlashcards).values([
      {
        id: 'fc-chap2-1',
        courseId: germanCourseId,
        chapterId: chap2Id,
        front: 'ich bin / du bist / er ist',
        back: 'Saya adalah / kamu adalah / dia adalah (sein)',
        hint: 'Kata kerja sein',
        explanation: 'Konjugasi dasar sein waktu sekarang.',
        orderIndex: 1,
      },
      {
        id: 'fc-chap2-2',
        courseId: germanCourseId,
        chapterId: chap2Id,
        front: 'ich habe / du hast / er hat',
        back: 'Saya punya / kamu punya / dia punya (haben)',
        hint: 'Kata kerja haben',
        explanation: 'Konjugasi dasar haben waktu sekarang.',
        orderIndex: 2,
      },
      {
        id: 'fc-chap2-3',
        courseId: germanCourseId,
        chapterId: chap2Id,
        front: 'wohnen (ich wohne, du wohnst)',
        back: 'Tinggal / Berdiam di',
        hint: 'Kata kerja tempat tinggal',
        explanation: 'Contoh: Ich wohne in Jakarta.',
        orderIndex: 3,
      },
      {
        id: 'fc-chap2-4',
        courseId: germanCourseId,
        chapterId: chap2Id,
        front: 'sprechen (ich spreche, du sprichst)',
        back: 'Berbicara',
        hint: 'Vokal e berubah menjadi i pada du/er',
        explanation: 'Contoh: Sprichst du Deutsch?',
        orderIndex: 4,
      },
    ])

    // Bab 3
    const chap3Id = 'chap-german-a1-3'
    await db.insert(courseChapters).values({
      id: chap3Id,
      courseId: germanCourseId,
      orderIndex: 3,
      title: 'Bab 3: Kasus Akkusativ (Objek Langsung)',
      description:
        'Pahami kapan kasus Akkusativ digunakan dan perubahan penting artikel maskulin menjadi den / einen / keinen saat berposisi sebagai objek langsung.',
      sourceFilename: '03_akkusativ_objekt.md',
      quizDurationMinutes: 5,
      markdownContent: `# Bab 3: Kasus Akkusativ (Objek Langsung)

Dalam tata bahasa Jerman, kata benda berubah perannya sesuai posisinya di dalam kalimat. Ketika kata benda berfungsi sebagai **objek penderita / objek langsung** yang dikenai tindakan, kata tersebut berada dalam **Kasus Akkusativ**.

---

## Perubahan Kunci pada Artikel Akkusativ

Kabar baiknya: **Hanya kata benda maskulin yang berubah bentuk!** Feminin, netral, dan jamak tetap sama seperti Nominativ.

| Gender | Nominativ (Subjek) | Akkusativ (Objek Penderita) | Artikel Tak Tentu Akkusativ |
|---|---|---|---|
| **Maskulin** | **der** Tisch | **den** Tisch | **einen** Tisch |
| **Feminin** | **die** Lampe | **die** Lampe | **eine** Lampe |
| **Netral** | **das** Buch | **das** Buch | **ein** Buch |
| **Jamak** | **die** Bücher | **die** Bücher | *(keine Bücher)* |

---

## Kata Kerja yang Selalu Membutuhkan Akkusativ

Sebagian besar kata kerja transitif membutuhkan objek Akkusativ:
- **haben** *(mempunyai)*: *Ich habe **einen** Bruder.*
- **kaufen** *(membeli)*: *Er kauft **den** Laptop.*
- **trinken** *(minum)*: *Wir trinken **einen** Kaffee.*
- **sehen** *(melihat)*: *Sie sieht **den** Mann.*
- **brauchen** *(membutuhkan)*: *Brauchst du **einen** Stift?*

Selamat! Setelah menyelesaikan Bab 3, Anda memenuhi syarat untuk membuka gerbang **Ujian Akhir Kelulusan Bersertifikat**!`,
    })

    // Soal Kuis Bab 3 (isExam = 0)
    await db.insert(questions).values([
      {
        id: 'q-chap3-1',
        courseId: germanCourseId,
        chapterId: chap3Id,
        isExam: 0,
        type: 'choice',
        question: 'Lengkapi kalimat: "Ich habe ___ (der Hund)." (Maskulin sebagai objek)',
        answer: 'den Hund',
        options: 'der Hund|den Hund|dem Hund|des Hundes',
        translation: 'Saya mempunyai anjing itu.',
        explanation: 'Pada kasus Akkusativ, artikel maskulin "der" berubah menjadi "den".',
        orderIndex: 1,
      },
      {
        id: 'q-chap3-2',
        courseId: germanCourseId,
        chapterId: chap3Id,
        isExam: 0,
        type: 'choice',
        question: 'Manakah bentuk artikel tak tentu yang benar: "Er kauft ___ Apfel (der Apfel)"?',
        answer: 'einen',
        options: 'ein|eine|einen|einem',
        translation: 'Dia membeli sebutir apel.',
        explanation: 'Kata "Apfel" adalah maskulin, maka artikel tak tentunya di Akkusativ adalah "einen".',
        orderIndex: 2,
      },
      {
        id: 'q-chap3-3',
        courseId: germanCourseId,
        chapterId: chap3Id,
        isExam: 0,
        type: 'choice',
        question: 'Apakah artikel netral (das) berubah saat berada di kasus Akkusativ?',
        answer: 'Tidak, tetap das / ein',
        options: 'Ya, berubah menjadi den|Tidak, tetap das / ein|Berubah menjadi dem|Berubah menjadi die',
        translation: 'Gender netral tidak mengalami perubahan bentuk di kasus Akkusativ.',
        explanation: 'Hanya maskulin yang berubah di kasus Akkusativ. Netral tetap das/ein.',
        orderIndex: 3,
      },
      {
        id: 'q-chap3-4',
        courseId: germanCourseId,
        chapterId: chap3Id,
        isExam: 0,
        type: 'input',
        question: 'Lengkapi kalimat negasi: "Wir haben ___ Zeit (die Zeit)." Ketik kata negasinya:',
        answer: 'keine',
        options: null,
        translation: 'Kami tidak mempunyai waktu.',
        explanation: 'Kata "Zeit" bergender feminin (die Zeit), bentuk negasinya adalah "keine Zeit".',
        orderIndex: 4,
      },
    ])

    // Flashcards Bab 3
    await db.insert(courseFlashcards).values([
      {
        id: 'fc-chap3-1',
        courseId: germanCourseId,
        chapterId: chap3Id,
        front: 'der -> den / ein -> einen',
        back: 'Perubahan artikel maskulin di kasus Akkusativ',
        hint: 'Hanya maskulin yang berubah akhiran -en',
        explanation: 'Contoh: der Kaffee -> Ich trinke einen Kaffee.',
        orderIndex: 1,
      },
      {
        id: 'fc-chap3-2',
        courseId: germanCourseId,
        chapterId: chap3Id,
        front: 'Ich brauche einen Stift',
        back: 'Saya butuh sebuah pena',
        hint: 'der Stift (pena) menjadi einen Stift',
        explanation: 'Pola kalimat umum Akkusativ.',
        orderIndex: 2,
      },
      {
        id: 'fc-chap3-3',
        courseId: germanCourseId,
        chapterId: chap3Id,
        front: 'kaufen (er kauft den Tisch)',
        back: 'Membeli (Dia membeli meja tersebut)',
        hint: 'Verba transitif Akkusativ',
        explanation: 'Kaufen selalu membutuhkan objek langsung.',
        orderIndex: 3,
      },
      {
        id: 'fc-chap3-4',
        courseId: germanCourseId,
        chapterId: chap3Id,
        front: 'keinen / keine / kein',
        back: 'Bentuk negasi Akkusativ (Maskulin / Feminin / Netral)',
        hint: 'Negasi objek kata benda',
        explanation: 'Contoh: Ich habe keinen Hunger.',
        orderIndex: 4,
      },
    ])

    // 6. Ujian Akhir Kelulusan Course (isExam = 1, chapterId = null)
    console.log('🏆 Membuat Bank Soal Ujian Akhir Bersertifikat...')
    const examQuestions = [
      {
        id: 'exam-q1',
        courseId: germanCourseId,
        chapterId: null,
        isExam: 1,
        type: 'choice',
        question: 'Manakah pasangan artikel dan kata benda yang BENAR di bawah ini?',
        answer: 'das Kind',
        options: 'der Frau|die Mann|das Kind|die Kind',
        translation: 'Anak kecil (netral).',
        explanation: 'Kind adalah netral (das Kind), Frau adalah feminin (die Frau), Mann adalah maskulin (der Mann).',
        orderIndex: 1,
      },
      {
        id: 'exam-q2',
        courseId: germanCourseId,
        chapterId: null,
        isExam: 1,
        type: 'choice',
        question: 'Kata benda dengan akhiran "-heit" seperti "Freiheit" pasti memiliki artikel...?',
        answer: 'die',
        options: 'der|die|das|den',
        translation: 'Kebebasan.',
        explanation: 'Semua kata benda berakhiran -heit selalu bergender feminin (die).',
        orderIndex: 2,
      },
      {
        id: 'exam-q3',
        courseId: germanCourseId,
        chapterId: null,
        isExam: 1,
        type: 'choice',
        question: 'Lengkapi kalimat: "Wir ___ aus Indonesien." (kommen)',
        answer: 'kommen',
        options: 'komme|kommst|kommt|kommen',
        translation: 'Kami datang dari Indonesia.',
        explanation: 'Konjugasi untuk wir selalu berakhiran -en (wir kommen).',
        orderIndex: 3,
      },
      {
        id: 'exam-q4',
        courseId: germanCourseId,
        chapterId: null,
        isExam: 1,
        type: 'choice',
        question: 'Lengkapi kalimat: "Er ___ sehr müde." (sein)',
        answer: 'ist',
        options: 'bin|bist|ist|sind',
        translation: 'Dia sangat lelah.',
        explanation: 'Bentuk kata kerja sein untuk er/sie/es adalah "ist".',
        orderIndex: 4,
      },
      {
        id: 'exam-q5',
        courseId: germanCourseId,
        chapterId: null,
        isExam: 1,
        type: 'choice',
        question: 'Pada kasus Akkusativ, apakah artikel "der" berubah menjadi apa?',
        answer: 'den',
        options: 'die|das|den|dem',
        translation: 'Artikel tertentu maskulin akkusativ.',
        explanation: 'Der berubah menjadi den di kasus Akkusativ.',
        orderIndex: 5,
      },
      {
        id: 'exam-q6',
        courseId: germanCourseId,
        chapterId: null,
        isExam: 1,
        type: 'choice',
        question: 'Lengkapi kalimat: "Ich trinke ___ Tee (der Tee)."',
        answer: 'einen',
        options: 'ein|eine|einen|einem',
        translation: 'Saya minum secangkir teh.',
        explanation: 'Tee adalah maskulin (der Tee), sebagai objek langsung menjadi "einen Tee".',
        orderIndex: 6,
      },
      {
        id: 'exam-q7',
        courseId: germanCourseId,
        chapterId: null,
        isExam: 1,
        type: 'input',
        question: 'Ketik konjugasi yang tepat: "Du ___ (haben) viel Arbeit."',
        answer: 'hast',
        options: null,
        translation: 'Kamu memiliki banyak pekerjaan.',
        explanation: 'Konjugasi haben untuk du adalah hast.',
        orderIndex: 7,
      },
      {
        id: 'exam-q8',
        courseId: germanCourseId,
        chapterId: null,
        isExam: 1,
        type: 'input',
        question: 'Lengkapi artikel tertentu untuk kata benda netral "Auto" (mobil): ___ Auto',
        answer: 'das',
        options: null,
        translation: 'Mobil tersebut.',
        explanation: 'Mobil bergender netral: das Auto.',
        orderIndex: 8,
      },
      {
        id: 'exam-q9',
        courseId: germanCourseId,
        chapterId: null,
        isExam: 1,
        type: 'sentence',
        question: 'Susun kalimat: "Ich kaufe ein Buch" (Saya membeli sebuah buku)',
        answer: 'Ich kaufe ein Buch',
        options: 'Buch|ein|kaufe|Ich',
        translation: 'Saya membeli sebuah buku.',
        explanation: 'Subjek (Ich) + Verba (kaufe) + Objek Akkusativ Netral (ein Buch).',
        orderIndex: 9,
      },
      {
        id: 'exam-q10',
        courseId: germanCourseId,
        chapterId: null,
        isExam: 1,
        type: 'choice',
        question: 'Lengkapi: "Siehst du ___ Lehrer (der Lehrer)?"',
        answer: 'den',
        options: 'der|den|dem|des',
        translation: 'Apakah kamu melihat guru itu?',
        explanation: 'Sehen membutuhkan objek akkusativ. Der Lehrer berubah menjadi den Lehrer.',
        orderIndex: 10,
      },
    ]

    for (const eq of examQuestions) {
      await db.insert(questions).values(eq)
    }

    // 7. Kursus Contoh Kedua: Percakapan Bahasa Inggris B1
    console.log('📚 Membuat Kursus Kedua: Bahasa Inggris Bisnis B1...')
    const englishCourseId = 'course-english-business-b1'
    await db.insert(courses).values({
      id: englishCourseId,
      userId: curriculumUser.id,
      title: 'Business English & Professional Communication B1',
      level: 'B1',
      category: 'Professional English',
      description:
        'Kuasai komunikasi bahasa Inggris untuk keperluan kerja profesional: etiket menulis email bisnis yang persuasif, frasa presentasi formal, dan teknik negosiasi praktis.',
      targetLanguage: 'en-US',
      visibility: 'public',
      status: 'published',
      examDurationMinutes: 10,
      examPassingScore: 80,
    })

    const engChap1Id = 'chap-eng-b1-1'
    await db.insert(courseChapters).values({
      id: engChap1Id,
      courseId: englishCourseId,
      orderIndex: 1,
      title: 'Bab 1: Professional Email Etiquette & Inquiries',
      description: 'Struktur email formal, salam pembuka, dan penulisan permohonan informasi profesional.',
      sourceFilename: '01_business_email.md',
      quizDurationMinutes: 5,
      markdownContent: `# Bab 1: Professional Email Etiquette

Menulis email formal dalam lingkungan bisnis internasional memerlukan nada bicara yang tepat, sopan, dan to the point.

## Frasa Pembuka Populer
- *I am writing to inquire about...* (Saya menulis untuk menanyakan perihal...)
- *Further to our conversation yesterday...* (Menindaklanjuti percakapan kita kemarin...)
- *Could you please provide an update regarding...?* (Bisakah Anda memberikan kabar terbaru mengenai...?)

## Frasa Penutup
- *I look forward to hearing from you.* (Saya menantikan kabar dari Anda.)
- *Sincerely / Best regards,* (Hormat kami,)`,
    })

    await db.insert(questions).values([
      {
        id: 'q-eng-1',
        courseId: englishCourseId,
        chapterId: engChap1Id,
        isExam: 0,
        type: 'choice',
        question: 'Which opening phrase is most formal for a business inquiry?',
        answer: 'I am writing to inquire about...',
        options: 'Hey there!|I am writing to inquire about...|What is up with...|Listen to me,',
        translation: 'Frasa pembuka email bisnis formal.',
        explanation: '"I am writing to inquire about..." adalah standar baku internasional.',
        orderIndex: 1,
      },
      {
        id: 'q-eng-2',
        courseId: englishCourseId,
        chapterId: engChap1Id,
        isExam: 0,
        type: 'choice',
        question: 'What is a polite professional closing?',
        answer: 'Sincerely,',
        options: 'See ya!|Sincerely,|Cheers dude|Later,',
        translation: 'Penutup email yang sopan.',
        explanation: 'Sincerely atau Best regards adalah penutup standar profesional.',
        orderIndex: 2,
      },
    ])

    await db.insert(courseFlashcards).values([
      {
        id: 'fc-eng-1',
        courseId: englishCourseId,
        chapterId: engChap1Id,
        front: 'Inquire about',
        back: 'Menanyakan perihal / mencari informasi tentang',
        hint: 'Formal verb for asking',
        explanation: 'Common in business emails.',
        orderIndex: 1,
      },
      {
        id: 'fc-eng-2',
        courseId: englishCourseId,
        chapterId: engChap1Id,
        front: 'Best regards',
        back: 'Salam hangat / Salam hormat (Penutup)',
        hint: 'Standard business closing',
        explanation: 'Polite sign-off.',
        orderIndex: 2,
      },
    ])

    // Soal Ujian Bahasa Inggris Bisnis
    await db.insert(questions).values([
      {
        id: 'exam-eng-1',
        courseId: englishCourseId,
        chapterId: null,
        isExam: 1,
        type: 'choice',
        question: 'Complete: "I look forward to ___ from you soon."',
        answer: 'hearing',
        options: 'hear|heard|hearing|hears',
        translation: 'Saya menantikan kabar dari Anda segera.',
        explanation: 'Ungkapan "look forward to" selalu diikuti gerund (-ing).',
        orderIndex: 1,
      },
      {
        id: 'exam-eng-2',
        courseId: englishCourseId,
        chapterId: null,
        isExam: 1,
        type: 'choice',
        question: 'What does "ASAP" stand for in business communication?',
        answer: 'As soon as possible',
        options: 'Always send all papers|As soon as possible|After standard audit process|All systems are positive',
        translation: 'Sesegera mungkin.',
        explanation: 'ASAP = As soon as possible.',
        orderIndex: 2,
      },
    ])

    // 8. Beri Demo Student progress di seluruh Bab & Ujian Kelulusan Bersertifikat
    console.log('🌟 Menambahkan contoh progres dan sertifikat kelulusan siswa demo...')
    await db.insert(chapterProgress).values([
      {
        userId: demoStudent.id,
        courseId: germanCourseId,
        chapterId: chap1Id,
        isRead: 1,
        flashcardMastered: 1,
        quizCompleted: 1,
        bestQuizScore: 4,
        bestQuizAccuracy: 100,
      },
      {
        userId: demoStudent.id,
        courseId: germanCourseId,
        chapterId: chap2Id,
        isRead: 1,
        flashcardMastered: 1,
        quizCompleted: 1,
        bestQuizScore: 4,
        bestQuizAccuracy: 100,
      },
      {
        userId: demoStudent.id,
        courseId: germanCourseId,
        chapterId: chap3Id,
        isRead: 1,
        flashcardMastered: 1,
        quizCompleted: 1,
        bestQuizScore: 4,
        bestQuizAccuracy: 100,
      },
    ])

    const now = new Date()
    await db.insert(courseProgress).values({
      userId: demoStudent.id,
      courseId: germanCourseId,
      isExamPassed: 1,
      bestExamScore: 10,
      bestExamAccuracy: 100,
      certificateId: 'CERT-GERMAN-A1-DEMO',
      examAttemptCount: 1,
      lastExamAt: now,
    })

    await db.insert(courseReviews).values({
      userId: demoStudent.id,
      courseId: germanCourseId,
      rating: 5,
      comment:
        'Penjelasannya sangat terstruktur dan mudah dimengerti! Suka sekali dengan alur bab materi -> flashcard -> kuis latihan sebelum ujian akhir.',
    })

    await db.insert(courseBookmarks).values({
      userId: demoStudent.id,
      courseId: germanCourseId,
    })

    console.log('✅ Seeding berhasil selesai!')
  } catch (error) {
    console.error('❌ Gagal menjalankan seed:', error)
    throw error
  } finally {
    await pool.end()
  }
}

seed()
