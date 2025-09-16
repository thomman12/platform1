import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendOtp } from '@/lib/mailer';

export const runtime = 'nodejs';

function genCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: Request) {
  const { email, password, username, presetAvatarId } = await req.json();
  if (!email || !password || !username || !presetAvatarId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const code = genCode();
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();

  const { error } = await supabaseAdmin
    .from('student_otps')
    .upsert(
      { email, code, expires_at: expiresAt, username, password, preset_avatar_id: presetAvatarId },
      { onConflict: 'email' }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await sendOtp(email, code);
  return NextResponse.json({ ok: true });
}
