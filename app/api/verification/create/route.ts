// app/api/verification/create/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const REQUIRED = (v: string | undefined, name: string) => {
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
};

const b64url = (input: Buffer | string) =>
  (Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8'))
    .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const sha256Base64Url = (s: string) => b64url(crypto.createHash('sha256').update(s).digest());
const randToken = (len = 32) => b64url(crypto.randomBytes(len));
const sixDigit = () => String(Math.floor(100000 + Math.random() * 900000));

const domainMatches = (emailDomain: string, baseDomain: string) => {
  const e = emailDomain.toLowerCase();
  const b = baseDomain.toLowerCase();
  return e === b || e.endsWith(`.${b}`);
};

const looksLikeUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

async function getTransporter() {
  const host = process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com';
  const port = Number(process.env.BREVO_SMTP_PORT || 587);
  const user = process.env.BREVO_SMTP_USER || process.env.SMTP_USER;
  const pass = process.env.BREVO_SMTP_PASS || process.env.SMTP_PASS;
  if (!user || !pass) throw new Error('Brevo SMTP credentials missing: set BREVO_SMTP_USER and BREVO_SMTP_PASS.');
  const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  await transporter.verify();
  return transporter;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const email = String(body?.email || '').trim().toLowerCase();
    const rawSelected = typeof body?.selectedInstitutionId === 'string'
      ? body.selectedInstitutionId.trim()
      : '';
    const user_id = body?.user_id ?? null;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ message: 'Valid email required' }, { status: 400 });
    }
    const emailDomain = email.split('@').pop()!.toLowerCase();

    // Admin client (server-side URL + service role)
    const admin = createClient(
      REQUIRED(process.env.SUPABASE_URL, 'SUPABASE_URL'),
      REQUIRED(process.env.SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false } }
    );

    // If student flow, resolve the provided value (uuid or slug) to the actual UUID
    let institutionIdUUID: string | null = null;

    if (rawSelected) {
      if (looksLikeUuid(rawSelected)) {
        // Verify this UUID exists (and optionally read slug if needed)
        const { data: instById, error: instByIdErr } = await admin
          .from('institutions')
          .select('id')
          .eq('id', rawSelected)
          .maybeSingle();

        if (instByIdErr) {
          console.error('[verification/create] institutions id lookup error:', instByIdErr);
          return NextResponse.json({ message: 'University lookup failed' }, { status: 500 });
        }
        if (!instById) {
          return NextResponse.json({ message: 'Selected university not found' }, { status: 400 });
        }
        institutionIdUUID = instById.id;
      } else {
        // Treat as slug (or any stable string key); resolve to UUID id
        const { data: instBySlug, error: instBySlugErr } = await admin
          .from('institutions')
          .select('id, slug')
          .eq('slug', rawSelected)
          .maybeSingle();

        if (instBySlugErr) {
          console.error('[verification/create] institutions slug lookup error:', instBySlugErr);
          return NextResponse.json({ message: 'University lookup failed' }, { status: 500 });
        }
        if (!instBySlug) {
          return NextResponse.json({ message: 'Selected university not found' }, { status: 400 });
        }
        institutionIdUUID = instBySlug.id;
      }

      // Enforce domain ↔ university with suffix matching
      const { data: domRows, error: domErr } = await admin
        .from('institution_domains')
        .select('base_domain')
        .eq('institution_id', institutionIdUUID);

      if (domErr) {
        console.error('[verification/create] domain lookup failed:', domErr);
        return NextResponse.json({ message: 'Domain lookup failed' }, { status: 500 });
      }

      const ok = (domRows ?? []).some(({ base_domain }) =>
        domainMatches(emailDomain, base_domain)
      );

      if (!ok) {
        return NextResponse.json(
          { message: 'Email domain does not match the selected university.' },
          { status: 400 }
        );
      }
    }

    // Create link token + 6-digit code
    const rawToken = randToken(32);
    const tokenHash = sha256Base64Url(rawToken);
    const code = sixDigit();
    const codeHash = sha256Base64Url(code);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

    // Store verification row (include institution_id UUID if we have it)
    const { data: row, error: insErr } = await admin
      .from('verifications')
      .insert({
        email,
        user_id,
        token_hash: tokenHash,
        code_hash: codeHash,
        expires_at: expiresAt,
        institution_id: institutionIdUUID, // 👈 now always UUID or null
      })
      .select('id')
      .single();

    if (insErr) {
      console.error('[verification/create] insert error:', insErr);
      return NextResponse.json({ message: 'DB insert failed' }, { status: 500 });
    }

    const vt = row!.id;
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const verifiedUrl = `${base}/verified?vt=${encodeURIComponent(vt)}`;

    // Send email (link + 6-digit code)
    const from = REQUIRED(process.env.EMAIL_FROM, 'EMAIL_FROM');
    const subject = 'Verify your email';
    const html = `
      <p>Click the link to finish verification:</p>
      <p><a href="${verifiedUrl}">${verifiedUrl}</a></p>
      <p>Then enter this 6-digit code on the page:
        <b style="font-size:18px;letter-spacing:2px">${code}</b>
      </p>
      <p>This link and code expire in 24 hours.</p>
    `;
    const text =
      `Finish verification:\n${verifiedUrl}\n\n` +
      `6-digit code: ${code}\n` +
      `This link and code expire in 24 hours.\n`;

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
