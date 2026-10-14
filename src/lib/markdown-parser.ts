import { marked } from 'marked'

export interface TOCHeading {
  id: string
  text: string
  level: number
}

export interface ParsedMarkdownLesson {
  frontmatter: {
    id?: string
    title?: string
    level?: string
    category?: string
    quizId?: string
    description?: string
  }
  content: string
  html: string
  headings: TOCHeading[]
  readingTimeMinutes: number
}

export function parseMarkdownLesson(rawMarkdown: string): ParsedMarkdownLesson {
  let frontmatter: Record<string, string> = {}
  let markdownBody = rawMarkdown.trim()

  // Extract YAML frontmatter if present (--- ... ---)
  const frontmatterMatch = rawMarkdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/)
  if (frontmatterMatch) {
    const rawYaml = frontmatterMatch[1]
    markdownBody = rawMarkdown.slice(frontmatterMatch[0].length).trim()

    rawYaml.split('\n').forEach(line => {
      const colonIdx = line.indexOf(':')
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx).trim()
        const value = line.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '')
        if (key && value) {
          frontmatter[key] = value
        }
      }
    })
  }

  // Calculate approximate reading time (~180 words per min)
  const words = markdownBody.trim().split(/\s+/).filter(Boolean).length
  const readingTimeMinutes = Math.max(1, Math.ceil(words / 180))

  // Configure marked options
  marked.setOptions({
    gfm: true,
    breaks: true,
  })

  // Render markdown to HTML
  let html = marked.parse(markdownBody) as string

  // 1. Extract headings & inject slug IDs + audio pronounce button
  const headings: TOCHeading[] = []
  const slugCounts: Record<string, number> = {}

  html = html.replace(/<h([1-3])>(.*?)<\/h\1>/gi, (_fullMatch, levelStr, innerContent) => {
    const level = parseInt(levelStr, 10)
    const plainText = innerContent
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim()
    let slug = plainText
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
    if (!slug) slug = `heading-${headings.length + 1}`

    if (slugCounts[slug]) {
      slugCounts[slug]++
      slug = `${slug}-${slugCounts[slug]}`
    } else {
      slugCounts[slug] = 1
    }

    if (level >= 2) {
      headings.push({
        id: slug,
        text: plainText,
        level,
      })
    }

    return `<h${level} id="${slug}" class="heading-anchor group relative flex items-center justify-between cursor-pointer scroll-mt-24" data-speak="${encodeURIComponent(plainText)}"><span class="heading-text">${innerContent}</span><button type="button" class="speaker-tts-btn opacity-80 sm:opacity-0 group-hover:opacity-100 transition-all duration-200 ml-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/25 hover:border-primary/50 px-2.5 py-1 rounded-full shrink-0 select-none cursor-pointer shadow-xs" data-speak="${encodeURIComponent(plainText)}" title="Dengarkan pengucapan audio"><svg class="size-3.5 fill-current" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg><span>Lafalkan</span></button></h${level}>`
  })

  // 2. Enhance tables with responsive wrapper & gender badge pills for language learning
  html = html.replace(
    /<table>/g,
    '<div class="table-wrapper"><table>'
  )
  html = html.replace(/<\/table>/g, '</table></div>')

  // Highlight grammatical gender articles inside table cells
  html = html.replace(/<td>([\s\S]*?)<\/td>/gi, (_match, cellContent) => {
    let enhanced = cellContent
      .replace(/<strong>der<\/strong>/gi, '<span class="gender-pill pill-der">der</span>')
      .replace(/<strong>die<\/strong>/gi, '<span class="gender-pill pill-die">die</span>')
      .replace(/<strong>das<\/strong>/gi, '<span class="gender-pill pill-das">das</span>')
      .replace(/<strong>ein<\/strong>/gi, '<span class="gender-pill pill-ein">ein</span>')
      .replace(/<strong>eine<\/strong>/gi, '<span class="gender-pill pill-ein">eine</span>')
      .replace(/<strong>kein<\/strong>/gi, '<span class="gender-pill pill-kein">kein</span>')
      .replace(/<strong>keine<\/strong>/gi, '<span class="gender-pill pill-kein">keine</span>')
    return `<td>${enhanced}</td>`
  })

  // 3. Transform Blockquotes into Rich Thematic Callout Boxes
  // Handles: > [!NOTE], > [!TIP], > [!IMPORTANT], > [!WARNING], > [!CAUTION]
  // As well as standard formatted: > **Tips ...**: , > **Catatan ...**: , > **Penting ...**:
  html = html.replace(/<blockquote>([\s\S]*?)<\/blockquote>/gi, (_match, blockContent) => {
    const rawText = blockContent.replace(/<[^>]+>/g, '').trim()
    let calloutType: 'tip' | 'note' | 'important' | 'warning' = 'note'
    let title = 'Catatan Belajar'
    let iconSvg = `<svg class="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`

    if (/\[!TIP\]/i.test(blockContent) || /tips|trik|selalu|sering|rekomendasi/i.test(rawText)) {
      calloutType = 'tip'
      title = 'Tips & Kaidah Gramatika'
      iconSvg = `<svg class="size-4 shrink-0 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`
    } else if (/\[!WARNING\]|\[!CAUTION\]/i.test(blockContent) || /peringatan|perhatian|awas|hati-hati|jebakan/i.test(rawText)) {
      calloutType = 'warning'
      title = 'Peringatan & Kesalahan Umum'
      iconSvg = `<svg class="size-4 shrink-0 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
    } else if (/\[!IMPORTANT\]/i.test(blockContent) || /penting|aturan utama|wajib|kunci/i.test(rawText)) {
      calloutType = 'important'
      title = 'Aturan Penting'
      iconSvg = `<svg class="size-4 shrink-0 text-indigo-500 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`
    } else {
      calloutType = 'note'
      title = 'Informasi & Konteks'
      iconSvg = `<svg class="size-4 shrink-0 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`
    }

    // Clean [!NOTE] tags from inner content if present
    const cleanedContent = blockContent
      .replace(/\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/gi, '')
      .trim()

    return `
      <div class="markdown-callout callout-${calloutType} my-5 rounded-2xl p-4 sm:p-5 border" role="region">
        <div class="callout-header flex items-center gap-2 font-bold text-xs sm:text-sm mb-2 select-none">
          ${iconSvg}
          <span class="tracking-wide">${title}</span>
        </div>
        <div class="callout-body text-xs sm:text-sm leading-relaxed">
          ${cleanedContent}
        </div>
      </div>
    `.trim()
  })

  // 4. Wrap Code Blocks with Header and Copy Trigger
  html = html.replace(/<pre><code(?: class="language-([a-zA-Z0-9_-]+)")?>([\s\S]*?)<\/code><\/pre>/gi, (_match, lang, codeInner) => {
    const languageLabel = (lang || 'contoh').toUpperCase()
    // Extract plain text for copy
    const plainCode = codeInner
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")

    return `
      <div class="code-card-wrapper my-5 rounded-2xl overflow-hidden border border-border/80 bg-muted/30 shadow-xs">
        <div class="code-card-header flex items-center justify-between px-4 py-2 border-b border-border/60 bg-muted/60 text-[11px] font-mono text-muted-foreground select-none">
          <div class="flex items-center gap-2">
            <span class="inline-block size-2 rounded-full bg-primary/40"></span>
            <span class="font-bold uppercase tracking-wider">${languageLabel}</span>
          </div>
          <button type="button" class="copy-code-trigger flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-background/80 hover:text-foreground text-muted-foreground transition-all duration-150 cursor-pointer font-sans text-xs" data-copy="${encodeURIComponent(plainCode)}" title="Salin contoh teks">
            <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
            <span class="copy-text">Salin</span>
          </button>
        </div>
        <pre class="p-4 sm:p-5 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed bg-transparent m-0"><code class="${lang ? `language-${lang}` : ''}">${codeInner}</code></pre>
      </div>
    `.trim()
  })

  return {
    frontmatter,
    content: markdownBody,
    html,
    headings,
    readingTimeMinutes,
  }
}

