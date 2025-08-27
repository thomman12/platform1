'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';
import Peer from 'simple-peer';

type Role = 'speaker' | 'listener';
type PresenceParticipant = { ap_profile_id: string; role: Role };

/* ---------- Remote audio element (attach via ref, iOS-safe) ---------- */
function RemoteAudio({ id, stream }: { id: string; stream: MediaStream }) {
  const ref = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // @ts-ignore
    el.srcObject = stream;

    let cancelled = false;

    const tryPlay = () => {
      if (!el || cancelled) return;
      const p = el.play();
      if (p?.catch) {
        p.catch((err: any) => {
          const name = err?.name || '';
          if (!/AbortError|NotAllowedError|OperationError/i.test(name)) {
            console.debug(`[${id}] audio.play warning:`, err);
          }
        });
      }
    };

    el.addEventListener('loadedmetadata', tryPlay, { once: true });
    tryPlay();

    const resume = () => tryPlay();
    document.addEventListener('visibilitychange', resume);

    return () => {
      cancelled = true;
      el.removeEventListener('loadedmetadata', tryPlay);
      document.removeEventListener('visibilitychange', resume);
      // @ts-ignore
      el.srcObject = null;
    };
  }, [stream, id]);

  return <audio ref={ref} id={`remote-audio-${id}`} autoPlay playsInline />;
}

/* Tie-breaker for who initiates */
function isInitiator(myId: string, remoteId: string) {
  return myId < remoteId;
}

