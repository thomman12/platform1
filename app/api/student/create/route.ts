// app/api/student/create/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // service role
);

function mkCode() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}
function hash(code: string) {
  const pepper = process.env.OTP_PEPPER || '';
  return crypto.createHash('sha256').update(code + pepper).digest('hex');
}

async function sendEmail(to: string, code: string) {
  // Use Brevo if you have the key; otherwise just log the code in dev
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
      htmlContent: `
        <p>Use this code to verify your student email:</p>
        <p style="font-size:24px;font-weight:700;letter-spacing:4px">${code}</p>
        <p>This code expires in 10 minutes.</p>
      `,
    }),
  });
}

export async function POST(req: Request) {
  try {
    const { email, password, username, preset_avatar_id } = await req.json();

    if (!email || !password || !username) {
      return NextResponse.json({ error: 'Missing fields.' }, { status: 400 });
    }

    // 1) create auth user WITHOUT sending a link
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { username, preset_avatar_id, flow: 'student' },
    });
    if (error || !data?.user) {
      return NextResponse.json(
        { error: error?.message || 'Create user failed.' },
        { status: 400 }
      );
    }
    const user = data.user;

    // 2) ensure a profiles row exists (optional)
    await supabaseAdmin.from('profiles').upsert(
      { id: user.id, username, avatar_id: preset_avatar_id ?? null },
      { onConflict: 'id' }
    );

    // 3) generate and store OTP (10 min)
    const code = mkCode();
    const code_hash = hash(code);
    const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await supabaseAdmin.from('email_otps').upsert({
      user_id: user.id,
      email,
      code_hash,
      sent_at: new Date().toISOString(),
      expires_at,
      consumed_at: null,
      tries: 0,
    });

    // 4) send the email
    await sendEmail(email, code);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error.' }, { status: 500 });
  }
}
