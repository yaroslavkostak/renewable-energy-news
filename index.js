#!/usr/bin/env node
/**
 * Renewable Energy News – automated collection, AI rewriting, and Git push.
 * Run via: node index.js  (or npm run collect)
 * Loads OPENAI_API_KEY from .env if present. In GitHub Actions use Secrets.
 */

import 'dotenv/config';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import axios from 'axios';
import OpenAI from 'openai';
import { config } from './config.js';

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

// --- Stock image (Unsplash) when article has no image
function keywordFromText(titleOrText) {
  const s = (titleOrText || '').replace(/[^\w\säöüÄÖÜß-]/gi, ' ').replace(/\s+/g, ' ').trim();
  const words = s.split(' ').filter((w) => w.length > 2).slice(0, 4);
  if (words.length) return words.join(' ');
  return 'solar panels renewable energy';
}

async function fetchStockImage(keyword) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  try {
    const q = encodeURIComponent(keyword);
    const { data } = await axios.get(
      `https://api.unsplash.com/search/photos?query=${q}&per_page=1&client_id=${key}`,
      { timeout: 8000 }
    );
    const hit = data?.results?.[0];
    if (hit?.urls?.regular) return { imageUrl: hit.urls.regular, imageSource: 'Unsplash' };
  } catch (err) {
    console.warn('[Unsplash]', err.message);
  }
  return null;
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

// --- Collect items from RSS feeds (supports priority/category)
async function collectFromRss(rssFeeds) {
  const parser = new Parser({
    timeout: config.fetchTimeoutMs,
    headers: { 'User-Agent': config.userAgent },
  });
  const items = [];
  for (const entry of rssFeeds) {
    const { url: feedUrl, priority, category, name: feedName } = normalizeFeedEntry(entry);
    try {
      const feed = await parser.parseURL(feedUrl);
      const sourceName = feed.title || feedName;
      for (const item of feed.items || []) {
        const link = item.link || item.guid;
        if (!link) continue;
        items.push({
          url: link,
          title: item.title || '',
          rawContent: item.contentSnippet || item.content || item.summary || '',
          sourceName,
          needFetch: !(item.content || item.contentSnippet),
          priority,
          category,
        });
      }
    } catch (err) {
      console.error(`[RSS error] ${feedUrl}:`, err.message);
    }
  }
  return items;
}

// --- Collect items from scrape URLs (list of pages that list articles)
async function collectFromScrapeUrls(scrapeUrls) {
  const items = [];
  for (const entry of scrapeUrls) {
    const { url: pageUrl, priority, category, name: feedName } = typeof entry === 'string' ? { url: entry, priority: 3, category: 'global', name: '' } : { ...entry, name: entry.name || '' };
    try {
      const { data } = await axios.get(pageUrl, {
        timeout: config.fetchTimeoutMs,
        headers: { 'User-Agent': config.userAgent },
        responseType: 'text',
      });
      const $ = cheerio.load(data);
      const baseUrl = new URL(pageUrl);
      const sourceName = feedName || baseUrl.hostname;
      const links = new Set();
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href || href.startsWith('#') || href.startsWith('mailto:')) return;
        try {
          const full = new URL(href, baseUrl).href;
          if (full.startsWith(baseUrl.origin) && full !== pageUrl) links.add(full);
        } catch {}
      });
      for (const url of links) {
        items.push({
          url,
          title: '',
          rawContent: '',
          sourceName,
          needFetch: true,
          priority: priority ?? 3,
          category: category || 'global',
        });
      }
    } catch (err) {
      console.error(`[Scrape error] ${pageUrl}:`, err.message);
    }
  }
  return items;
}

// --- Filter out already processed
function filterNewItems(items, processedSet) {
  return items.filter((item) => !processedSet.has(normalizeUrl(item.url)));
}

