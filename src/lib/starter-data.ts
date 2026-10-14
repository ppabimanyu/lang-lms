import type { Lesson, Quiz } from '@/types'
import { parseQuestionsCSV } from './csv-parser'

export const STARTER_LESSONS: Lesson[] = [
  {
    id: 'lesson-german-artikel',
    title: 'Mengenal Artikel Bahasa Jerman: Der, Die, Das',
    level: 'A1',
    category: 'Grammatik',
    description: 'Panduan lengkap memahami gender gramatikal kata benda Jerman (maskulin, feminin, netral) dan pemakaian artikel tentu serta tak tentu.',
    quizId: 'quiz-german-artikel',
    targetLanguage: 'de-DE',
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 3,
    sourceFilename: '01_artikel_der_die_das.md',
    markdownContent: `---
id: lesson-german-artikel
title: Mengenal Artikel Bahasa Jerman: Der, Die, Das
level: A1
category: Grammatik
quizId: quiz-german-artikel
---

# Mengenal Artikel Bahasa Jerman: Der, Die, Das

Dalam bahasa Jerman, setiap kata benda (*Substantiv*) selalu ditulis dengan **huruf kapital** di awalnya dan memiliki jenis kelamin gramatikal (*Genus*). Terdapat tiga jenis artikel tertentu (*bestimmter Artikel*):

- **der** : Maskulin (*männlich*)
- **die** : Feminin (*weiblich*)
- **das** : Netral (*sächlich*)
- **die** : Jamak (*Plural* untuk semua jenis)

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

> **Selalu Netral (*das*)**: Kata benda yang berakhiran bentuk pengecil **-chen** (*das Mädchen*) atau **-lein** (*das Fräulein*), serta kata kerja yang dijadikan kata benda (*das Essen*, *das Leben*).

> **Sering Maskulin (*der*)**: Nama hari (*der Montag*), bulan (*der Januar*), musim (*der Sommer*), arah mata angin (*der Norden*), serta kata yang berakhiran **-or** (*der Motor*) atau **-er** penunjuk orang (*der Lehrer*).

Lanjutkan pemahaman Anda dengan mengerjakan soal latihan interaktif pada topik ini!`
  },
  {
    id: 'lesson-german-praesens',
    title: 'Konjugasi Kata Kerja Präsens (Waktu Sekarang)',
    level: 'A1',
    category: 'Verben',
    description: 'Pelajari aturan perubahan bentuk kata kerja beraturan (regelmäßige Verben) serta kata kerja penting seperti sein dan haben.',
    quizId: 'quiz-german-praesens',
    targetLanguage: 'de-DE',
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
    sourceFilename: '02_konjugation_praesens.md',
    markdownContent: `---
id: lesson-german-praesens
title: Konjugasi Kata Kerja Präsens (Waktu Sekarang)
level: A1
category: Verben
quizId: quiz-german-praesens
---

# Konjugasi Kata Kerja Präsens (Waktu Sekarang)

Dalam bahasa Jerman, kata kerja berubah bentuk (*konjugieren*) mengikuti subjeknya. Bentuk dasar kata kerja berakhiran **-en** disebut *Infinitiv* (contoh: *lernen*, *wohnen*, *machen*).

---

## Pola Akhiran Kata Kerja Beraturan (Regelmäßig)

Ambil akar kata (*Verbstamm*) dengan menghilangkan akhiran **-en**, lalu tambahkan akhiran subjek:

| Subjek (Personalpronomen) | Akhiran | Contoh: lernen *(belajar)* | Contoh: kommen *(datang)* |
|---|---|---|---|
| **ich** *(saya)* | **-e** | ich lern**e** | ich komm**e** |
| **du** *(kamu)* | **-st** | du lern**st** | du偏移komm**st** |
| **er / sie / es** *(dia)* | **-t** | er lern**t** | er komm**t** |
| **wir** *(kami/kita)* | **-en** | wir lern**en** | wir komm**en** |
| **ihr** *(kalian)* | **-t** | ihr lern**t** | ihr komm**t** |
| **sie / Sie** *(mereka / Anda)* | **-en** | sie lern**en** | sie komm**en** |

---

## Dua Kata Kerja Paling Penting: sein dan haben

Kedua kata kerja ini adalah kata kerja tidak beraturan (*unregelmäßige Verben*) yang wajib dihafal:

| Subjek | sein *(adalah/ada)* | haben *(mempunyai)* |
|---|---|---|
| **ich** | **bin** | **habe** |
| **du** | **bist** | **hast** |
| **er / sie / es** | **ist** | **hat** |
| **wir** | **sind** | **haben** |
| **ihr** | **seid** | **habt** |
| **sie / Sie** | **sind** | **haben** |

> [!NOTE]
> Posisi kata kerja dalam kalimat berita bahasa Jerman selalu berada di **posisi kedua** (*Position 2*).
> Contoh: *Heute **lernen** wir Deutsch.*`
  },
  {
    id: 'lesson-german-akkusativ',
    title: 'Kasus Akkusativ: Objek Langsung',
    level: 'A1',
    category: 'Grammatik',
    description: 'Memahami kapan menggunakan kasus Akkusativ dan bagaimana perubahan artikel maskulin der menjadi den.',
    quizId: 'quiz-german-akkusativ',
    targetLanguage: 'de-DE',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
    sourceFilename: '03_kasus_akkusativ.md',
    markdownContent: `---
id: lesson-german-akkusativ
title: Kasus Akkusativ: Objek Langsung
level: A1
category: Grammatik
quizId: quiz-german-akkusativ
---

# Kasus Akkusativ: Mengenal Objek Penderita

Kasus **Akkusativ** digunakan ketika suatu kata benda berfungsi sebagai **objek langsung** (*direktes Objekt*) dari tindakan kata kerja, atau setelah preposisi tertentu (*bis, durch, für, gegen, ohne, um*).

Kabar baiknya: Dalam kasus Akkusativ, **hanya kata benda Maskulin yang berubah bentuk**. Feminin, Netral, dan Jamak tetap sama persis dengan Nominativ!

---

## Tabel Perubahan Artikel Kasus Akkusativ

| Gender | Nominativ (Subjek) | Akkusativ (Objek) | Indefinit (Akk.) | Negasi (Akk.) |
|---|---|---|---|---|
| **Maskulin** | **der** Mann | **den** Mann | **einen** Mann | **keinen** Mann |
| **Feminin** | **die** Frau | **die** Frau | **eine** Frau | **keine** Frau |
| **Netral** | **das** Kind | **das** Kind | **ein** Kind | **kein** Kind |
| **Jamak** | **die** Kinder | **die** Kinder | *(keine Endung)* | **keine** Kinder |

---

## Kata Kerja yang Membutuhkan Akkusativ

Sebagian besar kata kerja transitif memerlukan objek Akkusativ:
- **haben** *(mempunyai)*: *Ich habe **einen** Bruder.*
- **kaufen** *(membeli)*: *Er kauft **einen** Laptop.*
- **trinken** *(meminum)*: *Wir trinken **den** Kaffee.*
- **essen** *(memakan)*: *Sie isst **einen** Apfel.*
- **sehen** *(melihat)*: *Ich sehe **den** Park.*

Uji pemahaman Anda dengan latihan di bawah ini!`
  }
]

