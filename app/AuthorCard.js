import Link from 'next/link';
import { author } from '../lib/author';

export default function AuthorCard() {
  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-6 md:p-8 rounded-2xl border border-slate-100 bg-slate-50/50 mt-10">
      <Link href="/autor" className="flex-shrink-0 no-underline">
        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-4 border-white shadow-sm ring-1 ring-slate-100">
          <img
            src={author.image}
            alt={author.name}
            className="w-full h-full object-cover"
          />
        </div>
      </Link>
      <div className="text-center sm:text-left min-w-0">
        <Link href="/autor" className="no-underline">
          <h3 className="text-lg font-bold text-dark hover:text-primary transition-colors mb-1">
            {author.name}
          </h3>
        </Link>
        <p className="text-dark-4 text-sm font-medium mb-2">{author.role}</p>
        <p className="text-body text-sm leading-relaxed mb-4">
          {author.bio}
        </p>
        <Link
          href="/autor"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary transition-colors"
        >
          Alle Artikel von {author.name}
          <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}
