'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

type PostInsert = Database['public']['Tables']['posts']['Insert'];
type PostStatus = 'pending' | 'published' | 'rejected' | null;

export default function CreatePostPage() {
  const router = useRouter();
  const params = useParams();
  const communityId = params.id as string;

  const supabase = createClientComponentClient<Database>();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [hasLiveChat, setHasLiveChat] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Auth
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      setSubmitting(false);
      alert('You must be logged in to create a post.');
      return;
    }

    const payload: PostInsert = {
      title,
      content,
      visibility,
      user_id: user.id,
      community_id: communityId,
      has_live_chat: hasLiveChat,
      live_chat_status: hasLiveChat ? 'active' : null,
    } as PostInsert;

    // Insert and read back the *actual* status decided by DB triggers/policies
    const { data: inserted, error } = await supabase
      .from('posts')
      .insert(payload)
      .select('id, status')
      .single();

    setSubmitting(false);

    if (error || !inserted) {
      console.error('Error creating post:', error?.message);
      alert('Failed to create post');
      return;
    }

    const newStatus = (inserted.status as PostStatus) ?? null;
    if (newStatus === 'pending') {
      alert('Your post was submitted and is awaiting moderator approval.');
    }
    // If published immediately, no moderation message.

    router.push(`/community/${communityId}`);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Create a New Post</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium mb-1">Title</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Content</label>
          <textarea
            className="w-full border rounded px-3 py-2 h-40"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium mb-1">Visibility</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="hasLiveChat"
            type="checkbox"
            checked={hasLiveChat}
            onChange={(e) => setHasLiveChat(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="hasLiveChat" className="select-none">
            Enable Live Chat for this post
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? 'Posting...' : 'Post'}
        </button>
      </form>
    </div>
  );
}
