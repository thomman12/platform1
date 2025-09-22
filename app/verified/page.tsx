// app/verified/page.tsx
'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import AuthBrand from '@/app/components/AuthBrand';

// optional: avoid static prerender
export const dynamic = 'force-dynamic';

export default function VerifiedPage() {
  return (
    <Suspense fallback={<Shell><p>Loading…</p></Shell>}>
      <VerifiedInner />
    </Suspense>
  );
}

function VerifiedInner() {
  const supabase = createClientComponentClient<Database>();
  const q = useSearchParams();
  const router = useRouter();

  const vt = q.get('vt') || '';

  const [email, setEmail] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const codeRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    codeRef.current?.focus();
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user?.email ?? null);
    })();
  }, [supabase]);

  const onConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    if (!vt) {
      setErr('This verification link is missing data. Please request a new email.');
      return;
    }
    if (code.length < 6) {
      setErr('Enter the 6-digit code from the email.');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch('/api/verification/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vt, code }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Could not confirm.');

      setMsg('Verified! Redirecting to login…');

      try { await supabase.auth.signOut(); } catch {}

      setTimeout(() => router.replace('/login'), 900);
    } catch (e: any) {
      setErr(e?.message ?? 'Something went wrong. Try resending the email.');
    } finally {
      setBusy(false);
    }
  };

  if (!vt) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold mb-2">Link problem</h1>
        <p className="text-gray-700 mb-6">
          This verification link is missing data. Please request a new email and try again.
        </p>
        <div className="flex items-center gap-3">
          <Link href="/signup/check-email" className="inline-flex items-center justify-center rounded-md border px-4 py-2 hover:bg-gray-50">
            Resend email
          </Link>
          <Link href="/login" className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
            Go to Login
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="text-2xl font-bold mb-2">Review &amp; Confirm</h1>
      <p className="text-gray-700 mb-4">
        {email ? <>Signed in as <b>{email}</b>.</> : 'Enter the code from your email to activate your account.'}
      </p>

      <form onSubmit={onConfirm} className="space-y-3">
        <label className="block">
          <span className="text-sm">6-digit code</span>
          <input
            ref={codeRef}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 6);
              setCode(v);
            }}
            onPaste={(e) => {
              const t = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
              if (t) { e.preventDefault(); setCode(t); }
            }}
            className="mt-1 w-full rounded border p-2 text-center tracking-widest"
            placeholder="______"
            aria-label="6-digit verification code"
          />
        </label>

        <button
          type="submit"
          disabled={busy || code.length < 6}
          className="w-full rounded-md bg-black py-2.5 text-white font-semibold hover:opacity-90 disabled:opacity-60"
        >
          {busy ? 'Confirming…' : 'Confirm'}
        </button>
      </form>

      {msg && <p className="mt-3 text-xs text-gray-600" aria-live="polite">{msg}</p>}
      {err && <p className="mt-3 text-xs text-red-600" aria-live="polite">{err}</p>}

      <div className="mt-6 text-center text-sm text-gray-700">
        Didn’t get it?{' '}
        <Link href="/signup/check-email" className="text-indigo-600 hover:underline">
          Resend email
        </Link>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-md mx-auto">
      <AuthBrand />
      <div className="rounded-2xl border border-white/30 bg-white/70 backdrop-blur shadow-xl shadow-black/5 p-6">
        {children}
      </div>
    </div>
  );
}
