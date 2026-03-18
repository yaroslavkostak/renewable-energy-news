import Link from 'next/link';
import { getArticlesList } from '../../lib/articles';
import { author } from '../../lib/author';

const CAT_LABEL = { austria: 'Österreich', germany: 'DACH', global: 'Global', science: 'Wissenschaft' };

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('de-AT', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const metadata = {
  title: `Autorin – ${author.name} | Erneuerbare Energie`,
  description: author.bio,
};

export default function AutorPage() {
  const articles = getArticlesList();

  return (
    <main className="bg-gray-next min-h-screen w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10 w-full">
        {/* Author Profile – centered, no frame */}
        <div className="max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 mb-6 rounded-full overflow-hidden border-2 border-gray-next-3">
              <img
                src={author.image}
                alt={author.name}
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-3xl font-bold mb-4 text-dark">{author.name}</h1>
            <p className="text-dark-4 text-sm font-medium mb-4">{author.role}</p>
            <p className="text-dark-4 leading-relaxed text-sm md:text-base mb-5">
              {author.bio}
            </p>
            <div className="inline-flex items-center gap-3">
              <span className="text-dark-4 text-sm font-medium">Artikel</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-next-2 text-dark-4 text-sm font-semibold">
                {articles.length}
              </span>
            </div>
          </div>
        </div>

        {/* Blog Grid – tiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-12 sm:mb-16">
          {articles.map((a) => (
            <article key={a.slug} className="group bg-white rounded-xl overflow-hidden border border-gray-next-3 hover:border-gray-next-3 hover:shadow-sm transition-shadow">
              <Link
                href={`/articles/${a.slug}`}
                className="block no-underline hover:no-underline text-inherit [&>*]:no-underline"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  {a.image ? (
                    <img
                      src={a.image}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-next-2 flex items-center justify-center text-dark-3 text-sm">
                      {formatDate(a.date)}
                    </div>
                  )}
                </div>
                <div className="p-5 sm:p-6">
                  <h3 className="font-bold text-lg sm:text-xl mb-2 leading-tight text-dark line-clamp-2 group-hover:text-primary transition-colors">
                    {a.title}
                  </h3>
                  {a.description && (
                    <p className="text-body text-sm mb-4 line-clamp-2 leading-relaxed">
                      {a.description}
                    </p>
                  )}
                </div>
              </Link>
              <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pb-5 sm:pb-6 pt-5 border-t border-gray-next-3 text-xs text-dark-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Link href="/autor" className="flex items-center gap-2 no-underline text-inherit hover:text-primary transition-colors shrink-0">
                    <img src={author.image} alt="" className="w-6 h-6 rounded-full object-cover border border-white shadow-sm flex-shrink-0" />
                    <span>Von {author.name}</span>
                  </Link>
                  <span className="text-dark-2">•</span>
                  <span>{formatDate(a.date)}</span>
                </div>
                <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary shrink-0">
                  {CAT_LABEL[a.category] || a.category}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