export function generateSampleMarkdownTemplate(): string {
  return `---
id: german-a1-artikel
title: Mengenal Artikel Bahasa Jerman (Der, Die, Das)
level: A1
category: Grammatik
quizId: quiz-german-artikel
description: Panduan praktis memahami gender gramatikal kata benda bahasa Jerman dan aturan artikel tentu serta tak tentu.
---

# Mengenal Artikel Bahasa Jerman: Der, Die, Das

Dalam bahasa Jerman, setiap kata benda (*Substantiv*) selalu ditulis dengan **huruf kapital** di awalnya dan memiliki jenis kelamin gramatikal (*Genus*). Terdapat tiga jenis artikel tertentu (*bestimmter Artikel*):

- **der** : Maskulin (*männlich*)
- **die** : Feminin (*weiblich*)
- **das** : Netral (*sächlich*)
- **die** : Jamak (*Plural* untuk semua gender)

---

## Tabel Artikel Tentu & Tak Tentu (Kasus Nominativ)

| Gender | Artikel Tentu | Artikel Tak Tentu | Negasi (Kein) | Contoh Kosakata |
|---|---|---|---|---|
| **Maskulin** | **der** Mann | **ein** Mann | **kein** Mann | der Tisch, der Apfel |
| **Feminin** | **die** Frau | **eine** Frau | **keine** Frau | die Lampe, die Schule |
| **Netral** | **das** Kind | **ein** Kind | **kein** Kind | das Buch, das Auto |
| **Jamak** | **die** Kinder | *(tidak ada)* | **keine** Kinder | die Bücher, die Tische |

---

## Tips Mengenali Gender Kata Benda

Meskipun sebagian besar artikel harus dihafal bersama katanya, ada beberapa akhiran kata (*Suffix*) yang dapat dijadikan pedoman:

> [!TIP]
> **Selalu Feminin (*die*)**: Kata benda yang berakhiran **-ung** (*die Wohnung*), **-heit** (*die Freiheit*), **-keit** (*die Möglichkeit*), **-schaft** (*die Freundschaft*), dan **-tät** (*die Universität*).

> [!NOTE]
> **Selalu Netral (*das*)**: Kata benda yang berakhiran bentuk pengecil **-chen** (*das Mädchen*) atau **-lein** (*das Fräulein*), serta kata kerja yang dijadikan kata benda (*das Essen*, *das Leben*).

> [!IMPORTANT]
> **Sering Maskulin (*der*)**: Nama hari, bulan, musim, arah mata angin, serta kata yang berakhiran **-or** (*der Motor*) atau **-er** penunjuk profesi (*der Lehrer*).

Lanjutkan pemahaman Anda dengan mengerjakan soal latihan interaktif pada topik ini!
`
}
