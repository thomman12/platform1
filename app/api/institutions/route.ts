// app/api/institutions/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type InstRow = Database['public']['Tables']['institutions']['Row'];
type DomainRow = Database['public']['Tables']['institution_domains']['Row'];
type InstWithDomains = InstRow & {
  institution_domains: Pick<DomainRow, 'base_domain'>[] | null;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();

  // ✅ Next 15: pass a function that returns a Promise
  const supabase = createRouteHandlerClient<Database>({
    cookies: () => cookies(),
  });

  let query = supabase
    .from('institutions')
    .select(`
      id,
      slug,
      official_name,
      short_name,
      institution_domains:institution_domains (
        base_domain
      )
    `)
    .order('short_name');

  if (q) {
    query = query.or(`official_name.ilike.%${q}%,short_name.ilike.%${q}%`);
  }

  const { data, error } = await query.returns<InstWithDomains[]>().limit(20);
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const out = (data ?? []).map((i) => ({
    id: i.id,
    slug: i.slug,
    name: i.short_name || i.official_name,
    domains: (i.institution_domains ?? []).map((d) => d.base_domain).filter(Boolean),
  }));

  return NextResponse.json(out);
}
