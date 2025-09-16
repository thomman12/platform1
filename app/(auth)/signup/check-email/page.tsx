// app/(auth)/signup/check-email/page.tsx
'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import Link from 'next/link';
import AuthBrand from '@/app/components/AuthBrand';

type Mode = 'link' | 'otp'; // 'link' = magic link (normal), 'otp' = 6-digit code (student)

function CheckEmailInner() {
  const supabase = createClientComponentClient<Database>();
  const q = useSearchParams();

  // Which UI to show + the email we target
  const [mode, setMode] = useState<Mode>('link');
  const [email, setEmail] = useState('');

  useEffect(() => {
    // Decide the mode from query (?flow=normal|student), else from sessionStorage
    const flowParam = q.get('flow'); // 'normal' | 'student' | null
    let m: Mode = 'link';
    if (flowParam === 'student') m = 'otp';
    if (!flowParam) {
      try {
        const f = sessionStorage.getItem('signupFlow');
        if (f === 'student') m = 'otp';
      } catch {}
    }
    setMode(m);

    // Determine the email from query (?e=...) or sessionStorage
    const fromQueryEmail = q.get('e') ?? '';
    if (fromQueryEmail) {
      setEmail(fromQueryEmail);
    } else {
      try {
        const raw = sessionStorage.getItem('signupForm');
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed?.email) setEmail(parsed.email);
      } catch {}
    }
  }, [q]);

  // Shared 3-minute cooldown
  const [secs, setSecs] = useState(180);
  useEffect(() => {
    const id = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  const canResend = secs === 0 && !!email;

  // Resend handler
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const onResend = async () => {
    if (!canResend) return;
    setResending(true);
    setResendMsg('');
    try {
      if (mode === 'link') {
        // Normal flow: resend Supabase magic link
        const redirectTo =
          typeof window !== 'undefined'
            ? `${window.location.origin}/verified?e=${encodeURIComponent(email)}`
            : undefined;

        const { error } = await supabase.auth.resend({
          type: 'signup',
          email,
          options: { emailRedirectTo: redirectTo },
        });
        if (error) throw error;
      } else {
        // Student flow: ask your API to generate + email a new OTP
        const res = await fetch('/api/student/resend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        if (!res.ok) {
          let msg = 'Could not resend code.';
          try {
            const j = await res.json();
            msg = j?.error || msg;
          } catch {}
          throw new Error(msg);
        }
      }

      setSecs(180);
      setResendMsg(
        mode === 'link'
          ? 'Email resent. Check your inbox (and spam).'
          : 'Code resent. Check your inbox.'
      );
    } catch (e: any) {
      setResendMsg(e?.message ?? 'Unable to resend right now.');
    } finally {
      setResending(false);
    }
  };

  // OTP verify (student)
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState('');
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === 'otp') codeRef.current?.focus();
  }, [mode]);

  const onVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode !== 'otp' || !email || code.length < 6) return;

    setVerifying(true);
    setVerifyMsg('');
    try {
      // Your API should: validate OTP → create/verify user (service role) → invalidate OTP
      const res = await fetch('/api/student/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      if (!res.ok) {
        let msg = 'Invalid or expired code. Try resending.';
        try {
          const j = await res.json();
          msg = j?.error || msg;
        } catch {}
        throw new Error(msg);
      }

      setVerifyMsg('Email verified! You can now log in.');
    } catch (e: any) {
      setVerifyMsg(e?.message ?? 'Invalid or expired code. Try resending.');
    } finally {
      setVerifying(false);
    }
  };

  const title = mode === 'link' ? 'Check your email' : 'Enter your verification code';
  const lead =
    mode === 'link'
      ? `We sent a verification link to ${email || 'your inbox'}. Click it to confirm your account.`
      : `We sent a 6-digit code to ${email || 'your inbox'}. Enter it below to confirm your account.`;

  return (
    <div className="w-full max-w-md mx-auto">
      <AuthBrand />

      <div className="rounded-2xl border border-white/30 bg-white/70 backdrop-blur shadow-xl shadow-black/5">
        <div className="p-5 md:p-6 space-y-5">
          <h1 className="text-xl font-semibold text-center">{title}</h1>

          <p className="text-sm text-gray-700 text-center">{lead}</p>

          {mode === 'otp' && (
            <>
              <form onSubmit={onVerifyCode} className="space-y-3">
                <label className="block">
                  <span className="text-sm">Verification code</span>
                  <input
                    ref={codeRef}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                    }
                    onPaste={(e) => {
                      const t = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                      if (t.length) {
                        e.preventDefault();
                        setCode(t);
                      }
                    }}
                    className="mt-1 w-full rounded border p-2 text-center tracking-widest"
                    placeholder="______"
                    aria-label="6-digit verification code"
                  />
                </label>

                <button
                  type="submit"
                  disabled={!email || code.length < 6 || verifying}
                  className="w-full rounded-md bg-indigo-600 py-2.5 text-white font-semibold shadow-sm hover:bg-indigo-700 transition disabled:opacity-60"
                >
                  {verifying ? 'Verifying…' : 'Verify code'}
                </button>
              </form>

              {verifyMsg && (
                <div className="rounded border p-3 text-sm text-center" aria-live="polite">
                  {verifyMsg}
                </div>
              )}
            </>
          )}

          <div className="text-xs text-gray-500 text-center">
            You can request another {mode === 'link' ? 'email' : 'code'} in <b>{mm}:{ss}</b>.
          </div>

          <button
            onClick={onResend}
            disabled={!canResend || resending || !email}
            className="w-full rounded-md bg-gray-900 py-2.5 text-white font-semibold hover:bg-black transition disabled:opacity-60"
          >
            {resending
              ? (mode === 'link' ? 'Resending…' : 'Resending code…')
              : (mode === 'link' ? 'Resend email' : 'Resend code')}
          </button>

          <div className="text-center text-sm text-gray-700">
            Already verified?{' '}
            <Link href="/login" className="text-indigo-600 hover:underline">
              Go to Login
            </Link>
          </div>

          {resendMsg && (
            <p className="text-center text-xs text-gray-500" aria-live="polite">
              {resendMsg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  // Required for useSearchParams in a client component
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <CheckEmailInner />
    </Suspense>
  );
}
