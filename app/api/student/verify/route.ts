import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import crypto from 'node:crypto';

export const runtime = 'nodejs';

const hash = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();
    if (!email || !code) return NextResponse.json({ error: 'Missing email or code' }, { status: 400 });

    const emailLc = String(email).toLowerCase();
    const codeHash = hash(String(code));

    // fetch otp row
    const { data: row, error: selErr } = await (supabaseAdmin as any)
      .from('student_otps')
      .select('*')
      .eq('email', emailLc)
      .single();

    if (selErr || !row) return NextResponse.json({ error: 'Code not found. Resend and try again.' }, { status: 400 });
    if (row.code_hash !== codeHash) return NextResponse.json({ error: 'Invalid code.' }, { status: 400 });
    if (new Date(row.expires_at).getTime() < Date.now()) return NextResponse.json({ error: 'Code expired.' }, { status: 400 });

    const payload = row.payload as { password: string; username: string; preset_avatar_id: string };

    // create user (email already confirmed)
    const { data: created, error: cErr } = await (supabaseAdmin as any).auth.admin.createUser({
      email: emailLc,
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        username: payload.username,
        preset_avatar_id: payload.preset_avatar_id,
        is_student_verified: true,
      },
    });
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 400 });

    const userId = created.user.id;

    // upsert profile (optional if you have a trigger)
    await (supabaseAdmin as any).from('profiles').upsert({
      id: userId,
      username: payload.username,
      avatar_id: payload.preset_avatar_id,
      is_student_verified: true,
    });

    // consume OTP
    await (supabaseAdmin as any).from('student_otps').delete().eq('email', emailLc);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
