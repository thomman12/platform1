// app/(auth)/signup/student/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthBrand from '@/app/components/AuthBrand';

type SignupData = { email: string; password: string; username: string };
type Uni = { id: string; name: string; slug: string; domains: string[] };

// Helper: suffix matching (handles subdomains like student.cam.ac.uk)
const domainMatches = (emailDomain: string, baseDomain: string) => {
  const e = emailDomain.toLowerCase();
  const b = baseDomain.toLowerCase();
  return e === b || e.endsWith(`.${b}`);
};

export default function StudentSignupPage() {
  const router = useRouter();

  // form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  // uni picker
  const [unis, setUnis] = useState<Uni[]>([]);
  const [selectedUniId, setSelectedUniId] = useState<string>('');
  const [loadingUnis, setLoadingUnis] = useState(false);

  // ui
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load universities (with domains) once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingUnis(true);
        const res = await fetch('/api/institutions', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load universities');
        const data: Uni[] = await res.json();
        if (cancelled) return;
        setUnis(data);
        if (!selectedUniId && data.length) setSelectedUniId(data[0].id);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Unable to load universities.');
      } finally {
        if (!cancelled) setLoadingUnis(false);
      }
    })();
    return () => { cancelled = true; };
  }, []); // once

  const selectedUni = useMemo(
    () => unis.find(u => u.id === selectedUniId) || null,
    [unis, selectedUniId]
  );

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedUniId) return setError('Please choose your university.');
    if (!email || !password || !username) {
      return setError('Please fill in email, password, and username.');
    }
    if (password.length < 6) {
      return setError('Password must be at least 6 characters.');
    }

    // Validate picked university vs email domain (on submit)
    const domain = email.split('@').pop()?.trim().toLowerCase() || '';
    if (!domain) return setError('Please enter a valid university email address.');

    const uni = selectedUni;
    if (!uni) return setError('Please choose your university.');

    const ok = (uni.domains ?? []).some(d => domainMatches(domain, d));
    if (!ok) {
      return setError(
        `That email doesn’t look like a ${uni.name} address. ` +
        `Please use your official ${uni.name} email or choose the correct university.`
      );
    }

    // persist for avatar step (same as your current flow)
    const payload: SignupData = { email, password, username };
    try {
      sessionStorage.setItem('signupForm', JSON.stringify(payload));
      sessionStorage.setItem('signupFlow', 'student');
      sessionStorage.setItem('studentSelectedInstitutionId', uni.id);
      sessionStorage.setItem('studentEmail', email);
    } catch {}

    setSubmitting(true);
    router.push('/signup/avatar');
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <AuthBrand />

      <div className="rounded-2xl border border-white/30 bg-white/70 backdrop-blur shadow-xl shadow-black/5">
        <form onSubmit={handleNext} className="p-5 md:p-6 space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* University picker (simple select) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              University
            </label>
            <select
              value={selectedUniId}
              onChange={(e) => setSelectedUniId(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white/90 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={loadingUnis || !unis.length}
              aria-disabled={loadingUnis || !unis.length}
            >
              {loadingUnis && <option>Loading…</option>}
              {!loadingUnis && unis.length === 0 && <option>No universities found</option>}
              {unis.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* University email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              University Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@student.university.ac.uk"
              className="w-full rounded-md border border-gray-300 bg-white/90 px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Use your official university address (e.g., <code>@*.ac.uk</code>). We’ll send a link and a 6-digit code.
            </p>
          </div>

          {/* Password */}
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

          {/* Username */}
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
            disabled={submitting || loadingUnis || !unis.length}
            className="w-full rounded-md bg-indigo-600 py-2.5 text-white font-semibold shadow-sm hover:bg-indigo-700 transition disabled:opacity-60"
          >
            {submitting ? 'Next…' : 'Next'}
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

          <div className="text-sm text-gray-600">
            Not a student?{' '}
            <Link
              href="/signup"
              className="font-medium underline underline-offset-2 hover:opacity-80"
              aria-label="Go to regular signup"
            >
              Use regular signup
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
