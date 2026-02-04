import Link from 'next/link';
import { getArticlesList } from '../lib/articles';

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function HomePage() {
  const articles = getArticlesList();

  return (
    <>
      <h1>Aktuelle Nachrichten zu Solar, Wind und grüner Energie</h1>
      <ul className="news-list">
        {articles.length === 0 ? (
          <li style={{ padding: '24px 0', color: 'var(--text-muted)' }}>
            Noch keine Artikel. Der erste Lauf des Collectors wird bald neue Nachrichten hinzufügen.
          </li>
        ) : (
          articles.map((a) => (
            <li key={a.slug} className="news-item">
              <span className="news-time">{formatTime(a.date)}</span>
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
