# Renewable Energy News – Auto Collection & Publish

Node.js automation that aggregates **global** renewable-energy news and adapts it for the **Austrian market** (German). Target: **~1000 articles per month** (~33/day) by combining Austrian grants, DACH tech, and global innovation—with priority for Austrian sources and filtering of purely political content.

## Workflow

1. **Read** RSS feeds and scrape URLs from `feeds.json` (Austria → Germany → Global → Science).
2. **Sort by priority**: Austrian sources (Klimafonds, PV Austria, E-Control, etc.) are processed first.
3. **Scrape** full page content with Cheerio when needed.
4. **Deduplicate** using `processed_links.json`.
5. **Filter politics**: Skip items that are mostly about parties, elections, debates—but keep subsidy, law, price, and energy topics.
6. **Rewrite** with Claude 3.5 Sonnet: Austrian angle, practical value (savings in everyday terms, renter tips), optional FAQ, “Umfassende Gedanken”, image attribution.
7. **Save** one Markdown file per article in `content/articles/` (`YYYY-MM-DD-<slug>.md`), with `category` in frontmatter.
8. **Commit & push** (and updated `processed_links.json`) to trigger Vercel.

## Content strategy

- **Austrian angle**: Every article gets a local lens (e.g. “Was bedeutet das für Wien?”, “Bald in Tirol?”). No plain translation—add analysis for the Austrian market.
- **Practical value**: Where possible, express savings in everyday terms (e.g. cups of coffee, Netflix), include tips for renters (Stecker-Solar, window films), and focus on independence from gas prices rather than moral appeals.
- **FAQ**: When relevant, add a short “Häufige Fragen” section (e.g. “Funktioniert PV im Winter im Schnee?”) to build trust and capture search traffic.
- **Scale**: With 28+ RSS feeds and scrape URLs from Austria, Germany, USA, UK, France, and science sites, the raw stream exceeds 100 posts/day; the script caps at `maxArticlesPerRun` (default 40) per run so that 3× daily runs can reach ~33/day and ~1000/month.

## Feeds structure

`feeds.json` supports:

- **`maxArticlesPerRun`**: Max new articles per run (default 40).
- **`rssFeeds`**: Array of `{ "url", "priority", "category", "name" }` or plain URL strings.
  - `priority`: 1 = Austria, 2 = Germany/DACH, 3 = Global, 4 = Science. Lower = processed first.
  - `category`: `austria` | `germany` | `global` | `science` (stored in article frontmatter).
- **`scrapeUrls`**: Same shape; these are listing pages from which article links are scraped.

Example sources (see `feeds.json`): Klimafonds, PV Austria, E-Control, Oesterreichsenergie, Klimaaktiv, Raus aus Öl, Umweltbundesamt, Energiesparverband; PV Magazine (DE/International/France), Solarserver, CleanTechnica, Electrek, Canary Media, Carbon Brief, Treehugger, ScienceDaily, Phys.org, The Verge Energy, etc.

## Setup

1. **Install**
   ```bash
   npm install
   ```

2. **Configure**  
   Edit `feeds.json`: adjust `rssFeeds` and `scrapeUrls` (with optional `priority`/`category`/`name`). Add or remove feeds as needed.

3. **Environment**  
   Copy `.env.example` to `.env` and set `ANTHROPIC_API_KEY`. For Git push: `GITHUB_TOKEN` and `GITHUB_REPOSITORY` (or use GitHub Actions).

4. **Run**
   ```bash
   npm run collect
   ```

## GitHub Actions (3× daily)

- Workflow: `.github/workflows/collect-news.yml`.
- **Secrets:** `ANTHROPIC_API_KEY` (required). `GITHUB_TOKEN` is provided by Actions.
- Schedule: 06:00, 12:00, 18:00 UTC (+ manual “Run workflow”).
- With ~40 articles per run × 3 runs, you approach ~33/day and ~1000/month.

## Content & SEO (German / Austria)

- **SEO:** Title, description, URL slug.
- **Structure:** H1, H2 (no full Title Case), short intro, optional TOC (accordion-style), “Umfassende Gedanken”, optional “Häufige Fragen”.
- **Style:** Natural language; avoid colons, semicolons, excessive hyphens.
- **Tone:** Catchy, slightly provocative headlines.
- **Images:** Main image URL in frontmatter; attribution “Foto [source_name]” without link.

## Markdown frontmatter

| Field | Description |
|-------|-------------|
| `title` | SEO title |
| `description` | Meta description |
| `slug` | URL slug |
| `date` | Publication date (YYYY-MM-DD) |
| `category` | austria \| germany \| global \| science |
| `image` | Main image URL (optional) |
| `imageAttribution` | e.g. “Foto Quelle” (optional) |
| `sourceUrl` | Original article URL |
| `sourceName` | Source name for attribution |

## Politics filter

Items are **skipped** when the text is judged mostly political (e.g. party, election, debate) **and** does not contain relevant energy terms (subsidy, law, price, solar, battery, grid, etc.). So subsidy and regulatory news is kept; pure campaign or debate coverage is dropped.

## Suggested next steps

- **Secrets:** Store `ANTHROPIC_API_KEY` and `GITHUB_TOKEN` in GitHub Secrets.
- **Image proxying:** Use e.g. Cloudinary to host images and avoid hotlinking blocks.
- **Calculator:** Add an on-site savings calculator to increase engagement and ad value.
- **More sources:** Expand `rssFeeds` and `scrapeUrls` (e.g. EnBW Blog, IWR, more Austrian pages) to grow toward 100+ sources.

## License

MIT
