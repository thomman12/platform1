import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendStudentOtpEmail } from '@/lib/mailer';
import crypto from 'node:crypto';

export const runtime = 'nodejs';

const sixDigit = () => String(Math.floor(100000 + Math.random() * 900000));
const hash = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 });

    const code = sixDigit();
    const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: upErr } = await (supabaseAdmin as any)
      .from('student_otps')
      .upsert(
        {
          email: String(email).toLowerCase(),
          code_hash: hash(code),
          expires_at,
        },
        { onConflict: 'email' }
      );

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    await sendStudentOtpEmail(email, code);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
