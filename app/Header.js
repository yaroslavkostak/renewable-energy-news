'use client';

import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();
  const isArticle = pathname?.startsWith('/articles');

  return (
    <header className={`header${isArticle ? ' header--minimal' : ''}`}>
      <div className="header-inner">
        <div>
          <a href="/" className="logo-link">
            <span className="logo">Erneuerbare Energie</span>
          </a>
          <div className="logo-tagline">News für Österreich</div>
        </div>
        {!isArticle && (
          <h1 className="main-title">Aktuelle Nachrichten zu Solar, Wind und grüner Energie</h1>
        )}
      </div>
    </header>
  );
}
