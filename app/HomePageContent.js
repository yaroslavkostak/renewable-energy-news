'use client';

import { useSearchParams } from 'next/navigation';
import HomeHero from './HomeHero';
import CategoryTabs from './CategoryTabs';
import NewsList from './NewsList';
import PopularTags from './PopularTags';

const CAT_SLUGS = ['austria', 'germany', 'global', 'science'];

function matchesQuery(article, query) {
  if (!query || !query.trim()) return true;
  const q = query.trim().toLowerCase();
  const title = (article.title || '').toLowerCase();
  const desc = (article.description || '').toLowerCase();
  const tags = (article.tags || []).join(' ').toLowerCase();
  return title.includes(q) || desc.includes(q) || tags.includes(q);
}

export default function HomePageContent({ articles, categoryCounts, popularTags }) {
  const searchParams = useSearchParams();
  const cat = searchParams.get('cat');
  const q = searchParams.get('q');
  let list =
    cat && CAT_SLUGS.includes(cat) ? articles.filter((a) => a.category === cat) : articles;
  if (q) list = list.filter((a) => matchesQuery(a, q));
  const featured = list.slice(0, 3);
  const restArticles = list.slice(3);

  const isSearchPage = !!q;

  return (
    <div className="bg-gray-next min-h-screen homepage-blocks">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {isSearchPage && (
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-dark">Suchergebnisse</h2>
            <p className="text-dark-4 text-base sm:text-lg">
              „{q}" — {list.length} {list.length === 1 ? 'Treffer' : 'Treffer'}
            </p>
          </div>
        )}
        <HomeHero featured={featured} />
        {!isSearchPage && <CategoryTabs categoryCounts={categoryCounts} />}
        <NewsList articles={restArticles} />
        {!isSearchPage && <PopularTags popularTags={popularTags} />}
      </div>
    </div>
  );
}
