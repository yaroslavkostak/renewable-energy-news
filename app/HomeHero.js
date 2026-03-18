import Link from 'next/link';
import { author } from '../lib/author';

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('de-AT', { day: '2-digit', month: 'short', year: 'numeric' });
}

function CategoryTag({ category }) {
  const label = category === 'austria' ? 'Österreich' : category === 'germany' ? 'DACH' : category === 'science' ? 'Wissenschaft' : 'Global';
  return (
    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary">
      {label}
    </span>
  );
}

export default function HomeHero({ featured = [] }) {
  const [first, second, third] = featured;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 mb-12 sm:mb-16">
      {/* Main featured — NextBlog hero card */}
      {first && (
        <div className="lg:col-span-12 bg-white rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-box">
          <div className="md:w-1/2 p-4 sm:p-5 flex flex-col min-h-[280px] sm:min-h-[320px]">
            <div className="relative flex-1 min-h-[240px] aspect-[536/320] md:aspect-auto rounded-xl overflow-hidden">
              <Link href={`/articles/${first.slug}`} className="block absolute inset-0">
                {first.image ? (
                  <img src={first.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-gray-next-3" />
                )}
              </Link>
            </div>
          </div>
          <div className="md:w-1/2 p-6 sm:p-5 md:p-10 flex flex-col justify-center">
            <Link href={`/articles/${first.slug}`} className="no-underline group block">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 leading-tight text-dark group-hover:text-primary transition-colors">
                {first.title}
              </h1>
            </Link>
            {first.description && (
              <p className="text-body text-base leading-relaxed line-clamp-3 mb-6 sm:mb-8">
                {first.description}
              </p>
            )}
            <div className="flex items-center justify-between gap-3 text-sm text-dark-3">
              <div className="flex items-center gap-3">
                <Link href="/autor" className="flex items-center gap-2 no-underline text-inherit hover:text-primary transition-colors">
                  <img src={author.image} alt="" className="w-8 h-8 rounded-full object-cover border border-white shadow-next" />
                  <span>Von {author.name}</span>
                </Link>
                <span className="text-dark-2">•</span>
                <span>{formatDate(first.date)}</span>
              </div>
              <CategoryTag category={first.category} />
            </div>
          </div>
        </div>
      )}

      {/* Two smaller cards — NextBlog style */}
      {second && (
        <div className="lg:col-span-6 bg-white rounded-xl p-4 sm:p-5 flex gap-4 shadow-next hover:shadow-box transition-shadow group">
          <Link href={`/articles/${second.slug}`} className="w-28 h-28 sm:w-36 sm:h-36 flex-shrink-0 rounded-xl overflow-hidden bg-gray-next-2 block">
            {second.image ? (
              <img src={second.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            ) : (
              <div className="w-full h-full bg-gray-next-3" />
            )}
          </Link>
          <div className="flex flex-col justify-center py-1 min-w-0 flex-1">
            <Link href={`/articles/${second.slug}`} className="no-underline text-inherit mb-2 block">
              <h3 className="font-bold text-base sm:text-lg leading-snug line-clamp-2 text-dark group-hover:text-primary transition-colors">{second.title}</h3>
            </Link>
            {second.description && (
              <p className="text-body text-sm line-clamp-2 leading-relaxed mb-2">{second.description}</p>
            )}
            <div className="flex items-center justify-between gap-2 text-sm text-dark-3 mt-auto">
              <div className="flex items-center gap-2 min-w-0">
                <Link href="/autor" className="flex items-center gap-2 no-underline text-inherit hover:text-primary transition-colors shrink-0">
                  <img src={author.image} alt="" className="w-6 h-6 rounded-full object-cover border border-white shadow-sm" />
                  <span>Von {author.name}</span>
                </Link>
                <span>•</span>
                <span>{formatDate(second.date)}</span>
              </div>
              <CategoryTag category={second.category} />
            </div>
          </div>
        </div>
      )}
      {third && (
        <div className="lg:col-span-6 bg-white rounded-xl p-4 sm:p-5 flex gap-4 shadow-next hover:shadow-box transition-shadow group">
          <Link href={`/articles/${third.slug}`} className="w-28 h-28 sm:w-36 sm:h-36 flex-shrink-0 rounded-xl overflow-hidden bg-gray-next-2 block">
            {third.image ? (
              <img src={third.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            ) : (
              <div className="w-full h-full bg-gray-next-3" />
            )}
          </Link>
          <div className="flex flex-col justify-center py-1 min-w-0 flex-1">
            <Link href={`/articles/${third.slug}`} className="no-underline text-inherit mb-2 block">
              <h3 className="font-bold text-base sm:text-lg leading-snug line-clamp-2 text-dark group-hover:text-primary transition-colors">{third.title}</h3>
            </Link>
            {third.description && (
              <p className="text-body text-sm line-clamp-2 leading-relaxed mb-2">{third.description}</p>
            )}
            <div className="flex items-center justify-between gap-2 text-sm text-dark-3 mt-auto">
              <div className="flex items-center gap-2 min-w-0">
                <Link href="/autor" className="flex items-center gap-2 no-underline text-inherit hover:text-primary transition-colors shrink-0">
                  <img src={author.image} alt="" className="w-6 h-6 rounded-full object-cover border border-white shadow-sm" />
                  <span>Von {author.name}</span>
                </Link>
                <span>•</span>
                <span>{formatDate(third.date)}</span>
              </div>
              <CategoryTag category={third.category} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
