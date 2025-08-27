'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';

/* ---------- map preset avatar ids -> thumb paths ---------- */
const AVATAR_THUMBS: Record<string, string> = {
  a1:  '/avatars/a1-thumb.png',
  a2:  '/avatars/a2-thumb.png',
  a3:  '/avatars/a3-thumb.png',
  a4:  '/avatars/a4-thumb.png',
  a5:  '/avatars/a5-thumb.png',
  a6:  '/avatars/a6-thumb.png',
  a7:  '/avatars/a7-thumb.png',
  a8:  '/avatars/a8-thumb.png',
  a9:  '/avatars/a9-thumb.png',
  a10: '/avatars/a10-thumb.png',
  a11: '/avatars/a11-thumb.png',
};
function resolveAvatarThumb(id?: string | null) {
  if (!id) return null;
  return AVATAR_THUMBS[id] ?? null;
}

/* ---------- types ---------- */
type PostRow = Database['public']['Tables']['posts']['Row'] & {
  profiles: { username: string | null; avatar_id: string | null } | null;
  has_live_chat: boolean | null;
  live_chat_status: 'active' | 'ended' | null;
};

export default function PostDetailPage() {
  const supabase = createClientComponentClient<Database>();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const postId = params.id as string;

  const [post, setPost] = useState<PostRow | null>(null);
  const [liveStatus, setLiveStatus] = useState<'active' | 'ended' | null>(null);

  const [me, setMe] = useState<string | null>(null);
  const [voteCounts, setVoteCounts] = useState({ upvotes: 0, downvotes: 0 });
  const [userVote, setUserVote] = useState<'upvote' | 'downvote' | null>(null);
  const [saved, setSaved] = useState(false);

  // who am I (only needed to color vote/save buttons)
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setMe(user.id);
    })();
  }, [supabase]);

  // Fetch post (include avatar_id) and subscribe to updates
  useEffect(() => {
    if (!postId) return;

    const fetchPost = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id, title, content, created_at, community_id, user_id,
          has_live_chat, live_chat_status,
          profiles:profiles!user_id ( username, avatar_id )
        `)
        .eq('id', postId)
        .single();

    if (error) {
        console.error('post fetch error:', error);
        return;
      }

      if (data) {
        const normalized: PostRow = {
          ...(data as any),
          profiles: Array.isArray((data as any).profiles)
            ? (data as any).profiles[0] ?? null
            : (data as any).profiles ?? null,
        };
        setPost(normalized);
        setLiveStatus((data as any).live_chat_status ?? null);
      }
    };

    fetchPost();

    // live updates for has_live_chat & live_chat_status
    const ch = supabase
      .channel(`post-status-${postId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'posts', filter: `id=eq.${postId}` },
        (payload) => {
          const nextLS = (payload.new as any).live_chat_status ?? null;
          const nextHas = (payload.new as any).has_live_chat ?? null;
          setLiveStatus(nextLS);
          setPost(prev =>
            prev ? { ...prev, has_live_chat: nextHas } as PostRow : prev
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [postId, supabase]);

  // Votes + saved
  useEffect(() => {
    const fetchExtras = async () => {
      // votes
      const { data: votes } = await supabase
        .from('post_votes')
        .select('vote_type, profile_id')
        .eq('post_id', postId);

      if (votes) {
        const up = votes.filter(v => v.vote_type === 'upvote').length;
        const down = votes.filter(v => v.vote_type === 'downvote').length;
        setVoteCounts({ upvotes: up, downvotes: down });
        if (me) {
          const mine = votes.find(v => v.profile_id === me);
          setUserVote(mine ? (mine.vote_type as 'upvote' | 'downvote') : null);
        }
      }

      // saved state
      if (me) {
        const { data: savedRow } = await supabase
          .from('saved_posts')
          .select('id')
          .eq('sp_post_id', postId)
          .eq('sp_profile_id', me)
          .maybeSingle();
        setSaved(!!savedRow);
      }
    };

    if (postId) fetchExtras();
  }, [postId, me, supabase]);

  const handleVote = async (type: 'upvote' | 'downvote') => {
    if (!me) return alert('Please login to vote.');

    if (userVote === type) {
      await supabase.from('post_votes').delete().match({ post_id: postId, profile_id: me });
      setUserVote(null);
      setVoteCounts(prev => ({
        ...prev,
        [type === 'upvote' ? 'upvotes' : 'downvotes']:
          Math.max(0, prev[type === 'upvote' ? 'upvotes' : 'downvotes'] - 1),
      }));
    } else {
      await supabase.from('post_votes').upsert(
        [{ post_id: postId, profile_id: me, vote_type: type }],
        { onConflict: 'post_id, profile_id' }
      );
      setVoteCounts(prev => {
        const up = type === 'upvote'
          ? prev.upvotes + 1
          : prev.upvotes - (userVote === 'upvote' ? 1 : 0);
        const down = type === 'downvote'
          ? prev.downvotes + 1
          : prev.downvotes - (userVote === 'downvote' ? 1 : 0);
        return { upvotes: up, downvotes: down };
      });
      setUserVote(type);
    }
  };

  // SAVE — always present (prompts login if needed)
  const handleSaveToggle = async () => {
    if (!me) return alert('Please login to save posts.');
    if (saved) {
      await supabase
        .from('saved_posts')
        .delete()
        .match({ sp_post_id: postId, sp_profile_id: me });
      setSaved(false);
    } else {
      await supabase
        .from('saved_posts')
        .insert([{ sp_post_id: postId, sp_profile_id: me }]);
      setSaved(true);
    }
  };

  // Live chat label (only used if has_live_chat is true)
  const chatLabel = useMemo(() => {
    if (liveStatus === 'ended') return '💬 View Live Chat';
    if (liveStatus === 'active') return '💬 Enter Live Chat';
    return '💬 Live Chat';
  }, [liveStatus]);

  const chatColor = liveStatus === 'ended' ? 'bg-gray-500' : 'bg-purple-600';
  const audioDisabled = liveStatus === 'ended';

  if (!post) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <button onClick={() => router.back()} className="text-blue-500 hover:underline text-sm">
          ← Back
        </button>
        <p className="mt-4 text-gray-600">Loading post…</p>
      </div>
    );
  }

  const showChat = !!post.has_live_chat; // only when owner enabled it

  // author visuals
  const authorName = post.profiles?.username ?? 'Unknown';
  const authorThumb = resolveAvatarThumb(post.profiles?.avatar_id);
  const authorInitial = (authorName || 'U').trim().charAt(0).toUpperCase();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center mb-4">
        <button onClick={() => router.back()} className="text-blue-500 hover:underline text-sm">
          ← Back
        </button>
        <h1 className="text-2xl font-bold ml-4">{post.title}</h1>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        {/* Author avatar thumb */}
        <span
          className="inline-flex items-center justify-center rounded-full overflow-hidden bg-gray-200"
          style={{ width: 24, height: 24 }}
        >
          {authorThumb ? (
            <img src={authorThumb} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[11px] text-gray-700 font-semibold">{authorInitial}</span>
          )}
        </span>

        <span>
          Posted by{' '}
          <Link href={`/user/${post.user_id}`} className="font-medium text-blue-600 hover:underline">
            {authorName}
          </Link>{' '}
          {post.created_at ? new Date(post.created_at).toLocaleString() : ''}
        </span>
      </div>

      <div className="prose max-w-none whitespace-pre-wrap mb-6">{post.content}</div>

      {/* Votes + Save (Save always visible) */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => handleVote('upvote')}
          className={userVote === 'upvote' ? 'text-green-600' : ''}
        >
          🔼
        </button>
        <span>{voteCounts.upvotes}</span>

        <button
          onClick={() => handleVote('downvote')}
          className={userVote === 'downvote' ? 'text-red-600' : ''}
        >
          🔽
        </button>
        <span>{voteCounts.downvotes}</span>

        <button
          onClick={handleSaveToggle}
          className={`ml-4 px-3 py-1 rounded ${saved ? 'bg-yellow-400 text-black' : 'bg-gray-200'}`}
        >
          {saved ? '★ Saved' : '☆ Save'}
        </button>
      </div>

      {/* Info when chat ended */}
      {showChat && liveStatus === 'ended' && (
        <div className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-amber-800">
          This live chat has ended. You can still view the messages.
        </div>
      )}

      {/* Live chat/audio rendered ONLY when has_live_chat is true */}
      {showChat && (
        <div className="flex gap-3">
          <Link
            href={`/chat/${postId}`}
            className={`${chatColor} text-white px-4 py-2 rounded hover:opacity-90`}
          >
            {chatLabel}
          </Link>

          <Link
            href={`/audio/${postId}`}
            aria-disabled={audioDisabled}
            className={`${
              audioDisabled ? 'pointer-events-none opacity-50' : ''
            } bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600`}
          >
            🎙 Start Audio Room
          </Link>
        </div>
      )}
    </div>
  );
}
