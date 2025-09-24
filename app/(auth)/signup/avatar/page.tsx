// app/(auth)/signup/avatar/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

type SignupForm = { email: string; password: string; username: string };
type SignupFlow = 'normal' | 'student' | 'student_sso';
type AnimState = 'idle' | 'prep' | 'launching' | 'done';

type AvatarItem = { id: string; thumb: string; full: string };

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

function getCheckEmailHref(): string {
  try {
    const raw = sessionStorage.getItem('signupForm');
    const email = raw ? (JSON.parse(raw).email as string | undefined) : undefined;
    const flow = (sessionStorage.getItem('signupFlow') as SignupFlow | null) ?? 'normal';
    const qs = new URLSearchParams();
    if (email) qs.set('e', email);
    qs.set('flow', flow === 'student' ? 'student_sso' : flow);
    return `/signup/check-email?${qs.toString()}`;
  } catch {
    return '/signup/check-email';
  }
}
function nextDestForFlow(): string { return getCheckEmailHref(); }

export default function SignupAvatarPage() {
  const router = useRouter();
  const supabase = createClientComponentClient<Database>();

  const [form, setForm] = useState<SignupForm | null>(null);
  const [flow, setFlow] = useState<SignupFlow>('normal');

  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [anim, setAnim] = useState<AnimState>('idle');
  const signupPromiseRef = useRef<Promise<void> | null>(null);

  const stageImgRef = useRef<HTMLImageElement | null>(null);
  const [overlay, setOverlay] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const rocketRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (anim !== 'launching') return;
    let raf = 0;
    const start = performance.now();
    const go = async () => {
      try {
        if (signupPromiseRef.current) await signupPromiseRef.current;
        router.push(nextDestForFlow());
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
      if (el && el.getBoundingClientRect().bottom <= 0) return void go();
      if (performance.now() - start > 12000) return void go();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [anim, router]);

  useEffect(() => {
    const raw = sessionStorage.getItem('signupForm');
    const f = (sessionStorage.getItem('signupFlow') as SignupFlow | null) ?? 'normal';
    setFlow(f);
    if (!raw) return router.replace('/signup');
    try {
      const parsed: SignupForm | null = JSON.parse(raw);
      setForm(parsed);
      setSelected(AVATARS[0]?.id ?? null);
    } catch {
      router.replace('/signup');
    }
  }, [router]);

  const stageId = useMemo(() => hovered ?? selected ?? AVATARS[0]?.id, [hovered, selected]);
  const stageItem = AVATARS.find((a) => a.id === stageId);

  /**
   * NEW: After Supabase signUp, if flow === 'student', also call /api/verification/create
   * to send the link + 6-digit code with the selected institution.
   */
  async function signUp(): Promise<void> {
    if (!form || !selected) throw new Error('Please choose an avatar.');

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          username: form.username,
          preset_avatar_id: selected,
          claimed_student: flow === 'student' || flow === 'student_sso',
        },
      },
    });
    if (error) throw error;

    // Keep user id for resend on check-email
    try { if (data?.user?.id) sessionStorage.setItem('signupUserId', data.user.id); } catch {}

    // --- NEW: student flow triggers our verification email (link + code) ---
    if (flow === 'student') {
      const selectedInstitutionId = sessionStorage.getItem('studentSelectedInstitutionId');
      const studentEmail = sessionStorage.getItem('studentEmail') ?? form.email;

      if (!selectedInstitutionId) {
        throw new Error('Missing university selection. Please go back and choose your university.');
      }

      const res = await fetch('/api/verification/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: studentEmail,
          selectedInstitutionId,
          user_id: data?.user?.id ?? null,
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.message || 'Could not send verification email.');
      }
    }
    // --- END NEW ---
  }

  async function onFinish() {
    if (!selected) return setError('Please choose an avatar.');
    setError(null);
    setBusy(true);
    if (!form) { setBusy(false); return setError('Missing signup form.'); }
    signupPromiseRef.current = signUp();

    // animation prep
    const el = stageImgRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
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
      router.push(nextDestForFlow());
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong.');
      setBusy(false);
      setAnim('idle');
      if (stageImgRef.current) stageImgRef.current.style.visibility = 'visible';
      setOverlay(null);
    }
  }

  // FX (unchanged) ...
  const PUFF_COUNT = 32;
  const smokePuffs = Array.from({ length: PUFF_COUNT }).map((_, i) => {
    const style: React.CSSProperties & any = { '--d': `${i * 0.08}s`, '--x': `${(i % 9 - 4) * 6}px`, '--s': `${22 + (i % 6) * 4}px` };
    return <span key={`p-${i}`} className="smoke-puff" style={style} />;
  });
  const GROUND_COUNT = 60;
  const groundPuffs = Array.from({ length: GROUND_COUNT }).map((_, i) => {
    const spread = i - (GROUND_COUNT - 1) / 2;
    const style: React.CSSProperties & any = { '--gx': `${spread * 18}px`, '--gs': `${60 + (Math.abs(spread) % 7) * 10}px`, '--gd': `${Math.random() * 0.18 + Math.abs(spread) * 0.01}s` };
    return <span key={`g-${i}`} className="ground-cloud" style={style} />;
  });

  const helperText = `We’ll email a link and a 6-digit code to ${form?.email}. Use them to confirm your account.`;

  return (
    <div className="min-h-screen w-screen overflow-hidden flex flex-col">
      <div className="flex-1 flex items-end justify-center pb-[100px] md:pb-[120px]">
        {stageItem ? (
          <img ref={stageImgRef} src={stageItem.full} alt="Avatar preview" draggable={false}
               className="object-contain select-none pointer-events-none max-h-[36vh] md:max-h-[38vh]" />
        ) : <div className="text-gray-400">Preview</div>}
      </div>

      <div className="fixed left-0 right-0 bottom-0 z-40">
        <div className="mx-auto max-w-3xl px-4">
          <div className="rounded-xl border bg-white/95 backdrop-blur p-3 md:p-4 shadow-md">
            <h2 className="text-xs md:text-sm font-medium text-gray-700 mb-2 text-center">Choose your avatar</h2>
            <div className="flex flex-wrap justify-center gap-2.5 md:gap-3">
              {AVATARS.map((a) => {
                const isSelected = a.id === selected;
                return (
                  <button key={a.id} onClick={() => setSelected(a.id)}
                          onMouseEnter={() => setHovered(a.id)}
                          onMouseLeave={() => setHovered(prev => (prev === a.id ? null : prev))}
                          className={['h-12 w-12 md:h-12 md:w-12 rounded-full overflow-hidden border transition',
                            isSelected ? 'ring-2 ring-blue-500 border-blue-500' : 'hover:border-gray-400 border-gray-200'].join(' ')}
                          aria-pressed={isSelected}>
                    <img src={a.thumb} alt="" className="h-full w-full object-cover" draggable={false} />
                  </button>
                );
              })}
            </div>

            <div className="mt-3 md:mt-4 flex items-center justify-center gap-2">
              <button onClick={onFinish} disabled={!selected || anim !== 'idle' || busy}
                      className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
                {anim === 'idle' ? 'Finish' : 'Launching…'}
              </button>
              <button onClick={() => history.back()} className="px-4 py-2 rounded border text-sm" disabled={busy}>Back</button>
            </div>

            {error && <p className="mt-2 text-xs md:text-sm text-red-600 text-center">{error}</p>}
            <p className="mt-2 text-[11px] md:text-xs text-gray-500 text-center">{helperText}</p>
          </div>
        </div>
      </div>

      {(anim === 'prep' || anim === 'launching') && overlay && stageItem?.full && (
        <div className="fixed inset-0 z-30 pointer-events-none">
          <div className="absolute" style={{ top: overlay.top, left: overlay.left, width: overlay.width, height: overlay.height }}>
            <div ref={rocketRef} className={['relative w-full h-full flex items-center justify-center will-change-transform',
              anim === 'prep' ? 'anticipate' : '', anim === 'launching' ? 'dramatic-liftoff' : ''].join(' ')}
                 onAnimationEnd={onLaunchEnd}>
              {anim === 'launching' && <div className="bubble-right pop-only">See you in there</div>}
              <img src={stageItem.full} alt="launching avatar" className="max-h-full object-contain select-none" draggable={false} />
              <div className={`flame ${anim === 'launching' ? 'flame-on' : ''}`} />
              {anim === 'launching' && <div className="smoke">{smokePuffs}</div>}
            </div>
          </div>
          {anim === 'launching' && (
            <div className="absolute bottom-[100px] left-1/2 -translate-x-1/2 z-20">
              <div className="shockwave" />
              <div className="ground-smoke">{groundPuffs}</div>
              <div className="pad-haze" />
            </div>
          )}
        </div>
      )}

      {/* styles for FX omitted for brevity (same as yours) */}
    </div>
  );
}
