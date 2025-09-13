'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type SignupData = { email: string; password: string; username: string };

export default function VerifySignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();

    if (!trimmedEmail || !trimmedUsername || !password) {
      setError('Please fill in email, username and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setBusy(true);

    // Save exactly like your normal signup
    const payload: SignupData = {
      email: trimmedEmail,
      password,
      username: trimmedUsername,
    };
    sessionStorage.setItem('signupForm', JSON.stringify(payload));

    // (Optional) mark that this came from the student link
    sessionStorage.setItem('signupFlow', 'student');

    // Go to avatar picker; the actual signUp + email is done there
    router.push('/signup/avatar');
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-center">Student sign-up</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        <label className="block">
          <span className="text-sm">University email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border p-2"
            placeholder="name@youruni.ac.uk"
          />
        </label>

        <label className="block">
          <span className="text-sm">Username</span>
          <input
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1 w-full rounded border p-2"
            placeholder="your handle"
          />
        </label>

        <label className="block">
          <span className="text-sm">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border p-2"
            placeholder="••••••••"
            minLength={6}
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-black text-white px-4 py-2 disabled:opacity-60"
        >
          {busy ? 'Continuing…' : 'Next'}
        </button>
      </form>

      <p className="text-xs text-gray-500 text-center">
        After you pick an avatar and press <b>Finish</b>, we’ll send a verification link to your email.
        Click it to reach the <b>Verified</b> page, then log in.
      </p>
    </div>
  );
}
