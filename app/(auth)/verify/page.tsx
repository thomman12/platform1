'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthBrand from '@/app/components/AuthBrand';

type SignupData = { email: string; password: string; username: string };

export default function VerifySignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();

    if (!trimmedEmail || !password || !trimmedUsername) {
      setError('Please fill in email, password, and username.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setBusy(true);

    // Save exactly like your normal signup page
    const payload: SignupData = { email: trimmedEmail, password, username: trimmedUsername };
    sessionStorage.setItem('signupForm', JSON.stringify(payload));

    // Optional flag so you can tell this came from the student flow if needed
    sessionStorage.setItem('signupFlow', 'student');

    // Continue to avatar step; the actual signUp + email verify is done there
    router.push('/signup/avatar');
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Same brand header / mascot as normal signup */}
      <AuthBrand />

      {/* Card */}
      <div className="rounded-2xl border border-white/30 bg-white/70 backdrop-blur shadow-xl shadow-black/5">
        <form onSubmit={handleNext} className="p-5 md:p-6 space-y-4">
          <h1 className="text-xl font-semibold text-center">Student sign-up</h1>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">University email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@youruni.ac.uk"
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
              minLength={6}
              placeholder="••••••••"
              className="w-full rounded-md border border-gray-300 bg-white/90 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="your handle"
              className="w-full rounded-md border border-gray-300 bg-white/90 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-indigo-600 py-2.5 text-white font-semibold shadow-sm hover:bg-indigo-700 transition disabled:opacity-60"
          >
            {busy ? 'Continuing…' : 'Next'}
          </button>

          <p className="text-center text-sm text-gray-700">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-600 hover:underline">
              Login
            </Link>
          </p>

          <p className="text-center text-xs text-gray-500">
            After you pick an avatar on the next step and press <b>Finish</b>, we’ll send a verification
            link to your email. Click it to reach the <b>Verified</b> page, then log in.
          </p>
        </form>
      </div>
    </div>
  );
}
