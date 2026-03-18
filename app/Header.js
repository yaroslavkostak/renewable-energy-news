'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Sparkles, Search, X } from 'lucide-react';

export default function Header({ categories = [] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentCat = pathname === '/' ? (searchParams.get('cat') || '') : null;
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (searchOpen) {
      inputRef.current?.focus();
    }
  }, [searchOpen]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    window.location.href = `/?q=${encodeURIComponent(searchQuery.trim())}`;
    setSearchOpen(false);
    setSearchQuery('');
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-next-3">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[56px] sm:h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 sm:gap-8 min-w-0">
          <Link href="/" className="header-logo-link flex items-center gap-2 sm:gap-2.5 shrink-0 no-underline group">
            <span className="flex items-center justify-center w-9 h-9 rounded-full bg-primary text-white shrink-0">
              <Sparkles size={18} className="text-white" />
            </span>
            <span className="font-bold text-lg sm:text-xl tracking-tight text-dark group-hover:text-primary transition-colors">
              Erneuerbare Energie
            </span>
          </Link>
          {categories.length > 0 && (
            <div className="hidden md:flex items-center gap-6 text-sm font-medium">
              {categories.map(({ slug, label }) => (
                <Link
                  key={slug || 'home'}
                  href={slug ? `/?cat=${slug}` : '/'}
                  className={`no-underline transition-colors whitespace-nowrap ${
                    currentCat === slug ? 'text-primary' : 'text-dark-4 hover:text-primary'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-1 min-w-0">
          <form
            onSubmit={handleSearchSubmit}
            className={`overflow-hidden transition-[width] duration-300 ease-out flex items-center ${searchOpen ? 'w-40 sm:w-56' : 'w-0'}`}
          >
            <input
              ref={inputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Artikel durchsuchen…"
              className="w-40 sm:w-56 min-w-0 h-9 pl-3 pr-3 text-sm text-dark placeholder:text-dark-3 bg-gray-next-2 rounded-full border-0 outline-none"
              aria-label="Suchbegriff"
            />
          </form>
          <button
            type="button"
            onClick={() => {
              if (searchOpen) {
                setSearchOpen(false);
                setSearchQuery('');
              } else {
                setSearchOpen(true);
              }
            }}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-next-2 text-dark-4 hover:bg-gray-next-3 hover:text-dark transition-colors shrink-0"
            aria-label={searchOpen ? 'Suche schließen' : 'Suche öffnen'}
          >
            {searchOpen ? <X size={18} /> : <Search size={18} />}
          </button>
        </div>
      </div>
    </nav>
  );
}
