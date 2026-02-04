/** URL-Slug für Tag (Beliebte Themen Links). Kein Node – nutzbar in Client-Komponenten. */
export function tagToSlug(tag) {
  if (!tag || typeof tag !== 'string') return '';
  return tag
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9äöüß-]/gi, '');
}
