'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';
import { useFollowedStore } from '@/lib/followedStore';

type Visibility = 'public' | 'restricted' | 'private';

export default function CreateCommunityPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [userId, setUserId] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClientComponentClient<Database>();
  const { addFollowed } = useFollowedStore();

  // fetch logged-in user
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) setUserId(data.user.id);
    })();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return alert('User not logged in.');
    if (!name || !description) return alert('Please fill in all fields.');

    // 1) create the community (no feed_exposure_cap)
    const { data: community, error: ce } = await supabase
      .from('communities')
      .insert([
        {
          name,
          description,
          creator_id: userId,
          visibility, // 'public' | 'restricted' | 'private'
        } as any, // remove after regenerating supabase types
      ])
      .select()
      .single();

    if (ce || !community) {
      alert('Error creating community: ' + (ce?.message ?? 'Unknown error'));
      return;
    }

    // 2) add creator as OWNER + APPROVED (posting rights & admin)
    const { error: me } = await supabase.from('community_members').insert([
      {
        community_id: community.id,
        profile_id: userId,
        role: 'owner',
        status: 'approved',
      } as any,
    ]);
    if (me) console.warn('Creator owner membership insert failed:', me.message);

    // 3) keep your existing auto-follow so the sidebar updates immediately
    const { error: fe } = await supabase.from('community_followers').insert([
      { user_id: userId, community_id: community.id },
    ]);
    if (!fe) {
      // update Zustand sidebar cache
      addFollowed({
        id: community.id,
        name: community.name,
        description: community.description,
      } as any);
    }

    // 4) redirect (adjust to your community route if you like)
    router.push('/');
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white shadow rounded">
      <h1 className="text-2xl font-bold mb-6">Create a Community</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block mb-1 font-medium">Community Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            placeholder="e.g., Cambridge Cyclists"
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            rows={4}
            placeholder="What is this community about?"
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Visibility</label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as Visibility)}
            className="w-full border px-3 py-2 rounded"
          >
            <option value="public">Public — anyone can view; members can post</option>
            <option value="restricted">Restricted — anyone can view; only approved can post</option>
            <option value="private">Private — only approved members can see & post</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Create
        </button>
      </form>
    </div>
  );
}
