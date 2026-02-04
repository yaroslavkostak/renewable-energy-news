#!/usr/bin/env node
/**
 * Renewable Energy News – automated collection, AI rewriting, and Git push.
 * Run via: node index.js  (or npm run collect)
 * Loads OPENAI_API_KEY from .env if present. In GitHub Actions use Secrets.
 */

import 'dotenv/config';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import axios from 'axios';
import OpenAI from 'openai';
import matter from 'gray-matter';
import { config } from './config.js';
import { getBrandDisplayName } from './lib/brandNames.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FEEDS_PATH = join(__dirname, 'feeds.json');

// --- Load feeds config
function loadFeeds() {
  const raw = readFileSync(FEEDS_PATH, 'utf8');
  return JSON.parse(raw);
}

// --- Processed links (duplicate tracking)
function loadProcessedLinks() {
  const path = join(__dirname, config.processedLinksPath);
  if (!existsSync(path)) return [];
  try {
    const raw = readFileSync(path, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveProcessedLinks(links) {
  const path = join(__dirname, config.processedLinksPath);
  writeFileSync(path, JSON.stringify(links, null, 2), 'utf8');
}

// --- Fetch HTML and extract text + main image
async function fetchPage(url) {
  const { data } = await axios.get(url, {
    timeout: config.fetchTimeoutMs,
    headers: { 'User-Agent': config.userAgent },
    responseType: 'text',
    maxRedirects: 5,
  });
  const $ = cheerio.load(data);
  $('script, style, nav, footer, aside, [role="navigation"]').remove();
  const main = $('article, main, [role="main"], .content, .post, .article').first();
  const root = main.length ? main : $.root();
  const text = root.text().replace(/\s+/g, ' ').trim();
  let imageUrl = '';
  const img = root.find('img').first();
  if (img.length) {
    const src = img.attr('src');
    if (src) imageUrl = src.startsWith('http') ? src : new URL(src, url).href;
  }
  if (!imageUrl) {
    const og = $('meta[property="og:image"]').attr('content');
    if (og) imageUrl = og.startsWith('http') ? og : new URL(og, url).href;
  }
  const sourceName = $('meta[property="og:site_name"]').attr('content') || new URL(url).hostname;
  return { text: text.slice(0, 50000), imageUrl, sourceName };
}

// --- Placeholder = kein echtes Bild (z.B. blank.gif)
const PLACEHOLDER_PATTERNS = /blank\.gif|placeholder|1x1\.(gif|png|jpg)|pixel\.|spacer\.|data:image\/svg/i;
function isPlaceholderImage(url) {
  if (!url || typeof url !== 'string') return true;
  return PLACEHOLDER_PATTERNS.test(url);
}

/** Normalize image URL for deduplication (strip query string). */
function normalizeImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  return url.split('?')[0].trim();
}

/** Load set of image URLs already used in existing articles (no duplicates). */
function loadUsedImageUrls() {
  const dir = join(__dirname, config.articlesDir);
  const used = new Set();
  if (!existsSync(dir)) return used;
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  for (const file of files) {
    const raw = readFileSync(join(dir, file), 'utf8');
    const { data } = matter(raw);
    if (data.image && !isPlaceholderImage(data.image)) {
      used.add(normalizeImageUrl(data.image));
    }
  }
  return used;
}

// --- Fallback-Bilder: Picsum (horizontal 800×450), eindeutiger Seed pro Artikel
function getPicsumImageUrl(usedSet = new Set()) {
  let url;
  do {
    const seed = `renewable-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    url = `https://picsum.photos/seed/${seed}/800/450`;
  } while (usedSet.has(normalizeImageUrl(url)));
  return url;
}
function getRandomStockImage(usedSet = new Set()) {
  const imageUrl = getPicsumImageUrl(usedSet);
  return { imageUrl, imageSource: 'Picsum' };
}

function keywordFromText(titleOrText) {
  const s = (titleOrText || '').replace(/[^\w\säöüÄÖÜß-]/gi, ' ').replace(/\s+/g, ' ').trim();
  const words = s.split(' ').filter((w) => w.length > 2).slice(0, 4);
  if (words.length) return words.join(' ');
  return 'solar panels renewable energy';
}

const STOCK_KEYWORDS = ['solar panels energy', 'wind turbine renewable', 'renewable energy landscape', 'solar power plant', 'wind energy'];
async function fetchStockImage(keyword, usedSet = new Set()) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  try {
    const q = encodeURIComponent(keyword);
    const { data } = await axios.get(
      `https://api.unsplash.com/search/photos?query=${q}&per_page=15&client_id=${key}`,
      { timeout: 8000 }
    );
    const results = data?.results || [];
    for (const hit of results) {
      const url = hit?.urls?.regular ? hit.urls.regular + '?w=800&h=450&fit=crop' : '';
      if (url && !usedSet.has(normalizeImageUrl(url)))
        return { imageUrl: url, imageSource: 'Unsplash' };
    }
  } catch (err) {
    console.warn('[Unsplash]', err.message);
  }
  return null;
}

/** Versucht API mit mehreren Keywords (nur ungenutzte Bilder), sonst Fallback-Liste. */
async function fetchStockImageWithFallback(titleOrText, usedSet = new Set()) {
  const keyword = keywordFromText(titleOrText);
  let stock = await fetchStockImage(keyword, usedSet);
  if (stock) return stock;
  for (const k of STOCK_KEYWORDS) {
    if (k === keyword) continue;
    stock = await fetchStockImage(k, usedSet);
    if (stock) return stock;
  }
  return getRandomStockImage(usedSet);
}

// --- Normalize feed entry (string URL or { url, priority, category, name })
function normalizeFeedEntry(entry) {
  if (typeof entry === 'string') {
    return { url: entry, priority: 3, category: 'global', name: new URL(entry).hostname };
  }
  return {
    url: entry.url,
    priority: entry.priority ?? 3,
    category: entry.category || 'global',
    name: entry.name || new URL(entry.url).hostname,
  };
}

const LAST_SOURCE_INDEX_PATH = join(__dirname, 'last-source-index.json');
const MAX_LINKS_PER_SCRAPE = 50;

function loadLastSourceIndex() {
  if (!existsSync(LAST_SOURCE_INDEX_PATH)) return 0;
  try {
    const raw = readFileSync(LAST_SOURCE_INDEX_PATH, 'utf8');
    const data = JSON.parse(raw);
    return typeof data.index === 'number' ? data.index : 0;
  } catch {
    return 0;
  }
}

function saveLastSourceIndex(index) {
  writeFileSync(LAST_SOURCE_INDEX_PATH, JSON.stringify({ index }, null, 2), 'utf8');
}

/** Single ordered list of sources (RSS + scrape) by priority for incremental fetch. */
function getSourcesList(feeds) {
  const list = [];
  for (const entry of feeds.rssFeeds || []) {
    const { url, priority, category, name } = normalizeFeedEntry(entry);
    list.push({ type: 'rss', url, priority, category, name });
  }
  for (const entry of feeds.scrapeUrls || []) {
    const o = typeof entry === 'string' ? { url: entry, priority: 3, category: 'global', name: '' } : entry;
    const url = typeof entry === 'string' ? entry : entry.url;
    list.push({
      type: 'scrape',
      url,
      priority: o.priority ?? 3,
      category: o.category || 'global',
      name: o.name || (url ? new URL(url).hostname : ''),
    });
  }
  list.sort((a, b) => (a.priority ?? 3) - (b.priority ?? 3));
  return list;
}

const rssParser = new Parser({
  timeout: config.fetchTimeoutMs,
  headers: { 'User-Agent': config.userAgent },
});

/** Fetch items from a single RSS feed. */
async function fetchOneRssSource(source) {
  try {
    const feed = await rssParser.parseURL(source.url);
    const sourceName = feed.title || source.name;
    const items = [];
    for (const item of feed.items || []) {
      const link = item.link || item.guid;
      if (!link) continue;
      const pubDate = item.pubDate || item.isoDate || '';
      const dateTs = pubDate ? new Date(pubDate).getTime() : 0;
      items.push({
        url: link,
        title: item.title || '',
        rawContent: item.contentSnippet || item.content || item.summary || '',
        sourceName,
        needFetch: !(item.content || item.contentSnippet),
        priority: source.priority,
        category: source.category,
        dateTs, // newest-first order
      });
    }
    return items;
  } catch (err) {
    console.error(`[RSS error] ${source.url}:`, err.message);
    return [];
  }
}

/** Fetch items from a single scrape page; limit to MAX_LINKS_PER_SCRAPE. */
async function fetchOneScrapeSource(source) {
  try {
    const { data } = await axios.get(source.url, {
      timeout: config.fetchTimeoutMs,
      headers: { 'User-Agent': config.userAgent },
      responseType: 'text',
    });
    const $ = cheerio.load(data);
    const baseUrl = new URL(source.url);
    const sourceName = source.name || baseUrl.hostname;
    const links = [];
    $('a[href]').each((_, el) => {
      if (links.length >= MAX_LINKS_PER_SCRAPE) return false;
      const href = $(el).attr('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:')) return;
      try {
        const full = new URL(href, baseUrl).href;
        if (full.startsWith(baseUrl.origin) && full !== source.url) links.push(full);
      } catch {}
    });
    return links.slice(0, MAX_LINKS_PER_SCRAPE).map((url) => ({
      url,
      title: '',
      rawContent: '',
      sourceName,
      needFetch: true,
      priority: source.priority,
      category: source.category,
      dateTs: 0, // no date from scrape; keep DOM order
    }));
  } catch (err) {
    console.error(`[Scrape error] ${source.url}:`, err.message);
    return [];
  }
}

