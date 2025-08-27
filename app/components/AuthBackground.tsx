'use client';

/**
 * Full-screen gradient + subtle patterns for auth pages.
 * No images—pure CSS gradients (crisp at any resolution).
 */
export default function AuthBackground() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 pointer-events-none">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_20%_-10%,rgba(255,255,255,.35),transparent),linear-gradient(135deg,#31c6df_0%,#65d5e6_18%,#79d1f1_32%,#8fc4ff_52%,#a39cf8_72%,#8b64f0_100%)]" />

      {/* Subtle dot pattern */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.35) 1px, rgba(255,255,255,0) 1px)',
          backgroundSize: '22px 22px',
          backgroundPosition: '0 0',
        }}
      />

      {/* Diagonal sheen / soft vignette */}
      <div
        className="absolute inset-0 opacity-18"
        style={{
          backgroundImage:
            'linear-gradient(115deg, rgba(255,255,255,.18) 0%, rgba(255,255,255,0) 40%)',
        }}
      />
    </div>
  );
}
