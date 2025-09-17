// app/(auth)/verify/page.tsx
'use client';

import { useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import AuthBrand from '@/app/components/AuthBrand';

export default function VerifyStartPage() {
  const supabase = createClientComponentClient();

  const start = useCallback(async () => {
    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/verify/complete`
        : undefined;

    await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: { redirectTo },
    });
  }, [supabase]);

  return (
    <div className="w-full max-w-md mx-auto">
      <AuthBrand />
      <div className="rounded-2xl border border-white/30 bg-white/70 backdrop-blur shadow-xl shadow-black/5 p-6 space-y-5">
        <h1 className="text-xl font-semibold text-center">Student verification</h1>
        <p className="text-sm text-gray-700 text-center">
          Verify your university status with Microsoft. We won’t email you a link or code.
        </p>
        <button
          onClick={start}
          className="w-full rounded-md bg-black py-2.5 text-white font-semibold hover:opacity-90 transition"
        >
          Verify with Microsoft
        </button>
      </div>
    </div>
  );
}