/** Fetch one source (RSS or scrape), return items. */
async function fetchOneSource(source) {
  if (source.type === 'rss') return fetchOneRssSource(source);
  return fetchOneScrapeSource(source);
}

// --- Filter out already processed
function filterNewItems(items, processedSet) {
  return items.filter((item) => !processedSet.has(normalizeUrl(item.url)));
}

/** Newest first; items without date (dateTs 0) go to end. */
function sortByDateNewestFirst(items) {
  return [...items].sort((a, b) => {
    const ta = a.dateTs || 0;
    const tb = b.dateTs || 0;
    if (ta && tb) return tb - ta; // descending
    if (ta) return -1;
    if (tb) return 1;
    return 0;
  });
}

// --- Sort by priority (1 = Austria first), then by URL for stability
function sortByPriority(items) {
  return [...items].sort((a, b) => (a.priority ?? 3) - (b.priority ?? 3) || (a.url || '').localeCompare(b.url || ''));
}

// --- Interleave by source (hostname) so not all items are from the first feed
function interleaveBySource(items) {
  if (items.length <= 1) return items;
  const byHost = new Map();
  for (const item of items) {
    let host = '';
    try {
      host = new URL(item.url).hostname;
    } catch {
      host = item.url || 'other';
    }
    if (!byHost.has(host)) byHost.set(host, []);
    byHost.get(host).push(item);
  }
  const groups = [...byHost.values()];
  const result = [];
  let idx = 0;
  while (true) {
    let any = false;
    for (const arr of groups) {
      if (idx < arr.length) {
        result.push(arr[idx]);
        any = true;
      }
    }
    if (!any) break;
    idx++;
  }
  return result;
}

