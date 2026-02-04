#!/usr/bin/env node
/**
 * Check which RSS feeds and scrape URLs work. Run: node check-feeds.js
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Parser from 'rss-parser';
import axios from 'axios';

const __dirname = dirname(fileURLToPath(import.meta.url));
const feedsPath = join(__dirname, 'feeds.json');
const parser = new Parser({ timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FeedCheck/1.0)' } });

const feeds = JSON.parse(readFileSync(feedsPath, 'utf8'));

async function checkRss(url, name, category) {
  try {
    const feed = await parser.parseURL(url);
    const count = feed.items?.length ?? 0;
    return { ok: true, name, category, url, count };
  } catch (err) {
    return { ok: false, name, category, url, error: err.message || String(err) };
  }
}

async function checkScrape(url, name, category) {
  try {
    const { status } = await axios.get(url, { timeout: 10000, validateStatus: () => true, headers: { 'User-Agent': 'Mozilla/5.0' } });
    return { ok: status === 200, name, category, url, error: status !== 200 ? `HTTP ${status}` : null };
  } catch (err) {
    return { ok: false, name, category, url, error: err.message || String(err) };
  }
}

console.log('=== RSS Feeds ===\n');
const rssResults = [];
for (const entry of feeds.rssFeeds) {
  const e = typeof entry === 'string' ? { url: entry, name: entry, category: '?' } : entry;
  const r = await checkRss(e.url, e.name || e.url, e.category || '?');
  rssResults.push(r);
  const icon = r.ok ? '✓' : '✗';
  const extra = r.ok ? ` (${r.count} items)` : ` — ${r.error}`;
  console.log(`${icon} [${e.category}] ${e.name}${extra}`);
  if (!r.ok) console.log(`  URL: ${e.url}`);
}

console.log('\n=== Scrape URLs (HTTP only) ===\n');
const scrapeResults = [];
for (const entry of feeds.scrapeUrls) {
  const e = typeof entry === 'string' ? { url: entry, name: entry, category: '?' } : entry;
  const r = await checkScrape(e.url, e.name || e.url, e.category || '?');
  scrapeResults.push(r);
  const icon = r.ok ? '✓' : '✗';
  console.log(`${icon} [${e.category}] ${e.name}${r.error ? ` — ${r.error}` : ''}`);
  if (!r.ok) console.log(`  URL: ${e.url}`);
}

const rssOk = rssResults.filter((r) => r.ok);
const rssFail = rssResults.filter((r) => !r.ok);
console.log('\n--- Summary ---');
console.log(`RSS: ${rssOk.length} OK, ${rssFail.length} failed`);
console.log('Scrape:', scrapeResults.filter((r) => r.ok).length, 'OK,', scrapeResults.filter((r) => !r.ok).length, 'failed');
