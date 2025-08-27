'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

export default function PublicProfilePage() {
  const supabase = createClientComponentClient<Database>();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const profileId = params.id as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, created_at')
        .eq('id', profileId)
        .single();

      if (!error) setProfile(data);
      setLoading(false);
    };
    if (profileId) run();
  }, [profileId, supabase]);

  if (loading) return <div className="p-6">Loading…</div>;

  if (!profile) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <button onClick={() => router.back()} className="text-blue-600 underline">
          ← Back
        </button>
        <p className="mt-4">User not found.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="text-blue-600 underline">
        ← Back
      </button>

      <h1 className="text-3xl font-bold mt-4">
        {profile.username ?? 'Unknown user'}
      </h1>

      <p className="text-gray-500 mt-2">
        Joined:{' '}
        {profile.created_at
          ? new Date(profile.created_at).toLocaleDateString()
          : '—'}
      </p>

      {/* Add more: list of this user's posts, bio, etc. */}
    </div>
  );
}