// --- Filter out purely political content (keep subsidy, law, price)
const POLITICAL_BLACKLIST = /\b(partei|parteien|wahl|wahlen|debatt?e|koalition|opposition|abgeordnet|mandat)\b/i;
const KEEP_TOPICS = /\b(subvention|förderung|gesetz|verordnung|preis|tarif|kosten|batterie|solar|wind|pv|speicher|energie|netz|strom)\b/i;
function isMostlyPolitical(text) {
  if (!text || text.length < 200) return false;
  const lower = text.slice(0, 8000);
  const hasPolitical = POLITICAL_BLACKLIST.test(lower);
  const hasRelevant = KEEP_TOPICS.test(lower);
  return hasPolitical && !hasRelevant;
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    u.hash = '';
    u.searchParams.sort();
    return u.toString();
  } catch {
    return url;
  }
}

// --- ChatGPT: rewrite and structure content (rephrase only, no padding)
const ARTICLE_STYLE = `Stil: einfach und klar. Kurze Sätze, ein Gedanke pro Absatz. Keine Listen/Tabellen – nur Fließtext und H2. Überschriften ohne Title Case. Bild: Immer Bildquelle angeben (z.B. "Foto Unsplash" oder "Foto [Quellenname]") ohne Link, dazu 3–5 Wörter Beschreibung was auf dem Bild zu sehen ist und einen kurzen Alt-Text der zur Nachricht passt.

**Strikte Zeichenregel – unbedingt einhalten:** In Überschriften (H1, H2, seoTitle) und im gesamten Fließtext (intro, body, umfassendeGedanken) dürfen weder Doppelpunkt (:) noch Semikolon (;) noch langer Gedankenstrich (— oder –) vorkommen. Stattdessen Punkte, Kommas oder kurze Bindestriche mit Leerzeichen " - " verwenden. Diese Regel gilt für die komplette Ausgabe.`;

