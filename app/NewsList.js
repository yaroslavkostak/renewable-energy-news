'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { tagToSlug } from '../lib/tagSlug';

function formatTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function NewsList({ articles }) {
  const searchParams = useSearchParams();
  const cat = searchParams.get('cat');
  const tagSlug = searchParams.get('tag');

  let list = articles;
  if (cat) list = list.filter((a) => a.category === cat);
  if (tagSlug) {
    list = list.filter((a) =>
      (a.tags || []).some((t) => tagToSlug(t) === tagSlug)
    );
  }

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
          list.map((a) => (
            <li key={a.slug} className="news-item">
              <span className="news-date">{formatDate(a.date)}</span>
              <div>
                <Link href={`/articles/${a.slug}`} className="news-title">
                  {a.title}
                </Link>
                <div className="news-meta">
                  {formatDate(a.date)}
                  {a.sourceName && (
                    <>
                      {' · '}
                      <span>{a.sourceName}</span>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
    </>
  );
}
