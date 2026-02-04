'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { tagToSlug } from '../lib/tagSlug';
import { getBrandDisplayName } from '../lib/brandNames';

const INITIAL_COUNT = 12;
const LOAD_MORE_COUNT = 10;
const EXCERPT_LENGTH = 120;

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Long date for meta line: "04. Februar 2026" */
function formatDateLong(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('de-AT', { day: '2-digit', month: 'long', year: 'numeric' });
}

/** time from frontmatter: "14:30" or "14.30" → "14:30" */
function formatTimeStr(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return '';
  return timeStr.replace('.', ':').trim();
}

function normalizeImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  return url.split('?')[0].trim();
}

export default function NewsList({ articles }) {
  const searchParams = useSearchParams();
  const cat = searchParams.get('cat');
  const tagSlug = searchParams.get('tag');
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT);
  const sentinelRef = useRef(null);

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

  useEffect(() => {
    if (!hasMore || list.length === 0) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting)
          setVisibleCount((n) => Math.min(n + LOAD_MORE_COUNT, list.length));
      },
      { rootMargin: '200px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, list.length]);

  return (
    <>
      <h1>Aktuelle Nachrichten zu Solar, Wind und grüner Energie</h1>
      <ul className="news-list">
        {list.length === 0 ? (
          <li style={{ padding: '24px 0', color: 'var(--text-muted)' }}>
            {articles.length === 0
              ? 'Noch keine Artikel. Der erste Lauf des Collectors wird bald neue Nachrichten hinzufügen.'
              : 'Keine Artikel zu dieser Auswahl.'}
          </li>
        ) : (
          (() => {
            const seenImages = new Set();
            return visibleList.map((a) => {
              const brand = getBrandDisplayName(a.sourceName, a.sourceUrl);
              const imgKey = normalizeImageUrl(a.image);
              const useImage = a.image && !seenImages.has(imgKey);
              if (useImage) seenImages.add(imgKey);
              return (
                <li key={a.slug} className="news-item">
                  <div className="news-item-thumb-wrap">
                    {useImage ? (
                      <Link href={`/articles/${a.slug}`} className="news-item-thumb-link" aria-hidden="true">
                        <img
                          src={a.image}
                          alt=""
                          className="news-item-thumb"
                          width={160}
                          height={120}
                          loading="lazy"
                        />
                      </Link>
                    ) : (
                      <span className="news-date">{formatDate(a.date)}</span>
                    )}
                  </div>
                <div>
                  <Link href={`/articles/${a.slug}`} className="news-title">
                    {a.title}
                  </Link>
                  <div className="news-meta">
                    {formatDateLong(a.date)}
                    {formatTimeStr(a.time) ? `, ${formatTimeStr(a.time)} Uhr` : ''}
                    {brand ? <> · <span>{brand}</span></> : null}
                  </div>
                  {a.description && (
                    <p className="news-excerpt">
                      {a.description.length > EXCERPT_LENGTH
                        ? `${a.description.slice(0, EXCERPT_LENGTH).trim()}…`
                        : a.description}
                    </p>
                  )}
                  <Link href={`/articles/${a.slug}`} className="news-read-link">
                    Lesen →
                  </Link>
                </div>
              </li>
              );
            });
          })()
        )}
      </ul>
      {hasMore && list.length > 0 && (
        <div ref={sentinelRef} className="news-load-more-sentinel" aria-hidden="true" />
      )}
      {!hasMore && list.length > 0 && list.length > INITIAL_COUNT && (
        <p className="news-all-loaded">Alle Artikel geladen.</p>
      )}
    </>
  );
}
