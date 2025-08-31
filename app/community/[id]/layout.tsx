import { ReactNode } from 'react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const supabase = createServerComponentClient<Database>({ cookies });
  const { data: c } = await supabase
    .from('communities')
    .select('name, is_hidden')
    .eq('id', params.id)
    .single();

  const hidden = Boolean(c?.is_hidden);
  return {
    title: c?.name ?? 'Community',
    robots: {
      index: !hidden,
      follow: !hidden,
      googleBot: { index: !hidden, follow: !hidden },
    },
  };
}

export default function CommunityLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
