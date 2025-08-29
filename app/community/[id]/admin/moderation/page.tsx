'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

/** Types */
type Visibility = 'public' | 'restricted' | 'private';
type Community = {
  id: string;
  name: string;
  description: string | null;
  visibility: Visibility;
  creator_id: string;
};
type PostRow = Database['public']['Tables']['posts']['Row'] & {
  profiles: { username: string | null; avatar_id: string | null } | null;
};

/** Small Avatar helper */
const AVATAR_THUMBS: Record<string, string> = {
  a1: '/avatars/thumbs/a1-thumb.png',
  a2: '/avatars/thumbs/a2-thumb.png',
  a3: '/avatars/thumbs/a3-thumb.png',
  a4: '/avatars/thumbs/a4-thumb.png',
  a5: '/avatars/thumbs/a5-thumb.png',
  a6: '/avatars/thumbs/a6-thumb.png',
  a7: '/avatars/thumbs/a7-thumb.png',
  a8: '/avatars/thumbs/a8-thumb.png',
  a9: '/avatars/thumbs/a9-thumb.png',
  a10: '/avatars/thumbs/a10-thumb.png',
  a11: '/avatars/thumbs/a11-thumb.png',
};
const resolveAvatarThumb = (id?: string | null) => (id ? AVATAR_THUMBS[id] ?? null : null);

function Avatar({ username, avatarId, size = 28 }: { username?: string | null; avatarId?: string | null; size?: number }) {
  const src = resolveAvatarThumb(avatarId);
  if (src) {
    return <Image src={src} alt={username ?? 'avatar'} width={size} height={size} className="rounded-full object-cover" />;
  }
  const initial = (username ?? '?').trim().charAt(0).toUpperCase() || '?';
  return (
    <div style={{ width: size, height: size }} className="rounded-full bg-purple-600 text-white grid place-items-center text-xs font-semibold">
      {initial}
    </div>
  );
}

