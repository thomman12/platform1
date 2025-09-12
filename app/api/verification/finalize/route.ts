export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

function extFromPath(p: string) {
  const ext = (p.split('.').pop() || '').toLowerCase();
  return ['jpg','jpeg','png','pdf'].includes(ext) ? ext : 'bin';
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const st  = url.searchParams.get('st') || (await req.json().catch(()=>null))?.st;
    if (!st) return NextResponse.json({ error: 'missing token' }, { status: 400 });

    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) return NextResponse.json({ error: 'not authenticated' }, { status: 401 });

    // fetch staging row
    const { data: row, error: sErr } = await supabaseAdmin
      .from('verification_staging')
      .select('*')
      .eq('staging_token', st)
      .is('used_at', null)
      .single();
    if (sErr || !row) return NextResponse.json({ error: 'invalid or used token' }, { status: 400 });

    // emails must match
    if (row.email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json({ error: 'token/email mismatch' }, { status: 403 });
    }

    // move staged -> final
    const dl = await supabaseAdmin.storage.from('student-id-staging').download(row.storage_path);
    if (dl.error || !dl.data) return NextResponse.json({ error: dl.error?.message || 'download failed' }, { status: 500 });

    const ext  = extFromPath(row.storage_path);
    const dest = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const buf  = Buffer.from(await dl.data.arrayBuffer());

    const up = await supabaseAdmin.storage.from('student-id-uploads').upload(dest, buf, { upsert: false });
    if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 });

    // create PENDING verification + perks_provisional=true
    const rpc = await supabaseAdmin.rpc('start_student_verification', {
      p_email: user.email.toLowerCase(),
      p_base_domain: row.base_domain.toLowerCase(),
      p_storage_path: dest,
    });
    if (rpc.error) return NextResponse.json({ error: rpc.error.message }, { status: 500 });

    // mark used & cleanup staging object
    await supabaseAdmin.from('verification_staging').update({ used_at: new Date().toISOString() }).eq('id', row.id);
    await supabaseAdmin.storage.from('student-id-staging').remove([row.storage_path]);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'finalize failed' }, { status: 500 });
  }
}
