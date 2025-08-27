'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

/** ===== Local Types ===== */
type Visibility = 'public' | 'restricted' | 'private';

type Community = {
  id: string;
  name: string;
  description: string | null;
  visibility: Visibility;
  creator_id: string;
  banner_path?: string | null;
  banner_alt?: string | null;
  banner_updated_at?: string | null;
};

type TabKey = 'general' | 'branding' | 'posting' | 'privacy' | 'roles' | 'danger';

export default function CommunitySettingsPage() {
  const supabase = createClientComponentClient<Database>();
  const params = useParams();
  const communityId = (params.id as string) ?? '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  const [tab, setTab] = useState<TabKey>('general');

  /** ===== General tab state ===== */
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  /** ===== Branding tab state ===== */
  const [bannerAlt, setBannerAlt] = useState('');
  const [bannerUrl, setBannerUrl] = useState<string | null>(null); // public preview (with cache-bust)
  const [bannerUploading, setBannerUploading] = useState(false);

  const BUCKET = 'community-banners';

  useEffect(() => {
    (async () => {
      // who am I
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id ?? null;
      setUserId(uid);

      // load community (+ banner cols)
      const { data: comm } = await supabase
        .from('communities')
        .select('id, name, description, visibility, creator_id, banner_path, banner_alt, banner_updated_at')
        .eq('id', communityId)
        .maybeSingle();

      if (!comm) {
        setCommunity(null);
        setLoading(false);
        return;
      }

      const c = comm as unknown as Community;
      setCommunity(c);
      setIsOwner(!!uid && c.creator_id === uid);

      // Prime General
      setName(c.name);
      setDescription(c.description ?? '');
      setVisibility(c.visibility);

      // Prime Branding
      setBannerAlt(c.banner_alt ?? '');
      if (c.banner_path) {
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(c.banner_path);
        const bust = c.banner_updated_at ? `?v=${encodeURIComponent(c.banner_updated_at)}` : '';
        setBannerUrl(data.publicUrl ? data.publicUrl + bust : null);
      } else {
        setBannerUrl(null);
      }

      setLoading(false);
    })();
  }, [communityId, supabase]);

  /** ===== Tabs ===== */
  const tabs: { key: TabKey; label: string }[] = useMemo(
    () => [
      { key: 'general', label: 'General' },
      { key: 'branding', label: 'Branding' },
      { key: 'posting', label: 'Posting & Safety' },
      { key: 'privacy', label: 'Privacy & Indexing' },
      { key: 'roles', label: 'Roles' },
      { key: 'danger', label: 'Danger Zone' },
    ],
    []
  );

  const generalDirty =
    !!community &&
    (name !== community.name ||
      (description ?? '') !== (community.description ?? '') ||
      visibility !== community.visibility);

  /** ===== General: save ===== */
  const saveGeneral = async () => {
    if (!community || !isOwner || !userId) return;
    if (!name.trim()) {
      setMessage('Name cannot be empty.');
      return;
    }

    if (visibility !== community.visibility) {
      const text =
        visibility === 'public'
          ? 'Make this community PUBLIC? Posts may be visible to everyone.'
          : visibility === 'restricted'
          ? 'Make this community RESTRICTED? Posts visible to members; join requests require approval.'
          : 'Make this community PRIVATE? Only approved members can see posts and the community will not be indexed.';
      if (!window.confirm(text)) return;
    }

    setSaving(true);
    setMessage(null);

    const { data: updated, error: upErr } = await supabase
      .from('communities')
      .update({
        name: name.trim(),
        description: description.trim() || null,
        visibility,
      } as any)
      .eq('id', community.id)
      .select('id, name, description, visibility, creator_id, banner_path, banner_alt, banner_updated_at')
      .single();

    if (upErr || !updated) {
      setSaving(false);
      setMessage(upErr?.message || 'Failed to save. Check permissions.');
      return;
    }

    // audit (best-effort)
    const changed: string[] = [];
    if (name !== community.name) changed.push(`name: "${community.name}" → "${name.trim()}"`);
    if ((description ?? '') !== (community.description ?? '')) changed.push('description updated');
    if (visibility !== community.visibility) changed.push(`visibility: ${community.visibility} → ${visibility}`);

    const act = 'community.update_general';
    const why = reason.trim() || (changed.length ? changed.join('; ') : 'updated general settings');

    await supabase.from('community_mod_logs').insert([
      { community_id: community.id, actor_profile_id: userId, action: act, target_profile_id: null, reason: why } as any,
    ]);

    setCommunity(updated as Community);
    setReason('');
    setSaving(false);
    setMessage('Saved ✔️');
  };

  /** ===== Branding helpers (MIME/extension + resize + cache-bust) ===== */
  function pickOutputMime(input: string) {
    if (input.includes('png')) return 'image/png';
    if (input.includes('webp')) return 'image/webp';
    return 'image/jpeg';
  }

  async function fileToResizedBlob(file: File, maxW = 1600): Promise<{ blob: Blob; mime: string }> {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = URL.createObjectURL(file);
    });

    const scale = Math.min(1, maxW / img.width);
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, w, h);

    const mime = pickOutputMime(file.type);
    const quality = mime === 'image/jpeg' ? 0.85 : 0.92;

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b as Blob), mime, quality);
    });

    return { blob, mime };
  }

  const extFromMime = (mime: string) =>
    mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';

  /** ===== Branding: upload/replace banner (owner-only) ===== */
  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!community || !isOwner) return;
    const file = e.target.files?.[0];
    if (!file) return;

    // validation
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
      alert('Please choose a PNG, JPG, or WEBP image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Please choose an image under 10MB.');
      return;
    }

    setBannerUploading(true);
    const prevPath = community.banner_path || null;

    try {
      // resize & choose output mime
      const { blob, mime } = await fileToResizedBlob(file, 1600);
      const ext = extFromMime(mime);
      const newPath = `${community.id}/banner_${Date.now()}.${ext}`;

      // 1) upload to NEW key (atomic path swap pattern)
      const { error: upErr } = await supabase
        .storage
        .from(BUCKET)
        .upload(newPath, blob, { upsert: false, contentType: mime });
      if (upErr) throw upErr;

      // 2) point community record to new path
      const nowIso = new Date().toISOString();
      const { data: updated, error: dbErr } = await supabase
        .from('communities')
        .update({
          banner_path: newPath,
          banner_alt: bannerAlt?.trim() || null,
          banner_updated_at: nowIso,
        } as any)
        .eq('id', community.id)
        .select('id, name, description, visibility, creator_id, banner_path, banner_alt, banner_updated_at')
        .single();

      // If DB update fails, roll back the new upload to avoid orphans
      if (dbErr || !updated) {
        await supabase.storage.from(BUCKET).remove([newPath]).catch(() => {});
        throw dbErr || new Error('Failed to save banner');
      }

      setCommunity(updated as Community);

      // 3) best-effort delete previous file
      if (prevPath && prevPath !== newPath) {
        await supabase.storage.from(BUCKET).remove([prevPath]).catch(() => {});
      }

      // audit (best-effort)
      await supabase.from('community_mod_logs').insert([
        {
          community_id: community.id,
          actor_profile_id: userId,
          action: 'community.update_banner',
          target_profile_id: null,
          reason: bannerAlt?.trim() ? `alt: "${bannerAlt.trim()}"` : 'updated banner',
        } as any,
      ]);

      // 4) refresh public URL with cache-bust
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(updated.banner_path!);
      const bust = updated.banner_updated_at ? `?v=${encodeURIComponent(updated.banner_updated_at)}` : `?v=${Date.now()}`;
      setBannerUrl(data.publicUrl ? data.publicUrl + bust : null);
    } catch (err: any) {
      alert('Upload failed: ' + (err?.message || err));
    } finally {
      setBannerUploading(false);
      // allow re-selecting same file to re-trigger onChange
      if (e.target) e.target.value = '';
    }
  };

  /** ===== Branding: remove banner ===== */
  const removeBanner = async () => {
    if (!community || !isOwner) return;
    if (!community.banner_path) {
      setBannerAlt('');
      setBannerUrl(null);
      return;
    }
    const ok = window.confirm('Remove the current banner?');
    if (!ok) return;

    // delete file (best-effort)
    await supabase.storage.from(BUCKET).remove([community.banner_path]).catch(() => {});

    // clear DB fields
    const { data: updated, error } = await supabase
      .from('communities')
      .update({ banner_path: null, banner_alt: null, banner_updated_at: null } as any)
      .eq('id', community.id)
      .select('id, name, description, visibility, creator_id, banner_path, banner_alt, banner_updated_at')
      .single();

    if (error || !updated) {
      alert(error?.message || 'Failed to remove banner.');
      return;
    }

    // audit
    await supabase.from('community_mod_logs').insert([
      { community_id: community.id, actor_profile_id: userId, action: 'community.remove_banner', target_profile_id: null, reason: 'removed banner' } as any,
    ]);

    setCommunity(updated as Community);
    setBannerAlt('');
    setBannerUrl(null);
  };

  /** ===== UI ===== */
  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 bg-gray-200 rounded" />
          <div className="h-10 w-full bg-gray-200 rounded" />
          <div className="h-64 w-full bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-red-600 font-medium">Community not found.</p>
        <Link href="/home" className="text-blue-600 hover:underline mt-2 inline-block">
          ← Back to Home
        </Link>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Owner only</h1>
          <p className="text-gray-600 mt-1">Community settings can only be changed by the owner.</p>
          <div className="mt-4 flex gap-3">
            <Link href={`/community/${community.id}/admin`} className="px-4 py-2 rounded bg-gray-900 text-white hover:bg-black/85">
              🛡️ Go to Admin Controls
            </Link>
            <Link href={`/community/${community.id}`} className="px-4 py-2 rounded border hover:bg-gray-50">
              ← Back to Community
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Community Settings</h1>
          <p className="text-gray-600">
            {community.name} · <span className="uppercase text-xs tracking-wide text-gray-500">{community.visibility}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/community/${community.id}`} className="px-3 py-2 rounded border hover:bg-gray-50">← Back</Link>
          <Link href={`/community/${community.id}/admin`} className="px-3 py-2 rounded bg-gray-900 text-white hover:bg-black/85">🛡️ Admin Controls</Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4 flex gap-4 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-2 pb-2 text-sm font-medium ${
              tab === t.key ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Panels */}
      <div className="space-y-6">
        {/* GENERAL */}
        {tab === 'general' && (
          <Section title="General">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm text-gray-600 mb-1">Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Community name" className="border rounded px-3 py-2 w-full" maxLength={80} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm text-gray-600 mb-1">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell members what this community is about…" className="border rounded px-3 py-2 w-full min-h-[100px]" maxLength={300} />
                <div className="text-xs text-gray-500 text-right">{description.length}/300</div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm text-gray-600 mb-1">Visibility</label>
                <select className="border rounded px-3 py-2 w-full" value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)}>
                  <option value="public">Public</option>
                  <option value="restricted">Restricted</option>
                  <option value="private">Private</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  Visibility affects who can see posts and whether the community appears in public feeds/indexing.
                </p>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm text-gray-600 mb-1">Reason (optional)</label>
                <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why are you changing this? (kept in audit log)" className="border rounded px-3 py-2 w-full" maxLength={140} />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button onClick={saveGeneral} disabled={!generalDirty || saving} className={`px-4 py-2 rounded text-white ${!generalDirty || saving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              {message && <span className="text-sm text-gray-600">{message}</span>}
            </div>
          </Section>
        )}

        {/* BRANDING */}
        {tab === 'branding' && (
          <Section title="Branding">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <div className="text-sm font-medium mb-2">Current Banner</div>
                <div className="rounded border bg-gray-50 p-3">
                  <div className="relative w-full h-40 sm:h-56 md:h-64 overflow-hidden rounded">
                    {bannerUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={bannerUrl} alt={bannerAlt || 'Community banner'} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-gray-500 text-sm">No banner set</div>
                    )}
                  </div>
                  <div className="mt-3 flex flex-col sm:flex-row gap-3">
                    <label className="inline-flex items-center justify-center cursor-pointer px-3 py-2 rounded bg-gray-900 text-white hover:bg-black/85">
                      {bannerUploading ? 'Uploading…' : 'Upload / Replace'}
                      <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleBannerChange} disabled={bannerUploading} />
                    </label>
                    <button onClick={removeBanner} className="px-3 py-2 rounded border hover:bg-gray-50" disabled={!community?.banner_path || bannerUploading}>
                      Remove Banner
                    </button>
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm text-gray-600 mb-1">Alt text (accessibility)</label>
                <input
                  value={bannerAlt}
                  onChange={(e) => setBannerAlt(e.target.value)}
                  className="border rounded px-3 py-2 w-full"
                  placeholder="Describe the banner image"
                  maxLength={140}
                />
                <p className="text-xs text-gray-500 mt-1">Saved when you upload/replace the banner.</p>
              </div>
            </div>
          </Section>
        )}

        {tab === 'posting' && (
          <Section title="Posting & Safety">
            <p className="text-gray-600">Premod & rate limits coming later.</p>
          </Section>
        )}

        {tab === 'privacy' && (
          <Section title="Privacy & Indexing">
            <p className="text-gray-600">Indexing control to follow. Private stays non-indexable.</p>
          </Section>
        )}

        {tab === 'roles' && (
          <Section title="Roles">
            <p className="text-gray-600">Role management and ownership transfer coming later.</p>
          </Section>
        )}

        {tab === 'danger' && (
          <Section title="Danger Zone">
            <p className="text-gray-600">Archive/delete with safeguards will be added later.</p>
          </Section>
        )}
      </div>
    </div>
  );
}

/** ===== UI helpers ===== */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
