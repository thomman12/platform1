

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


import { NextResponse } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';



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
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Build a transporter for Brevo SMTP and validate config up-front
async function getTransporter() {
  const host = process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com';
  const port = Number(process.env.BREVO_SMTP_PORT || 587);
  const user = process.env.BREVO_SMTP_USER; // usually your Brevo login (email) or a key
  const pass = process.env.BREVO_SMTP_PASS; // an SMTP key generated in Brevo

  if (!user || !pass) {
    throw new Error('Brevo SMTP credentials missing: set BREVO_SMTP_USER and BREVO_SMTP_PASS.');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = SSL, 587 = STARTTLS
    auth: { user, pass },
  });

  // Verify connection/credentials clearly
  await transporter.verify();
  return transporter;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const email = String(body?.email || '').trim();
    const user_id = body?.user_id || null;

    if (!email) {
      return NextResponse.json({ message: 'email required' }, { status: 400 });
    }

    // create token + code
    const rawToken = randToken(32);
    const tokenHash = sha256Base64Url(rawToken);
    const code = sixDigit();
    const codeHash = sha256Base64Url(code);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // supabase admin
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // SERVICE ROLE KEY
      { auth: { persistSession: false } }
    );

    // store verification row
    const { data: row, error: insErr } = await admin
      .from('verifications')
      .insert({
        email,
        user_id,
        token_hash: tokenHash,
        code_hash: codeHash,
        expires_at: expiresAt.toISOString(),
      })
      .select('id')
      .single();

    if (insErr) {
      console.error('[verification/create] insert error:', insErr);
      return NextResponse.json({ message: 'DB insert failed', detail: insErr.message }, { status: 500 });
    }

    const vt = row!.id;
    const base =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      'http://localhost:3000';
    const verifiedUrl = `${base}/verified?vt=${encodeURIComponent(vt)}`;

    // email content
    const from = process.env.EMAIL_FROM || 'Orbio <noreply@example.com>';
    const subject = 'Verify your account';
    const html = `
      <p>Click the link to finish verification:</p>
      <p><a href="${verifiedUrl}">${verifiedUrl}</a></p>
      <p>Then enter this 6-digit code on the page: <b style="font-size:18px;letter-spacing:2px">${code}</b></p>
      <p>This code expires in 24 hours.</p>
    `;

    // send via Brevo; in dev also return link+code so you can move forward
    let sent = false;
    let sendError: unknown = null;
    try {
      const transporter = await getTransporter();
      const info = await transporter.sendMail({
        from,
        to: email,
        subject,
        html,
      });
      sent = true;
      console.log('[verification/create] email accepted by SMTP:', info?.messageId || info);
    } catch (e) {
      sendError = e;
      console.error('[verification/create] SMTP send failed:', e);
    }

    // If SMTP failed, don’t silently succeed. In dev, return the data to unblock you.
    if (!sent) {
      if (process.env.NODE_ENV !== 'production') {
        return NextResponse.json({
          ok: false,
          note: 'SMTP send failed, but returning link/code for local testing.',
          vt,
          verifiedUrl,
          code,
          error: String((sendError as any)?.message || sendError),
        }, { status: 200 });
      }
      return NextResponse.json({ message: 'Email send failed' }, { status: 502 });
    }

    // success
    return NextResponse.json({
      ok: true,
      // In dev, also echo for convenience
      ...(process.env.NODE_ENV !== 'production' ? { vt, verifiedUrl, code } : {}),
    });
  } catch (e: any) {
    console.error('/api/verification/create error', e);
    return NextResponse.json({ message: e?.message || 'failed' }, { status: 500 });
  }
}