const SYSTEM_PROMPT = `Du bist Redakteur für eine österreichische Website zu erneuerbarer Energie. Ausgabe immer auf Deutsch für den österreichischen Markt.

Wichtig – nur umformulieren, nicht aufblähen:
- Jeden Absatz und jede Überschrift des Originals nur sprachlich umformulieren (jedes Satz neu formulieren). Keinen neuen Inhalt erfinden und nichts weglassen, was sachlich wichtig ist.
- Kurze Meldung bleibt kurz. Lange Quelle darf auf bis zu 1000 Wörter gebracht werden, wenn der Stoff es hergibt. Niemals kurze News künstlich auf 1000 Wörter strecken.
- Quelle auf Deutsch (z.B. PV Magazine Germany, Solarserver): nur umformulieren – Überschriften und Absätze Satz für Satz auf Deutsch neu schreiben, österreichischen Bezug wo sinnvoll, Länge an die Quelle anpassen (kurz bleibt kurz, längere bis max. 1000 Wörter).
- Quelle auf Englisch oder Französisch (z.B. CleanTechnica, Electrek, PV Magazine France): in einem einzigen Schritt direkt auf Deutsch reraiten. Nicht zuerst in der Ausgangssprache umformulieren und dann übersetzen – sofort in unserem Stil auf Österreich-Deutsch ausgeben (jeden Satz sinngemäß übertragen, gleiche Längenlogik, kurz bleibt kurz).

${ARTICLE_STYLE}

Struktur:
- H1, ein kurzer Einleitungsabsatz, dann 2–5 H2-Abschnitte. **Wichtig:** Pro H2-Abschnitt mindestens 2, höchstens 4 Absätze – und die Anzahl muss von Abschnitt zu Abschnitt zufällig wechseln (z.B. erster H2 drei Absätze, zweiter H2 zwei Absätze, dritter H2 vier Absätze). Niemals nur ein Absatz pro Überschrift. Kein festes Muster wie "jeweils ein Absatz". Länge der Absätze variieren (mal kürzer, mal länger). Ziel: redaktioneller Nachrichtenartikel, nicht Schablone.
- **Unter jeder H2 nur Fließtext (Absätze).** Niemals unter einer H2 eine Aufzählung oder Bullet-Liste, die Überschriften oder TOC-Einträge wiederholt (z.B. keine Liste mit "Modelle der CO2-Bepreisung", "Beispiele aus Europa" usw.). Die Inhaltsübersicht steht nur einmal oben – im body keine Wiederholung der Überschriften als Liste.
- "Inhaltsübersicht": nur wenn der Artikel mindestens 3 H2 hat; toc = exakt die H2-Überschriften im gleichen Wortlaut wie im body (keine Slugs). Jede H2-Überschrift nur einmal – keine doppelten Überschriften im body und in toc.
- Am Ende ein Schlussabschnitt mit einer inhaltlichen H2-Überschrift wie die anderen (z.B. "Bedeutung der Modernisierung für Österreich") – kein generisches "Fazit" oder "Umfassende Gedanken", sondern eine echte Überschrift zum Inhalt in "schlussAbschnitt" angeben. "Häufige Fragen" weglassen – bei normalen Nachrichten wirkt FAQ wie Verkauf. Nur bei ausdrücklichen FAQ-Guides 1–3 Einträge; sonst faq immer leeres Array.
- Österreich-Bezug wo passend.

Links im Fließtext:
- **Mindestens 1 Link zwingend**, ideal 1–2, bis zu 5 Links als Markdown [Text](URL) im body. Mindestens einer davon ausgehend (z.B. zur Quelle, E-Control, Klimafonds, Ministerium). Kein Artikel ohne mindestens einen Link.
- Links nur im Fließtext: nie in H2-Überschriften, nie in den ersten Wörtern eines Absatzes – natürlich in der Mitte oder am Ende von Sätzen platzieren.
- Nur verlinken, wo es inhaltlich passt (z.B. "auf der [Website des Klimafonds](url)", "laut [E-Control](url)").`;

