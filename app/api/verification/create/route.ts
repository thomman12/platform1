// app/api/verification/create/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const REQUIRED = (val: string | undefined, name: string) => {
  if (!val) throw new Error(`Missing required env: ${name}`);
  return val;
};

function b64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8');
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function sha256Base64Url(s: string) {
  return b64url(crypto.createHash('sha256').update(s).digest());
}
function randToken(len = 32) {
  return b64url(crypto.randomBytes(len));
}
function sixDigit() {
  // 100000–999999 (always 6 digits)
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function getTransporter() {
  const host = process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com';
  const port = Number(process.env.BREVO_SMTP_PORT || 587);
  const user = process.env.BREVO_SMTP_USER || process.env.SMTP_USER;
  const pass = process.env.BREVO_SMTP_PASS || process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error('Brevo SMTP credentials missing: set BREVO_SMTP_USER and BREVO_SMTP_PASS.');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = SSL, 587 = STARTTLS
    auth: { user, pass },
  });

  await transporter.verify(); // throws on bad creds or unverified sender/domain issues
  return transporter;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const email = String(body?.email || '').trim();
    const user_id = body?.user_id ?? null;

    if (!email) {
      return NextResponse.json({ message: 'email required' }, { status: 400 });
    }

    // supabase admin (server vars)
    const admin = createClient(
      REQUIRED(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL'),
      REQUIRED(process.env.SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false } }
    );

    // create token + code
    const rawToken = randToken(32);
    const tokenHash = sha256Base64Url(rawToken);
    const code = sixDigit();
    const codeHash = sha256Base64Url(code);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // store verification row
    const { data: row, error: insErr } = await admin
      .from('verifications')
      .insert({ email, user_id, token_hash: tokenHash, code_hash: codeHash, expires_at: expiresAt })
      .select('id')
      .single();

    if (insErr) {
      console.error('[verification/create] insert error:', insErr);
      return NextResponse.json({ message: 'DB insert failed', detail: insErr.message }, { status: 500 });
    }

    const vt = row!.id;
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const verifiedUrl = `${base}/verified?vt=${encodeURIComponent(vt)}`;

    // email content
    const from = REQUIRED(process.env.EMAIL_FROM, 'EMAIL_FROM'); // must be a verified Brevo sender/domain
    const subject = 'Verify your account';
    const html = `
      <p>Click the link to finish verification:</p>
      <p><a href="${verifiedUrl}">${verifiedUrl}</a></p>
      <p>Then enter this 6-digit code on the page: <b style="font-size:18px;letter-spacing:2px">${code}</b></p>
      <p>This code expires in 24 hours.</p>
    `;
    const text =
      `Finish verification: ${verifiedUrl}\n` +
      `6-digit code: ${code}\n` +
      `This code expires in 24 hours.\n`;

    // send via Brevo
    let sent = false;
    let sendError: unknown = null;
    try {
      const transporter = await getTransporter();
      const info = await transporter.sendMail({ from, to: email, subject, html, text });
      sent = true;
      console.log('[verification/create] email accepted by SMTP:', info?.messageId || info);
    } catch (e) {
      sendError = e;
      console.error('[verification/create] SMTP send failed:', e);
    }

    if (!sent) {
      // flip this to true temporarily if you want the raw SMTP error in the client
      const allowDebug = process.env.ALLOW_EMAIL_DEBUG === '1';
      return NextResponse.json(
        { message: 'Email send failed', ...(allowDebug ? { detail: String((sendError as any)?.message || sendError) } : {}) },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('/api/verification/create error', e);
    return NextResponse.json({ message: e?.message || 'failed' }, { status: 500 });
  }
}
