'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

type SignupForm = { email: string; password: string; username: string };
type AvatarItem  = { id: string; thumb: string; full: string };

const AVATARS: AvatarItem[] = [
  { id: 'a1',  thumb: '/avatars/thumbs/a1-thumb.png',  full: '/avatars/full/a1-full.png'  },
  { id: 'a2',  thumb: '/avatars/thumbs/a2-thumb.png',  full: '/avatars/full/a2-full.png'  },
  { id: 'a3',  thumb: '/avatars/thumbs/a3-thumb.png',  full: '/avatars/full/a3-full.png'  },
  { id: 'a4',  thumb: '/avatars/thumbs/a4-thumb.png',  full: '/avatars/full/a4-full.png'  },
  { id: 'a5',  thumb: '/avatars/thumbs/a5-thumb.png',  full: '/avatars/full/a5-full.png'  },
  { id: 'a6',  thumb: '/avatars/thumbs/a6-thumb.png',  full: '/avatars/full/a6-full.png'  },
  { id: 'a7',  thumb: '/avatars/thumbs/a7-thumb.png',  full: '/avatars/full/a7-full.png'  },
  { id: 'a8',  thumb: '/avatars/thumbs/a8-thumb.png',  full: '/avatars/full/a8-full.png'  },
  { id: 'a9',  thumb: '/avatars/thumbs/a9-thumb.png',  full: '/avatars/full/a9-full.png'  },
  { id: 'a10', thumb: '/avatars/thumbs/a10-thumb.png', full: '/avatars/full/a10-full.png' },
  { id: 'a11', thumb: '/avatars/thumbs/a11-thumb.png', full: '/avatars/full/a11-full.png' },
];

type AnimState = 'idle' | 'prep' | 'launching' | 'done';

export default function SignupAvatarPage() {
  const router   = useRouter();
  const supabase = createClientComponentClient<Database>();

  const [form, setForm] = useState<SignupForm | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered]   = useState<string | null>(null);
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const [anim, setAnim] = useState<AnimState>('idle');
  const signupPromiseRef = useRef<Promise<void> | null>(null);

  const stageImgRef = useRef<HTMLImageElement | null>(null);
  const [overlay, setOverlay] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const rocketRef = useRef<HTMLDivElement | null>(null);


