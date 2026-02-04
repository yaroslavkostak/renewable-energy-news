import Link from 'next/link';

export const metadata = {
  title: 'Über uns – Erneuerbare Energie',
  description: 'Informationscharakter dieser Website. Haftungsausschluss.',
};

export default function UberUnsPage() {
  return (
    <article className="legal-page">
      <Link href="/" className="back-link">← Zurück zur Übersicht</Link>
      <h1>Über uns</h1>
      <p>Diese Website dient ausschließlich der <strong>Information</strong> zu Themen erneuerbarer Energie, Solar, Wind und grüner Energie für den österreichischen Raum.</p>
      <p>Sie erhebt <strong>keinen Anspruch auf Vollständigkeit oder Richtigkeit</strong> der Inhalte. Die dargestellten Informationen ersetzen keine fachliche oder rechtliche Beratung. Für Entscheidungen (z. B. zu Förderungen, Anlagen oder Verträgen) bitten wir um Rückfrage bei offiziellen Stellen oder Fachleuten.</p>
      <p>Die Nutzung der Inhalte erfolgt auf eigenes Risiko. <strong>Eine Haftung für Schäden, die aus der Nutzung dieser Informationen entstehen, wird ausgeschlossen</strong>, soweit gesetzlich zulässig.</p>
      <p>Texte und Aufbereitung dienen der allgemeinen Orientierung und entsprechen dem für österreichische Informationsangebote üblichen Rahmen.</p>
    </article>
  );
}
