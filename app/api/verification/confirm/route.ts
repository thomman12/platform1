// app/api/verification/confirm/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// --- helpers (must match the ones used when creating the row) ---
function b64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8');
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function sha256Base64Url(s: string) {
  return b64url(crypto.createHash('sha256').update(s).digest());
}

function deriveUsernameFromEmail(email: string): string {
  const base = (email.split('@')[0] || 'user')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .slice(0, 20);
  return base || `user${Math.floor(10000 + Math.random() * 90000)}`;
}
function withRandomSuffix(name: string): string {
  const suffix = Math.floor(1000 + Math.random() * 9000);
  const trimmed = name.slice(0, Math.max(0, 24 - String(suffix).length - 1));
  return `${trimmed}_${suffix}`;
}

export async function POST(req: Request) {
  try {
    const { vt, code } = await req.json().catch(() => ({}));

    if (!vt || typeof vt !== 'string') {
      return NextResponse.json({ message: 'Missing verification token id (vt).' }, { status: 400 });
    }
    const cleanCode = String(code || '').replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      return NextResponse.json({ message: 'Invalid 6-digit code.' }, { status: 400 });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // SERVICE ROLE
      { auth: { persistSession: false } }
    );

    // 1) Load verification row
    const { data: row, error } = await admin
      .from('verifications')
      .select('id, email, user_id, code_hash, expires_at, used')
      .eq('id', vt)
      .single();

    if (error || !row) {
      return NextResponse.json({ message: 'Verification not found.' }, { status: 400 });
    }
    if (row.used) {
      return NextResponse.json({ message: 'This code was already used.' }, { status: 400 });
    }
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ message: 'This code has expired.' }, { status: 400 });
    }

    // 2) Check code
    const providedHash = sha256Base64Url(cleanCode);
    if (providedHash !== row.code_hash) {
      return NextResponse.json({ message: 'Incorrect code.' }, { status: 400 });
    }

    // 3) Ensure we have a user_id; if missing, resolve via auth.users (service role)
    let userId: string | null = row.user_id;
    if (!userId) {
      const { data: userRow, error: uErr } = await (admin as any)
        .schema('auth')
        .from('users')
        .select('id,email,raw_user_meta_data')
        .eq('email', row.email)
        .maybeSingle();

      if (uErr) {
        console.error('[verification/confirm] auth.users lookup error:', uErr);
      }
      if (!userRow?.id) {
        return NextResponse.json({ message: 'User not found for this email.' }, { status: 400 });
      }
      userId = userRow.id as string;
    }

    // 4) Fetch existing profile (if any) and user metadata to populate required fields
    const [{ data: profile }, { data: authUser }] = await Promise.all([
      admin.from('profiles').select('id, username, avatar_id').eq('id', userId).maybeSingle(),
      (admin as any).schema('auth').from('users').select('id,email,raw_user_meta_data').eq('id', userId).maybeSingle(),
    ]);

    const meta = (authUser?.raw_user_meta_data ?? {}) as Record<string, any>;
    const metaUsername = (meta.username ?? '').toString().trim();
    const metaAvatar = (meta.preset_avatar_id ?? meta.avatar_id ?? null) as string | null;

    // Decide final username:
    // - keep existing profile.username if present
    // - else use metadata username if present
    // - else derive from email
    let finalUsername =
      (profile?.username && String(profile.username)) ||
      (metaUsername || deriveUsernameFromEmail(row.email));

    const finalAvatarId = profile?.avatar_id ?? (metaAvatar || null);

    // 5) Mark verification as used
    const { error: updErr } = await admin
      .from('verifications')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('id', vt);

    if (updErr) {
      console.error('[verification/confirm] update used failed:', updErr);
      return NextResponse.json({ message: 'Could not finalize verification.' }, { status: 500 });
    }

    // 6) Upsert profile with NOT NULL username and activated_at
    // try once; on unique violation for username, retry with random suffix
    const doUpsert = async (uname: string) => {
      return await admin
        .from('profiles')
        .upsert(
          {
            id: userId!,
            username: uname,
            avatar_id: finalAvatarId,
            activated_at: new Date().toISOString(),
          } as any,
          { onConflict: 'id' }
        );
    };

    let upsertRes = await doUpsert(finalUsername);
    if (upsertRes.error && String(upsertRes.error.code) === '23505') {
      // likely unique violation on username, retry once
      finalUsername = withRandomSuffix(finalUsername);
      upsertRes = await doUpsert(finalUsername);
    }
    if (upsertRes.error) {
      console.error('[verification/confirm] upsert profile failed:', upsertRes.error);
      return NextResponse.json({ message: 'Could not activate profile.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, username: finalUsername });
  } catch (e: any) {
    console.error('/api/verification/confirm error', e);
    return NextResponse.json({ message: e?.message || 'failed' }, { status: 500 });
  }
}
