'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import { useFollowedStore } from '@/lib/followedStore';

/* =========================
   Local types (safe even if supabase.ts is behind)
========================= */
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

type PostWithAuthor = Database['public']['Tables']['posts']['Row'] & {
  profiles: { username: string | null; avatar_id: string | null } | null;
  has_live_chat: boolean | null;
  live_chat_status: 'active' | 'ended' | null;
  audio_room_active?: boolean | null;
};

type VoteCount = Record<string, { upvotes: number; downvotes: number }>;

/* =========================
   Preset avatar thumbs (your assets)
========================= */
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

function Avatar({
  username,
  avatarId,
  size = 28,
}: {
  username?: string | null;
  avatarId?: string | null;
  size?: number;
}) {
  const src = resolveAvatarThumb(avatarId);
  if (src) {
    return (
      <Image
        src={src}
        alt={username ?? 'avatar'}
        width={size}
        height={size}
        className="rounded-full object-cover"
      />
    );
  }
  const initial = (username ?? '?').trim().charAt(0).toUpperCase() || '?';
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-purple-600 text-white grid place-items-center text-xs font-semibold"
      aria-label="avatar"
    >
      {initial}
    </div>
  );
}

/* =========================
   Page
========================= */
export default function CommunityPage() {
  const supabase = createClientComponentClient<Database>();
  const router = useRouter();
  const params = useParams();
  const communityId = (params.id as string) ?? '';

  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [membership, setMembership] = useState<'approved' | 'pending' | 'banned' | 'none'>('none');
  const [isOwner, setIsOwner] = useState(false);
  const [role, setRole] = useState<'owner' | 'mod' | 'member' | null>(null);

  // votes/saves
  const [voteCounts, setVoteCounts] = useState<VoteCount>({});
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [errorText, setErrorText] = useState<string | null>(null);

  // sidebar store (for instant updates)
  const { addFollowed, followed } = useFollowedStore();

  const BUCKET = 'community-banners';

  /* who am I (optional login) */
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id ?? null;
      setUserId(uid);

      if (uid) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', uid)
          .maybeSingle();
        setProfileId(prof?.id ?? null);
      }
    })();
  }, [supabase]);

  /* load community + membership meta first */
  useEffect(() => {
    if (!communityId) return;
    (async () => {
      setLoading(true);
      setErrorText(null);

      // community metadata (+ banner cols)
      const { data: comm, error: ce } = await supabase
        .from('communities')
        .select('id, name, description, visibility, creator_id, banner_path, banner_alt, banner_updated_at')
        .eq('id', communityId)
        .single();

      if (ce || !comm) {
        setErrorText('Failed to load community.');
        setCommunity(null);
        setLoading(false);
        return;
      }
      const c = comm as unknown as Community;
      setCommunity(c);
      setIsOwner(!!userId && c.creator_id === userId);

      // my membership + role
      if (userId) {
        const { data: mem } = await supabase
          .from('community_members')
          .select('status, role')
          .eq('community_id', communityId)
          .eq('profile_id', userId)
          .maybeSingle();

        if (mem?.status === 'approved') setMembership('approved');
        else if (mem?.status === 'pending') setMembership('pending');
        else if (mem?.status === 'banned') setMembership('banned');
        else setMembership('none');

        setRole((mem?.role as 'owner' | 'mod' | 'member') ?? null);
      } else {
        setMembership('none');
        setRole(null);
      }

      setLoading(false);
    })();
  }, [communityId, supabase, userId]);

  const isAdmin = isOwner || role === 'mod';

  /* derive banner URL with cache-bust */
  const bannerUrl = useMemo(() => {
    if (!community?.banner_path) return null;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(community.banner_path);
    const bust = community.banner_updated_at ? `?v=${encodeURIComponent(community.banner_updated_at)}` : '';
    return data.publicUrl ? data.publicUrl + bust : null;
  }, [community?.banner_path, community?.banner_updated_at, supabase]);

  /* permissions derived from meta */
  const canSeePosts = useMemo(() => {
    if (!community) return false;
    if (community.visibility === 'public') return true; // anyone
    return membership === 'approved'; // restricted/private
  }, [community, membership]);

  const canCreatePost = useMemo(() => membership === 'approved', [membership]);

  /* load posts only if allowed */
  useEffect(() => {
    if (!community || !canSeePosts) {
      setPosts([]);
      return;
    }
    (async () => {
      try {
        const { data } = await supabase
          .from('posts')
          .select(`
            id, title, content, visibility, created_at, user_id, community_id,
            has_live_chat, live_chat_status, audio_room_active,
            profiles:profiles!user_id (username, avatar_id)
          `)
          .eq('community_id', community.id)
          .order('created_at', { ascending: false })
          .throwOnError();

        const normalized: PostWithAuthor[] = (data ?? []).map((row: any) => ({
          ...row,
          profiles: Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles ?? null,
        }));

        setPosts(normalized);
      } catch (e: any) {
        console.error('Posts fetch error:', e);
        setErrorText(e?.message || 'Failed to load posts.');
      }
    })();
  }, [community, canSeePosts, supabase]);

  /* realtime (only when visible) */
  useEffect(() => {
    if (!community || !canSeePosts) return;

    const ch = supabase
      .channel(`posts-status-${community.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'posts', filter: `community_id=eq.${community.id}` },
        (payload) => {
          const updated = payload.new as Partial<PostWithAuthor> & { id: string };
          setPosts((prev) =>
            prev.map((p) =>
              p.id === updated.id
                ? {
                    ...p,
                    live_chat_status:
                      (updated.live_chat_status as 'active' | 'ended' | null) ?? p.live_chat_status,
                    has_live_chat: (updated.has_live_chat as boolean | null) ?? p.has_live_chat,
                    audio_room_active:
                      (updated.audio_room_active as boolean | null) ?? p.audio_room_active,
                  }
                : p
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [community, canSeePosts, supabase]);

  /* saved posts (when logged in & posts exist) */
  useEffect(() => {
    if (!profileId || posts.length === 0) return;
    (async () => {
      const { data, error } = await supabase
        .from('saved_posts')
        .select('sp_post_id')
        .eq('sp_profile_id', profileId);

      if (error) {
        console.error('Saved posts fetch error:', error);
        return;
      }
      setSavedPosts(new Set((data ?? []).map((r) => r.sp_post_id)));
    })();
  }, [profileId, posts.length, supabase]);

  /* vote counts */
  useEffect(() => {
    (async () => {
      if (posts.length === 0) {
        setVoteCounts({});
        return;
      }
      const ids = posts.map((p) => p.id);
      const { data, error } = await supabase
        .from('post_votes')
        .select('post_id, vote_type')
        .in('post_id', ids);

      if (error) {
        console.error('Votes fetch error:', error);
        return;
      }

      const counts: VoteCount = {};
      (data ?? []).forEach((v) => {
        counts[v.post_id] ??= { upvotes: 0, downvotes: 0 };
        if (v.vote_type === 'upvote') counts[v.post_id].upvotes++;
        else counts[v.post_id].downvotes++;
      });
      setVoteCounts(counts);
    })();
  }, [posts, supabase]);

  /* ---- actions: join/request, vote, save ---- */
  const handleJoin = async () => {
    if (!community) return;
    if (!userId) {
      router.push('/login');
      return;
    }
    const targetStatus = community.visibility === 'public' ? 'approved' : 'pending';
    const { error: me } = await supabase.from('community_members').insert([
      {
        community_id: community.id,
        profile_id: userId,
        status: targetStatus,
      } as any,
    ]);
    if (me) {
      console.error('Join/Request error:', me.message);
      return;
    }

    setMembership(targetStatus as any);

    // Sidebar: optimistic add for public joins
    if (targetStatus === 'approved') {
      if (!followed.find((c) => c.id === community.id)) {
        addFollowed({
          id: community.id,
          name: community.name,
          description: community.description ?? '',
        });
      }
    }
  };

  const handleVote = async (postId: string, type: 'upvote' | 'downvote') => {
    if (!profileId) return alert('Please login to vote.');

    const { data: existing } = await supabase
      .from('post_votes')
      .select('*')
      .eq('profile_id', profileId)
      .eq('post_id', postId)
      .maybeSingle();

    if (existing) {
      if (existing.vote_type === type) {
        await supabase.from('post_votes').delete().eq('id', existing.id);
      } else {
        await supabase.from('post_votes').update({ vote_type: type }).eq('id', existing.id);
      }
    } else {
      await supabase.from('post_votes').upsert(
        [{ profile_id: profileId, post_id: postId, vote_type: type }],
        { onConflict: 'profile_id, post_id' }
      );
    }

    const { data } = await supabase
      .from('post_votes')
      .select('vote_type')
      .eq('post_id', postId);
    const up = (data ?? []).filter((v) => v.vote_type === 'upvote').length;
    const down = (data ?? []).filter((v) => v.vote_type === 'downvote').length;
    setVoteCounts((prev) => ({ ...prev, [postId]: { upvotes: up, downvotes: down } }));
  };

  const handleSave = async (postId: string) => {
    if (!profileId) return alert('Please login to save posts.');
    if (savedPosts.has(postId)) {
      await supabase
        .from('saved_posts')
        .delete()
        .eq('sp_profile_id', profileId)
        .eq('sp_post_id', postId);
      const s = new Set(savedPosts);
      s.delete(postId);
      setSavedPosts(s);
    } else {
      await supabase
        .from('saved_posts')
        .insert([{ sp_profile_id: profileId, sp_post_id: postId }]);
      const s = new Set(savedPosts);
      s.add(postId);
      setSavedPosts(s);
    }
  };

  /* ✅ Auto-add to sidebar when membership flips to approved (restricted/private approval) */
  useEffect(() => {
    if (!community) return;
    if (membership === 'approved') {
      if (!followed.find((c) => c.id === community.id)) {
        addFollowed({
          id: community.id,
          name: community.name,
          description: community.description ?? '',
        });
      }
    }
  }, [membership, community, followed, addFollowed]);

  /* helpers */
  const joinLabel = useMemo(() => {
    if (membership === 'approved') return 'Joined';
    if (membership === 'pending') return 'Pending';
    return community?.visibility === 'public' ? 'Join' : 'Request';
  }, [membership, community]);

  const canClickJoin = membership === 'none';
  const preview = (t?: string | null, n = 180) =>
    (t ?? '').length > n ? (t ?? '').slice(0, n) + '…' : (t ?? '');

  /* UI states */
  if (loading) return <p className="p-4">Loading…</p>;
  if (errorText) {
    return (
      <div className="p-6">
        <p className="text-red-600 mb-2">{errorText}</p>
        {community && <p className="text-gray-600">Community: {community.name}</p>}
      </div>
    );
  }
  if (!community) return <p className="p-4">Community not found</p>;

  return (
    <div className="p-0 sm:p-6 max-w-5xl mx-auto">
      {/* HERO BANNER */}
      <div className="relative mb-4 sm:mb-6 overflow-hidden rounded-none sm:rounded-lg border bg-gray-100">
        {/* Banner or fallback */}
        {bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bannerUrl}
            alt={community.banner_alt || `${community.name} banner`}
            className="w-full h-40 sm:h-56 md:h-72 object-cover"
          />
        ) : (
          <div className="w-full h-40 sm:h-56 md:h-72 bg-gradient-to-r from-slate-200 to-slate-300" />
        )}

        {/* Gradient overlay for readability */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* Bottom content overlay */}
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div className="text-white">
              <h1 className="text-2xl sm:text-3xl font-bold drop-shadow">{community.name}</h1>
              {community.description && (
                <p className="mt-1 text-white/90 drop-shadow max-w-3xl line-clamp-2">
                  {community.description}
                </p>
              )}
              <span className="mt-2 inline-block text-[11px] uppercase tracking-wide px-2 py-0.5 rounded bg-white/15 text-white/95 backdrop-blur">
                {community.visibility}
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                disabled={!canClickJoin}
                onClick={handleJoin}
                className={`px-4 py-2 rounded text-white ${
                  canClickJoin ? 'bg-blue-600 hover:bg-blue-700' : 'bg-white/30 text-white/80 cursor-default'
                }`}
                title={!canClickJoin ? 'Already joined or pending' : undefined}
              >
                {joinLabel}
              </button>

              {/* Admin/Settings */}
              {isAdmin && (
                <Link
                  href={`/community/${community.id}/admin`}
                  className="px-4 py-2 rounded bg-black/70 text-white hover:bg-black/80"
                  title="Admin Controls"
                >
                  🛡️ Admin
                </Link>
              )}
              {isOwner && (
                <Link
                  href={`/community/${community.id}/admin/settings`}
                  className="px-4 py-2 rounded bg-white/85 text-gray-900 hover:bg-white"
                  title="Community Settings"
                >
                  ⚙️ Settings
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Posts / content area */}
      <div className="px-4 sm:px-0">
        {/* Create Post (approved members only) */}
        {canCreatePost && (
          <div className="flex justify-end mb-4">
            <Link
              href={`/community/${community.id}/create-post`}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              ➕ Create Post
            </Link>
          </div>
        )}

        {/* Posts */}
        {canSeePosts ? (
          posts.length === 0 ? (
            <div className="bg-white border rounded p-5 shadow-sm text-gray-500">
              No posts yet.
            </div>
          ) : (
            <ul className="space-y-4">
              {posts.map((post) => {
                let chatLabel = '';
                let chatColor = '';
                if (post.has_live_chat) {
                  if (post.live_chat_status === 'active') {
                    chatLabel = '💬 Enter Live Chat';
                    chatColor = 'bg-purple-600';
                  } else if (post.live_chat_status === 'ended') {
                    chatLabel = '💬 View Live Chat';
                    chatColor = 'bg-gray-500';
                  } else {
                    chatLabel = '💬 Start Live Chat';
                    chatColor = 'bg-green-500';
                  }
                }

                return (
                  <li key={post.id} className="border p-4 rounded shadow-sm bg-white">
                    <Link href={`/post/${post.id}`} className="block group">
                      <h3 className="text-lg font-semibold group-hover:underline">{post.title}</h3>
                    </Link>

                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <Avatar
                        username={post.profiles?.username}
                        avatarId={post.profiles?.avatar_id ?? null}
                        size={28}
                      />
                      <Link
                        href={`/user/${post.user_id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {post.profiles?.username ?? 'Unknown'}
                      </Link>
                      <span>· {post.created_at ? new Date(post.created_at).toLocaleString() : ''}</span>
                    </div>

                    <p className="text-gray-700">
                      {preview(post.content)}
                    </p>

                    <div className="mt-3 flex items-center space-x-4 text-sm">
                      <button onClick={() => handleVote(post.id, 'upvote')}>🔼</button>
                      <span>{voteCounts[post.id]?.upvotes ?? 0}</span>
                      <button onClick={() => handleVote(post.id, 'downvote')}>🔽</button>
                      <span>{voteCounts[post.id]?.downvotes ?? 0}</span>

                      <button
                        onClick={() => handleSave(post.id)}
                        className={`ml-4 text-sm px-2 py-1 rounded ${
                          savedPosts.has(post.id) ? 'bg-yellow-200' : 'bg-gray-200'
                        }`}
                      >
                        {savedPosts.has(post.id) ? '🔖 Saved' : '📑 Save'}
                      </button>

                      <Link href={`/post/${post.id}`} className="ml-4 text-blue-600 hover:underline">
                        Read more →
                      </Link>

                      {post.has_live_chat && (
                        <Link
                          href={`/chat/${post.id}`}
                          className={`ml-auto inline-block ${chatColor} text-white px-4 py-1 rounded hover:opacity-90`}
                        >
                          {chatLabel}
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )
        ) : (
          <div className="bg-white border rounded p-5 shadow-sm text-gray-500">
            Become a member to view posts.
          </div>
        )}
      </div>
    </div>
  );
}
