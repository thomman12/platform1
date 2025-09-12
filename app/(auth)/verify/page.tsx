'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function VerifySignupPage() {
  const supabase = createClientComponentClient();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>('');
  const [sent, setSent] = useState(false); // show “check your email” screen after submit

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    if (!email || !username || !password) {
      setMsg('Please fill in email, username and password.');
      return;
    }
    if (!file) {
      setMsg('Please upload your student ID card or enrolment letter (JPG/PNG/PDF).');
      return;
    }
    if (password.length < 6) {
      setMsg('Password must be at least 6 characters.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
      setMsg('Allowed file types: JPG, PNG, or PDF.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMsg('File too large (max 10MB).');
      return;
    }

    setBusy(true);
    try {
      // 1) Stage the file BEFORE signUp (no session yet)
      const fd = new FormData();
      fd.append('email', email.trim());
      fd.append('file', file);

      const stageRes = await fetch('/api/verification/stage', { method: 'POST', body: fd });
      if (!stageRes.ok) {
        const { error } = await stageRes.json().catch(() => ({ error: 'Staging failed.' }));
        throw new Error(error || 'Staging failed.');
      }
      const { staging_token } = await stageRes.json();

      // 2) Sign up — this sends the confirmation email and (with confirmation required) returns NO session
      const redirect = typeof window !== 'undefined'
        ? `${window.location.origin}/verified?st=${encodeURIComponent(staging_token)}`
        : undefined;

      const { error: signErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { username },
          emailRedirectTo: redirect, // link lands on /verified and we’ll finalize there
        },
      });
      if (signErr) throw signErr;

      // 3) Tell the user to check their inbox (we do NOT proceed to avatar yet)
      setSent(true);
      setMsg('We’ve emailed a verification link to your university mailbox. Click it to continue.');
    } catch (err: any) {
      setMsg(err?.message ?? 'Sign-up failed.');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    // "Check your email" state
    return (
      <div className="max-w-md mx-auto space-y-4 p-6">
        <h1 className="text-2xl font-semibold text-center">Check your email</h1>
        <p className="text-sm text-gray-700 text-center">
          We sent a verification link to <b>{email}</b>. Click it to verify your email.
          We’ll then set up your student verification and take you to pick an avatar.
        </p>
        {msg && <div className="rounded border p-3 text-sm text-center">{msg}</div>}
        <div className="text-xs text-center text-gray-500">
          Didn’t get it? Check spam, or try again with the correct address.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-center">Student sign-up</h1>

      <form onSubmit={onSubmit} className="space-y-4">
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

        <label className="block">
          <span className="text-sm">Upload student ID (JPG/PNG/PDF · max 10MB)</span>
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 block w-full"
            required
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-black text-white px-4 py-2 disabled:opacity-60"
        >
          {busy ? 'Submitting…' : 'Next — check your email'}
        </button>
      </form>

      {msg && <div className="rounded border p-3 text-sm">{msg}</div>}

      <p className="text-xs text-gray-500 text-center">
        You’ll verify your email first. After clicking the link, we’ll finalize your student verification and take you to pick an avatar.
      </p>
    </div>
  );
}