const RAW_CSV_QUIZ_1 = `type,question,answer,options,translation,explanation
choice,Das ist ___ Mann.,"ein","ein|eine|einen|einer",Itu adalah seorang pria.,"Mann adalah kata benda maskulin (der Mann) dalam posisi subjek (Nominativ)."
input,Ich gehe heute in ___ Schule.,die,,Saya pergi ke sekolah hari ini.,"Schule adalah kata benda bergender feminin (die Schule)."
sentence,Das Kind liest ein Buch.,Das Kind liest ein Buch.,,Anak itu sedang membaca sebuah buku.,"Susunan subjek kata benda netral (das Kind) + verba (liest) + objek (ein Buch)."
choice,Wo ist ___ Lampe?,"die","der|die|das|den",Di mana lampunya?,"Lampe bergender feminin sehingga artikel tentu bentuk Nominativ adalah die."
input,Hier ist ___ Auto von Peter.,das,,Ini adalah mobil milik Peter.,"Auto adalah kata benda bergender netral (das Auto)."
sentence,Wir haben heute keine Zeit.,Wir haben heute keine Zeit.,,Kami tidak punya waktu hari ini.,"Negasi untuk kata benda tak tentu (die Zeit) menggunakan keine."
choice,Das ist ___ Apfel.,"ein","ein|eine|einen|einem",Itu adalah sebuah apel.,"Dalam kalimat predikatif 'Das ist...', Apfel tetap berada dalam kasus Nominativ maskulin (ein Apfel)."`

