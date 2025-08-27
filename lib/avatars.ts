// lib/avatars.ts
export const AVATAR = {
  a1:  { thumb: '/avatars/a1-thumb.png'  },
  a2:  { thumb: '/avatars/a2-thumb.png'  },
  a3:  { thumb: '/avatars/a3-thumb.png'  },
  a4:  { thumb: '/avatars/a4-thumb.png'  },
  a5:  { thumb: '/avatars/a5-thumb.png'  },
  a6:  { thumb: '/avatars/a6-thumb.png'  },
  a7:  { thumb: '/avatars/a7-thumb.png'  },
  a8:  { thumb: '/avatars/a8-thumb.png'  },
  a9:  { thumb: '/avatars/a9-thumb.png'  },
  a10: { thumb: '/avatars/a10-thumb.png' },
  a11: { thumb: '/avatars/a11-thumb.png' },
} as const;

export type AvatarId = keyof typeof AVATAR;

export function resolveAvatarThumb(id?: string | null) {
  if (!id) return null;
  // guard against unknown ids
  return (AVATAR as Record<string, { thumb: string }>)?.[id]?.thumb ?? null;
}
