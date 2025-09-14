import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;

  const supabase = createServerComponentClient<Database>({ cookies });
  const { data: c } = await supabase
    .from('communities')
    .select('name, is_hidden')
    .eq('id', id)
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

export default async function CommunityLayout({
  children,
  params,
}: {
  children: ReactNode;
  // Next 15 App Router: params is a Promise for dynamic segments
  params: Promise<{ id: string }>;
}) {
  // If you don't need the id here, just await to satisfy the type
  await params;
  return <>{children}</>;
}
