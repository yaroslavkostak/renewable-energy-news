/**
 * Domain/hostname → brand display name for article sources.
 * Used in NewsList (time + brand under title) and in collector (saved in frontmatter).
 */
const DOMAIN_TO_BRAND = {
  'oesterreichsenergie.at': 'Österreichs E-Wirtschaft',
  'www.oesterreichsenergie.at': 'Österreichs E-Wirtschaft',
  'e-control.at': 'E-Control',
  'www.e-control.at': 'E-Control',
  'klimafonds.gv.at': 'Klima- und Energiefonds',
  'www.klimafonds.gv.at': 'Klima- und Energiefonds',
  'klimaaktiv.at': 'klimaaktiv',
  'www.klimaaktiv.at': 'klimaaktiv',
  'umweltbundesamt.at': 'Umweltbundesamt',
  'www.umweltbundesamt.at': 'Umweltbundesamt',
  'energiesparverband.at': 'Energiesparverband',
  'www.energiesparverband.at': 'Energiesparverband',
  'pv-magazine.de': 'PV Magazine Deutschland',
  'www.pv-magazine.de': 'PV Magazine Deutschland',
  'pv-magazine.com': 'PV Magazine',
  'www.pv-magazine.com': 'PV Magazine',
  'solarserver.de': 'Solarserver',
  'www.solarserver.de': 'Solarserver',
  'utopia.de': 'Utopia',
  'www.utopia.de': 'Utopia',
  'cleantechnica.com': 'CleanTechnica',
  'www.cleantechnica.com': 'CleanTechnica',
  'electrek.co': 'Electrek',
  'www.electrek.co': 'Electrek',
  'renewableenergyworld.com': 'Renewable Energy World',
  'www.renewableenergyworld.com': 'Renewable Energy World',
  'carbonbrief.org': 'Carbon Brief',
  'www.carbonbrief.org': 'Carbon Brief',
  'energypost.eu': 'Energy Post',
  'www.energiezukunft.eu': 'Energiezukunft',
  'iwr.de': 'IWR',
  'www.iwr.de': 'IWR',
  'cleanenergywire.org': 'Clean Energy Wire',
  'www.cleanenergywire.org': 'Clean Energy Wire',
  'canarymedia.com': 'Canary Media',
  'www.canarymedia.com': 'Canary Media',
};

/**
 * Resolve display brand from sourceName (e.g. from frontmatter) and optional sourceUrl.
 * Returns brand string for UI; if no mapping, returns sourceName as-is.
 */
export function getBrandDisplayName(sourceName, sourceUrl) {
  let host = '';
  if (sourceUrl && typeof sourceUrl === 'string') {
    try {
      host = new URL(sourceUrl).hostname;
    } catch {}
  }
  if (host && DOMAIN_TO_BRAND[host]) return DOMAIN_TO_BRAND[host];
  const fromName = (sourceName || '').trim().toLowerCase();
  if (fromName && DOMAIN_TO_BRAND[fromName]) return DOMAIN_TO_BRAND[fromName];
  if (host) {
    const withoutWww = host.replace(/^www\./, '');
    if (DOMAIN_TO_BRAND[withoutWww]) return DOMAIN_TO_BRAND[withoutWww];
  }
  return sourceName || '';
}