// --- Sort by priority (1 = Austria first), then by URL for stability
function sortByPriority(items) {
  return [...items].sort((a, b) => (a.priority ?? 3) - (b.priority ?? 3) || (a.url || '').localeCompare(b.url || ''));
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
- H1, ein kurzer Einleitungsabsatz, dann 2–5 H2-Abschnitte (nicht mehr). Pro Abschnitt unterschiedlich viele Absätze: mal 2, mal 3, mal 4 – nicht alle Abschnitte gleich, wirkt sonst schablonenhaft. Länge variieren (mal kürzer, mal länger). Ziel: redaktioneller Nachrichtenartikel.
- "Inhaltsübersicht": nur wenn der Artikel mindestens 3 H2 hat; toc = exakt die H2-Überschriften im gleichen Wortlaut wie im body (keine Slugs).
- Am Ende ein Schlussabschnitt mit einer inhaltlichen H2-Überschrift wie die anderen (z.B. "Bedeutung der Modernisierung für Österreich") – kein generisches "Fazit" oder "Umfassende Gedanken", sondern eine echte Überschrift zum Inhalt in "schlussAbschnitt" angeben. "Häufige Fragen" weglassen – bei normalen Nachrichten wirkt FAQ wie Verkauf. Nur bei ausdrücklichen FAQ-Guides 1–3 Einträge; sonst faq immer leeres Array.
- Österreich-Bezug wo passend.

Links im Fließtext:
- Im body 2–5 sinnvolle Links als Markdown [Text](URL) einbauen. Lieber 1–2 gute Links setzen als viele. Mindestens 1–2 ausgehende Links (z.B. zur Quelle, zu offiziellen Seiten wie E-Control, Klimafonds, Ministerium).
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
- "body": string (Markdown: 2–5 H2, pro H2 unterschiedlich 2–4 Absätze, Fließtext, maximal 5 Links [Text](URL), davon 1–2 ausgehend, nie in Überschriften, nie am Absatzanfang; im gesamten body keine Zeichen : ; — –)
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

// --- Build Markdown with frontmatter
function buildMarkdown(payload, meta) {
  const date = new Date().toISOString().slice(0, 10);
  const frontmatter = {
    title: payload.seoTitle,
    description: payload.seoDescription,
    slug: payload.slug,
    date,
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
  body += payload.body + '\n\n';
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
  console.log('[Start] Loading feeds and processed links…');
  const feeds = loadFeeds();
  const processed = loadProcessedLinks();
  const processedSet = new Set(processed.map(normalizeUrl));

  const rssItems = await collectFromRss(feeds.rssFeeds || []);
  const scrapeItems = await collectFromScrapeUrls(feeds.scrapeUrls || []);
  const allItems = [...rssItems, ...scrapeItems];
  let newItems = filterNewItems(allItems, processedSet);
  newItems = sortByPriority(newItems);

  const maxPerRun = feeds.maxArticlesPerRun ?? 40;
  if (newItems.length > maxPerRun) {
    console.log(`[Limit] Capping at ${maxPerRun} articles per run (${newItems.length} new available).`);
    newItems = newItems.slice(0, maxPerRun);
  }

  console.log(`[Links] Total: ${allItems.length}, New: ${newItems.length}, Skipped (duplicates): ${allItems.length - newItems.length}`);

  const date = new Date().toISOString().slice(0, 10);
  const created = [];
  const errors = [];

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
    if (!imageUrl && process.env.UNSPLASH_ACCESS_KEY) {
      const keyword = keywordFromText(item.title || rawText);
      const stock = await fetchStockImage(keyword);
      if (stock) {
        imageUrl = stock.imageUrl;
        imageSource = stock.imageSource || 'Unsplash';
        console.log(`[Image] Stock (${imageSource}): ${keyword}`);
      }
    }
    const meta = { url: item.url, sourceName, imageUrl, imageSource, category: item.category, priority: item.priority };
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

  const hasChanges = created.length > 0 || newProcessed.length !== processed.length;
  if (hasChanges) {
    gitPush(created.length > 0 ? `Auto: ${created.length} neue Artikel (${date})` : `Auto: processed_links aktualisiert (${date})`);
    console.log('[Done] Created:', created.length, 'articles; processed links:', newProcessed.length);
  } else {
    console.log('[Done] No changes to commit.');
  }
  if (errors.length > 0) console.log('[Errors]', errors);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
