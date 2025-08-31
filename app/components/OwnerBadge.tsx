'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

type Owner = { id: string; username: string | null; avatar_id: string | null };

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
const thumb = (id?: string | null) => (id ? AVATAR_THUMBS[id] ?? null : null);

export default function OwnerBadge({ communityId }: { communityId: string }) {
  const supabase = createClientComponentClient<Database>();
  const [owner, setOwner] = useState<Owner | null>(null);

  // initial load + realtime when creator_id changes
  useEffect(() => {
    if (!communityId) return;

    let mounted = true;

    const load = async () => {
      const { data: c } = await supabase
        .from('communities')
        .select('creator_id')
        .eq('id', communityId)
        .single();

      const id = c?.creator_id;
      if (!id) { mounted && setOwner(null); return; }

      const { data: p } = await supabase
        .from('profiles')
        .select('id, username, avatar_id')
        .eq('id', id)
        .single();

      mounted && setOwner(p ?? null);
    };

    load();

    const ch = supabase
      .channel(`comm-owner-${communityId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'communities', filter: `id=eq.${communityId}` },
        async (payload) => {
          const id = (payload.new as any).creator_id;
          if (!id) { setOwner(null); return; }
          const { data: p } = await supabase
            .from('profiles')
            .select('id, username, avatar_id')
            .eq('id', id)
            .single();
          setOwner(p ?? null);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [communityId, supabase]);

  if (!owner) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-2 rounded border">
        <span className="text-sm text-gray-600">Owner:</span>
        <span className="text-sm text-gray-400">unknown</span>
      </div>
    );
  }

  const src = thumb(owner.avatar_id);

  return (
    <div className="inline-flex items-center gap-2 px-3 py-2 rounded border">
      <span className="text-sm text-gray-600">Owner:</span>
      {src ? (
        <Image src={src} alt={owner.username ?? owner.id} width={20} height={20} className="rounded-full" />
      ) : (
        <span className="grid place-items-center w-5 h-5 rounded-full bg-purple-600 text-white text-[10px]">
          {(owner.username ?? '?').slice(0,1).toUpperCase()}
        </span>
      )}
      <span className="text-sm font-medium">{owner.username ?? owner.id}</span>
    </div>
  );
}
