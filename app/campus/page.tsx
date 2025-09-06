'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';
import { useRouter } from 'next/navigation';

type Campus = { id: string; name: string };
type Profile = { id: string; username: string | null; avatar_id: string | null; campus_id: string | null };

type PostRow = {
  id: string;
  body: string;
  created_at: string | null;
  author_id: string;
  profiles: { username: string | null; avatar_id: string | null } | null; // via foreign select
};

type VoteCount = Record<string, { up: number; down: number }>;
type Tab = 'top' | 'orby' | 'new';

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

export default function CampusPage() {
  const supabase = createClientComponentClient<Database>();
  const router = useRouter();

  const [me, setMe] = useState<Profile | null>(null);
  const [campus, setCampus] = useState<Campus | null>(null);

  const [tab, setTab] = useState<Tab>('orby');
  const [composer, setComposer] = useState('');
  const [posting, setPosting] = useState(false);

  const [posts, setPosts] = useState<PostRow[]>([]);
  const [votes, setVotes] = useState<VoteCount>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  /* load profile + campus */
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) {
        router.push('/login');
        return;
      }

      const { data: pRes, error: pErr } = await supabase
        .from('profiles')
        .select('id, username, avatar_id, campus_id')
        .eq('id', u.user.id)
        .maybeSingle();

      if (pErr) {
        setErr(pErr.message);
        setLoading(false);
        return;
      }

      setMe(pRes as Profile);

      if (!pRes?.campus_id) {
        setLoading(false);
        return; // gate the page below
      }

      const { data: c } = await supabase
        .from('campuses')
        .select('id, name')
        .eq('id', pRes.campus_id)
        .maybeSingle();

      setCampus(c as Campus ?? null);
      setLoading(false);
    })();
  }, [supabase, router]);

  /* fetch posts for my campus */
  const loadPosts = async (campusId: string) => {
    setErr(null);
    try {
      const { data, error } = await supabase
        .from('campus_posts')
        .select(`
          id, body, created_at, author_id,
          profiles!author_id (username, avatar_id)
        `)
        .eq('campus_id', campusId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const normalized: PostRow[] = (data ?? []).map((row: any) => ({
        ...row,
        profiles: Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles ?? null,
      }));

      setPosts(normalized);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load posts.');
    }
  };

  /* fetch votes for visible posts */
  const loadVotes = async (ids: string[]) => {
    if (!ids.length) { setVotes({}); return; }
    const { data, error } = await supabase
      .from('campus_post_votes')
      .select('post_id, vote')
      .in('post_id', ids);

    if (error) return;

    const counts: VoteCount = {};
    (data ?? []).forEach((v) => {
      counts[v.post_id] ??= { up: 0, down: 0 };
      if (v.vote === 1) counts[v.post_id].up++;
      else counts[v.post_id].down++;
    });
    setVotes(counts);
  };

  useEffect(() => {
    if (me?.campus_id) {
      loadPosts(me.campus_id).then(() => {
        const ids = posts.map((p) => p.id);
        loadVotes(ids);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.campus_id]);

  useEffect(() => {
    const ids = posts.map((p) => p.id);
    loadVotes(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts.length]);

  /* create a post */
  const submitPost = async () => {
    if (!me?.campus_id || !me.id) return;
    const body = composer.trim();
    if (!body) return;

    setPosting(true);
    try {
      const { error } = await supabase
        .from('campus_posts')
        .insert([{ campus_id: me.campus_id, author_id: me.id, body }]);
      if (error) throw error;

      setComposer('');
      await loadPosts(me.campus_id);
    } catch (e: any) {
      setErr(e?.message || 'Failed to post.');
    } finally {
      setPosting(false);
    }
  };

  /* vote handlers */
  const vote = async (postId: string, value: 1 | -1) => {
    if (!me?.id) return;

    // fetch my existing vote
    const { data: existing } = await supabase
      .from('campus_post_votes')
      .select('*')
      .eq('post_id', postId)
      .eq('profile_id', me.id)
      .maybeSingle();

    if (!existing) {
      await supabase.from('campus_post_votes').insert([{ post_id: postId, profile_id: me.id, vote: value }]);
    } else if (existing.vote === value) {
      await supabase
        .from('campus_post_votes')
        .delete()
        .eq('post_id', postId)
        .eq('profile_id', me.id);
    } else {
      await supabase
        .from('campus_post_votes')
        .update({ vote: value })
        .eq('post_id', postId)
        .eq('profile_id', me.id);
    }

    // refresh counts quickly
    loadVotes(posts.map((p) => p.id));
  };

  /* sorting */
  const scored = useMemo(() => {
    const withScore = posts.map((p) => {
      const v = votes[p.id] ?? { up: 0, down: 0 };
      const net = v.up - v.down;
      const hours = Math.max(1, (Date.now() - new Date(p.created_at ?? '').getTime()) / 3600000);
      const hot = net / Math.pow(hours + 2, 1.5); // “Orbying” feel
      return { post: p, net, hot };
    });

    if (tab === 'new') {
      return withScore.sort((a, b) =>
        new Date(b.post.created_at ?? 0).getTime() - new Date(a.post.created_at ?? 0).getTime()
      );
    }
    if (tab === 'top') {
      return withScore.sort((a, b) => b.net - a.net);
    }
    // orby
    return withScore.sort((a, b) => b.hot - a.hot);
  }, [posts, votes, tab]);

  /* ui gates */
  if (loading) return <div className="p-6">Loading…</div>;

  if (!me?.campus_id) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Campus</h1>
        <p className="text-gray-600">
          Campus is available for verified university accounts. Sign up or update your account with a
          university email to get access.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm text-gray-500">university name space</div>
          <h1 className="text-2xl font-bold">{campus?.name ?? 'Campus'}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/campus/leaderboard" className="px-3 py-1 border rounded hover:bg-gray-50">
            leader board
          </Link>
          <Link href="/campus/dms" className="px-3 py-1 border rounded hover:bg-gray-50">
            Dm&apos;s
          </Link>
        </div>
      </div>

      {/* Tabs row like your sketch */}
      <div className="grid grid-cols-3 gap-8 w-full max-w-lg mx-auto mb-5">
        <button
          onClick={() => setTab('top')}
          className={`px-4 py-1 border rounded ${tab==='top' ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'}`}
        >
          Top
        </button>
        <button
          onClick={() => setTab('orby')}
          className={`px-4 py-1 border rounded ${tab==='orby' ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'}`}
        >
          Orbying
        </button>
        <button
          onClick={() => setTab('new')}
          className={`px-4 py-1 border rounded ${tab==='new' ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'}`}
        >
          New
        </button>
      </div>

      {/* Composer (any campus user can post) */}
      <div className="mb-4 rounded border bg-white p-4">
        <textarea
          value={composer}
          onChange={(e) => setComposer(e.target.value)}
          placeholder="Share something with your campus…"
          className="w-full h-24 border rounded p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          maxLength={2000}
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={submitPost}
            disabled={posting || composer.trim().length === 0}
            className={`px-4 py-2 rounded text-white ${posting || composer.trim().length===0 ? 'bg-gray-300' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {posting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>

      {err && <div className="mb-3 text-red-600 text-sm">{err}</div>}

      {/* Feed */}
      {scored.length === 0 ? (
        <div className="text-gray-500">No posts yet.</div>
      ) : (
        <ul className="space-y-3">
          {scored.map(({ post }) => {
            const v = votes[post.id] ?? { up: 0, down: 0 };
            const src = post.profiles?.avatar_id ? AVATAR_THUMBS[post.profiles.avatar_id] : null;

            return (
              <li key={post.id} className="rounded border bg-white p-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200 grid place-items-center">
                    {src ? <img src={src} alt="avatar" /> : <span>🙂</span>}
                  </div>
                  <span className="font-medium">{post.profiles?.username ?? 'Anon'}</span>
                  <span>· {post.created_at ? new Date(post.created_at).toLocaleString() : ''}</span>
                </div>

                <p className="whitespace-pre-wrap text-gray-900">{post.body}</p>

                <div className="mt-3 flex items-center gap-3 text-sm">
                  <button onClick={() => vote(post.id, 1)}>🔼</button>
                  <span>{v.up}</span>
                  <button onClick={() => vote(post.id, -1)}>🔽</button>
                  <span>{v.down}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
