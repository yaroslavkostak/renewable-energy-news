import { Suspense } from 'react';
import { getArticlesList } from '../lib/articles';
import NewsList from './NewsList';

export default function HomePage() {
  const articles = getArticlesList();
  return (
    <Suspense fallback={<p style={{ color: 'var(--text-muted)' }}>Laden…</p>}>
      <NewsList articles={articles} />
    </Suspense>
  );
}
