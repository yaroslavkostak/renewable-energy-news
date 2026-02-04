/**
 * Configuration for news collection and AI rewriting.
 * Override via environment variables where applicable.
 */

export const config = {
  /** Path to the JSON file tracking processed article URLs (avoid duplicates). */
  processedLinksPath: process.env.PROCESSED_LINKS_PATH || 'processed_links.json',

  /** Directory where generated Markdown articles are saved. */
  articlesDir: process.env.ARTICLES_DIR || 'content/articles',

  /** OpenAI model (ChatGPT). */
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',

  /** Max tokens for AI response. */
  openaiMaxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4096', 10),

  /** Request timeout in ms for HTTP fetches. */
  fetchTimeoutMs: parseInt(process.env.FETCH_TIMEOUT_MS || '15000', 10),

  /** User-Agent for HTTP requests (some sites block default Node). */
  userAgent: process.env.USER_AGENT || 'Mozilla/5.0 (compatible; RenewableEnergyNews/1.0)',

  /** Git: branch to push to. */
  gitBranch: process.env.GIT_BRANCH || 'main',
};
