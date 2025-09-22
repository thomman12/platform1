// app/page.tsx
'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <RootInner />
    </Suspense>
  );
}

function RootInner() {
  const router = useRouter();
  const q = useSearchParams();
  const supabase = createClientComponentClient<Database>();

  useEffect(() => {
    // 1) If a Supabase verification hit '/', forward it to /verified (preserve query)
    const code = q.get('code');
    const token_hash = q.get('token_hash');
    const type = q.get('type');
    if (code || (token_hash && type)) {
      router.replace(`/verified?${q.toString()}`);
      return;
    }

    // 2) Otherwise do your normal session-based redirect
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      router.replace(session ? '/home' : '/login');
    })();
  }, [q, router, supabase]);

  return <p>Loading...</p>;
}