const USER_PROMPT_TEMPLATE = `Verarbeite die folgende Nachricht zu einem vollständigen Artikel mit österreichischem Bezug und praktischem Nutzen.

**Quelle:** {{sourceName}}
**URL:** {{url}}
**Bild-URL (falls vorhanden):** {{imageUrl}}
**Bildquelle (wenn von Stock, z.B. Unsplash):** {{imageSource}}
**Region/Kategorie der Quelle:** {{category}}

**Rohtext:**
---
{{rawText}}
---

Antworte ausschließlich mit einem JSON-Objekt (kein anderer Text davor oder danach) mit exakt diesen Schlüsseln:
- "seoTitle": string (einzigartiger SEO-Titel, genau 5–6 Wörter, griffig; ohne : ; — –)
- "seoDescription": string (Meta-Beschreibung, ca. 140–155 Zeichen, prägnant; ohne : ; — –)
- "slug": string (URL-Slug, klein, Bindestriche, nur a-z 0-9)
- "h1": string (Hauptüberschrift, ohne : ; — –)
- "intro": string (kurzer Einleitungsabsatz mit österreichischem Bezug wo sinnvoll, ohne : ; — –)
- "toc": string[] (nur wenn Artikel mindestens 3 H2 hat, exakt die H2-Überschriften wie im body, keine Slugs, sonst leeres Array; jede Überschrift ohne : ; — –)
- "body": string (Markdown: 2–5 H2. Pro H2 zwingend 2, 3 oder 4 Absätze – nur Fließtext, keine Listen die Überschriften/TOC wiederholen. Nie unter einer H2 eine Bullet-Liste mit Section-Titeln. **Mindestens 1, bis zu 5 Links** [Text](URL) im Fließtext, nie in Überschriften; im body keine Zeichen : ; — –)
- "schlussAbschnitt": string (inhaltsbezogene Schluss-Überschrift wie die anderen H2, z.B. "Bedeutung der Modernisierung für Österreich" oder "Ausblick auf die Versorgungssicherheit" – kein generisches "Fazit" oder "Umfassende Gedanken", ohne : ; — –)
- "umfassendeGedanken": string (Inhalt des Schlussabschnitts, ohne : ; — –)
- "faq": string[] (für normale Nachrichten immer leeres Array []; nur bei ausdrücklichen FAQ-Guides 1–3 Einträge "Frage|Antwort")
- "imageAttribution": string (Format: "Quelle: [Bildquelle, z.B. Unsplash oder Name] ([sourceName])", ohne Link)
- "imageDescription": string (3–5 Wörter, was auf dem Bild zu sehen ist)
- "imageAlt": string (Alt-Text, zur Barrierefreiheit, passt zur Nachricht)
- "tags": string[] (3–6 Stichwörter für Beliebte Themen, z.B. Solar, Wind, Speicher, Subvention, Balkonkraftwerk, Energiegemeinschaft, Förderung, PV, Klimaneutralität – passend zum Inhalt, gleiche Begriffe wie in der Sidebar nutzbar)`;

async function rewriteWithChatGPT(rawText, meta) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

  const userPrompt = USER_PROMPT_TEMPLATE
    .replace('{{sourceName}}', meta.sourceName || 'Unbekannt')
    .replace('{{url}}', meta.url)
    .replace('{{imageUrl}}', meta.imageUrl || '')
    .replace('{{imageSource}}', meta.imageSource || '')
    .replace('{{category}}', meta.category || 'global')
    .replace('{{rawText}}', (rawText || '').slice(0, 80000));

  const openai = new OpenAI({ apiKey });
  const response = await openai.chat.completions.create({
    model: config.openaiModel,
    max_tokens: config.openaiMaxTokens,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content in OpenAI response');
  let text = content.trim();
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}') + 1;
  if (jsonStart >= 0 && jsonEnd > jsonStart) text = text.slice(jsonStart, jsonEnd);
  const payload = JSON.parse(text);
  return sanitizePayloadNoColonSemicolonDash(payload);
}

/** Strikte Regel: Keine : ; — – in Überschriften und Fließtext. */
function sanitizePayloadNoColonSemicolonDash(payload) {
  const replaceIn = (s) => {
    if (typeof s !== 'string') return s;
    return s
      .replace(/\u2014/g, ' - ')
      .replace(/\u2013/g, ' - ')
      .replace(/;\s*/g, ', ')
      .replace(/\s:\s/g, '. ')
      .replace(/([^\s]):\s/g, '$1. ')
      .trim();
  };
  const replaceInBody = (s) => {
    if (typeof s !== 'string') return s;
    return s
      .replace(/\u2014/g, ' - ')
      .replace(/\u2013/g, ' - ')
      .replace(/;\s*/g, ', ')
      .replace(/\s:\s/g, '. ')
      .trim();
  };
  const fields = ['seoTitle', 'seoDescription', 'h1', 'intro', 'schlussAbschnitt', 'umfassendeGedanken'];
  for (const k of fields) if (payload[k]) payload[k] = replaceIn(payload[k]);
  if (payload.toc && Array.isArray(payload.toc)) payload.toc = payload.toc.map(replaceIn);
  if (payload.body) payload.body = replaceInBody(payload.body);
  return payload;
}

