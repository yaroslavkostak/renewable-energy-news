import './globals.css';

export const metadata = {
  title: 'Erneuerbare Energie – News für Österreich',
  description: 'Aktuelle Nachrichten zu Solar, Wind und grüner Energie für den österreichischen Markt.',
  robots: 'noindex, nofollow',
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>
        <div className="container">
          <header className="header">
            <div className="header-inner">
              <div>
                <div className="logo">Erneuerbare Energie</div>
                <div className="logo-tagline">News für Österreich</div>
              </div>
              <h1 className="main-title">Aktuelle Nachrichten zu Solar, Wind und grüner Energie</h1>
            </div>
          </header>
          <aside className="sidebar-left">
            <h3>▣ Kategorien</h3>
            <nav>
              <a href="/">Hauptseite</a>
              <a href="/">Österreich</a>
              <a href="/">Deutschland / DACH</a>
              <a href="/">Global</a>
              <a href="/">Wissenschaft</a>
            </nav>
          </aside>
          <main className="main">{children}</main>
          <aside className="sidebar-right">
            <div className="search-wrap">
              <input type="search" placeholder="Suche in den News…" aria-label="Suche" />
            </div>
            <h3>Beliebte Themen</h3>
            <div className="tags">
              <a href="/?tag=solar"># Solar</a>
              <a href="/?tag=wind"># Wind</a>
              <a href="/?tag=speicher"># Speicher</a>
              <a href="/?tag=subvention"># Subvention</a>
              <a href="/?tag=balkon"># Balkonkraftwerk</a>
              <a href="/?tag=energiegemeinschaft"># Energiegemeinschaft</a>
            </div>
            <div className="footer-links">
              <a href="#">Über uns</a>
              <span>·</span>
              <a href="#">Datenschutz</a>
              <span>·</span>
              <a href="#">Impressum</a>
            </div>
          </aside>
        </div>
      </body>
    </html>
  );
}
