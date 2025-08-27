'use client';

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment, OrbitControls, useGLTF } from '@react-three/drei';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

/* Preset -> GLB path */
const AVATAR_MODEL_BY_ID: Record<string, string> = {
  a1: '/avatars3d/a1.glb',
  a2: '/avatars3d/a2.glb',
  a3: '/avatars3d/a3.glb',
  a4: '/avatars3d/a4.glb',
  a5: '/avatars3d/a5.glb',
  a6: '/avatars3d/a6.glb',
  a7: '/avatars3d/a7.glb',
  a8: '/avatars3d/a8.glb',
  a9: '/avatars3d/a9.glb',
  a10: '/avatars3d/a10.glb',
  a11: '/avatars3d/a11.glb',
};

type ProfileRow = Database['public']['Tables']['profiles']['Row'] & {
  avatar_id?: string | null;
  avatar_url?: string | null;
  username?: string | null;
};

/* ------------ fit helper ------------ */
function fitCameraAndPlace({
  root,
  camera,
  controls,
  size,
  padding,
  modelOffset,
}: {
  root: THREE.Object3D;
  camera: THREE.PerspectiveCamera;
  controls: any;
  size: { width: number; height: number };
  padding: number;
  modelOffset: number;
}) {
  const box = new THREE.Box3().setFromObject(root);
  root.position.y -= box.min.y;

  const grounded = new THREE.Box3().setFromObject(root);
  const center = grounded.getCenter(new THREE.Vector3());
  const sphere = grounded.getBoundingSphere(new THREE.Sphere());
  const radius = sphere.radius * (1 + padding);

  const fov = (camera.fov * Math.PI) / 180;
  const aspect = size.width / size.height;
  const hFov = 2 * Math.atan(Math.tan(fov / 2) * aspect);
  const dist = Math.max(radius / Math.sin(fov / 2), radius / Math.sin(hFov / 2));

  camera.position.copy(center.clone().add(new THREE.Vector3(0, radius * 0.2, dist)));
  camera.near = Math.max(0.01, dist * 0.01);
  camera.far = dist * 50;
  camera.updateProjectionMatrix();

  if (controls) {
    controls.target.copy(center);
    controls.update();
  }

  const visualY = modelOffset * radius;
  root.position.y += visualY;

  return { floorY: visualY + 0.0005, radius };
}

type FitAfterReadyProps = {
  groupRef: React.RefObject<THREE.Group | null>;
  padding: number;
  modelOffset: number;
  onFitted: (floorY: number, radius: number) => void;
  refitKey: string;
};
function FitAfterReady({ groupRef, padding, modelOffset, onFitted, refitKey }: FitAfterReadyProps) {
  const { camera, controls, size } = useThree() as any;

  useLayoutEffect(() => {
    const root = groupRef.current;
    if (!root) return;

    const { floorY, radius } = fitCameraAndPlace({
      root,
      camera,
      controls,
      size,
      padding,
      modelOffset,
    });
    onFitted(floorY, radius);
  }, [groupRef, camera, controls, size, padding, modelOffset, onFitted, refitKey]);

  return null;
}

function LoadedModel({ url, onReady }: { url: string; onReady: () => void }) {
  const { scene } = useGLTF(url);
  useLayoutEffect(() => {
    scene.traverse((o: any) => {
      if (o.isMesh && o.material) {
        if ('aoMap' in o.material) { o.material.aoMap = null; o.material.aoMapIntensity = 0; }
        if ('lightMap' in o.material) { o.material.lightMap = null; o.material.lightMapIntensity = 0; }
        o.castShadow = true;
        o.receiveShadow = false;
        o.material.needsUpdate = true;
      }
    });
    onReady();
  }, [scene, onReady]);

  return <primitive object={scene} dispose={null} />;
}

