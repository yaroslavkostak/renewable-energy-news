import Link from 'next/link';

export const metadata = {
  title: 'Impressum – Erneuerbare Energie',
  description: 'Impressum und Verantwortlichkeit.',
};

export default function ImpressumPage() {
  return (
    <article className="legal-page">
      <Link href="/" className="back-link">← Zurück zur Übersicht</Link>
      <h1>Impressum</h1>
      <p><strong>Informationspflicht gemäß § 5 ECG (Österreich)</strong></p>
      <p>Diese Website ist ein <strong>rein informatives Angebot</strong> und erhebt keinen Anspruch auf Vollständigkeit oder inhaltliche Richtigkeit. Sie dient der allgemeinen Orientierung zu Themen erneuerbarer Energie.</p>
      <p><strong>Haftungsausschluss:</strong> Für die Inhalte externer Links wird keine Verantwortung übernommen. Die verlinkten Seiten unterliegen der Haftung ihrer jeweiligen Betreiber. Für Schäden aus der Nutzung dieser Website wird die Haftung soweit gesetzlich zulässig ausgeschlossen.</p>
      <p><strong>Urheberrecht / Nutzung:</strong> Die redaktionellen Texte und die Aufbereitung der Inhalte stehen zur informativen Nutzung zur Verfügung. Quellen und Urheber werden wo möglich genannt. Die Weiternutzung kann unter Beachtung der jeweiligen Rechte (z. B. Creative Commons, wo angegeben) erfolgen.</p>
      <p>Für Angaben zu verantwortlicher Person, Kontakt und Unternehmensregister siehe die jeweiligen Einträge des Website-Betreibers (z. B. im Handelsregister oder bei der zuständigen Behörde), sofern diese Website in einem geschäftlichen oder behördlichen Kontext betrieben wird.</p>
    </article>
  );
}
