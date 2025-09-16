import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { email, code } = await req.json();
  if (!email || !code) return NextResponse.json({ error: 'Email and code required' }, { status: 400 });

  const { data: pending, error } = await supabaseAdmin
    .from('student_otps')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!pending) return NextResponse.json({ error: 'No pending signup' }, { status: 400 });
  if (pending.code !== code) return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
  if (new Date(pending.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Code expired' }, { status: 400 });
  }

  const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email: pending.email,
    email_confirm: true,
    password: pending.password, // (POC) in production, store a hashed temp or complete password properly
    user_metadata: {
      username: pending.username,
      preset_avatar_id: pending.preset_avatar_id,
      is_student_verified: true,
    },
  });

  if (createErr) return NextResponse.json({ error: createErr.message }, { status: 400 });

  await supabaseAdmin.from('student_otps').delete().eq('email', email);

  return NextResponse.json({ ok: true });
}
