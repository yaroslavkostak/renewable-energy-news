'use client';

import { useSearchParams } from 'next/navigation';
import HomeHero from './HomeHero';
import CategoryTabs from './CategoryTabs';
import NewsList from './NewsList';
import PopularTags from './PopularTags';

const CAT_SLUGS = ['austria', 'germany', 'global', 'science'];

export default function HomePageContent({ articles, categoryCounts, popularTags }) {
  const searchParams = useSearchParams();
  const cat = searchParams.get('cat');
  const list =
    cat && CAT_SLUGS.includes(cat) ? articles.filter((a) => a.category === cat) : articles;
  const featured = list.slice(0, 3);
  const restArticles = list.slice(3);

  return (
    <div className="bg-gray-next min-h-screen homepage-blocks">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <HomeHero featured={featured} />
        <CategoryTabs categoryCounts={categoryCounts} />
        <NewsList articles={restArticles} />
        <PopularTags popularTags={popularTags} />
      </div>
    </div>
  );
}
