import { NextResponse } from 'next/server';

// Hinweis: Bei output: 'export' (statischer Export) gibt es keinen Server – diese Route
// funktioniert nur bei next dev oder wenn du output: 'export' entfernst. Alternativ
// Formular an externen Dienst (Formspree, Mailchimp) schicken.

function isValidEmail(str) {
  return typeof str === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim());
}

export async function POST(request) {
  try {
    const body = await request.json();
    const email = body?.email?.trim();
    const consent = body?.consent === true;

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    if (!consent) {
      return NextResponse.json({ error: 'Consent required' }, { status: 400 });
    }

    // Hier später: E-Mail an Provider (Mailchimp, Resend, etc.) oder in DB speichern.
    // Für jetzt nur Validierung und 200 – Formular funktioniert, Speicherung kannst du ergänzen.
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
