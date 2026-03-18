'use client';

import { usePathname } from 'next/navigation';

export default function ContentWrap({ children }) {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isArticle = pathname?.startsWith('/articles');
  const isAutor = pathname?.startsWith('/autor');

  return (
    <div className="flex-1 w-full min-w-0">
      {isHome || isArticle || isAutor ? children : <div className="max-w-4xl mx-auto px-4 py-6">{children}</div>}
    </div>
  );
}
