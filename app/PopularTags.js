import Link from 'next/link';
import { ArrowRight, Tag } from 'lucide-react';

export default function PopularTags({ popularTags = [] }) {
  if (popularTags.length === 0) return null;

  return (
    <div className="mb-24">
      <div className="flex justify-between items-end mb-6 sm:mb-8">
        <h2 className="text-2xl font-bold text-dark">Beliebte Themen</h2>
        <Link href="/" className="text-sm font-semibold flex items-center gap-1 text-dark-4 hover:text-primary no-underline transition-colors">
          Alle Themen <ArrowRight size={16} />
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {popularTags.slice(0, 6).map((t) => (
          <Link
            key={t.slug}
            href={`/?tag=${t.slug}`}
            className="bg-white border border-gray-next-3 rounded-xl p-5 flex items-center gap-4 shadow-next hover:shadow-box hover:border-primary/20 transition-all no-underline text-inherit"
          >
            <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Tag size={20} className="text-primary" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-dark">{t.name}</h4>
              <p className="text-dark-4 text-xs">
                {t.count} Artikel
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
