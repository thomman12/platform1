export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ['image/jpeg','image/png','application/pdf'];

function baseDomainFromEmail(email: string) {
  const m = email.toLowerCase().match(/@([^@]+)$/);
  if (!m) return '';
  const domain = m[1];
  if (domain.endsWith('.ac.uk')) {
    const parts = domain.split('.');
    const i = parts.length - 3; // [..., bath, ac, uk] -> bath.ac.uk
    if (i >= 0) return `${parts[i]}.ac.uk`;
  }
  return domain;
}

function extFrom(name: string, type: string) {
  const byType: Record<string,string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'application/pdf': 'pdf',
  };
  const typed = byType[type];
  if (typed) return typed;
  const fromName = (name.split('.').pop() || '').toLowerCase();
  return ['jpg','jpeg','png','pdf'].includes(fromName) ? fromName : 'bin';
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const email = String(form.get('email') ?? '').trim().toLowerCase();
    const file  = form.get('file') as File | null;

    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });
    if (!file)  return NextResponse.json({ error: 'file required' }, { status: 400 });
    if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: 'Allowed: jpg, png, pdf' }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });

    const base = baseDomainFromEmail(email);
    if (!base) return NextResponse.json({ error: 'invalid email' }, { status: 400 });

    const token = crypto.randomUUID().replace(/-/g, '');
    const ext   = extFrom(file.name, file.type);
    const path  = `staged/${crypto.randomUUID()}.${ext}`;

    const buf = Buffer.from(await file.arrayBuffer());
    const up = await supabaseAdmin
      .storage.from('student-id-staging')
      .upload(path, buf, { contentType: file.type, upsert: false });
    if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 });

    const ins = await supabaseAdmin
      .from('verification_staging')
      .insert({ staging_token: token, email, base_domain: base, storage_path: path })
      .select('staging_token')
      .single();
    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });

    return NextResponse.json({ staging_token: token });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'stage failed' }, { status: 500 });
  }
}
