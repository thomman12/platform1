'use client';

import { useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

export default function AvatarFinalizeOnLogin() {
  const supabase = createClientComponentClient<Database>();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const presetId = (user.user_metadata as any)?.preset_avatar_id as string | undefined;
      const username = (user.user_metadata as any)?.username as string | undefined;
      if (!presetId && !username) return;

      const { data: prof } = await supabase
        .from('profiles')
        .select('id, avatar_id')
        .eq('id', user.id)
        .maybeSingle();

      if (prof?.avatar_id) return;

      await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username: username ?? null,
          avatar_id: presetId ?? null,
        })
        .select()
        .single();
    })();
  }, [supabase]);

  return null;
}