/** Remove paragraphs that are only bullet lists repeating TOC/H2 titles (duplicate Inhaltsübersicht). */
function stripDuplicateTocListsFromBody(body, toc = []) {
  const titles = new Set([...(toc || [])].map((t) => t.trim()));
  const h2Matches = body.match(/^## (.+)$/gm);
  if (h2Matches) for (const m of h2Matches) titles.add(m.trim());
  if (titles.size === 0) return body;
  const blocks = body.split(/\n\n+/);
  const out = [];
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim());
    const allBulletTitles = lines.length > 0 && lines.every((l) => /^[-*]\s+/.test(l));
    if (allBulletTitles) {
      const bulletTexts = lines.map((l) => l.replace(/^[-*]\s+/, '').trim());
      if (bulletTexts.every((t) => titles.has(t))) continue; // skip this block – duplicate TOC list
    }
    out.push(block);
  }
  return out.join('\n\n');
}

// --- Build Markdown with frontmatter
function buildMarkdown(payload, meta) {
  const date = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const timeStr = now.toISOString().slice(11, 16);
  const frontmatter = {
    title: payload.seoTitle,
    description: payload.seoDescription,
    slug: payload.slug,
    date,
    time: timeStr,
    category: meta.category || 'global',
    ...(meta.imageUrl && { image: meta.imageUrl }),
    ...(payload.imageAttribution && { imageAttribution: payload.imageAttribution }),
    ...(payload.imageDescription && { imageDescription: payload.imageDescription }),
    ...(payload.imageAlt && { imageAlt: payload.imageAlt }),
    ...(payload.tags && Array.isArray(payload.tags) && payload.tags.length > 0 && { tags: payload.tags }),
    sourceUrl: meta.url,
    sourceName: meta.sourceName || '',
  };
  const fmLines = ['---'];
  for (const [k, v] of Object.entries(frontmatter)) {
    if (Array.isArray(v)) fmLines.push(`${k}:\n${v.map((t) => `  - ${t}`).join('\n')}`);
    else fmLines.push(`${k}: ${JSON.stringify(String(v))}`);
  }
  fmLines.push('---');
  const fm = fmLines.join('\n');
  let body = `# ${payload.h1}\n\n${payload.intro}\n\n`;
  if (payload.toc && payload.toc.length > 0) {
    body += '## Inhaltsübersicht\n\n';
    body += payload.toc.map((h) => `- ${h}`).join('\n') + '\n\n';
  }
  body += stripDuplicateTocListsFromBody(payload.body || '', payload.toc) + '\n\n';
  const closingTitle = payload.schlussAbschnitt || 'Umfassende Gedanken';
  body += `## ${closingTitle}\n\n${payload.umfassendeGedanken}\n`;
  if (payload.faq && Array.isArray(payload.faq) && payload.faq.length > 0) {
    body += '\n## Häufige Fragen\n\n';
    for (const entry of payload.faq) {
      const [q, a] = String(entry).includes('|') ? entry.split('|').map((s) => s.trim()) : [entry, ''];
      if (q) body += `**${q}**\n\n${a || ''}\n\n`;
    }
  }
  return fm + '\n\n' + body;
}

// --- Save article to content/articles
function saveArticle(slug, date, markdown) {
  const dir = join(__dirname, config.articlesDir);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const safeSlug = slug.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'article';
  const filename = `${date}-${safeSlug}.md`;
  const path = join(dir, filename);
  writeFileSync(path, markdown, 'utf8');
  return path;
}

// --- Vor Deploy: Alle Artikel mit Bild versehen (kein Platzhalter)
function ensureAllArticlesHaveImages(usedImageUrls = new Set()) {
  const dir = join(__dirname, config.articlesDir);
  if (!existsSync(dir)) return 0;
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  let fixed = 0;
  for (const file of files) {
    const path = join(dir, file);
    const raw = readFileSync(path, 'utf8');
    const { data, content } = matter(raw);
    if (!data.image || isPlaceholderImage(data.image)) {
      const { imageUrl } = getRandomStockImage(usedImageUrls);
      data.image = imageUrl;
      data.imageAttribution = data.imageAttribution || 'Quelle: Picsum';
      data.imageDescription = data.imageDescription || 'Erneuerbare Energie';
      data.imageAlt = data.imageAlt || 'Erneuerbare Energie';
      writeFileSync(path, matter.stringify(content, data, { lineWidth: 1000 }), 'utf8');
      if (imageUrl) usedImageUrls.add(normalizeImageUrl(imageUrl));
      fixed++;
      console.log(`[Image fix] ${file}`);
    }
  }
  return fixed;
}

