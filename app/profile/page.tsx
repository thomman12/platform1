'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

/* ---------- Avatar preset thumbs (id -> public path) ---------- */
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
function resolveAvatarThumb(id?: string | null) {
  if (!id) return null;
  return AVATAR_THUMBS[id] ?? null;
}

/* ---------- Types ---------- */
type ProfileRow = Database['public']['Tables']['profiles']['Row'] & {
  bio?: string | null;
  avatar_url?: string | null;
  avatar_id?: string | null;
};
type PostRow = Database['public']['Tables']['posts']['Row'];
type CommunityRow = Database['public']['Tables']['communities']['Row'];
type TabKey = 'posts' | 'saved' | 'communities';

const PAGE_SIZE = 10;

export default function ProfilePage() {
  const supabase = createClientComponentClient<Database>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [usernameCheck, setUsernameCheck] =
    useState<'idle' | 'checking' | 'ok' | 'taken'>('idle');

  const [editBio, setEditBio] = useState('');

  // stats
  const [postCount, setPostCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [communityCount, setCommunityCount] = useState(0);

  // lists
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [postsHasMore, setPostsHasMore] = useState(false);
  const postsFrom = useRef(0);

  const [savedPosts, setSavedPosts] = useState<
    (PostRow & { communities?: Pick<CommunityRow, 'id' | 'name'> | null })[]
  >([]);
  const [communities, setCommunities] = useState<CommunityRow[]>([]);

  const [tab, setTab] = useState<TabKey>('posts');

  // track delete in-flight
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /* ------------- auth & base profile ------------- */
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      setEmail(user.email ?? null);

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (prof) {
        const p = prof as ProfileRow;
        setProfile(p);
        setEditUsername(p.username ?? '');
        setEditBio((p as any).bio ?? '');
      }
      setLoading(false);
    })();
  }, [supabase]);

  /* ------------- counts + lists ------------- */
  useEffect(() => {
    if (!userId) return;
    (async () => {
      // posts count + first page
      const list1 = await supabase
        .from('posts')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(0, PAGE_SIZE - 1);

      setPostCount(list1.count ?? 0);
      setPosts(list1.data ?? []);
      postsFrom.current = list1.data?.length ?? 0;
      setPostsHasMore((list1.count ?? 0) > (list1.data?.length ?? 0));

      // saved
      const savedRes = await supabase
        .from('saved_posts')
        .select(
          `
          sp_post_id,
          posts:sp_post_id (
            id, title, created_at, community_id,
            communities!posts_community_id_fkey ( id, name )
          )
        `,
          { count: 'exact' }
        )
        .eq('sp_profile_id', userId)
        .order('saved_at', { ascending: false })
        .limit(12);

      setSavedCount(savedRes.count ?? 0);
      const flattened = (savedRes.data ?? [])
        .map((r: any) => ({
          ...(r.posts || {}),
          communities: r.posts?.communities ? { ...r.posts.communities } : null,
        }))
        .filter((p: any) => p?.id);
      setSavedPosts(flattened);

      // communities (✅ use approved memberships instead of followers)
      const commRes = await supabase
        .from('community_members')
        .select(
          `
          community_id,
          communities:communities!community_id ( id, name, description )
        `,
          { count: 'exact' }
        )
        .eq('profile_id', userId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(50);

      setCommunityCount(commRes.count ?? 0);
      setCommunities(
        (commRes.data ?? [])
          .map((r: any) => r.communities)
          .filter(Boolean)
      );
    })();
  }, [userId, supabase]);

  /* ------------- username availability check ------------- */
  useEffect(() => {
    if (!editUsername || editUsername === profile?.username) {
      setUsernameCheck('idle');
      return;
    }
    const handle = setTimeout(async () => {
      setUsernameCheck('checking');
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', editUsername)
        .neq('id', userId!)
        .limit(1);
      if (error) {
        setUsernameCheck('idle');
        return;
      }
      setUsernameCheck(data && data.length > 0 ? 'taken' : 'ok');
    }, 300);
    return () => clearTimeout(handle);
  }, [editUsername, profile?.username, supabase, userId]);

  const initials = useMemo(() => {
    const name = profile?.username || email || 'U';
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join('');
  }, [profile?.username, email]);

  const joinedOn = useMemo(() => {
    if (!profile?.created_at) return '';
    try {
      return new Date(profile.created_at).toLocaleDateString();
    } catch {
      return '';
    }
  }, [profile?.created_at]);

  const saveProfile = async () => {
    if (!userId) return;
    if (!editUsername.trim()) return alert('Username cannot be empty.');
    if (usernameCheck === 'taken') return alert('That username is already taken.');

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ username: editUsername.trim(), bio: editBio.trim() || null } as any)
      .eq('id', userId);
    setSaving(false);

    if (error) return alert('Failed to save profile: ' + error.message);
    setProfile((p) =>
      p ? { ...p, username: editUsername.trim(), bio: editBio.trim() || null } : p
    );
  };

  const copyProfileLink = async () => {
    const url = `${window.location.origin}/user/${userId}`;
    await navigator.clipboard.writeText(url);
    alert('Profile link copied!');
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  /* ---------------- UI ---------------- */
  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-24 w-24 rounded-full bg-gray-200" />
          <div className="mt-6 h-6 w-64 bg-gray-200 rounded" />
          <div className="mt-2 h-4 w-40 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-2">You’re not signed in</h1>
        <p className="text-gray-600 mb-4">Please log in to view your profile.</p>
        <Link
          href="/login"
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  const nameToShow = profile?.username || email || 'User';
  const presetThumb = resolveAvatarThumb(profile?.avatar_id || undefined);

  /* ---------- working functions ---------- */
  const loadMore = async () => {
    if (!userId) return;
    const from = postsFrom.current;
    const to = from + PAGE_SIZE - 1;

    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    const next = data ?? [];
    setPosts((prev) => [...prev, ...next]);
    postsFrom.current += next.length;
    setPostsHasMore(postsFrom.current < (postCount || 0));
  };

  const deleteOne = async (postId: string) => {
    if (!userId) return;
    const ok = confirm('Delete this post? This cannot be undone.');
    if (!ok) return;

    setDeletingId(postId);
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', userId);

      if (error) {
        alert('Failed to delete post: ' + error.message);
      } else {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        setPostCount((prev) => Math.max(0, prev - 1));
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-6">
        {/* Avatar (clickable to customize/3D view) */}
        <div className="flex flex-col items-center">
          <Link
            href="/profile/customize"
            title="Open 3D avatar"
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-full"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="h-24 w-24 rounded-full object-cover border shadow cursor-pointer"
              />
            ) : presetThumb ? (
              <img
                src={presetThumb}
                alt="Avatar"
                className="h-24 w-24 rounded-full object-cover border shadow cursor-pointer"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center text-3xl font-bold shadow cursor-pointer">
                {initials}
              </div>
            )}
          </Link>
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{nameToShow}</h1>
            <span className="text-sm text-gray-500">Joined {joinedOn || '—'}</span>
            <button
              onClick={copyProfileLink}
              className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
              title="Copy public profile link"
            >
              Copy link
            </button>
            <button
              onClick={logout}
              className="ml-2 text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
              title="Log out"
            >
              Logout
            </button>
          </div>

          <div className="mt-2 text-gray-600">{email}</div>

          {/* Username + Bio editor */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Username</label>
              <div className="flex items-center gap-2">
                <input
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="Your username"
                  className="border rounded px-3 py-1 w-full"
                />
                <span className="text-xs">
                  {usernameCheck === 'checking' && 'Checking…'}
                  {usernameCheck === 'ok' && (
                    <span className="text-green-600">Available</span>
                  )}
                  {usernameCheck === 'taken' && (
                    <span className="text-red-600">Taken</span>
                  )}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Bio</label>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Tell people about yourself…"
                className="border rounded px-3 py-2 w-full h-[70px]"
                maxLength={200}
              />
              <div className="text-xs text-gray-500 text-right">
                {editBio.length}/200
              </div>
            </div>
          </div>

          <button
            onClick={saveProfile}
            disabled={saving || usernameCheck === 'taken'}
            className="mt-3 bg-gray-900 text-white px-4 py-2 rounded hover:bg-black/80 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
        <StatCard label="Posts" value={postCount} />
        <StatCard label="Saved" value={savedCount} />
        <StatCard label="Communities" value={communityCount} />
      </div>

      {/* Tabs */}
      <div className="mt-8 border-b border-gray-200 flex gap-6">
        <TabButton active={tab === 'posts'} onClick={() => setTab('posts')}>
          Posts
        </TabButton>
        <TabButton active={tab === 'saved'} onClick={() => setTab('saved')}>
          Saved
        </TabButton>
        <TabButton
          active={tab === 'communities'}
          onClick={() => setTab('communities')}
        >
          Communities
        </TabButton>
      </div>

      {/* Panels */}
      <div className="mt-6">
        {tab === 'posts' && (
          <div className="space-y-3">
            {posts.length === 0 ? (
              <Empty text="You haven’t posted anything yet." />
            ) : (
              <>
                {posts.map((p) => (
                  <div key={p.id} className="group relative">
                    <RowCard>
                      {/* Small avatar next to each post */}
                      <AvatarBubble
                        avatarUrl={profile?.avatar_url}
                        avatarId={profile?.avatar_id}
                      />

                      <div className="flex-1">
                        <Link
                          href={`/post/${p.id}`}
                          className="font-semibold text-blue-600 hover:underline"
                        >
                          {p.title || '(untitled)'}
                        </Link>
                        <div className="text-xs text-gray-500">
                          {new Date(p.created_at!).toLocaleString()}
                        </div>
                      </div>

                      <Link
                        href={`/post/${p.id}`}
                        className="text-sm text-gray-700 hover:underline"
                      >
                        Open →
                      </Link>

                      {/* Delete button */}
                      <button
                        onClick={() => deleteOne(p.id)}
                        disabled={deletingId === p.id}
                        className="
                          absolute right-2 top-2
                          opacity-0 pointer-events-none
                          group-hover:opacity-100 group-hover:pointer-events-auto
                          focus-visible:opacity-100 focus-visible:pointer-events-auto
                          transition duration-150 ease-out
                          -translate-y-1 group-hover:translate-y-0
                          rounded-full px-2.5 py-1 text-[11px] font-medium
                          bg-red-600/90 text-white shadow-sm hover:bg-red-600
                        "
                        title="Delete post"
                        tabIndex={0}
                      >
                        <span className="sm:hidden">🗑️</span>
                        <span className="hidden sm:inline">
                          {deletingId === p.id ? 'Deleting…' : 'Delete'}
                        </span>
                      </button>
                    </RowCard>
                  </div>
                ))}
                {postsHasMore && (
                  <button
                    onClick={loadMore}
                    className="mt-2 text-sm bg-gray-100 px-3 py-2 rounded hover:bg-gray-200"
                  >
                    Load more
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'saved' && (
          <div className="space-y-3">
            {savedPosts.length === 0 ? (
              <Empty text="No saved posts yet." />
            ) : (
              savedPosts.map((p) => (
                <RowCard key={p.id}>
                  <div className="flex-1">
                    <Link
                      href={`/post/${p.id}`}
                      className="font-semibold text-blue-600 hover:underline"
                    >
                      {p.title || '(untitled)'}
                    </Link>
                    <div className="text-xs text-gray-500">
                      {p.communities?.name ? (
                        <>
                          in{' '}
                          <Link
                            className="hover:underline"
                            href={`/community/${p.communities.id}`}
                          >
                            {p.communities.name}
                          </Link>
                        </>
                      ) : (
                        '—'
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/post/${p.id}`}
                    className="text-sm text-gray-700 hover:underline"
                  >
                    Open →
                  </Link>
                </RowCard>
              ))
            )}
            <Link
              href="/saved"
              className="inline-block text-sm text-blue-600 hover:underline mt-2"
            >
              Open saved posts page
            </Link>
          </div>
        )}

        {tab === 'communities' && (
          <div className="space-y-3">
            {communities.length === 0 ? (
              <Empty text="You haven’t joined any communities yet." />
            ) : (
              communities.map((c) => (
                <RowCard key={c.id}>
                  <div className="flex-1">
                    <Link
                      href={`/community/${c.id}`}
                      className="font-semibold text-blue-600 hover:underline"
                    >
                      {c.name}
                    </Link>
                    <div className="text-xs text-gray-500 line-clamp-1">
                      {c.description || '—'}
                    </div>
                  </div>
                  <Link
                    href={`/community/${c.id}`}
                    className="text-sm text-gray-700 hover:underline"
                  >
                    Visit →
                  </Link>
                </RowCard>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- small presentational helpers ---------- */

function AvatarBubble({
  avatarUrl,
  avatarId,
  size = 36,
}: {
  avatarUrl?: string | null;
  avatarId?: string | null;
  size?: number;
}) {
  const src = avatarUrl || resolveAvatarThumb(avatarId || undefined);
  return (
    <div
      className="rounded-full overflow-hidden bg-gray-200 flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      {src ? (
        <img src={src} alt="Avatar" className="w-full h-full object-cover" />
      ) : (
        <span className="text-xs text-gray-600">🙂</span>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="text-sm uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-2 pb-2 text-sm font-medium ${
        active
          ? 'border-gray-900 text-gray-900'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {children}
    </button>
  );
}

function RowCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex items-center gap-3 rounded-lg border bg-white p-4 pr-16 shadow-sm">
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="text-sm text-gray-500">{text}</div>;
}