export default function CustomizeAvatarPage() {
  const supabase = createClientComponentClient<Database>();

  const [me, setMe] = useState<{ id: string; username: string | null } | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  // 3D state
  const groupRef = useRef<THREE.Group | null>(null);
  const [modelReady, setModelReady] = useState(false);
  const [fitted, setFitted] = useState(false);          // ✅ hide until fitted
  const [floorY, setFloorY] = useState(0);

  const padding = 0.2;
  const modelOffset = -0.35;
  const floorRadius = 1.6;
  const floorColor = '#a78bfa';
  const showShadow = true;
  const rotate = true;

  useEffect(() => {
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) {
        setLoading(false);
        return;
      }
      setMe({ id: userRes.user.id, username: userRes.user.user_metadata?.username ?? null });

      const { data: prof } = await supabase
        .from('profiles')
        .select('id, username, created_at, avatar_id, avatar_url')
        .eq('id', userRes.user.id)
        .single();

      if (prof) setProfile(prof as ProfileRow);
      setLoading(false);
    })();
  }, [supabase]);

  const modelUrl = useMemo(() => {
    const id = profile?.avatar_id ?? null;
    if (!id) return null;
    return AVATAR_MODEL_BY_ID[id] ?? null;
  }, [profile?.avatar_id]);

  const handleReady = useCallback(() => setModelReady(true), []);
  const refitKey = `${modelUrl ?? 'none'}-${modelReady ? 'ready' : 'loading'}`;

  const handleFitted = useCallback((y: number) => {
    setFloorY(y);
    // small tick to ensure camera matrices are applied before revealing
    requestAnimationFrame(() => setFitted(true));
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-40 rounded bg-gray-200" />
          <div className="h-[48vh] rounded-lg bg-gray-100" />
        </div>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="max-w-xl mx-auto p-6 text-center">
        <p className="mb-4 text-gray-600">You’re not signed in.</p>
        <Link href="/login" className="inline-block px-4 py-2 rounded bg-blue-600 text-white">
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {profile?.username ? `${profile.username}'s 3D Avatar` : 'Your 3D Avatar'}
        </h1>
        <Link href="/profile" className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50" title="Back to profile">
          ← Back
        </Link>
      </div>

      <div className="rounded-lg overflow-hidden border bg-white">
        {/* Responsive stage: width 100%; height clamps via aspect ratio.
            It autosizes the model because our fit uses the live canvas size. */}
        <div className="w-full" style={{ aspectRatio: '3 / 4' }}>
          {modelUrl ? (
            <Canvas
              shadows={showShadow}
              dpr={[1, 2]}
              camera={{ position: [0, 1.4, 2.2], fov: 35 }}
              // smoother resizing
              gl={{ antialias: true }}
            >
              <ambientLight intensity={0.55} />
              <directionalLight
                position={[3, 5, 2]}
                intensity={0.85}
                castShadow={showShadow}
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
                shadow-camera-near={0.5}
                shadow-camera-far={20}
              />

              <Suspense fallback={null}>
                {/* Hidden until fitted to avoid first-frame "giant flash" */}
                <group
                  ref={groupRef}
                  key={modelUrl}
                  // extra guard: tiny scale until fitted (not strictly necessary, but harmless)
                  scale={fitted ? 1 : 0.001}
                  visible={fitted}
                >
                  <LoadedModel url={modelUrl} onReady={handleReady} />
                </group>

                {modelReady && (
                  <FitAfterReady
                    groupRef={groupRef}
                    padding={padding}
                    modelOffset={modelOffset}
                    onFitted={handleFitted}
                    refitKey={refitKey}
                  />
                )}

                <Environment preset="studio" />

                {fitted && (
                  <mesh rotation-x={-Math.PI / 2} position={[0, floorY, 0]} receiveShadow={showShadow}>
                    <circleGeometry args={[floorRadius, 64]} />
                    <meshStandardMaterial color={floorColor} metalness={0} roughness={1} />
                  </mesh>
                )}
              </Suspense>

              <OrbitControls
                enablePan={false}
                enableZoom={false}
                minPolarAngle={Math.PI / 2.2}
                maxPolarAngle={Math.PI / 2.2}
                autoRotate={false}
                autoRotateSpeed={0.8}
              />
            </Canvas>
          ) : (
            <div className="h-full w-full grid place-items-center text-gray-500">
              No 3D model for your avatar preset.
            </div>
          )}
        </div>
      </div>

      {/* optional helper text */}
      <p className="mt-3 text-xs text-gray-500">
        The model auto‑fits to your screen and refits on resize. Hidden until fitted to avoid the initial flash.
      </p>
    </div>
  );
}

/* Optional preloads (keeps loading smooth when switching presets later) */
useGLTF.preload?.('/avatars3d/a1.glb');
useGLTF.preload?.('/avatars3d/a2.glb');
useGLTF.preload?.('/avatars3d/a3.glb');
useGLTF.preload?.('/avatars3d/a4.glb');
useGLTF.preload?.('/avatars3d/a5.glb');
useGLTF.preload?.('/avatars3d/a6.glb');
useGLTF.preload?.('/avatars3d/a7.glb');
useGLTF.preload?.('/avatars3d/a8.glb');
useGLTF.preload?.('/avatars3d/a9.glb');
useGLTF.preload?.('/avatars3d/a10.glb');
useGLTF.preload?.('/avatars3d/a11.glb');
