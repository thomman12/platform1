import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendOtpEmail } from '@/lib/mailer';
import crypto from 'node:crypto';

export const runtime = 'nodejs';

const sixDigit = () => String(Math.floor(100000 + Math.random() * 900000));
const hash = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

    const { email, password, username, presetAvatarId, preset_avatar_id } = body;
    const avatar = presetAvatarId ?? preset_avatar_id;

    if (!email || !password || !username || !avatar) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const code = sixDigit();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const payload = { password, username, preset_avatar_id: avatar };

    const { error: upErr } = await (supabaseAdmin as any)
      .from('student_otps')
      .upsert(
        {
          email: String(email).toLowerCase(),
          code_hash: hash(code),
          expires_at,
          payload,
        },
        { onConflict: 'email' }
      );

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    await sendOtpEmail(email, code);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
