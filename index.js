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

// --- ChatGPT: rewrite and structure content (simple style, Austrian angle)
const ARTICLE_STYLE = `Stil der Artikel: einfach und klar. Kurze Sätze, ein Gedanke pro Absatz. Keine überladenen Formulierungen, keine Doppelpunkte/Semikolons, keine langen Gedankenstriche (—). Keine Aufzählungslisten, keine Tabellen – nur Fließtext und H2-Überschriften. Überschriften ohne Title Case (nicht jedes Wort groß). Bildquelle als "Foto [Quellenname]" ohne Link.`;

const SYSTEM_PROMPT = `Du bist Redakteur für eine österreichische Website zu erneuerbarer Energie. Alle Texte auf Deutsch für den österreichischen Markt.

${ARTICLE_STYLE}

Sprache und Struktur:
- Natürlich und menschlich. Keine übermäßigen Doppelpunkte, Semikolons oder Bindestriche.
- H1 und mehrere H2. Einleitung: ein kurzer Absatz mit der Hauptnachricht.
- Bei längeren Artikeln: "Inhaltsübersicht" am Anfang. Headlines: griffig, etwas provokant.

Österreich-Bezug: Jede Meldung mit österreichischem Blickwinkel (z.B. "Was bedeutet das für Wien?", "Bald in Österreich?"). Kein reines Übersetzen – lokale Einordnung.

Praktischer Nutzen: Wo möglich Kosten in Alltagsgrößen (Kaffee, Netflix). Tipps für Mieter wenn relevant. Ökologie sachlich (Unabhängigkeit von Gaspreisen).

Struktur: Am Ende immer "Umfassende Gedanken" (nicht "Fazit"). Optional "Häufige Fragen" (1–3 Fragen mit kurzen Antworten).`;

const USER_PROMPT_TEMPLATE = `Verarbeite die folgende Nachricht zu einem vollständigen Artikel mit österreichischem Bezug und praktischem Nutzen.

**Quelle:** {{sourceName}}
**URL:** {{url}}
**Bild-URL (falls vorhanden):** {{imageUrl}}
**Region/Kategorie der Quelle:** {{category}}

**Rohtext:**
---
{{rawText}}
---

Antworte ausschließlich mit einem JSON-Objekt (kein anderer Text davor oder danach) mit exakt diesen Schlüsseln:
- "seoTitle": string (SEO-Titel, griffig)
- "seoDescription": string (Meta-Beschreibung, ca. 150 Zeichen)
- "slug": string (URL-Slug, klein, Bindestriche, nur a-z 0-9)
- "h1": string (Hauptüberschrift)
- "intro": string (kurzer Einleitungsabsatz mit österreichischem Bezug wo sinnvoll)
- "toc": string[] (H2-Überschriften für Inhaltsübersicht; bei kurzen Artikeln leeres Array)
- "body": string (Markdown: nur H2 und Absätze als Fließtext; keine H1, keine Listen, keine Tabellen, keine langen Gedankenstriche; wo passend Kosten in Alltagsgrößen, Mieter-Tipps, sachliche Öko-Einordnung)
- "umfassendeGedanken": string (Abschnitt "Umfassende Gedanken")
- "faq": string[] (optional: 0–3 Einträge im Format "Frage|Antwort", z.B. "Funktioniert PV im Winter?|Ja, auch bei Schnee...")
- "imageAttribution": string (z.B. "Foto Quelle" ohne Link)`;

async function rewriteWithChatGPT(rawText, meta) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

  const userPrompt = USER_PROMPT_TEMPLATE
    .replace('{{sourceName}}', meta.sourceName || 'Unbekannt')
    .replace('{{url}}', meta.url)
    .replace('{{imageUrl}}', meta.imageUrl || '')
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
  return JSON.parse(text);
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
    sourceUrl: meta.url,
    sourceName: meta.sourceName || '',
  };
  const fm = ['---', ...Object.entries(frontmatter).map(([k, v]) => `${k}: ${JSON.stringify(String(v))}`), '---'].join('\n');
  let body = `# ${payload.h1}\n\n${payload.intro}\n\n`;
  if (payload.toc && payload.toc.length > 0) {
    body += '## Inhaltsübersicht\n\n';
    body += payload.toc.map((h) => `- ${h}`).join('\n') + '\n\n';
  }
  body += payload.body + '\n\n';
  body += '## Umfassende Gedanken\n\n' + payload.umfassendeGedanken + '\n';
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
    const meta = { url: item.url, sourceName, imageUrl, category: item.category, priority: item.priority };
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