/** Replace placeholder images and duplicates with unique stock images. Run: node index.js --fix-images */
function fixDuplicateAndPlaceholderImages() {
  const dir = join(__dirname, config.articlesDir);
  if (!existsSync(dir)) return 0;
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  const imageToFiles = new Map();
  for (const file of files) {
    const raw = readFileSync(join(dir, file), 'utf8');
    const { data } = matter(raw);
    const url = data.image ? normalizeImageUrl(data.image) : '';
    if (!url) continue;
    if (!imageToFiles.has(url)) imageToFiles.set(url, []);
    imageToFiles.get(url).push(file);
  }
  const usedSet = new Set();
  const filesToReplace = [];
  for (const file of files) {
    const raw = readFileSync(join(dir, file), 'utf8');
    const { data } = matter(raw);
    const url = data.image ? normalizeImageUrl(data.image) : '';
    const needNew = !data.image || isPlaceholderImage(data.image);
    const duplicate = url && (imageToFiles.get(url)?.length > 1);
    const firstOfDuplicate = duplicate && imageToFiles.get(url)[0] === file;
    if (needNew) {
      filesToReplace.push(file);
    } else if (duplicate && !firstOfDuplicate) {
      filesToReplace.push(file);
    } else if (url) {
      usedSet.add(url);
    }
  }
  let fixed = 0;
  for (const file of filesToReplace) {
    const path = join(dir, file);
    const raw = readFileSync(path, 'utf8');
    const { data, content } = matter(raw);
    const { imageUrl } = getRandomStockImage(usedSet);
    data.image = imageUrl;
    data.imageAttribution = data.imageAttribution || 'Quelle: Picsum';
    data.imageDescription = data.imageDescription || 'Erneuerbare Energie';
    data.imageAlt = data.imageAlt || 'Erneuerbare Energie';
    writeFileSync(path, matter.stringify(content, data, { lineWidth: 1000 }), 'utf8');
    if (imageUrl) usedSet.add(normalizeImageUrl(imageUrl));
    fixed++;
    console.log(`[Image fix] ${file}`);
  }
  return fixed;
}

// --- Git: add, commit, push
function gitPush(message) {
  const branch = config.gitBranch;
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) {
    console.warn('[Git] GITHUB_REPOSITORY not set; skipping push.');
    return;
  }
  try {
    execSync('git add content/articles/ processed_links.json', { cwd: __dirname, stdio: 'inherit' });
    if (existsSync(LAST_SOURCE_INDEX_PATH)) {
      execSync('git add last-source-index.json', { cwd: __dirname, stdio: 'inherit' });
    }
    execSync('git diff --staged --quiet', { cwd: __dirname });
  } catch (e) {
    if (e.status === 1) {
      execSync(`git commit -m ${JSON.stringify(message)}`, { cwd: __dirname, stdio: 'inherit' });
      if (token) {
        const remote = `https://x-access-token:${token}@github.com/${repo}.git`;
        execSync(`git push ${remote} ${branch}`, { cwd: __dirname, stdio: 'inherit' });
      } else {
        execSync(`git push origin ${branch}`, { cwd: __dirname, stdio: 'inherit' });
      }
    }
  }
}

