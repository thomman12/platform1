// app/api/student/verify/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function hash(code: string) {
  const pepper = process.env.OTP_PEPPER || '';
  return crypto.createHash('sha256').update(code + pepper).digest('hex');
}

export async function POST(req: Request) {
  const { email, code } = await req.json();
  if (!email || !code) return NextResponse.json({ error: 'Missing.' }, { status: 400 });

  const code_hash = hash(code);

  const { data: row, error } = await supabaseAdmin
    .from('email_otps')
    .select('user_id, code_hash, expires_at, consumed_at, tries')
    .eq('email', email)
    .single();

  if (error || !row) return NextResponse.json({ error: 'Code not found.' }, { status: 400 });
  if (row.consumed_at) return NextResponse.json({ error: 'Code already used.' }, { status: 400 });
  if (new Date(row.expires_at).getTime() < Date.now())
    return NextResponse.json({ error: 'Code expired.' }, { status: 400 });
  if (row.code_hash !== code_hash) {
    await supabaseAdmin
      .from('email_otps')
      .update({ tries: (row.tries ?? 0) + 1 })
      .eq('user_id', row.user_id);
    return NextResponse.json({ error: 'Invalid code.' }, { status: 400 });
  }

  // confirm the user’s email
  await supabaseAdmin.auth.admin.updateUserById(row.user_id, {
    email_confirm: true,
  });

  // mark OTP consumed
  await supabaseAdmin
    .from('email_otps')
    .update({ consumed_at: new Date().toISOString() })
    .eq('user_id', row.user_id);

  return NextResponse.json({ ok: true });
}
