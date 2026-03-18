'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Sparkles, Search } from 'lucide-react';

export default function Header({ categories = [] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentCat = pathname === '/' ? (searchParams.get('cat') || '') : null;

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
        <div className="flex items-center shrink-0">
          <button type="button" className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-next-2 text-dark-4 hover:bg-gray-next-3 hover:text-dark transition-colors" aria-label="Suche">
            <Search size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
}