// --- Main
async function main() {
  if (process.argv.includes('--fix-images')) {
    const n = fixDuplicateAndPlaceholderImages();
    console.log('[Done] Fixed', n, 'article images (placeholders + duplicates).');
    process.exit(0);
  }
  console.log('[Start] Loading feeds and processed links…');
  const feeds = loadFeeds();
  const processed = loadProcessedLinks();
  const processedSet = new Set(processed.map(normalizeUrl));
  const sources = getSourcesList(feeds);
  const maxPerRun = feeds.maxArticlesPerRun ?? 1;

  // Incremental: try one source at a time (with rotation). Within each source: newest first; if all new ones are already rewritten → next source.
  const lastIdx = loadLastSourceIndex();
  let newItems = [];
  let usedSourceIndex = -1;
  for (let i = 0; i < sources.length; i++) {
    const idx = (lastIdx + 1 + i) % sources.length;
    const source = sources[idx];
    const label = source.name || source.url;
    const items = await fetchOneSource(source);
    const newOnes = filterNewItems(items, processedSet);
    if (newOnes.length > 0) {
      // Take newest first (від нових до старіших); if newest already rewritten we’d have 0 newOnes and go to next source
      const sorted = sortByDateNewestFirst(newOnes);
      newItems = sorted.slice(0, maxPerRun);
      usedSourceIndex = idx;
      console.log(`[Links] Source "${label}": ${items.length} items, ${newOnes.length} new → taking ${newItems.length} (newest first)`);
      break;
    }
  }
  if (newItems.length === 0) {
    console.log('[Info] No new links in any source this run (all newest already rewritten). Nothing to publish.');
  }
  if (usedSourceIndex >= 0) saveLastSourceIndex(usedSourceIndex);

  const date = new Date().toISOString().slice(0, 10);
  const created = [];
  const errors = [];
  const usedImageUrls = loadUsedImageUrls();
  if (usedImageUrls.size > 0) console.log('[Images] Already used:', usedImageUrls.size);

  for (const item of newItems) {
    let rawText = item.rawContent;
    let imageUrl = '';
    let sourceName = item.sourceName;
    if (item.needFetch || !rawText) {
      try {
        const page = await fetchPage(item.url);
        if (page.text) rawText = page.text;
        if (page.imageUrl) imageUrl = page.imageUrl;
        if (page.sourceName) sourceName = page.sourceName;
      } catch (err) {
        console.error(`[Fetch error] ${item.url}:`, err.message);
        errors.push({ url: item.url, error: err.message });
        continue;
      }
    }
    if (!rawText || rawText.length < 100) {
      console.log(`[Skip] Too little content: ${item.url}`);
      processedSet.add(normalizeUrl(item.url));
      continue;
    }
    if (isMostlyPolitical(rawText)) {
      console.log(`[Skip] Mostly political (filtered): ${item.url}`);
      processedSet.add(normalizeUrl(item.url));
      continue;
    }
    let imageSource = '';
    const fromSource = imageUrl && !isPlaceholderImage(imageUrl) && !usedImageUrls.has(normalizeImageUrl(imageUrl));
    if (fromSource) {
      imageSource = 'Quelle';
      usedImageUrls.add(normalizeImageUrl(imageUrl));
      console.log('[Image] From news source (unique)');
    } else if (!imageUrl || isPlaceholderImage(imageUrl) || usedImageUrls.has(normalizeImageUrl(imageUrl))) {
      const stock = await fetchStockImageWithFallback(item.title || rawText, usedImageUrls);
      imageUrl = stock.imageUrl;
      imageSource = stock.imageSource || 'Picsum';
      if (imageUrl) usedImageUrls.add(normalizeImageUrl(imageUrl));
      console.log(`[Image] Stock (${imageSource}, unique): ${imageUrl ? 'ok' : 'fallback'}`);
    }
    const meta = { url: item.url, sourceName, imageUrl, imageSource, category: item.category, priority: item.priority };
    meta.sourceName = getBrandDisplayName(meta.sourceName, meta.url) || meta.sourceName;
    try {
      const payload = await rewriteWithChatGPT(rawText, meta);
      const markdown = buildMarkdown(payload, meta);
      const slug = payload.slug || 'article';
      saveArticle(slug, date, markdown);
      created.push({ url: item.url, slug: `${date}-${slug}.md` });
      processedSet.add(normalizeUrl(item.url));
    } catch (err) {
      console.error(`[OpenAI error] ${item.url}:`, err.message);
      errors.push({ url: item.url, error: err.message });
    }
  }

  const newProcessed = [...processedSet];
  saveProcessedLinks(newProcessed);

  // Image fix only when no new articles this run (keeps scheduled runs fast; fix old articles when idle)
  const imageFixCount = created.length === 0 ? ensureAllArticlesHaveImages(usedImageUrls) : 0;
  const hasChanges = created.length > 0 || newProcessed.length !== processed.length || imageFixCount > 0;
  if (hasChanges) {
    const msg = created.length > 0
      ? `Auto: ${created.length} neue Artikel (${date})`
      : imageFixCount > 0
        ? `Auto: Bilder ergänzt (${imageFixCount} Artikel)`
        : `Auto: processed_links aktualisiert (${date})`;
    gitPush(msg);
    console.log('[Done] Created:', created.length, 'articles; image fixes:', imageFixCount, '; processed links:', newProcessed.length);
    if (created.length > 0) {
      console.log('');
      console.log('=== PUBLISHED ===');
      created.forEach((c) => console.log('  →', c.slug));
      console.log('Pushed to main. Site updates after Vercel deploy.');
    }
  } else {
    console.log('[Done] No changes to commit. (No new articles and no image/links updates.)');
    console.log('No article published this run.');
  }
  if (errors.length > 0) console.log('[Errors]', errors);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
