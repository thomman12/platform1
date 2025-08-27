'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';

type Message = Database['public']['Tables']['post_chats']['Row'] & {
  profiles: { username: string | null } | null;
};

export default function ChatPage() {
  const supabase = createClientComponentClient<Database>();
  const router = useRouter();
  const params = useParams<{ postId: string }>();
  const postId = params.postId as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [profileId, setProfileId] = useState<string | null>(null);

  const [postOwnerId, setPostOwnerId] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<'active' | 'ended' | null>(null);
  const [audioActive, setAudioActive] = useState<boolean>(false); // 👈 NEW

  const isOwner = useMemo(
    () => !!profileId && !!postOwnerId && profileId === postOwnerId,
    [profileId, postOwnerId]
  );

  // who am I
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      // profiles.id == auth.user.id
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();
      if (data) setProfileId(data.id);
    })();
  }, [supabase]);

  // fetch post owner + live status + audio flag, subscribe for changes
  useEffect(() => {
    if (!postId) return;

    (async () => {
      const { data } = await supabase
        .from('posts')
        .select('user_id, live_chat_status, audio_room_active') // 👈 include audio flag
        .eq('id', postId)
        .single();

      if (data) {
        setPostOwnerId(data.user_id ?? null);
        setLiveStatus((data as any).live_chat_status ?? null);
        setAudioActive(!!(data as any).audio_room_active);
      }
    })();

    const ch = supabase
      .channel(`post-status-${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'posts',
          filter: `id=eq.${postId}`,
        },
        (payload) => {
          const n = payload.new as any;
          if ('live_chat_status' in n) setLiveStatus(n.live_chat_status ?? null);
          if ('audio_room_active' in n) setAudioActive(!!n.audio_room_active); // 👈 live update
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [postId, supabase]);

  // load history
  useEffect(() => {
    if (!postId) return;
    (async () => {
      const { data } = await supabase
        .from('post_chats')
        .select('*, profiles ( username )')
        .eq('pc_post_id', postId)
        .order('sent_at', { ascending: true });

      setMessages((data ?? []) as Message[]);
    })();
  }, [postId, supabase]);

  // realtime inserts
  useEffect(() => {
    if (!postId) return;

    const ch = supabase
      .channel(`chat-${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'post_chats',
          filter: `pc_post_id=eq.${postId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('post_chats')
            .select('*, profiles ( username )')
            .eq('id', (payload.new as { id: string }).id)
            .single();
          if (data) setMessages((prev) => [...prev, data as Message]);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [postId, supabase]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !profileId) return;
    if (liveStatus !== 'active') return; // block when ended

    await supabase.from('post_chats').insert([
      {
        pc_post_id: postId,
        sender_id: profileId,
        message: newMessage.trim(),
      },
    ]);

    setNewMessage('');
  };

  const endLiveChat = async () => {
    if (!isOwner) return;
    await supabase
      .from('posts')
      .update({ live_chat_status: 'ended' })
      .eq('id', postId)
      .eq('user_id', profileId);
  };

  const chatEnded = liveStatus !== 'active';

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center mb-4">
        <button
          onClick={() => router.back()}
          className="text-blue-500 hover:underline text-sm"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold ml-4">💬 Live Chat</h1>

        {isOwner && (
          <button
            onClick={endLiveChat}
            className="ml-auto bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 disabled:opacity-50"
            disabled={liveStatus === 'ended'}
            title={liveStatus === 'ended' ? 'Already ended' : 'End live chat'}
          >
            End Live Chat
          </button>
        )}
      </div>

      {liveStatus === 'ended' && (
        <div className="mb-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-amber-800">
          This chat has ended. You can read past messages, but new messages are
          disabled.
        </div>
      )}

      {/* Messages */}
      <div className="border rounded p-4 h-[400px] overflow-y-scroll mb-4 bg-gray-50">
        {messages.map((msg) => (
          <div key={msg.id} className="mb-2">
            <span className="font-semibold text-blue-600">
              {msg.profiles?.username ?? 'User'}
            </span>
            <span className="text-gray-500 text-xs ml-2">
              {new Date(msg.sent_at).toLocaleTimeString()}
            </span>
            <p className="ml-2">{msg.message}</p>
          </div>
        ))}
      </div>

      {/* 🎙 / 🎧 Audio room */}
      <div className="mb-4">
        {isOwner && !audioActive && (
          <Link
            href={`/audio/${postId}`}
            className={`${
              chatEnded ? 'pointer-events-none opacity-50' : ''
            } bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 inline-block`}
            aria-disabled={chatEnded}
          >
            🎙 Start Audio Room
          </Link>
        )}

        {audioActive && (
          <Link
            href={`/audio/${postId}`}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 inline-block"
          >
            🎧 Enter Audio Room
          </Link>
        )}
      </div>

      {/* Composer */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1 border rounded p-2 disabled:bg-gray-100"
          placeholder={chatEnded ? 'Chat has ended' : 'Type your message...'}
          disabled={chatEnded}
        />
        <button
          onClick={sendMessage}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
          disabled={chatEnded}
        >
          Send
        </button>
      </div>
    </div>
  );
}
