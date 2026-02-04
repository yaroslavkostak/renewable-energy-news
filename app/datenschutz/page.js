import Link from 'next/link';

export const metadata = {
  title: 'Datenschutz – Erneuerbare Energie',
  description: 'Datenschutzhinweise dieser Website.',
};

export default function DatenschutzPage() {
  return (
    <article className="legal-page">
      <Link href="/" className="back-link">← Zurück zur Übersicht</Link>
      <h1>Datenschutz</h1>
      <p>Der Schutz Ihrer Daten ist uns wichtig. Diese Website ist ein <strong>rein informatives Angebot</strong>.</p>
      <p><strong>Erhobene Daten:</strong> Beim Besuch der Seite können technisch bedingt Zugriffsdaten (z. B. IP-Adresse, aufgerufene Seite, Browser, Zeitpunkt) an den Betreiber bzw. den Hosting-Dienst (z. B. Vercel) übermittelt werden. Eine personenbezogene Auswertung zu Werbezwecken erfolgt nicht.</p>
      <p><strong>Keine Registrierung, keine Newsletter:</strong> Es werden keine Kontaktformulare, Anmeldungen oder Newsletter angeboten. Es werden keine Cookies zu Tracking- oder Werbezwecken gesetzt.</p>
      <p><strong>Rechte:</strong> Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung Ihrer Daten. Für die Ausübung wenden Sie sich an die im Impressum genannte Kontaktmöglichkeit.</p>
      <p>Maßgeblich sind die Bestimmungen der <strong>DSGVO</strong> und des österreichischen Datenschutzrechts.</p>
    </article>
  );
}
