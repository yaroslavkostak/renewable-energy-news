'use client';

import { useState } from 'react';

// Placeholder SVG (grey) when external image fails to load
const FALLBACK_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='450' viewBox='0 0 800 450'%3E%3Crect fill='%23e5e7eb' width='800' height='450'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='18' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle'%3EBild%3C/text%3E%3C/svg%3E";

export default function ArticleImage({ src, alt, attribution }) {
  const [error, setError] = useState(false);
  const url = error || !src ? FALLBACK_SVG : src;

  return (
    <figure className="article-header-image">
      <div className="article-header-image-frame">
        <img
          src={url}
          alt={alt || ''}
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setError(true)}
        />
      </div>
      <figcaption className="image-attribution">
        {attribution?.trim() ? (
          attribution.trimStart().toLowerCase().startsWith('quelle:')
            ? attribution.trim()
            : `Quelle: ${attribution.trim()}`
        ) : (
          'Quelle: Bildquelle nicht angegeben'
        )}
      </figcaption>
    </figure>
  );
}
