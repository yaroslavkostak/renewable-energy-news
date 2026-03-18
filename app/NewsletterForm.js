'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | loading | success | error

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !consent) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), consent: true }),
      });
      if (!res.ok) throw new Error('Fehler');
      setStatus('success');
      setEmail('');
      setConsent(false);
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <section id="newsletter" className="bg-gray-next-2 py-16 md:py-20" aria-label="Newsletter">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="bg-white rounded-2xl shadow-box border border-gray-next-3 p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-2 text-dark">Vielen Dank!</h2>
            <p className="text-dark-4">Sie erhalten in Kürze eine Bestätigung an Ihre E-Mail-Adresse.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="newsletter" className="bg-gray-next-2 py-16 md:py-20" aria-label="Newsletter">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-2xl shadow-box border border-gray-next-3 p-8 md:p-14 md:flex md:items-center md:justify-between gap-10 md:gap-12">
          <div className="md:max-w-[420px] mb-8 md:mb-0">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 text-dark">Subscribe to Newsletter</h2>
            <p className="text-dark-4 text-sm md:text-base">
              Provide your email to get email notification when we launch new products or publish new articles.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="flex-1 min-w-0 flex flex-col gap-3 max-w-xl">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-stretch">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your Email"
                required
                disabled={status === 'loading'}
                className="flex-1 min-w-0 px-5 py-3.5 rounded-xl border-none ring-1 ring-gray-next-3 focus:ring-2 focus:ring-primary outline-none transition-all text-dark placeholder:text-dark-3 disabled:opacity-60"
                aria-label="E-Mail-Adresse"
              />
              <button
                type="submit"
                disabled={status === 'loading' || !email.trim() || !consent}
                className="bg-primary text-white px-6 py-3.5 rounded-xl font-bold hover:bg-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {status === 'loading' ? '…' : 'Subscribe'}
              </button>
            </div>
            <label className="flex items-start gap-2 text-left text-sm text-dark-4 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                required
                disabled={status === 'loading'}
                className="mt-1 rounded border-gray-next-3 text-primary focus:ring-primary"
              />
              <span>
                Ich stimme zu, dass meine E-Mail zum Newsletter-Versand gemäß der{' '}
                <Link href="/datenschutz" className="text-primary hover:underline">Datenschutzerklärung</Link> verarbeitet wird.
              </span>
            </label>
            {status === 'error' && (
              <p className="text-red-600 text-sm">Fehler. Bitte später erneut versuchen.</p>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
