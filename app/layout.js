import './globals.css';
import { Suspense } from 'react';
import Link from 'next/link';
import { Inter } from 'next/font/google';
import { getArticlesList, CATEGORY_LABELS } from '../lib/articles';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
import Header from './Header';
import ContentWrap from './ContentWrap';
import BackToTop from './BackToTop';
import NewsletterForm from './NewsletterForm';

/** Production site URL – canonical and metadataBase match this. */
export function getSiteBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    const u = process.env.NEXT_PUBLIC_SITE_URL;
    return u.startsWith('http') ? u : `https://${u}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'https://renewable-energy-news.vercel.app';
}

function getMetadataBase() {
  return new URL(getSiteBaseUrl());
}

export const metadata = {
  metadataBase: getMetadataBase(),
  title: 'Erneuerbare Energie – News für Österreich',
  description: 'Aktuelle Nachrichten zu Solar, Wind und grüner Energie für den österreichischen Markt.',
  robots: 'noindex, nofollow',
};

const CAT_ORDER = ['austria', 'germany', 'global', 'science'];

export default async function RootLayout({ children }) {
  let articles = [];
  try {
    articles = getArticlesList();
  } catch (_) {}
  const categoryCounts = Object.fromEntries(CAT_ORDER.map((c) => [c, articles.filter((a) => a.category === c).length]));
  const menuCategories = CAT_ORDER.filter((cat) => categoryCounts[cat] > 0).map((cat) => ({ slug: cat, label: CATEGORY_LABELS[cat] }));

  return (
    <html lang="de" className={inter.variable}>
      <body className="min-h-screen bg-white font-sans text-dark selection:bg-primary-100 selection:text-primary-600">
        <div className="min-h-screen flex flex-col">
          <Suspense fallback={<nav className="sticky top-0 z-50 bg-white/80 border-b border-gray-next-3 h-16" />}>
            <Header categories={menuCategories} />
          </Suspense>
          <ContentWrap>{children}</ContentWrap>

          <Suspense fallback={null}>
            <NewsletterForm />
          </Suspense>

          {/* Footer */}
          <footer className="bg-white border-t border-gray-next-3 py-10 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <p className="text-dark-2 text-xs">
                  © {new Date().getFullYear()} Erneuerbare Energie. Rein informativ, ohne Anspruch auf Vollständigkeit oder Richtigkeit.
                </p>
                <div className="flex items-center gap-6 text-sm font-medium">
                  <Link href="/ueber-uns" className="text-dark-4 hover:text-primary no-underline transition-colors whitespace-nowrap">Über uns</Link>
                  <Link href="/datenschutz" className="text-dark-4 hover:text-primary no-underline transition-colors whitespace-nowrap">Datenschutz</Link>
                  <Link href="/impressum" className="text-dark-4 hover:text-primary no-underline transition-colors whitespace-nowrap">Impressum</Link>
                </div>
                <BackToTop />
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
