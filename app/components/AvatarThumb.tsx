'use client';
import { resolveAvatarThumb } from '@/lib/avatars';

export default function AvatarThumb({
  avatarId,
  size = 40,
  alt = 'Avatar',
  className = '',
}: {
  avatarId?: string | null;
  size?: number;
  alt?: string;
  className?: string;
}) {
  const src = resolveAvatarThumb(avatarId);

  return (
    <div
      className={`rounded-full overflow-hidden bg-gray-200 flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-label={alt}
    >
      {src ? (
        // plain <img> is fine for static public assets
        <img src={src} alt={alt} className="w-full h-full object-cover" draggable={false} />
      ) : (
        <span className="text-xs text-gray-600">🙂</span>
      )}
    </div>
  );
}