/** Default Exported React Component (fixes your error) */
export default function ModerationPage() {
  const supabase = createClientComponentClient<Database>();
  const params = useParams();
  const router = useRouter();
  const communityId = (params.id as string) ?? '';

  const [loading, setLoading] = useState(true);
  const [authId, setAuthId] = useState<string | null>(null);
  const [community, setCommunity] = useState<Community | null>(null);
  const [role, setRole] = useState<'owner' | 'moderator' | 'member' | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  const [queue, setQueue] = useState<PostRow[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [errorText, setErrorText] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // postId while acting

  const canModerate = isOwner || role === 'moderator';

  /** Load auth + community + role */
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErrorText(null);

      // auth
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id ?? null;
      setAuthId(uid);

      // community
      const { data: comm, error: ce } = await supabase
        .from('communities')
        .select('id, name, description, visibility, creator_id')
        .eq('id', communityId)
        .maybeSingle();

      if (ce || !comm) {
        setCommunity(null);
        setErrorText('Community not found.');
        setLoading(false);
        return;
      }

      const c = comm as unknown as Community;
      setCommunity(c);
      setIsOwner(!!uid && c.creator_id === uid);

      if (uid) {
        const { data: mem } = await supabase
          .from('community_members')
          .select('role, status')
          .eq('community_id', communityId)
          .eq('profile_id', uid)
          .maybeSingle();

        setRole((mem?.role as 'owner' | 'moderator' | 'member') ?? null);
      } else {
        setRole(null);
      }

      setLoading(false);
    })();
  }, [communityId, supabase]);

  /** Load pending posts */
  const loadQueue = async () => {
    if (!community || !canModerate) {
      setQueue([]);
      return;
    }
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id, title, content, created_at, user_id, community_id, status, mod_notes,
        profiles:profiles!user_id (username, avatar_id)
      `)
      .eq('community_id', community.id)
      .eq('status', 'pending' as any)
      .order('created_at', { ascending: true });

    if (error) {
      setErrorText(error.message);
      return;
    }

    const normalized: PostRow[] = (data ?? []).map((row: any) => ({
      ...row,
      profiles: Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles ?? null,
    }));

    setQueue(normalized);
  };

  useEffect(() => {
    loadQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [community?.id, canModerate]);

  /** Realtime: refresh queue when posts in this community change */
  useEffect(() => {
    if (!community || !canModerate) return;
    const ch = supabase
      .channel(`mod-queue-${community.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts', filter: `community_id=eq.${community.id}` },
        () => loadQueue()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [community?.id, canModerate, supabase]);

  /** Actions */
  const approve = async (postId: string) => {
    if (!authId || !community || !canModerate) return;
    setBusy(postId);
    const { error } = await supabase
      .from('posts')
      .update({
        status: 'published' as any,
        approved_by: authId,
        approved_at: new Date().toISOString(),
        mod_notes: notes[postId]?.trim() || null,
      })
      .eq('id', postId)
      .eq('community_id', community.id);

    if (error) alert(error.message);
    setBusy(null);
    loadQueue();
  };

  const reject = async (postId: string) => {
    if (!authId || !community || !canModerate) return;
    if (!notes[postId]?.trim()) {
      if (!confirm('Reject without a moderator note?')) return;
    }
    setBusy(postId);
    const { error } = await supabase
      .from('posts')
      .update({
        status: 'rejected' as any,
        approved_by: authId,
        approved_at: new Date().toISOString(),
        mod_notes: notes[postId]?.trim() || null,
      })
      .eq('id', postId)
      .eq('community_id', community.id);

    if (error) alert(error.message);
    setBusy(null);
    loadQueue();
  };

  /** UI states */
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

  if (!canModerate) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Access denied</h1>
          <p className="text-gray-600 mt-1">Only the owner and moderators can access Moderation.</p>
          <div className="mt-4 flex gap-3">
            <Link href={`/community/${community.id}`} className="px-4 py-2 rounded border hover:bg-gray-50">← Back to Community</Link>
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
          <h1 className="text-2xl font-bold">Moderation Queue</h1>
          <p className="text-gray-600">
            {community.name} · <span className="uppercase text-xs tracking-wide text-gray-500">{community.visibility}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/community/${community.id}`} className="px-3 py-2 rounded border hover:bg-gray-50">← Back</Link>
          <Link href={`/community/${community.id}/admin`} className="px-3 py-2 rounded bg-gray-900 text-white hover:bg-black/85">🛡️ Admin Controls</Link>
        </div>
      </div>

      {/* Queue */}
      {errorText && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">
          {errorText}
        </div>
      )}

      {queue.length === 0 ? (
        <div className="rounded border bg-white p-6 shadow-sm text-gray-600">
          🎉 Nothing to moderate. New posts that match your safety rules will appear here as <em>pending</em>.
        </div>
      ) : (
        <ul className="space-y-4">
          {queue.map((p) => (
            <li key={p.id} className="rounded border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Avatar username={p.profiles?.username} avatarId={p.profiles?.avatar_id ?? null} size={24} />
                    <span className="font-medium text-gray-800">{p.profiles?.username ?? 'Unknown'}</span>
                    <span>· {p.created_at ? new Date(p.created_at).toLocaleString() : ''}</span>
                  </div>
                  <h3 className="mt-1 text-lg font-semibold break-words">{p.title}</h3>
                  <p className="mt-1 text-gray-700 whitespace-pre-wrap break-words">
                    {(p.content ?? '').length > 400 ? (p.content ?? '').slice(0, 400) + '…' : (p.content ?? '')}
                  </p>
                </div>

                <Link href={`/post/${p.id}`} className="shrink-0 text-blue-600 hover:underline">
                  Open →
                </Link>
              </div>

              <div className="mt-3">
                <label className="block text-sm text-gray-600 mb-1">Moderator notes (optional)</label>
                <textarea
                  className="w-full rounded border px-3 py-2 text-sm"
                  placeholder="Reasoning / rule references…"
                  value={notes[p.id] ?? (p.mod_notes ?? '')}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  maxLength={300}
                />
                <div className="text-right text-xs text-gray-500">{(notes[p.id] ?? p.mod_notes ?? '').length}/300</div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => approve(p.id)}
                  disabled={busy === p.id}
                  className={`px-3 py-2 rounded text-white ${busy === p.id ? 'bg-green-400' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  Approve & Publish
                </button>
                <button
                  onClick={() => reject(p.id)}
                  disabled={busy === p.id}
                  className={`px-3 py-2 rounded text-white ${busy === p.id ? 'bg-rose-400' : 'bg-rose-600 hover:bg-rose-700'}`}
                >
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
