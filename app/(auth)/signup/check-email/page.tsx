// app/(auth)/signup/check-email/page.tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

function CheckEmailInner() {
  const supabase = createClientComponentClient();
  const q = useSearchParams();

  // 1) try to read ?e= from URL, else fall back to sessionStorage
  const [email, setEmail] = useState<string>('');
  useEffect(() => {
    const fromQuery = q.get('e') ?? '';
    if (fromQuery) {
      setEmail(fromQuery);
      return;
    }
    try {
      const raw = sessionStorage.getItem('signupForm');
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed?.email) setEmail(parsed.email);
    } catch {}
  }, [q]);

  // 2) 3-minute countdown
  const [secs, setSecs] = useState(180);
  useEffect(() => {
    const id = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = Math.floor(secs / 60).toString().padStart(2, '0');
  const ss = (secs % 60).toString().padStart(2, '0');
  const canResend = secs === 0;

  // 3) resend
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>('');
  const onResend = async () => {
    if (!email || busy || !canResend) return;
    setBusy(true);
    setMsg('');
    try {
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/verified`
          : undefined;

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;

      setSecs(180); // restart timer
      setMsg('Resent! If you don’t see it, check spam/junk.');
    } catch (e: any) {
      setMsg(e?.message ?? 'Could not resend email.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md p-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm text-center">
        <h1 className="text-2xl font-bold mb-2">Check your email</h1>
        <p className="text-gray-700">
          We sent a verification link to{' '}
          <b>{email || 'your inbox'}</b>. Click it to verify your account.
        </p>

        <div className="mt-4 text-sm text-gray-600">
          You can request another email in <b>{mm}:{ss}</b>.
        </div>

        <button
          onClick={onResend}
          disabled={!canResend || busy || !email}
          className="mt-4 inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? 'Resending…' : 'Resend verification email'}
        </button>

        {msg && <p className="mt-3 text-sm">{msg}</p>}

        <p className="mt-4 text-xs text-gray-500">
          Tip: look in Spam/Updates/Other tabs, or search for “Supabase”.
        </p>
      </div>
    </div>
  );
}

// Page wrapper with Suspense (fixes the error)
export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <CheckEmailInner />
    </Suspense>
  );
}
