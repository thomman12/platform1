// app/(auth)/signup/check-email/page.tsx
'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AuthBrand from '@/app/components/AuthBrand';

function CheckEmailInner() {
  const q = useSearchParams();

  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState('');

  // cooldown
  const [secs, setSecs] = useState(180);
  useEffect(() => {
    const id = setInterval(() => setSecs(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  const canResend = secs === 0 && !!email;

  // read email
  useEffect(() => {
    const fromQueryEmail = q.get('e') ?? '';
    if (fromQueryEmail) {
      setEmail(fromQueryEmail);
      return;
    }
    try {
      const raw = sessionStorage.getItem('signupForm');
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed?.email) setEmail(parsed.email);
    } catch {}
  }, [q]);

  // send exactly once on first load (guard against double-mount)
  const sentOnceRef = useRef(false);
  useEffect(() => {
    (async () => {
      if (!email) return;
      if (sentOnceRef.current) return;
      sentOnceRef.current = true;

      setSending(true);
      setSendMsg('');
      try {
        const user_id = sessionStorage.getItem('signupUserId') || null;
        const res = await fetch('/api/verification/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, user_id }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.message || 'Could not send email.');
        }
        setSecs(180);
        setSendMsg('Email sent. Check your inbox (and spam).');
      } catch (e: any) {
        setSendMsg(e?.message || 'Unable to send email.');
      } finally {
        setSending(false);
      }
    })();
  }, [email]);

  const onResend = async () => {
    if (!canResend || !email) return;
    setSending(true);
    setSendMsg('');
    try {
      const user_id = sessionStorage.getItem('signupUserId') || null;
      const res = await fetch('/api/verification/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, user_id }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || 'Could not resend email.');
      }
      setSecs(180);
      setSendMsg('Email resent. Check your inbox.');
    } catch (e: any) {
      setSendMsg(e?.message || 'Unable to resend right now.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <AuthBrand />
      <div className="rounded-2xl border border-white/30 bg-white/70 backdrop-blur shadow-xl shadow-black/5">
        <div className="p-5 md:p-6 space-y-5">
          <h1 className="text-xl font-semibold text-center">Check your email</h1>
          <p className="text-sm text-gray-700 text-center">
            We sent a verification link and a 6-digit code to {email || 'your inbox'}.
            Open the link and enter the code to activate your account.
          </p>

          <div className="text-xs text-gray-500 text-center">
            You can request another email in <b>{mm}:{ss}</b>.
          </div>

          <button
            onClick={onResend}
            disabled={!canResend || sending || !email}
            className="w-full rounded-md bg-gray-900 py-2.5 text-white font-semibold hover:bg-black transition disabled:opacity-60"
          >
            {sending ? 'Sending…' : 'Resend email'}
          </button>

          <div className="text-center text-sm text-gray-700">
            Already verified?{' '}
            <Link href="/login" className="text-indigo-600 hover:underline">
              Go to Login
            </Link>
          </div>

          {sendMsg && (
            <p className="text-center text-xs text-gray-500" aria-live="polite">
              {sendMsg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <CheckEmailInner />
    </Suspense>
  );
}
