import { Suspense } from 'react';
import { getArticlesList, getPopularTags } from '../lib/articles';
import HomePageContent from './HomePageContent';

const CAT_SLUGS = ['austria', 'germany', 'global', 'science'];

export default function HomePage() {
  let articles;
  try {
    articles = getArticlesList();
  } catch (e) {
    console.error('getArticlesList failed:', e);
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-dark-4">Artikel konnten nicht geladen werden.</p>
      </div>
    );
  }
  const popularTags = getPopularTags(15);
  const categoryCounts = {
    all: articles.length,
    ...Object.fromEntries(
      CAT_SLUGS.map((c) => [c, articles.filter((a) => a.category === c).length])
    ),
  };
  return (
    <Suspense fallback={<p className="text-dark-4 p-8">Laden…</p>}>
      <HomePageContent
        articles={articles}
        categoryCounts={categoryCounts}
        popularTags={popularTags}
      />
    </Suspense>
  );
}
