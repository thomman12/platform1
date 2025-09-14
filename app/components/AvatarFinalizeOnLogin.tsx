'use client';

import { useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

type ProfilesInsert = Database['public']['Tables']['profiles']['Insert'];

export default function AvatarFinalizeOnLogin() {
  const supabase = createClientComponentClient<Database>();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) return;

      const meta = (user.user_metadata ?? {}) as Record<string, any>;
      const rawUsername = (meta.username as string | null | undefined) ?? null;
      const presetAvatarId =
        (meta.preset_avatar_id as string | null | undefined) ??
        (meta.avatar_id as string | null | undefined) ??
        null;

      // Coerce to a guaranteed string for non-nullable profiles.username
      const fallbackFromEmail =
        typeof user.email === 'string' && user.email.includes('@')
          ? user.email.split('@')[0]
          : undefined;
      const safeUsername =
        rawUsername ??
        fallbackFromEmail ??
        `user_${user.id.slice(0, 8)}`;

      // Read current profile (preserve existing avatar if present)
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, username, avatar_id')
        .eq('id', user.id)
        .maybeSingle();

      const row: ProfilesInsert = {
        id: user.id,
        username: safeUsername,                       // <- never null
        avatar_id: presetAvatarId ?? prof?.avatar_id ?? null,
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(row, { onConflict: 'id' });

      if (error) {
        // optional: surface somewhere if you render UI here
        // console.error('Finalize profile failed:', error.message);
      }

      if (!cancelled) {
        // nothing to render
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  return null;
}
