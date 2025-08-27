'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthBrand from '@/app/components/AuthBrand';

type SignupData = { email: string; password: string; username: string };

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !username) return setError('Please fill in email, password, and username.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');

    const payload: SignupData = { email, password, username };
    sessionStorage.setItem('signupForm', JSON.stringify(payload));
    router.push('/signup/avatar');
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Brand header (fluid mascot sizing) */}
      <AuthBrand />

      {/* Card */}
      <div className="rounded-2xl border border-white/30 bg-white/70 backdrop-blur shadow-xl shadow-black/5">
        <form onSubmit={handleNext} className="p-5 md:p-6 space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}

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
              minLength={6}
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
              className="w-full rounded-md border border-gray-300 bg-white/90 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-indigo-600 py-2.5 text-white font-semibold shadow-sm hover:bg-indigo-700 transition"
          >
            Next
          </button>

          <p className="text-center text-sm text-gray-700">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-600 hover:underline">
              Login
            </Link>
          </p>

          <p className="text-center text-xs text-gray-500">
            Your account will be created after you pick an avatar on the next step and press <b>Finish</b>.
          </p>
        </form>
      </div>
    </div>
  );
}
