'use client';

type Props = {
  title?: string;
  className?: string;
};

/**
 * Brand header for auth pages.
 * - Mascot scales with viewport width (fluid), but clamped to sensible min/max.
 * - Title is responsive too.
 */
export default function AuthBrand({ title = 'Orbio', className = '' }: Props) {
  return (
    <div className={`mb-6 md:mb-8 flex flex-col items-center select-none ${className}`}>
      <img
        src="/brand/orbio-head.svg"
        alt="Orbio mascot"
        draggable={false}
        className="
          h-auto
          w-[20vw]          /* fluid with screen */
          max-w-[180px]     /* don’t get too large on desktops */
          min-w-[80px]      /* don’t get too tiny on phones */
          drop-shadow-[0_6px_16px_rgba(0,0,0,0.15)]
          transition-transform duration-300 hover:scale-105
        "
      />
      <h1
        className="
          mt-3
          text-3xl md:text-4xl
          font-black tracking-tight
          text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]
        "
      >
        {title}
      </h1>
    </div>
  );
}
