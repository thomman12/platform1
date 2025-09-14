'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  error?: string;
  errorCode?: string;
  st?: string;    // present for student flow only
  next?: string;  // where to continue after finalize
};

export default function VerifiedClient({
  error = '',
  errorCode = '',
  st = '',
  next = '/signup/avatar',
}: Props) {
  const router = useRouter();
  const ok = !error && !errorCode;

  const [finalizing, setFinalizing] = useState<boolean>(Boolean(ok && st));
  const [finalizeMsg, setFinalizeMsg] = useState<string>(
    ok && st ? 'Email verified ✅ Finalising your student verification…' : ''
  );
  const [finalizeErr, setFinalizeErr] = useState<string>('');

  useEffect(() => {
    if (!ok || !st) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/verification/finalize?st=${encodeURIComponent(st)}`, {
          method: 'POST',
        });
        if (!res.ok) {
          const { error: e } = await res.json().catch(() => ({ error: 'Finalisation failed.' }));
          if (!cancelled) {
            setFinalizeErr(e || 'Finalisation failed.');
            setFinalizing(false);
          }
          return;
        }
        if (!cancelled) {
          setFinalizeMsg('All set! Taking you to pick an avatar…');
          setTimeout(() => router.replace(next), 900);
        }
      } catch (e: any) {
        if (!cancelled) {
          setFinalizeErr(e?.message ?? 'Finalisation failed.');
          setFinalizing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ok, st, router, next]);

  if (!ok) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold mb-2">Verification link problem</h1>
          <p className="text-gray-600 mb-4">
            {errorCode === 'otp_expired'
              ? 'This link has expired. Please request a new verification email.'
              : 'This verification link is invalid or has already been used.'}
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
            >
              Go to Login
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-md border px-4 py-2 hover:bg-gray-50"
            >
              Start over
            </Link>
          </div>
          <p className="mt-4 text-xs text-gray-500">Error: {errorCode || error}</p>
        </div>
      </div>
    );
  }

  if (st) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <div className="rounded-xl border bg-white p-6 shadow-sm text-center">
          <h1 className="text-2xl font-bold mb-2">Email verified 🎉</h1>
          {finalizing && <p className="text-gray-600 mb-6">{finalizeMsg}</p>}
          {!finalizing && finalizeErr && (
            <>
              <p className="text-red-600 mb-4">{finalizeErr}</p>
              <p className="text-gray-600 mb-6">
                You can still continue and set your avatar. We’ll try to finalise in the background.
              </p>
            </>
          )}
          <div className="flex items-center justify-center">
            <button
              onClick={() => router.replace(next)}
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg p-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-2">Email verified 🎉</h1>
        <p className="text-gray-600 mb-6">
          Your account is confirmed. You can now log in with the email and password you used to sign up.
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
          >
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
