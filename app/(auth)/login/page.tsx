'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import AuthBrand from '@/app/components/AuthBrand';

type ProfileActivated = { activated_at: string | null };

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClientComponentClient<Database>();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);

    try {
      // 1) Try password sign-in
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErr(error.message);
        return;
      }

      // 2) Gate by activation (profiles.activated_at set by your /api/confirm)
      const userId = data.user.id;

      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('activated_at')
        .eq('id', userId)
        .maybeSingle<ProfileActivated>();

      if (profErr) {
        // If profiles fetch fails, be safe: do not allow entry
        await supabase.auth.signOut();
        setErr('We could not verify your account status. Please try again.');
        return;
      }

      if (!profile?.activated_at) {
        // Not activated → end the session and nudge them to check email
        await supabase.auth.signOut();
        router.push(`/signup/check-email?e=${encodeURIComponent(email)}`);
        return;
      }

      // 3) Activated → allow entry
      router.push('/home');
    } catch (e: any) {
      setErr(e?.message ?? 'Login failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Brand header (fluid mascot sizing) */}
      <AuthBrand />

      {/* Card */}
      <div className="rounded-2xl border border-white/30 bg-white/70 backdrop-blur shadow-xl shadow-black/5">
        <form onSubmit={handleLogin} className="p-5 md:p-6 space-y-4">
          {err && (
            <p className="text-sm text-red-600" role="alert">
              {err}
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 bg-white/90 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 bg-white/90 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-indigo-600 py-2.5 text-white font-semibold shadow-sm hover:bg-indigo-700 transition disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="text-center text-sm text-gray-700">
            Don’t have an account?{' '}
            <Link href="/signup" className="text-indigo-600 hover:underline">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