const RAW_CSV_QUIZ_2 = `type,question,answer,options,translation,explanation
choice,Ich ___ jeden Tag Deutsch.,"lerne","lerne|lernst|lernt|lernen",Saya belajar bahasa Jerman setiap hari.,"Subjek 'ich' mengambil akhiran kata kerja -e (lerne)."
input,Du ___ sehr gut Deutsch.,sprichst,,Kamu berbicara bahasa Jerman dengan sangat baik.,"Kata kerja sprechen mengalami perubahan vokal e -> i untuk subjek du (du sprichst)."
sentence,Wir kommen aus Indonesien.,Wir kommen aus Indonesien.,,Kami berasal dari Indonesia.,"Konjugasi kata kerja kommen untuk subjek 'wir' berakhiran -en."
choice,Er ___ einen Kaffee.,"trinkt","trinke|trinkst|trinkt|trinken",Dia minum secangkir kopi.,"Subjek 'er' (dia laki-laki) mengambil akhiran konjugasi -t."
input,Ich ___ Student an der Universität.,bin,,Saya adalah seorang mahasiswa di universitas.,"Bentuk kata kerja sein untuk subjek 'ich' adalah bin."
sentence,Sie wohnen seit zwei Jahren in Berlin.,Sie wohnen seit dua Jahren in Berlin.,,Mereka tinggal di Berlin sejak dua tahun lalu.,"Perhatikan huruf kapital dan posisi kedua untuk kata kerja wohnen."
choice,___ ihr heute Zeit?,"Habt","Hast|Habt|Haben|Hat",Apakah kalian punya waktu hari ini?,"Konjugasi haben untuk subjek jamak kedua 'ihr' adalah habt."`

const RAW_CSV_QUIZ_3 = `type,question,answer,options,translation,explanation
choice,Ich habe ___ Hund.,"einen","ein|eine|einen|einem",Saya mempunyai seekor anjing.,"Hund adalah maskulin (der Hund). Sebagai objek kata kerja haben menjadi einen (Akkusativ)."
input,Er kauft ___ Apfel auf dem Markt.,den,,Dia membeli apel tersebut di pasar.,"Apfel bergender maskulin, artikel tertentu berubah dari der menjadi den dalam Akkusativ."
sentence,Wir trinken jeden Morgen den Kaffee.,Wir trinken jeden Morgen den Kaffee.,,Kami meminum kopi tersebut setiap pagi.,"Pola kalimat Akkusativ: Subjek (Wir) + Verba (trinken) + Waktu (jeden Morgen) + Objek (den Kaffee)."
choice,Sie isst ___ Pizza zum Mittagessen.,"eine","ein|eine|einen|einer",Dia makan sebuah pizza untuk makan siang.,"Pizza bergender feminin (die Pizza), artikel tak tentu Akkusativ tetap eine."
input,Ich sehe ___ Auto auf der Straße.,das,,Saya melihat mobil itu di jalan.,"Kata benda netral (das Auto) tidak mengalami perubahan artikel dalam kasus Akkusativ."
sentence,Ich brauche einen neuen Laptop.,Ich brauche einen neuen Laptop.,,Saya membutuhkan sebuah laptop baru.,"Objek maskulin laptop menerima artikel tak tentu einen dalam Akkusativ."`

export const STARTER_QUIZZES: Quiz[] = [
  {
    id: 'quiz-german-artikel',
    title: 'Latihan 1: Artikel Der, Die, Das & Ein, Eine',
    description: 'Latihan mengidentifikasi gender kata benda bahasa Jerman dan penggunaan artikel tentu/tak tentu.',
    level: 'A1',
    category: 'Grammatik',
    targetLanguage: 'de-DE',
    lessonId: 'lesson-german-artikel',
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 3,
    sourceFilename: '01_quiz_artikel.csv',
    questions: parseQuestionsCSV(RAW_CSV_QUIZ_1, 'quiz-german-artikel').questions,
  },
  {
    id: 'quiz-german-praesens',
    title: 'Latihan 2: Konjugasi Kata Kerja Präsens & Sein/Haben',
    description: 'Latihan konjugasi kata kerja bentuk waktu sekarang dan penyusunan kalimat sederhana.',
    level: 'A1',
    category: 'Verben',
    targetLanguage: 'de-DE',
    lessonId: 'lesson-german-praesens',
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
    sourceFilename: '02_quiz_praesens.csv',
    questions: parseQuestionsCSV(RAW_CSV_QUIZ_2, 'quiz-german-praesens').questions,
  },
  {
    id: 'quiz-german-akkusativ',
    title: 'Latihan 3: Kasus Akkusativ (Objek Penderita)',
    description: 'Latihan perubahan artikel maskulin den/einen sebagai objek langsung kata kerja.',
    level: 'A1',
    category: 'Grammatik',
    targetLanguage: 'de-DE',
    lessonId: 'lesson-german-akkusativ',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
    sourceFilename: '03_quiz_akkusativ.csv',
    questions: parseQuestionsCSV(RAW_CSV_QUIZ_3, 'quiz-german-akkusativ').questions,
  },
]
