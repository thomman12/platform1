'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';
import { useFollowedStore } from '@/lib/followedStore';

export default function Sidebar() {
  const router = useRouter();
  const supabase = createClientComponentClient<Database>();
  const { followed, setFollowed } = useFollowedStore();

  useEffect(() => {
    const supa = supabase; // stable ref for closures
    let channel: ReturnType<typeof supa.channel> | null = null;
    let uid: string | null = null;
    let cancelled = false;

    const dedupeAndSort = (list: { id: string; name: string; description: string }[]) => {
      const map = new Map<string, { id: string; name: string; description: string }>();
      for (const c of list) map.set(c.id, c);
      return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    };

    const refresh = async () => {
      if (!uid || cancelled) return;

      // 1) my approved memberships
      const { data: memRows, error: memErr } = await supa
        .from('community_members')
        .select('community_id')
        .eq('profile_id', uid)
        .eq('status', 'approved');

      if (memErr || cancelled) return;

      const ids = (memRows ?? []).map((r) => r.community_id);
      if (ids.length === 0) {
        setFollowed([]);
        return;
      }

      // 2) fetch names/descriptions
      const { data: comms } = await supa
        .from('communities')
        .select('id, name, description')
        .in('id', ids)
        .order('name', { ascending: true });

      if (!cancelled) {
        const safe = (comms ?? []).map((c: any) => ({
          id: c.id,
          name: c.name,
          description: c.description ?? '',
        }));
        setFollowed(dedupeAndSort(safe));
      }
    };

    (async () => {
      const { data } = await supa.auth.getUser();
      uid = data?.user?.id ?? null;

      if (!uid) {
        setFollowed([]);
        return;
      }

      await refresh();

      // Subscribe AFTER initial load
      channel = supa
        .channel(`cm-sidebar-${uid}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'community_members', filter: `profile_id=eq.${uid}` },
          refresh
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'community_members', filter: `profile_id=eq.${uid}` },
          refresh
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'community_members', filter: `profile_id=eq.${uid}` },
          refresh
        )
        .subscribe();
    })();

    const onVis = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      if (channel) supa.removeChannel(channel);
    };
  }, [setFollowed, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside className="w-64 min-h-screen flex flex-col justify-between p-4 border-r bg-white">
      <div>
        <Link href="/profile" className="block mb-4 text-blue-600 font-semibold hover:underline">
          👤 Profile
        </Link>

        <Link href="/home" className="block mb-6 text-gray-800 font-medium hover:text-blue-600">
          🏠 Home
        </Link>

        <Link href="/saved" className="flex items-center gap-2 p-2 hover:bg-gray-200 rounded-md">
          <span>🔖</span>
          <span>Saved Posts</span>
        </Link>

        <Link href="/create-community" className="block mb-6 text-green-600 font-semibold hover:underline">
          ➕ Create Community
        </Link>


        <Link
          href="/campus"
          className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-3 py-2 text-white hover:bg-purple-700"
        >
          Campus
        </Link>




        <div className="bg-gray-100 p-4 rounded shadow-sm">
          <h2 className="text-sm font-semibold mb-2">Communities You Follow</h2>
          <ul className="text-sm text-gray-700 space-y-1">
            {followed.length > 0 ? (
              followed.map((community) => (
                <li key={community.id}>
                  <Link href={`/community/${community.id}`} className="hover:text-blue-600 block">
                    {community.name}
                  </Link>
                </li>
              ))
            ) : (
              <li className="text-gray-500">You’re not following any communities.</li>
            )}
          </ul>
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={handleLogout}
          className="w-full py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
        >
          🚪 Logout
        </button>
      </div>
    </aside>
  );
}
