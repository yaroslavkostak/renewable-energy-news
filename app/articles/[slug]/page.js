import Link from 'next/link';
import { getArticleSlugs, getArticleBySlug, getArticlesList, CATEGORY_LABELS, tagToSlug } from '../../../lib/articles';
import ReactMarkdown from 'react-markdown';
import { author } from '../../../lib/author';
import { getSiteBaseUrl } from '../../layout';
import { Calendar, Clock } from 'lucide-react';

const TOC_SKIP = ['inhaltsübersicht', 'häufige fragen'];
const CAT_ORDER = ['austria', 'germany', 'global', 'science'];

function extractH2FromContent(content) {
  if (!content) return [];
  const re = /^## (.+)$/gm;
  const out = [];
  let m;
  while ((m = re.exec(content)) !== null) {
    const title = m[1].trim();
    const lower = title.toLowerCase();
    if (TOC_SKIP.some((s) => lower.includes(s))) continue;
    out.push({ title, slug: tagToSlug(title) });
  }
  return out;
}

function contentWithoutTocBlock(content) {
  if (!content) return content;
  return content.replace(/^## Inhaltsübersicht\n\n[\s\S]*?(?=\n## |\n$|$)/m, '').trim();
}

/** Remove leading H1 line so body starts with first paragraph (avoids duplicate/variant title in content). */
function contentWithoutLeadingH1(content) {
  if (!content) return content;
  const match = content.match(/^#\s+.+?(\n|$)/);
  if (match) return content.slice(match[0].length).trimStart();
  return content;
}

function getTextFromChildren(children) {
  if (children == null) return '';
  if (typeof children === 'string') return children;
  const arr = Array.isArray(children) ? children : [children];
  return arr.map((c) => {
    if (typeof c === 'string') return c;
    if (c?.props?.children) return getTextFromChildren(c.props.children);
    return '';
  }).join('');
}

function estimateReadTime(content) {
  if (!content) return 1;
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function generateStaticParams() {
  const slugs = getArticleSlugs().map((f) => f.replace(/\.md$/, ''));
  if (slugs.length === 0) return [{ slug: '_no_articles_yet' }];
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const resolved = typeof params?.then === 'function' ? await params : params;
  const slug = resolved?.slug;
  if (!slug || slug === '_no_articles_yet') return {};
  const article = getArticleBySlug(slug);
  if (!article) return {};
  const rawTime = article.time && typeof article.time === 'string' ? article.time.replace('.', ':') : '';
  const timeNorm = /^\d{1,2}:\d{2}$/.test(rawTime) ? `${rawTime}:00` : rawTime || null;
  const dateTime = article.date && timeNorm ? `${article.date}T${timeNorm}` : article.date ? `${article.date}T12:00:00` : null;
  const baseUrl = getSiteBaseUrl().replace(/\/$/, '');
  return {
    title: article.title,
    description: article.description || undefined,
    alternates: { canonical: `${baseUrl}/articles/${slug}/` },
    openGraph: {
      title: article.title,
      description: article.description || undefined,
      type: 'article',
      ...(dateTime && { publishedTime: dateTime }),
    },
  };
}

export default async function ArticlePage({ params }) {
  const resolved = typeof params?.then === 'function' ? await params : params;
  const slug = resolved?.slug;
  if (slug === '_no_articles_yet') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/" className="text-sm text-primary hover:underline">← Zurück zur Übersicht</Link>
        <p className="mt-4 text-dark-4">Noch keine Artikel vorhanden.</p>
      </div>
    );
  }
  const article = slug ? getArticleBySlug(slug) : null;
  if (!article) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/" className="text-sm text-primary hover:underline">← Zurück zur Übersicht</Link>
        <p className="mt-4 text-dark-4">Artikel nicht gefunden.</p>
      </div>
    );
  }

  const allArticles = getArticlesList();
  const recentPosts = allArticles.filter((a) => a.slug !== article.slug).slice(0, 5);
  const categoryCounts = CAT_ORDER.map((c) => ({ slug: c, label: CATEGORY_LABELS[c], count: allArticles.filter((a) => a.category === c).length }));

  const dateStr = article.date
    ? new Date(article.date + 'T12:00:00').toLocaleDateString('de-AT', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';
  const readTime = estimateReadTime(article.content);
  const bodyContent = contentWithoutLeadingH1(contentWithoutTocBlock(article.content));
  const tocHeadings = extractH2FromContent(article.content).filter((h, i, arr) => arr.findIndex((x) => x.slug === h.slug) === i);
  const showToc = tocHeadings.length >= 3;

  const markdownComponents = {
    h2: ({ children, ...props }) => {
      const id = tagToSlug(getTextFromChildren(children));
      return <h2 id={id} className="scroll-mt-20 text-2xl font-bold text-dark mt-10 mb-4" {...props}>{children}</h2>;
    },
    h3: ({ children, ...props }) => <h3 className="scroll-mt-20 text-xl font-bold text-dark mt-8 mb-3" {...props}>{children}</h3>,
    p: ({ children, ...props }) => <p className="text-body leading-relaxed mb-6" {...props}>{children}</p>,
    ul: ({ children, ...props }) => <ul className="list-disc pl-6 mb-6 space-y-2 text-body" {...props}>{children}</ul>,
    blockquote: ({ children, ...props }) => (
      <div className="bg-primary-50 border-l-4 border-primary p-8 my-10 rounded-r-xl" {...props}>
        <div className="italic text-lg text-body prose-p:m-0">{children}</div>
      </div>
    ),
    img: ({ src, alt, ...props }) => (
      <div className="my-10 rounded-2xl overflow-hidden aspect-video shadow-sm">
        <img src={src} alt={alt || ''} className="w-full h-full object-cover" {...props} />
      </div>
    ),
    a: ({ href, children, ...rest }) => (
      <a href={href} rel="nofollow noopener noreferrer" target="_blank" className="text-primary hover:underline">
        {children}
      </a>
    ),
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">
      <Link href="/" className="inline-block text-sm text-dark-4 hover:text-primary mb-6 transition-colors">
        ← Zurück zur Übersicht
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Main content */}
        <div className="lg:col-span-8">
          {/* Featured image */}
          {article.image && (
            <div className="mb-8">
              <div className="relative aspect-[16/9] rounded-2xl overflow-hidden shadow-sm">
                <img
                  src={article.image}
                  alt={article.imageAlt || article.title || ''}
                  className="w-full h-full object-cover"
                />
              </div>
              {article.imageAttribution && (
                <p className="text-xs text-dark-3 mt-2 italic">{article.imageAttribution}</p>
              )}
            </div>
          )}

          <h1 className="text-3xl md:text-4xl font-bold mb-6 leading-tight text-dark">
            {article.title}
          </h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 mb-8 text-sm text-dark-4 pb-8 border-b border-gray-next-3">
            <Link href="/autor" className="flex items-center gap-2 no-underline text-inherit hover:text-primary transition-colors">
              <img src={author.image} alt="" className="w-8 h-8 rounded-full object-cover" />
              <span className="font-medium text-dark">{author.name}</span>
            </Link>
            <span className="text-dark-3">•</span>
            <div className="flex items-center gap-1">
              <Calendar size={14} />
              <span>{dateStr}</span>
            </div>
            <span className="text-dark-3">•</span>
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>{readTime} Min. Lesezeit</span>
            </div>
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold ml-auto">
              {CATEGORY_LABELS[article.category] || article.category}
            </span>
          </div>

          {/* Body */}
          <div className="prose-custom text-body leading-relaxed">
            {showToc && (
              <details className="mb-8 p-4 bg-gray-next-2 rounded-xl border border-gray-next-3">
                <summary className="cursor-pointer font-semibold text-dark">Inhaltsübersicht</summary>
                <nav className="mt-3 space-y-1" aria-label="Inhaltsverzeichnis">
                  {tocHeadings.map(({ title, slug: s }) => (
                    <a key={s} href={`#${s}`} className="block text-sm text-primary hover:underline">
                      {title}
                    </a>
                  ))}
                </nav>
              </details>
            )}
            <ReactMarkdown components={markdownComponents}>{bodyContent}</ReactMarkdown>
          </div>

          {/* Tags & Share */}
          <div className="mt-12 pt-8 border-t border-gray-next-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-dark-3 font-bold uppercase mr-2">Tags:</span>
              {Array.isArray(article.tags) && article.tags.length > 0 ? (
                article.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/?tag=${tagToSlug(tag)}`}
                    className="text-xs font-medium text-dark-4 bg-gray-next-2 px-3 py-1 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    #{tag}
                  </Link>
                ))
              ) : (
                <Link href="/" className="text-xs font-medium text-dark-4 bg-gray-next-2 px-3 py-1 rounded-full">
                  # News
                </Link>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-dark-3 font-bold uppercase">Teilen:</span>
              {(() => {
                const articleUrl = `${getSiteBaseUrl().replace(/\/$/, '')}/articles/${article.slug}/`;
                return (
                  <>
                    <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(articleUrl)}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-primary text-white rounded-full hover:bg-primary-600 transition-colors" aria-label="Facebook">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    </a>
                    <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(articleUrl)}&text=${encodeURIComponent(article.title)}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-sky-500 text-white rounded-full hover:bg-sky-600 transition-colors" aria-label="Twitter">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    </a>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Author box – no frame */}
          <div className="mt-16 pt-8 flex flex-col md:flex-row items-center md:items-start gap-6">
            <Link href="/autor" className="flex-shrink-0">
              <img src={author.image} alt="" className="w-24 h-24 rounded-full object-cover bg-gray-next-2" />
            </Link>
            <div className="text-center md:text-left">
              <h3 className="text-xl font-bold mb-3 text-dark">
                <Link href="/autor" className="text-dark hover:text-primary transition-colors no-underline">
                  Autorin: {author.name}
                </Link>
              </h3>
              <p className="text-dark-4 text-sm leading-relaxed mb-4">
                {author.bio}
              </p>
              <Link href="/autor" className="text-sm font-semibold text-primary hover:text-primary transition-colors">
                Alle Artikel von {author.name} →
              </Link>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4 space-y-8">
          {/* Recent Posts */}
          <div className="bg-white border border-gray-next-3 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-6 pb-2 border-b border-gray-next-3">Aktuelle Artikel</h3>
            <div className="space-y-6">
              {recentPosts.map((post) => (
                <Link key={post.slug} href={`/articles/${post.slug}`} className="flex gap-4 group no-underline hover:no-underline text-inherit">
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-next-2">
                    {post.image ? (
                      <img src={post.image} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    ) : (
                      <span className="text-dark-3 text-xs flex items-center justify-center h-full w-full">📄</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold leading-snug group-hover:text-primary transition-colors line-clamp-2 text-dark">
                      {post.title}
                    </h4>
                    <p className="text-[10px] text-dark-3 font-medium mt-1">
                      {new Date(post.date + 'T12:00:00').toLocaleDateString('de-AT', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Explore Topics */}
          <div className="bg-white border border-gray-next-3 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-6 pb-2 border-b border-gray-next-3">Kategorien</h3>
            <div className="space-y-4">
              {categoryCounts.map(({ slug: c, label, count }) => (
                <Link
                  key={c}
                  href={`/?cat=${c}`}
                  className="block text-sm font-medium text-dark-4 hover:text-primary transition-colors no-underline"
                >
                  {label} – {count}
                </Link>
              ))}
            </div>
          </div>

          {/* Newsletter sidebar */}
          <div className="bg-white border border-gray-next-3 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-4">Newsletter</h3>
            <p className="text-xs text-dark-4 mb-6 leading-relaxed">
              Keine News verpassen – melden Sie sich an.
            </p>
            <Link
              href="/#newsletter"
              className="block w-full bg-primary text-white py-3 rounded-xl font-bold text-xs hover:bg-primary-600 transition-all text-center no-underline"
            >
              Jetzt anmelden
            </Link>
            <p className="text-[10px] text-dark-3 text-center mt-4 px-2">
              Mit Anmeldung stimmen Sie unserer{' '}
              <Link href="/datenschutz" className="underline hover:underline hover:text-primary">Datenschutzerklärung</Link> zu.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
