'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const CATEGORIES = [
  { slug: 'austria', label: 'Österreich' },
  { slug: 'germany', label: 'Deutschland / DACH' },
  { slug: 'global', label: 'Global' },
  { slug: 'science', label: 'Wissenschaft' },
];

function getCount(categoryCounts, slug) {
  if (!slug) return categoryCounts?.all ?? 0;
  return categoryCounts?.[slug] ?? 0;
}

export default function CategoryTabs({ categoryCounts = {} }) {
  const searchParams = useSearchParams();
  const currentCat = searchParams.get('cat') || '';
  const tag = searchParams.get('tag');

  return (
    <div className="text-center mb-12 sm:mb-16">
      <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-dark">Browse by Category</h2>
      <p className="text-dark-4 text-sm sm:text-base">Wählen Sie eine Kategorie für passende Artikel</p>
      <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-6 sm:mt-8">
        {CATEGORIES.map(({ slug, label }) => {
          const href = slug ? `/?cat=${slug}${tag ? `&tag=${tag}` : ''}` : (tag ? `/?tag=${tag}` : '/');
          const isActive = currentCat === slug;
          const count = getCount(categoryCounts, slug);
          return (
            <Link
              key={slug || 'all'}
              href={href}
              scroll={false}
              className={`px-4 py-2.5 rounded-full text-sm font-semibold transition-all no-underline ${
                isActive
                  ? 'bg-primary text-white hover:bg-primary/90'
                  : 'bg-white text-dark-4 hover:bg-gray-next-2 border border-gray-next-3'
              }`}
            >
              {label} – {count}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