export default function AudioRoomPage() {
  const supabase = createClientComponentClient<Database>();
  const router = useRouter();
  const { postId } = useParams<{ postId: string }>();

  // auth/owner
  const [profileId, setProfileId] = useState<string | null>(null);
  const [postOwnerId, setPostOwnerId] = useState<string | null>(null);
  const isOwner = !!profileId && !!postOwnerId && profileId === postOwnerId;

  // presence + my role
  const [participants, setParticipants] = useState<PresenceParticipant[]>([]);
  const [myRole, setMyRole] = useState<Role>('listener');

  // rtc
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Record<string, Peer.Instance>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

  // track if we've already set room active this session
  const madeActiveOnceRef = useRef(false);

  // HMR guard (don’t teardown on Fast Refresh)
  const isDev = process.env.NODE_ENV === 'development';
  const hmrDisposingRef = useRef(false);
  useEffect(() => {
    if (isDev && typeof module !== 'undefined' && (module as any).hot?.addStatusHandler) {
      const hot: any = (module as any).hot;
      const handler = (status: string) => {
        if (status === 'dispose') hmrDisposingRef.current = true;
        if (status === 'apply' || status === 'idle') hmrDisposingRef.current = false;
      };
      hot.addStatusHandler(handler);
      return () => {
        try { hot.removeStatusHandler?.(handler); } catch {}
      };
    }
  }, [isDev]);

  /* ---------------- Auth ---------------- */
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setProfileId(user.id);
      console.log('[auth] me:', user.id);
    })();
  }, [router, supabase]);

  /* -------------- Post owner -------------- */
  useEffect(() => {
    if (!postId) return;
    (async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .single();
      if (!error && data) {
        setPostOwnerId(data.user_id as string);
        console.log('[post] owner:', data.user_id);
      }
    })();
  }, [postId, supabase]);

  /* ---------- helpers to flip audio_room_active on posts ---------- */
  const setRoomActive = async (active: boolean) => {
    try {
      await supabase
        .from('posts')
        .update({ audio_room_active: active })
        .eq('id', postId)
        .eq('user_id', postOwnerId!); // only the owner record should flip it
      console.log('[room]', active ? 'activated' : 'deactivated');
    } catch (e) {
      console.warn('setRoomActive failed', e);
    }
  };

  /* -------- Presence + signaling wiring -------- */
  useEffect(() => {
    if (!profileId || !postId) return;

    const channel = supabase.channel(`audio-room-${postId}`, {
      config: { presence: { key: profileId } },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState() as Record<string, Array<{ role: Role }>>;
      const flat: PresenceParticipant[] = [];
      for (const uid in state) {
        const meta = state[uid][0];
        flat.push({ ap_profile_id: uid, role: uid === profileId ? myRole : meta.role });
      }
      console.log('[presence] participants:', flat);
      setParticipants(flat);
    });

    channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
      const { from, data } = payload as { from: string; data: any };
      if (from === profileId) return;
      console.log('[signal] from', from, 'type', data?.type || Object.keys(data || {}));

      if (!peersRef.current[from]) {
        const i = isInitiator(profileId!, from);
        peersRef.current[from] = createPeer(i && false, from); // if we got a signal, be responder
        if (myRole === 'speaker' && localStreamRef.current) {
          attachLocalTracksToPeer(peersRef.current[from], localStreamRef.current);
        }
      }
      peersRef.current[from].signal(data);
    });

    channel.subscribe(async (status) => {
      if (status !== 'SUBSCRIBED') return;
      const state = channel.presenceState() as Record<string, any[]>;
      if (!state[profileId]) {
        const initial: Role = isOwner ? 'speaker' : 'listener';
        console.log('[presence] initial track:', { role: initial });
        setMyRole(initial);
        await channel.track({ role: initial });

        // If owner auto-starts as speaker, flip flag true once
        if (initial === 'speaker' && isOwner && !madeActiveOnceRef.current) {
          madeActiveOnceRef.current = true;
          void setRoomActive(true);
        }
      }
    });

    channelRef.current = channel;

    return () => {
      if (isDev && hmrDisposingRef.current) return; // keep call alive on Fast Refresh
      try { channel.unsubscribe(); } catch {}
      channelRef.current = null;
      Object.values(peersRef.current).forEach((p) => { try { p.destroy(); } catch {} });
      peersRef.current = {};
      stopMic();
      setRemoteStreams({});

      // When owner leaves the room, mark inactive
      if (isOwner) void setRoomActive(false);
    };
  }, [profileId, postId, isOwner, myRole, supabase, isDev]);

  /* --------- Build peers more aggressively ---------
     Connect to ANY remote where (I am a speaker) OR (they are a speaker).
     The initiator is decided deterministically by id ordering. */
  useEffect(() => {
    if (!profileId) return;

    const candidates = participants
      .filter(p => p.ap_profile_id !== profileId)
      .filter(p => myRole === 'speaker' || p.role === 'speaker');

    console.log('[peer-plan]', {
      me: profileId, myRole,
      connectTo: candidates.map(c => ({ id: c.ap_profile_id, role: c.role }))
    });

    candidates.forEach((p) => {
      const rid = p.ap_profile_id;
      if (!peersRef.current[rid]) {
        const i = isInitiator(profileId!, rid);
        console.log('[peer-create]', { to: rid, initiator: i, remoteRole: p.role });
        peersRef.current[rid] = createPeer(i, rid);
        if (myRole === 'speaker' && localStreamRef.current) {
          attachLocalTracksToPeer(peersRef.current[rid], localStreamRef.current);
        }
      }
    });

    // Debounced mic control to ignore role flicker
    let cancelled = false;
    const t = window.setTimeout(async () => {
      if (cancelled) return;
      if (myRole === 'speaker') {
        await startMic(); // attaches to existing peers
      } else {
        stopMic();
      }
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [participants, myRole, profileId]);

  /* ------------------- WebRTC helpers ------------------- */
  function createPeer(initiator: boolean, remoteId: string) {
    const peer = new Peer({
      initiator,
      trickle: true,
      config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },
    });

    // logs
    peer.on('connect', () => console.log(`[${remoteId}] peer: connect`));
    peer.on('close',   () => console.log(`[${remoteId}] peer: close`));
    peer.on('error',   (e) => console.log(`[${remoteId}] peer: error`, e));

    // Inspect underlying RTCPeerConnection for state logs + auto-rebuild
    // @ts-ignore
    const pc: RTCPeerConnection | undefined = (peer as any)._pc;
    if (pc) {
      pc.addEventListener('iceconnectionstatechange', () => {
        console.log(`[${remoteId}] ICE state:`, pc.iceConnectionState);
        if (['failed', 'disconnected'].includes(pc.iceConnectionState)) {
          setTimeout(() => attemptRebuild(remoteId), 1500);
        }
      });
      pc.addEventListener('connectionstatechange', () => {
        console.log(`[${remoteId}] PC state:`, pc.connectionState);
        if (['failed', 'disconnected'].includes(pc.connectionState)) {
          setTimeout(() => attemptRebuild(remoteId), 1500);
        }
      });
    }

    peer.on('signal', (signal) => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'signal',
        payload: { from: profileId, data: signal },
      });
    });

    // Capture remote audio robustly
    peer.on('stream', (remoteStream) => attachRemote(remoteId, remoteStream));
    // @ts-ignore
    peer.on('track', (_track: MediaStreamTrack, stream: MediaStream) => attachRemote(remoteId, stream));

    return peer;
  }

  function attemptRebuild(remoteId: string) {
    const current = peersRef.current[remoteId];
    if (!current) return;
    console.log(`[${remoteId}] rebuilding peer...`);

    try { current.destroy(); } catch {}
    delete peersRef.current[remoteId];
    setRemoteStreams((prev) => { const { [remoteId]: _gone, ...rest } = prev; return rest; });

    if (!profileId) return;
    const i = isInitiator(profileId, remoteId);
    const fresh = createPeer(i, remoteId);
    peersRef.current[remoteId] = fresh;

    if (myRole === 'speaker' && localStreamRef.current) {
      attachLocalTracksToPeer(fresh, localStreamRef.current);
    }
  }

  function attachLocalTracksToPeer(peer: Peer.Instance, stream: MediaStream) {
    stream.getTracks().forEach((t) => {
      try { peer.addTrack(t, stream); } catch {}
    });
  }

  function attachRemote(remoteId: string, stream: MediaStream) {
    setRemoteStreams((prev) => ({ ...prev, [remoteId]: stream }));
    const el = document.getElementById(`remote-audio-${remoteId}`) as HTMLAudioElement | null;
    el?.play().catch(() => {
      console.log(`[${remoteId}] autoplay blocked; press "Enable audio"`);
    });
  }

  /* ------------------- Mic control ------------------- */
  async function startMic() {
    // Only start mic if I am speaker
    if (myRole !== 'speaker') {
      console.log('[mic] start skipped (not speaker)');
      return;
    }
    if (localStreamRef.current) return;

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      alert('Microphone requires HTTPS (use your Cloudflare tunnel).');
      return;
    }

    const nav: any = typeof navigator !== 'undefined' ? navigator : {};
    const hasStd = !!nav.mediaDevices && typeof nav.mediaDevices.getUserMedia === 'function';
    const hasWebkit = typeof nav.webkitGetUserMedia === 'function';

    const getUM =
      hasStd
        ? (constraints: MediaStreamConstraints) =>
            navigator.mediaDevices.getUserMedia(constraints)
        : hasWebkit
        ? (constraints: MediaStreamConstraints) =>
            new Promise<MediaStream>((res, rej) =>
              nav.webkitGetUserMedia.call(navigator, constraints, res, rej)
            )
        : null;

    if (!getUM) {
      alert('Mic API not available in this browser.');
      return;
    }

    try {
      const stream: MediaStream = await getUM({ audio: true, video: false });
      localStreamRef.current = stream;
      console.log('[mic] started, tracks:', stream.getTracks().map(t => t.kind));

      // Immediately attach to ALL existing peers
      Object.values(peersRef.current).forEach((peer) => {
        attachLocalTracksToPeer(peer, stream);
      });
    } catch (e) {
      console.error('Mic permission failed:', e);
      alert('Please allow microphone access to speak.');
    }
  }

  function stopMic() {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    console.log('[mic] stopped');
  }

  /* ------------------- Role toggles ------------------- */
  async function becomeSpeaker() {
    // Only owner may start speaking (starting the room)
    if (!isOwner) {
      alert('Only the post owner can start the audio room.');
      return;
    }

    setMyRole('speaker');           // debounced effect will start mic
    await channelRef.current?.track({ role: 'speaker' });

    if (!madeActiveOnceRef.current) {
      madeActiveOnceRef.current = true;
      void setRoomActive(true);     // flip flag so others see "Enter Audio Room"
    }
  }

  async function becomeListener() {
    setMyRole('listener');          // debounced effect will stop mic
    await channelRef.current?.track({ role: 'listener' });

    // If owner stops speaking, mark room inactive
    if (isOwner) {
      void setRoomActive(false);
    }
  }

  // Optional: explicit "End Room" for owner
  async function endRoom() {
    if (!isOwner) return;
    try {
      stopMic();
      await channelRef.current?.track({ role: 'listener' });
      setMyRole('listener');
      await setRoomActive(false);
      // Optionally, navigate back:
      // router.back();
    } catch (e) {
      console.warn('endRoom failed', e);
    }
  }

  /* ----------------------- UI ----------------------- */
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => router.back()} className="text-blue-600 hover:underline">
          ← Back
        </button>
        <h1 className="text-2xl font-bold">🎙 Audio Room</h1>
        {isOwner && (
          <button
            onClick={endRoom}
            className="ml-auto px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
          >
            End Room
          </button>
        )}
      </div>

      <div className="border rounded p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Participants ({participants.length})</h2>
          {myRole === 'speaker' ? (
            <button onClick={becomeListener} className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300">
              Become Listener
            </button>
          ) : (
            <button onClick={becomeSpeaker} className="px-3 py-1 rounded bg-purple-600 text-white hover:bg-purple-700">
              Become Speaker
            </button>
          )}
        </div>

        <ul className="space-y-1">
          {[...new Map(participants.map(p => [p.ap_profile_id, p])).values()].map((p) => (
            <li key={`${p.ap_profile_id}-row`}>
              {p.ap_profile_id === profileId ? 'You' : p.ap_profile_id} — {p.ap_profile_id === profileId ? myRole : p.role}
            </li>
          ))}
        </ul>
      </div>

      {/* Remote audio players */}
      <div>
        {Object.entries(remoteStreams).map(([id, stream]) => (
          <RemoteAudio key={`${id}-audio`} id={id} stream={stream} />
        ))}
      </div>

      {/* Manual autoplay unlock */}
      <button
        className="mt-3 rounded px-3 py-1 bg-gray-200"
        onClick={() => {
          Object.keys(remoteStreams).forEach((id) => {
            const el = document.getElementById(`remote-audio-${id}`) as HTMLAudioElement | null;
            el?.play().catch(() => {});
          });
        }}
      >
        ▶️ Enable audio
      </button>

      <p className="text-gray-500 mt-3">
        Owner flips the room active flag. Others will see <b>🎧 Enter Audio Room</b> on community/chat pages.
      </p>
    </div>
  );
}
