'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { tagToSlug } from '../lib/tagSlug';
import { author } from '../lib/author';

const INITIAL_COUNT = 12;
const LOAD_MORE_COUNT = 10;
const EXCERPT_LENGTH = 120;

const CAT_LABEL = { austria: 'Österreich', germany: 'DACH', global: 'Global', science: 'Wissenschaft' };

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('de-AT', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function NewsList({ articles }) {
  const searchParams = useSearchParams();
  const cat = searchParams.get('cat');
  const tagSlug = searchParams.get('tag');
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);

  let list = articles;
  if (cat) list = list.filter((a) => a.category === cat);
  if (tagSlug) {
    list = list.filter((a) =>
      (a.tags || []).some((t) => tagToSlug(t) === tagSlug)
    );
  }

  const visibleList = list.slice(0, visibleCount);
  const hasMore = visibleCount < list.length;

  useEffect(() => {
    setVisibleCount(INITIAL_COUNT);
  }, [cat, tagSlug]);

  if (list.length === 0) {
    return (
      <p className="text-center py-12 text-dark-4">
        {articles.length === 0
          ? 'Noch keine Artikel. Der erste Lauf des Collectors wird bald neue Nachrichten hinzufügen.'
          : 'Keine Artikel zu dieser Auswahl.'}
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16">
        {visibleList.map((a) => {
          const excerpt = a.description
            ? (a.description.length > EXCERPT_LENGTH ? `${a.description.slice(0, EXCERPT_LENGTH).trim()}…` : a.description)
            : '';
          return (
            <article key={a.slug} className="group bg-white rounded-xl overflow-hidden shadow-box hover:shadow-[var(--shadow-2)] transition-shadow">
              <Link
                href={`/articles/${a.slug}`}
                className="block no-underline hover:no-underline text-inherit [&>*]:no-underline"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  {a.image ? (
                    <img
                      src={a.image}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-next-2 flex items-center justify-center text-dark-3 text-sm">
                      {formatDate(a.date)}
                    </div>
                  )}
                </div>
                <div className="p-3 sm:p-4">
                  <h3 className="font-bold text-lg sm:text-xl mb-1.5 leading-tight text-dark line-clamp-2 group-hover:text-primary transition-colors">
                    {a.title}
                  </h3>
                  {excerpt && (
                    <p className="text-body text-sm mb-2 line-clamp-2 leading-relaxed">
                      {excerpt}
                    </p>
                  )}
                </div>
              </Link>
              <div className="flex items-center justify-between gap-3 px-3 sm:px-4 pb-3 sm:pb-4 pt-3 border-t border-gray-next-3 text-xs text-dark-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Link href="/autor" className="flex items-center gap-2 no-underline text-inherit hover:text-primary transition-colors shrink-0">
                    <img src={author.image} alt="" className="w-6 h-6 rounded-full object-cover border border-white shadow-sm flex-shrink-0" />
                    <span>Von {author.name}</span>
                  </Link>
                  <span className="text-dark-2">•</span>
                  <span>{formatDate(a.date)}</span>
                </div>
                <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary shrink-0">
                  {CAT_LABEL[a.category] || a.category}
                </span>
              </div>
            </article>
          );
        })}
      </div>
      {!hasMore && list.length > INITIAL_COUNT && (
        <div className="flex justify-center mb-24">
          <span className="text-sm text-dark-4">Alle Artikel geladen.</span>
        </div>
      )}
      {hasMore && list.length > 0 && (
        <div className="flex justify-center mb-24">
          <button
            type="button"
            onClick={() => setVisibleCount((n) => Math.min(n + LOAD_MORE_COUNT, list.length))}
            className="bg-primary text-white px-8 py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Mehr laden
          </button>
        </div>
      )}
    </>
  );
}
