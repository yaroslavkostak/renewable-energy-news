import './globals.css';
import { getPopularTags, CATEGORY_LABELS } from '../lib/articles';
import Header from './Header';

export const metadata = {
  title: 'Erneuerbare Energie – News für Österreich',
  description: 'Aktuelle Nachrichten zu Solar, Wind und grüner Energie für den österreichischen Markt.',
  robots: 'noindex, nofollow',
};

const CAT_ORDER = ['austria', 'germany', 'global', 'science'];

export default async function RootLayout({ children }) {
  const popularTags = getPopularTags(15);
  return (
    <html lang="de">
      <body>
        <div className="container">
          <Header />
          <aside className="sidebar-left">
            <h3>Kategorien</h3>
            <nav>
              <a href="/">Hauptseite</a>
              {CAT_ORDER.map((cat) => (
                <a key={cat} href={`/?cat=${cat}`}>
                  {CATEGORY_LABELS[cat]}
                </a>
              ))}
            </nav>
          </aside>
          <main className="main">{children}</main>
          <aside className="sidebar-right">
            <div className="search-wrap">
              <input type="search" placeholder="Suche in den News…" aria-label="Suche" />
            </div>
            <h3>Beliebte Themen</h3>
            <div className="tags">
              {popularTags.length > 0
                ? popularTags.map((t) => (
                    <a key={t.slug} href={`/?tag=${t.slug}`}>
                      # {t.name}
                    </a>
                  ))
                : (
                  <>
                    <a href="/?tag=solar"># Solar</a>
                    <a href="/?tag=wind"># Wind</a>
                    <a href="/?tag=speicher"># Speicher</a>
                    <a href="/?tag=subvention"># Subvention</a>
                    <a href="/?tag=balkonkraftwerk"># Balkonkraftwerk</a>
                    <a href="/?tag=energiegemeinschaft"># Energiegemeinschaft</a>
                  </>
                )}
            </div>
            <div className="footer-links">
              <a href="#">Über uns</a>
              <span>·</span>
              <a href="#">Datenschutz</a>
              <span>·</span>
              <a href="#">Impressum</a>
            </div>
          </aside>
          <footer className="site-footer">
            <p className="site-footer-desc">Aktuelle Nachrichten zu Solar, Wind und erneuerbarer Energie für den österreichischen Markt – kurz zusammengefasst und redaktionell aufbereitet.</p>
            <p className="site-footer-copy">© {new Date().getFullYear()} Erneuerbare Energie</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
