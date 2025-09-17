// app/(auth)/verify/complete/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import AuthBrand from '@/app/components/AuthBrand';

export default function VerifyCompletePage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [email, setEmail] = useState<string>('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u?.email) {
        setErr('We could not retrieve your verified email. Please try again.');
        return;
      }
      setEmail(u.email);
    })();
  }, [supabase]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (!email) return setErr('Missing verified email from Microsoft.');
    if (!username.trim()) return setErr('Please choose a username.');
    if (password.length < 6) return setErr('Password must be at least 6 characters.');

    try {
      setBusy(true);

      // 1) Add a password to this (currently OAuth) user.
      const { error: updErr } = await supabase.auth.updateUser({
        password,
        data: { username }, // we’ll also upsert the profile after avatar pick
      });
      if (updErr) throw updErr;

      // 2) Prime the avatar step like your normal flow expects.
      sessionStorage.setItem('signupFlow', 'student_sso');
      sessionStorage.setItem(
        'signupForm',
        JSON.stringify({ email, password, username })
      );

      // 3) Go pick an avatar (no email/OTP step).
      router.replace('/signup/avatar');
    } catch (e: any) {
      setErr(e?.message ?? 'Could not complete verification.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <AuthBrand />
      <div className="rounded-2xl border border-white/30 bg-white/70 backdrop-blur shadow-xl shadow-black/5 p-6 space-y-5">
        <h1 className="text-xl font-semibold text-center">Complete your account</h1>

        <p className="text-sm text-gray-700 text-center">
          We got your verified university email from Microsoft. Create a password so you can log in next time without SSO.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full rounded-md border border-gray-300 bg-gray-100/80 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 bg-white/90 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="your handle"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-md border border-gray-300 bg-white/90 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
            />
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}

          <button
            type="submit"
            disabled={!email || busy}
            className="w-full rounded-md bg-indigo-600 py-2.5 text-white font-semibold shadow-sm hover:bg-indigo-700 transition disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
