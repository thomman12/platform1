// app/api/student/resend/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function mkCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
function hash(code: string) {
  const pepper = process.env.OTP_PEPPER || '';
  return crypto.createHash('sha256').update(code + pepper).digest('hex');
}

async function sendEmail(to: string, code: string) {
  if (!process.env.BREVO_API_KEY) {
    console.log('DEV OTP for', to, code);
    return;
  }
  await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: [{ email: to }],
      sender: {
        email: process.env.MAIL_FROM || 'no-reply@orbi.org.uk',
        name: process.env.MAIL_FROM_NAME || 'Orbio',
      },
      subject: 'Your Orbio verification code',
      htmlContent: `<p>Your new code:</p><p style="font-size:24px;font-weight:700;letter-spacing:4px">${code}</p>`,
    }),
  });
}

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: 'Missing email.' }, { status: 400 });

  const { data: row } = await supabaseAdmin
    .from('email_otps')
    .select('user_id, sent_at')
    .eq('email', email)
    .maybeSingle();

  if (!row?.user_id) {
    return NextResponse.json({ error: 'User not found for that email.' }, { status: 404 });
  }

  // 3-minute cooldown
  const last = row.sent_at ? new Date(row.sent_at).getTime() : 0;
  const wait = 3 * 60 * 1000 - (Date.now() - last);
  if (wait > 0) {
    return NextResponse.json({ error: 'Too soon', retryInMs: wait }, { status: 429 });
  }

  const code = mkCode();
  const code_hash = hash(code);
  const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await supabaseAdmin
    .from('email_otps')
    .upsert({
      user_id: row.user_id,
      email,
      code_hash,
      sent_at: new Date().toISOString(),
      expires_at,
      consumed_at: null,
      tries: 0,
    });

  await sendEmail(email, code);

  return NextResponse.json({ ok: true });
}
