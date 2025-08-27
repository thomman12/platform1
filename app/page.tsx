'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';


export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const supabase = createClientComponentClient<Database>();


  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
      } else {
        router.push('/home'); // ✅ redirect to home
      }
    };

    checkSession();
  }, [router]);

  return <p>Loading...</p>; // Always return something
}