useEffect(() => {
  if (anim !== 'launching') return;

  let raf = 0;
  const start = performance.now();

  const goToLogin = async () => {
    try {
      if (signupPromiseRef.current) await signupPromiseRef.current;
      router.push('/login');
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong.');
      setBusy(false);
      setAnim('idle');
      if (stageImgRef.current) stageImgRef.current.style.visibility = 'visible';
      setOverlay(null);
    }
  };

  const tick = () => {
    const el = rocketRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      // fully off the top?
      if (rect.bottom <= 0) {
        goToLogin();
        return;
      }
    }
    // hard failsafe after ~12s
    if (performance.now() - start > 12000) {
      goToLogin();
      return;
    }
    raf = requestAnimationFrame(tick);
  };

  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}, [anim, router]);



  useEffect(() => {
    const raw = sessionStorage.getItem('signupForm');
    if (!raw) return router.replace('/signup');
    try {
      const parsed: SignupForm = JSON.parse(raw);
      setForm(parsed);
      setSelected(AVATARS[0]?.id ?? null);
    } catch {
      router.replace('/signup');
    }
  }, [router]);

  const stageId   = useMemo(() => hovered ?? selected ?? AVATARS[0]?.id, [hovered, selected]);
  const stageItem = AVATARS.find(a => a.id === stageId);

  function signUpNow(): Promise<void> {
    if (!form || !selected) return Promise.reject(new Error('Please choose an avatar.'));
    return supabase.auth
      .signUp({
        email: form.email,
        password: form.password,
        options: { data: { username: form.username, preset_avatar_id: selected } },
      })
      .then(({ error }) => { if (error) throw error; });
  }

  async function onFinish() {
    if (!form || !selected) { setError('Please choose an avatar.'); return; }
    setError(null);

    signupPromiseRef.current = signUpNow();

    const el = stageImgRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      // start a touch above the dock so it doesn’t look like it emerges from inside it
      setOverlay({ top: rect.top - 10, left: rect.left, width: rect.width, height: rect.height });
      el.style.visibility = 'hidden';
    }

    setAnim('prep');
    setTimeout(() => setAnim('launching'), 900);
  }

  async function onLaunchEnd() {
    if (anim !== 'launching') return;
    setAnim('done');
    try {
      if (signupPromiseRef.current) await signupPromiseRef.current;
      router.push('/login');
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong.');
      setBusy(false);
      setAnim('idle');
      if (stageImgRef.current) stageImgRef.current.style.visibility = 'visible';
      setOverlay(null);
    }
  }

  /* Rising smoke puffs (follow rocket) */
  const PUFF_COUNT = 32;
  const smokePuffs = Array.from({ length: PUFF_COUNT }).map((_, i) => {
    const delay = i * 0.08;
    const drift = (i % 9 - 4) * 6;
    const size  = 22 + (i % 6) * 4;
    const style: React.CSSProperties & any = {
      '--d': `${delay}s`,
      '--x': `${drift}px`,
      '--s': `${size}px`,
    };
    return <span key={`p-${i}`} className="smoke-puff" style={style} />;
  });

  /* Ground bloom cloud (anchored to pad, NOT moving) */
  const GROUND_COUNT = 60;
  const groundPuffs = Array.from({ length: GROUND_COUNT }).map((_, i) => {
    const spread = (i - (GROUND_COUNT - 1) / 2);
    const gx = spread * 18;                            // wider spread
    const gs = 60 + (Math.abs(spread) % 7) * 10;      // bigger puffs
    const gd = Math.random() * 0.18 + Math.abs(spread) * 0.01; // quick stagger
    const style: React.CSSProperties & any = {
      '--gx': `${gx}px`,
      '--gs': `${gs}px`,
      '--gd': `${gd}s`,
    };
    return <span key={`g-${i}`} className="ground-cloud" style={style} />;
  });

  return (
   <div className="min-h-screen w-screen overflow-hidden flex flex-col">
      {/* Stage (above the dock) */}
      <div className="flex-1 flex items-end justify-center pb-[100px] md:pb-[120px]">
        {stageItem ? (
          <img
            ref={stageImgRef}
            src={stageItem.full}
            alt="Avatar preview"
            draggable={false}
            className="object-contain select-none pointer-events-none max-h-[36vh] md:max-h-[38vh]"
          />
        ) : (
          <div className="text-gray-400">Preview</div>
        )}
      </div>

      {/* Bottom picker dock */}
      <div className="fixed left-0 right-0 bottom-0 z-40">
        <div className="mx-auto max-w-3xl px-4">
          <div className="rounded-xl border bg-white/95 backdrop-blur p-3 md:p-4 shadow-md">
            <h2 className="text-xs md:text-sm font-medium text-gray-700 mb-2 text-center">Choose your avatar</h2>
            <div className="flex flex-wrap justify-center gap-2.5 md:gap-3">
              {AVATARS.map(a => {
                const isSelected = a.id === selected;
                return (
                  <button
                    key={a.id}
                    onClick={() => setSelected(a.id)}
                    onMouseEnter={() => setHovered(a.id)}
                    onMouseLeave={() => setHovered(prev => (prev === a.id ? null : prev))}
                    className={[
                      'h-12 w-12 md:h-12 md:w-12 rounded-full overflow-hidden border transition',
                      isSelected ? 'ring-2 ring-blue-500 border-blue-500' : 'hover:border-gray-400 border-gray-200',
                    ].join(' ')}
                    aria-pressed={isSelected}
                  >
                    <img src={a.thumb} alt="" className="h-full w-full object-cover" draggable={false} />
                  </button>
                );
              })}
            </div>

            <div className="mt-3 md:mt-4 flex items-center justify-center gap-2">
              <button
                onClick={onFinish}
                disabled={!selected || anim !== 'idle' || busy}
                className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {anim === 'idle' ? 'Finish' : 'Launching…'}
              </button>
              <button onClick={() => history.back()} className="px-4 py-2 rounded border text-sm" disabled={busy}>
                Back
              </button>
            </div>

            {error && <p className="mt-2 text-xs md:text-sm text-red-600 text-center">{error}</p>}
            <p className="mt-2 text-[11px] md:text-xs text-gray-500 text-center">
              We’ll launch your avatar 🚀 then take you to login.
            </p>
          </div>
        </div>
      </div>

      {/* Launch overlay: behind dock (z-30) */}
      {(anim === 'prep' || anim === 'launching') && overlay && stageItem?.full && (
        <div className="fixed inset-0 z-30 pointer-events-none">
          {/* 🚀 Rocket + flame + rising smoke (this lifts off) */}
          <div
            className="absolute"
            style={{ top: overlay.top, left: overlay.left, width: overlay.width, height: overlay.height }}
          >
            <div
              ref={rocketRef}
              className={[
              'relative w-full h-full flex items-center justify-center will-change-transform',
              anim === 'prep' ? 'anticipate' : '',
              anim === 'launching' ? 'dramatic-liftoff' : '',
              ].join(' ')}
            >

              {anim === 'launching' && (
                <div className="bubble-right pop-only">See you in there</div>
              )}

              <img
                src={stageItem.full}
                alt="launching avatar"
                className="max-h-full object-contain select-none"
                draggable={false}
              />

              {/* 🔥 flame + rising smoke follow the rocket */}
              <div className={`flame ${anim === 'launching' ? 'flame-on' : ''}`} />
              {anim === 'launching' && <div className="smoke">{smokePuffs}</div>}
            </div>
          </div>

          {/* 🌫 Ground smoke & shockwave (anchored to pad, independent) */}
          {anim === 'launching' && (
            <div className="absolute bottom-[100px] left-1/2 -translate-x-1/2 z-20">
              <div className="shockwave" />
              <div className="ground-smoke">{groundPuffs}</div>
              <div className="pad-haze" />
            </div>
          )}
        </div>
      )}

      {/* Animations / styles */}
      <style jsx global>{`
        /* anticipation wobble */
        @keyframes anticipateMotion {
          0% { transform: translateY(0) scale(1); }
          50% { transform: translateY(6px) scale(0.97,0.98); }
          100% { transform: translateY(0) scale(1); }
        }
        /* dramatic, slower liftoff */
        @keyframes liftoff {
          0%   { transform: translateY(0);        opacity: 1; }
          40%  { transform: translateY(-40vh);    opacity: 1; }
          80%  { transform: translateY(-110vh);   opacity: 1; } 
          100% { transform: translateY(-200vh);   opacity: 1; }
        }
        .anticipate { animation: anticipateMotion 0.9s ease-in-out both; }
        .dramatic-liftoff { animation: liftoff 9s cubic-bezier(0.22, 1, 0.36, 1) forwards; }

        /* flame */
        .flame {
          position:absolute; bottom:-18px; left:50%; transform:translateX(-50%);
          width:18px; height:48px; border-radius:9px;
          background: radial-gradient(circle at 50% 80%, rgba(255,210,60,0.95), rgba(255,140,0,0.9) 60%, rgba(255,120,0,0) 72%);
          opacity:0;
          filter: drop-shadow(0 4px 8px rgba(255,120,0,0.35));
        }
        .flame-on { opacity:1; animation: flicker 0.18s infinite alternate; }
        @keyframes flicker { from { transform:translateX(-50%) scaleY(0.9); } to { transform:translateX(-50%) scaleY(1.12); } }

        /* big right-side bubble */
        .bubble-right {
          position:absolute;
          top: 22%;
          left: calc(100% + 16px);
          background:#fff; color:#000; font-weight:800; font-size:1.15rem;
          border:3px solid #000; border-radius:14px; padding:10px 14px; white-space:nowrap;
          box-shadow: 0 2px 6px rgba(0,0,0,0.08);
        }
        .bubble-right::after {
          content:""; position:absolute; top:50%; left:-12px; transform:translateY(-50%);
          width:0; height:0; border:12px solid transparent; border-right-color:#fff;
          filter: drop-shadow(-3px 0 0 #000);
        }
        @keyframes bubblePop {
          0% { opacity:0; transform: translate(0, 6px) scale(0.96); }
          25% { opacity:1; transform: translate(0, 0) scale(1); }
          70% { opacity:1; }
          100% { opacity:0; transform: translate(0, -6px) scale(0.98); }
        }
        .pop-only { animation: bubblePop 1.8s ease-out forwards; }

        /* --- RISING SMOKE --- */
        .smoke {
          position:absolute;
          bottom:-4px;
          left:50%; transform:translateX(-50%);
          width:140px; height:90px; pointer-events:none;
          filter: blur(2px);
        }
        .smoke-puff {
          position:absolute; bottom:0; left:50%;
          width: var(--s, 22px); height: var(--s, 22px);
          margin-left: calc(var(--s, 22px) / -2);
          border-radius: 999px;
          background: radial-gradient(circle at 40% 40%, rgba(255,255,255,0.9), rgba(200,200,200,0.55) 60%, rgba(200,200,200,0.0) 75%);
          opacity:0;
          animation: smokeRise 2.2s ease-out var(--d, 0s) forwards;
        }
        @keyframes smokeRise {
          0%   { transform: translate(var(--x, 0px), 10px) scale(0.6); opacity:0; }
          10%  { opacity:0.55; }
          50%  { transform: translate(calc(var(--x, 0px) * 1.2), -25px) scale(1); opacity:0.75; }
          100% { transform: translate(calc(var(--x, 0px) * 1.8), -70px) scale(1.25); opacity:0; }
        }

        /* --- GROUND BLOOM (violent) --- */
        .ground-smoke {
          position:absolute;
          bottom:-8px;
          left:50%; transform:translateX(-50%);
          width:560px; height:170px; pointer-events:none;
          filter: blur(3px);
        }
        .ground-cloud {
          position:absolute; bottom:0;
          left: calc(50% + var(--gx, 0px));
          width: var(--gs, 60px); height: var(--gs, 60px);
          margin-left: calc(var(--gs, 60px) / -2);
          border-radius: 9999px;
          background: radial-gradient(circle at 50% 50%, rgba(235,235,235,0.95), rgba(185,185,185,0.62) 60%, rgba(180,180,180,0.0) 75%);
          opacity:0;
          animation: groundBlast 2.6s cubic-bezier(0.2, 0.7, 0.1, 1) var(--gd, 0s) forwards;
        }
        /* fast shove sideways, then linger & fade */
        @keyframes groundBlast {
          0%   { transform: translateY(12px) scale(0.6); opacity:0; }
          10%  { opacity:0.85; transform: translateY(2px) scale(1.05); }
          30%  { transform: translateY(0px) scale(1.2); opacity:0.98; }
          60%  { transform: translateY(4px) scale(1.35); opacity:0.9; }
          100% { transform: translateY(10px) scale(1.55); opacity:0; }
        }

        /* Low pad haze sheet, expands quickly then drifts */
        .pad-haze {
          position:absolute; bottom:-10px; left:50%; transform:translateX(-50%);
          width: 700px; height: 120px; border-radius: 50%;
          background: radial-gradient(ellipse at center, rgba(220,220,220,0.8) 0%, rgba(205,205,205,0.6) 55%, rgba(210,210,210,0) 72%);
          filter: blur(6px);
          opacity:0;
          animation: padSpread 3.1s ease-out 0.05s forwards;
        }
        @keyframes padSpread {
          0%   { transform: translateX(-50%) scale(0.7, 0.55); opacity:0; }
          20%  { opacity:0.75; }
          55%  { transform: translateX(-50%) scale(1.35, 0.95); opacity:0.9; }
          100% { transform: translateX(-50%) scale(1.9, 1.05); opacity:0; }
        }

        /* Shockwave ring for punch */
        .shockwave {
          position:absolute; bottom:-6px; left:50%; transform:translateX(-50%);
          width: 40px; height: 12px; border-radius: 999px;
          border: 3px solid rgba(230,230,230,0.8);
          filter: blur(1px);
          opacity:0;
          animation: shock 0.7s ease-out 0.05s forwards;
        }
        @keyframes shock {
          0%   { opacity:0.0; transform:translateX(-50%) scaleX(0.6); }
          15%  { opacity:0.8; }
          100% { opacity:0; transform:translateX(-50%) scaleX(9); }
        }
      `}</style>
    </div>
  );
}
