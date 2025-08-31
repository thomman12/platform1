'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

  /** Toggles */
  require_mod_review?: boolean | null;
  is_hidden?: boolean | null;   // Privacy tab (hide from explore/search)
  is_archived?: boolean | null; // Danger Zone (read-only mode)
};

type MemberRow = {
  profile_id: string;
  username: string | null;
  avatar_id: string | null;
  role: 'owner' | 'moderator' | 'member';
  status: 'approved' | 'pending' | 'banned';
  created_at: string | null;         // your table column
  status_changed_at: string | null;  // your table column
};

type TabKey = 'general' | 'branding' | 'posting' | 'privacy' | 'roles' | 'danger';

export default function CommunitySettingsPage() {
  const supabase = createClientComponentClient<Database>();
  const params = useParams();
  const router = useRouter();
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

  /** ===== Posting (single toggle) ===== */
  const [requireMod, setRequireMod] = useState(false);

  /** ===== Privacy (single toggle) ===== */
  const [hidden, setHidden] = useState(false);

  /** ===== Roles tab state ===== */
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [rolesBusy, setRolesBusy] = useState(false);
  const [rolesMsg, setRolesMsg] = useState<string | null>(null);
  const [memberFilter, setMemberFilter] = useState<'approved' | 'pending' | 'banned'>('approved');
  const [memberSearch, setMemberSearch] = useState('');

  /** ===== Danger Zone state ===== */
  const [archived, setArchived] = useState(false);
  const [dzMsg, setDzMsg] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [ack, setAck] = useState(false);

  const BUCKET = 'community-banners';

  useEffect(() => {
    (async () => {
      // who am I
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id ?? null;
      setUserId(uid);

      // load community (+ banner + moderation flag + hidden + archived)
      const fetchFull = await supabase
        .from('communities')
        .select(
          `
          id, name, description, visibility, creator_id,
          banner_path, banner_alt, banner_updated_at,
          require_mod_review,
          is_hidden,
          is_archived
        `
        )
        .eq('id', communityId)
        .maybeSingle();

      let c: Community | null = null;

      if (fetchFull.error) {
        // Fallback if columns aren’t present yet
        const { data: commBasic } = await supabase
          .from('communities')
          .select('id, name, description, visibility, creator_id, banner_path, banner_alt, banner_updated_at')
          .eq('id', communityId)
          .maybeSingle();

        c = (commBasic as unknown as Community) ?? null;
      } else {
        c = (fetchFull.data as unknown as Community) ?? null;
      }

      if (!c) {
        setCommunity(null);
        setLoading(false);
        return;
      }

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

      // Prime Posting
      setRequireMod(Boolean(c.require_mod_review));

      // Prime Privacy
      setHidden(Boolean(c.is_hidden));

      // Prime Danger Zone
      setArchived(Boolean(c.is_archived));

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
          : 'Make this community PRIVATE? Only approved members can see posts.';
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
      .select(
        'id, name, description, visibility, creator_id, banner_path, banner_alt, banner_updated_at, require_mod_review, is_hidden, is_archived'
      )
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
      const { blob, mime } = await fileToResizedBlob(file, 1600);
      const ext = extFromMime(mime);
      const newPath = `${community.id}/banner_${Date.now()}.${ext}`;

      const { error: upErr } = await supabase
        .storage
        .from(BUCKET)
        .upload(newPath, blob, { upsert: false, contentType: mime });
      if (upErr) throw upErr;

      const nowIso = new Date().toISOString();
      const { data: updated, error: dbErr } = await supabase
        .from('communities')
        .update({
          banner_path: newPath,
          banner_alt: bannerAlt?.trim() || null,
          banner_updated_at: nowIso,
        } as any)
        .eq('id', community.id)
        .select('id, name, description, visibility, creator_id, banner_path, banner_alt, banner_updated_at, require_mod_review, is_hidden, is_archived')
        .single();

      if (dbErr || !updated) {
        await supabase.storage.from(BUCKET).remove([newPath]).catch(() => {});
        throw dbErr || new Error('Failed to save banner');
      }

      setCommunity(updated as Community);

      if (prevPath && prevPath !== newPath) {
        await supabase.storage.from(BUCKET).remove([prevPath]).catch(() => {});
      }

      await supabase.from('community_mod_logs').insert([
        {
          community_id: community.id,
          actor_profile_id: userId,
          action: 'community.update_banner',
          target_profile_id: null,
          reason: bannerAlt?.trim() ? `alt: "${bannerAlt.trim()}"` : 'updated banner',
        } as any,
      ]);

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(updated.banner_path!);
      const bust = updated.banner_updated_at ? `?v=${encodeURIComponent(updated.banner_updated_at)}` : `?v=${Date.now()}`;
      setBannerUrl(data.publicUrl ? data.publicUrl + bust : null);
    } catch (err: any) {
      alert('Upload failed: ' + (err?.message || err));
    } finally {
      setBannerUploading(false);
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

    await supabase.storage.from(BUCKET).remove([community.banner_path]).catch(() => {});

    const { data: updated, error } = await supabase
      .from('communities')
      .update({ banner_path: null, banner_alt: null, banner_updated_at: null } as any)
      .eq('id', community.id)
      .select('id, name, description, visibility, creator_id, banner_path, banner_alt, banner_updated_at, require_mod_review, is_hidden, is_archived')
      .single();

    if (error || !updated) {
      alert(error?.message || 'Failed to remove banner.');
      return;
    }

    await supabase.from('community_mod_logs').insert([
      { community_id: community.id, actor_profile_id: userId, action: 'community.remove_banner', target_profile_id: null, reason: 'removed banner' } as any,
    ]);

    setCommunity(updated as Community);
    setBannerAlt('');
    setBannerUrl(null);
  };

  /** ===== Posting (single toggle): save ===== */
  const postingDirty = useMemo(() => {
    if (!community) return false;
    return Boolean(requireMod) !== Boolean(community.require_mod_review);
  }, [community, requireMod]);

  const savePosting = async () => {
    if (!community || !isOwner || !userId) return;

    setSaving(true);
    setMessage(null);

    try {
      const { data: updated, error } = await supabase
        .from('communities')
        .update({ require_mod_review: requireMod } as any)
        .eq('id', community.id)
        .select(
          `
          id, name, description, visibility, creator_id,
          banner_path, banner_alt, banner_updated_at,
          require_mod_review,
          is_hidden,
          is_archived
        `
        )
        .single();

      if (error || !updated) throw error || new Error('Failed to save');

      await supabase.from('community_mod_logs').insert([
        {
          community_id: community.id,
          actor_profile_id: userId,
          action: 'community.update_require_mod_review',
          target_profile_id: null,
          reason: `require_mod_review: ${String(requireMod)}`,
        } as any,
      ]);

      setCommunity(updated as Community);
      setMessage('Saved ✔️');
    } catch (e: any) {
      const msg =
        e?.code === '42703'
          ? 'Missing column require_mod_review on communities. Add it first.'
          : e?.message || 'Failed to save.';
      setMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  /** ===== Privacy: dirty + save ===== */
  const privacyDirty = useMemo(() => {
    if (!community) return false;
    return Boolean(hidden) !== Boolean(community.is_hidden);
  }, [community, hidden]);

  const savePrivacy = async () => {
    if (!community || !isOwner || !userId) return;

    setSaving(true);
    setMessage(null);

    try {
      const { data: updated, error } = await supabase
        .from('communities')
        .update({ is_hidden: hidden } as any)
        .eq('id', community.id)
        .select(
          `
          id, name, description, visibility, creator_id,
          banner_path, banner_alt, banner_updated_at,
          require_mod_review,
          is_hidden,
          is_archived
        `
        )
        .single();

      if (error || !updated) throw error || new Error('Failed to save');

      await supabase.from('community_mod_logs').insert([
        {
          community_id: community.id,
          actor_profile_id: userId,
          action: 'community.update_hidden',
          target_profile_id: null,
          reason: `is_hidden: ${String(hidden)}`,
        } as any,
      ]);

      setCommunity(updated as Community);
      setMessage('Saved ✔️');
    } catch (e: any) {
      setMessage(e?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  /** ========================
   * Roles: load + actions
   * ====================== */
  const loadMembers = async () => {
    if (!community) return;
    setRolesBusy(true);
    setRolesMsg(null);
    try {
      const { data, error } = await supabase
        .from('community_members')
        .select(`
          profile_id, role, status, created_at, status_changed_at,
          profiles:profiles!profile_id (username, avatar_id)
        `)
        .eq('community_id', community.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const rows: MemberRow[] = (data ?? []).map((r: any) => ({
        profile_id: r.profile_id,
        role: r.role,
        status: r.status,
        created_at: r.created_at,
        status_changed_at: r.status_changed_at,
        username: Array.isArray(r.profiles) ? r.profiles[0]?.username ?? null : r.profiles?.username ?? null,
        avatar_id: Array.isArray(r.profiles) ? r.profiles[0]?.avatar_id ?? null : r.profiles?.avatar_id ?? null,
      }));

      setMembers(rows);
    } catch (e: any) {
      setRolesMsg(e?.message || 'Failed to load members.');
    } finally {
      setRolesBusy(false);
    }
  };

  useEffect(() => {
    if (tab === 'roles') loadMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, community?.id]);

  const actLog = async (action: string, target_profile_id: string, reasonText: string) => {
    if (!community || !userId) return;
    await supabase.from('community_mod_logs').insert([
      {
        community_id: community.id,
        actor_profile_id: userId,
        action,
        target_profile_id,
        reason: reasonText,
      } as any,
    ]);
  };

  const setStatus = async (profileId: string, status: 'approved' | 'pending' | 'banned') => {
    if (!community) return;
    setRolesBusy(true);
    try {
      const { error } = await supabase
        .from('community_members')
        .update({ status, status_changed_at: new Date().toISOString() })
        .eq('community_id', community.id)
        .eq('profile_id', profileId);

      if (error) throw error;

      await actLog('community.member_set_status', profileId, `status → ${status}`);
      await loadMembers();
      setRolesMsg('Saved ✔️');
    } catch (e: any) {
      setRolesMsg(e?.message || 'Failed.');
    } finally {
      setRolesBusy(false);
    }
  };

  const removeMember = async (profileId: string) => {
    if (!community) return;
    if (!window.confirm('Remove this member from the community?')) return;
    setRolesBusy(true);
    try {
      const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('community_id', community.id)
        .eq('profile_id', profileId);

      if (error) throw error;

      await actLog('community.member_removed', profileId, 'removed from community');
      await loadMembers();
      setRolesMsg('Removed ✔️');
    } catch (e: any) {
      setRolesMsg(e?.message || 'Failed.');
    } finally {
      setRolesBusy(false);
    }
  };

  const setRole = async (profileId: string, nextRole: 'member' | 'moderator' | 'owner') => {
    if (!community) return;
    if (nextRole === 'owner') return transferOwnership(profileId);

    setRolesBusy(true);
    try {
      const { error } = await supabase
        .from('community_members')
        .update({ role: nextRole })
        .eq('community_id', community.id)
        .eq('profile_id', profileId);

      if (error) throw error;

      await actLog('community.member_set_role', profileId, `role → ${nextRole}`);
      await loadMembers();
      setRolesMsg('Saved ✔️');
    } catch (e: any) {
      setRolesMsg(e?.message || 'Failed.');
    } finally {
      setRolesBusy(false);
    }
  };

  const transferOwnership = async (newOwnerProfileId: string) => {
    if (!community || !userId) return;
    const ok = window.confirm('Transfer ownership to this user? You will become a moderator.');
    if (!ok) return;

    setRolesBusy(true);
    setRolesMsg(null);
    try {
      // 1) Ensure new owner is approved member
      const target = members.find((m) => m.profile_id === newOwnerProfileId);
      if (!target || target.status !== 'approved') {
        throw new Error('New owner must be an approved member.');
      }

      // 2) Update communities.creator_id
      const { error: up1 } = await supabase
        .from('communities')
        .update({ creator_id: newOwnerProfileId } as any)
        .eq('id', community.id);
      if (up1) throw up1;

      // 3) Set roles: new → owner, current owner → moderator
      await supabase
        .from('community_members')
        .upsert([{ community_id: community.id, profile_id: newOwnerProfileId, role: 'owner', status: 'approved' } as any], { onConflict: 'community_id,profile_id' });

      await supabase
        .from('community_members')
        .update({ role: 'moderator' } as any)
        .eq('community_id', community.id)
        .eq('profile_id', userId);

      await actLog('community.transfer_ownership', newOwnerProfileId, 'owner → new profile');

      // reflect locally
      setCommunity({ ...community, creator_id: newOwnerProfileId });
      setIsOwner(false);
      await loadMembers();
      setRolesMsg('Ownership transferred ✔️');
    } catch (e: any) {
      setRolesMsg(e?.message || 'Failed to transfer ownership.');
    } finally {
      setRolesBusy(false);
    }
  };

  /** ===== Danger Zone: archive/unarchive ===== */
  const archiveDirty = useMemo(() => {
    if (!community) return false;
    return Boolean(archived) !== Boolean(community.is_archived);
  }, [community, archived]);

  const saveArchive = async () => {
    if (!community || !isOwner || !userId) return;
    const txt = archived
      ? 'Archive this community? Members won’t be able to post or join until unarchived.'
      : 'Unarchive this community and restore posting?';
    if (!window.confirm(txt)) return;

    setSaving(true);
    setDzMsg(null);
    try {
      const { data: updated, error } = await supabase
        .from('communities')
        .update({ is_archived: archived } as any)
        .eq('id', community.id)
        .select('id, name, description, visibility, creator_id, banner_path, banner_alt, banner_updated_at, require_mod_review, is_hidden, is_archived')
        .single();

      if (error || !updated) throw error || new Error('Failed to save');

      await supabase.from('community_mod_logs' as any).insert([
        { community_id: community.id, actor_profile_id: userId, action: 'community.update_is_archived', target_profile_id: null, reason: `is_archived: ${String(archived)}` } as any,
      ]);

      setCommunity(updated as Community);
      setDzMsg('Saved ✔️');
    } catch (e: any) {
      setDzMsg(e?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  /** ===== Danger Zone: hard delete ===== */
  const canDelete = isOwner && ack && confirmText.trim() === (community?.name ?? '');

  const deleteCommunity = async () => {
    if (!community || !isOwner) return;
    const really = window.prompt(`Type DELETE to permanently remove "${community.name}". This cannot be undone.`);
    if (!really || really.toUpperCase() !== 'DELETE') return;

    setDeleteBusy(true);
    setDzMsg(null);
    try {
      const { error } = await supabase.rpc('delete_community_hard', { p_community: community.id });
      if (error) throw error;
      setDzMsg('Community deleted.');
      router.push('/home');
    } catch (e: any) {
      setDzMsg(e?.message || 'Failed to delete.');
    } finally {
      setDeleteBusy(false);
    }
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

        {/* POSTING (single toggle) */}
        {tab === 'posting' && (
          <Section title="Posting & Safety">
            <div className="sm:col-span-2 flex items-center justify-between rounded border p-3">
              <div>
                <div className="font-medium">Require moderator review before posts go live</div>
                <div className="text-sm text-gray-600">If enabled, new posts enter a pending queue until approved.</div>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={requireMod}
                  onChange={(e) => setRequireMod(e.target.checked)}
                />
                <span className="text-sm">Enabled</span>
              </label>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={savePosting}
                disabled={!postingDirty || saving}
                className={`px-4 py-2 rounded text-white ${!postingDirty || saving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {saving ? 'Saving…' : 'Save settings'}
              </button>
              {message && <span className="text-sm text-gray-600">{message}</span>}
            </div>
          </Section>
        )}

        {/* PRIVACY (single toggle) */}
        {tab === 'privacy' && (
          <Section title="Privacy & Indexing">
            <div className="sm:col-span-2 flex items-center justify-between rounded border p-3">
              <div>
                <div className="font-medium">Hide this community</div>
                <div className="text-sm text-gray-600">
                  When hidden, the community won’t appear in Explore/search. Direct links still work.
                </div>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={hidden}
                  onChange={(e) => setHidden(e.target.checked)}
                />
                <span className="text-sm">{hidden ? 'Hidden' : 'Visible'}</span>
              </label>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={savePrivacy}
                disabled={!privacyDirty || saving}
                className={`px-4 py-2 rounded text-white ${!privacyDirty || saving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {saving ? 'Saving…' : 'Save settings'}
              </button>
              {message && <span className="text-sm text-gray-600">{message}</span>}
            </div>
          </Section>
        )}

        {/* ROLES */}
        {tab === 'roles' && (
          <Section title="Roles">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-600">Filter</label>
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={memberFilter}
                    onChange={(e) => setMemberFilter(e.target.value as any)}
                  >
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="banned">Banned</option>
                  </select>
                </div>
                <input
                  placeholder="Search username…"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="border rounded px-3 py-2 w-full sm:w-64"
                />
              </div>

              <div className="rounded border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left px-3 py-2">User</th>
                      <th className="text-left px-3 py-2">Role</th>
                      <th className="text-left px-3 py-2">Status</th>
                      <th className="text-left px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members
                      .filter((m) => m.status === memberFilter)
                      .filter((m) => (memberSearch ? (m.username ?? '').toLowerCase().includes(memberSearch.toLowerCase()) : true))
                      .map((m) => (
                        <tr key={m.profile_id} className="border-t">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{m.username ?? 'Unknown'}</span>
                              {m.profile_id === community.creator_id && (
                                <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-700">owner</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <select
                              className="border rounded px-2 py-1 text-sm"
                              value={m.role}
                              onChange={(e) => setRole(m.profile_id, e.target.value as any)}
                              disabled={m.profile_id === community.creator_id || rolesBusy}
                              title={m.profile_id === community.creator_id ? 'Owner role cannot be edited here. Use Transfer Ownership.' : undefined}
                            >
                              <option value="member">member</option>
                              <option value="moderator">moderator</option>
                              <option value="owner">owner (transfer)</option>
                            </select>
                          </td>
                          <td className="px-3 py-2 capitalize">{m.status}</td>
                          <td className="px-3 py-2">
                            {m.status === 'pending' && (
                              <button
                                onClick={() => setStatus(m.profile_id, 'approved')}
                                className="px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700 mr-2"
                                disabled={rolesBusy}
                              >
                                Approve
                              </button>
                            )}
                            {m.status !== 'banned' ? (
                              <button
                                onClick={() => setStatus(m.profile_id, 'banned')}
                                className="px-2 py-1 rounded bg-rose-600 text-white hover:bg-rose-700 mr-2"
                                disabled={rolesBusy}
                              >
                                Ban
                              </button>
                            ) : (
                              <button
                                onClick={() => setStatus(m.profile_id, 'approved')}
                                className="px-2 py-1 rounded bg-amber-600 text-white hover:bg-amber-700 mr-2"
                                disabled={rolesBusy}
                              >
                                Unban
                              </button>
                            )}
                            <button
                              onClick={() => removeMember(m.profile_id)}
                              className="px-2 py-1 rounded border hover:bg-gray-50"
                              disabled={rolesBusy || m.profile_id === community.creator_id}
                              title={m.profile_id === community.creator_id ? 'Owner cannot be removed.' : undefined}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    {members.filter((m) => m.status === memberFilter && (memberSearch ? (m.username ?? '').toLowerCase().includes(memberSearch.toLowerCase()) : true)).length === 0 && (
                      <tr>
                        <td className="px-3 py-4 text-gray-500" colSpan={4}>
                          No members found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {rolesMsg && <div className="text-sm text-gray-600">{rolesMsg}</div>}

              {/* Transfer ownership quick action */}
              <div className="rounded border p-3">
                <div className="font-medium mb-2">Transfer Ownership</div>
                <p className="text-sm text-gray-600 mb-3">
                  Transfer ownership to an <b>approved</b> member or moderator. You will become a moderator.
                </p>
                <TransferOwnershipInline
                  members={members.filter((m) => m.status === 'approved' && m.profile_id !== community.creator_id)}
                  onTransfer={transferOwnership}
                  busy={rolesBusy}
                />
              </div>
            </div>
          </Section>
        )}

        {/* DANGER ZONE */}
        {tab === 'danger' && (
          <Section title="Danger Zone">
            {/* Archive card */}
            <div className="rounded border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Archive this community</div>
                  <div className="text-sm text-gray-600">
                    When archived, members can’t post or join. You can unarchive later.
                  </div>
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="h-4 w-4" checked={archived} onChange={(e) => setArchived(e.target.checked)} />
                  <span className="text-sm">{archived ? 'Archived' : 'Active'}</span>
                </label>
              </div>
              <div className="mt-3">
                <button onClick={saveArchive} disabled={!archiveDirty || saving} className={`px-4 py-2 rounded text-white ${!archiveDirty || saving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  {saving ? 'Saving…' : 'Save archive state'}
                </button>
                {dzMsg && <span className="ml-3 text-sm text-gray-600">{dzMsg}</span>}
              </div>
            </div>

            {/* Delete card */}
            <div className="rounded border p-4 mt-5">
              <div className="font-medium text-red-700">Delete community (permanent)</div>
              <p className="text-sm text-gray-600 mt-1">
                This will permanently remove the community, its posts, votes, saved posts, members, and audit logs. This cannot be undone.
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-sm text-gray-600 block mb-1">
                    Type the community name to confirm ({community.name})
                  </label>
                  <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="border rounded px-3 py-2 w-full" />
                </div>
                <label className="inline-flex items-center gap-2 sm:col-span-2">
                  <input type="checkbox" className="h-4 w-4" checked={ack} onChange={(e) => setAck(e.target.checked)} />
                  <span className="text-sm">I understand this action is permanent.</span>
                </label>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={deleteCommunity}
                  disabled={!canDelete || deleteBusy}
                  className={`px-4 py-2 rounded text-white ${!canDelete || deleteBusy ? 'bg-red-300' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  {deleteBusy ? 'Deleting…' : 'Delete community'}
                </button>
                {dzMsg && <span className="text-sm text-gray-600">{dzMsg}</span>}
              </div>
            </div>
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

/** Small inline transfer widget */
function TransferOwnershipInline({
  members,
  onTransfer,
  busy,
}: {
  members: MemberRow[];
  onTransfer: (profileId: string) => void;
  busy: boolean;
}) {
  const [pick, setPick] = useState<string>('');
  return (
    <div className="flex items-center gap-2">
      <select
        className="border rounded px-2 py-2"
        value={pick}
        onChange={(e) => setPick(e.target.value)}
      >
        <option value="">Select member…</option>
        {members.map((m) => (
          <option key={m.profile_id} value={m.profile_id}>
            {m.username ?? m.profile_id} · {m.role}
          </option>
        ))}
      </select>
      <button
        onClick={() => pick && onTransfer(pick)}
        className={`px-3 py-2 rounded text-white ${pick && !busy ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400'}`}
        disabled={!pick || busy}
      >
        Transfer
      </button>
    </div>
  );
}
