import { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Button } from '@/components/ui/button';
import { GripVertical, X } from 'lucide-react';

export type HipPathology = 'none' | 'cam' | 'pincer' | 'labral_tear' | 'oa';

export interface HipZoomConfig {
  flexion?: number;
  extension?: number;
  abduction?: number;
  adduction?: number;
  internalRotation?: number;
  externalRotation?: number;
}

interface HipZoomPanelProps {
  side: 'left' | 'right';
  hipConfig: HipZoomConfig;
  pathology: HipPathology;
  onClose: () => void;
  /**
   * Optional viewer-relative position (left/top in px). When provided,
   * the panel renders at that position; otherwise it falls back to the
   * default top-left slot. The parent owns the state so position
   * persists across L/R switches within the same Movement Mode session.
   */
  position?: { left: number; top: number } | null;
  onPositionChange?: (pos: { left: number; top: number } | null) => void;
}

const PATHOLOGY_LABEL: Record<HipPathology, string> = {
  none: 'No pathology',
  cam: 'CAM impingement',
  pincer: 'Pincer impingement',
  labral_tear: 'Labral tear (antero-superior)',
  oa: 'Hip osteoarthritis',
};

const PATHOLOGY_BLURB: Record<HipPathology, string> = {
  none: 'Joint morphology within normal limits.',
  cam: 'Aspherical femoral head-neck junction → bony bump impacts antero-superior labrum in flexion + IR.',
  pincer: 'Acetabular over-coverage / retroversion → labrum is crushed against femoral neck at end-range flexion.',
  labral_tear: 'Antero-superior labral disruption — fibres torn at impingement zone, mechanical catching with FADIR.',
  oa: 'Cartilage thinning, joint-space narrowing, marginal osteophyte formation — global compression rises throughout arc.',
};

export default function HipZoomPanel({ side, hipConfig, pathology, onClose, position, onPositionChange }: HipZoomPanelProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneStateRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    femurGroup: THREE.Group;
    femoralHead: THREE.Mesh;
    femoralHeadMat: THREE.MeshStandardMaterial;
    labrum: THREE.Mesh;
    labrumMat: THREE.MeshStandardMaterial;
    camBump: THREE.Mesh;
    camBumpMat: THREE.MeshStandardMaterial;
    osteophytes: THREE.Group;
    pincerRing: THREE.Mesh;
    rafId: number;
  } | null>(null);

  // Net joint angles (degrees)
  const angles = useMemo(() => {
    const flex = (hipConfig.flexion ?? 0) - (hipConfig.extension ?? 0);
    const add = (hipConfig.adduction ?? 0) - (hipConfig.abduction ?? 0);
    const ir = (hipConfig.internalRotation ?? 0) - (hipConfig.externalRotation ?? 0);
    return { flex, add, ir };
  }, [hipConfig.flexion, hipConfig.extension, hipConfig.abduction, hipConfig.adduction, hipConfig.internalRotation, hipConfig.externalRotation]);

  // Clinical metrics derived from joint pose. Pathology contributes
  // angle-dependent contact behaviour (not just static offsets):
  //   - CAM: deep flexion + IR triggers a non-linear contact spike at
  //     the antero-superior femoral head-neck junction.
  //   - PINCER: end-range flexion crushes the labrum against the rim.
  //   - OA: baseline joint-space narrowing across the whole arc, plus
  //     amplified compression rise vs. flexion (cartilage attrition).
  const metrics = useMemo(() => {
    const fNorm = Math.max(0, angles.flex) / 120;            // 0–1 flexion
    const addNorm = Math.max(0, angles.add) / 30;            // 0–1 adduction
    const irNorm = Math.max(0, angles.ir) / 45;              // 0–1 internal rotation
    // Antero-superior labral compression — FADIR-position weighted
    let labralCompression = Math.min(1, fNorm * 0.5 + addNorm * 0.3 + irNorm * 0.2);
    // CAM contact: deep flexion (>~70°) AND IR (>~15°) → non-linear spike
    // because the aspherical bump enters the acetabulum and shears the
    // antero-superior labrum. Below the threshold, CAM is silent.
    const camFlex = Math.max(0, angles.flex - 70) / 50;       // 0 below 70°, 1 at 120°
    const camIR = Math.max(0, angles.ir - 15) / 30;           // 0 below 15°, 1 at 45°
    const camContact = pathology === 'cam' ? camFlex * camIR : 0;  // 0–1
    if (pathology === 'cam') {
      labralCompression = Math.min(1, labralCompression + camContact * 0.6);
    }
    if (pathology === 'pincer') {
      // Pincer crushes labrum at end-range flexion regardless of IR
      labralCompression = Math.min(1, labralCompression + Math.max(0, fNorm - 0.6) * 1.5);
    }
    if (pathology === 'labral_tear') {
      labralCompression = Math.min(1, labralCompression + 0.15);
    }
    // Global joint compression — magnitude-based
    const absAdd = Math.abs(angles.add) / 30;
    const absIR = Math.abs(angles.ir) / 45;
    let jointCompression = Math.min(1, fNorm * 0.4 + absAdd * 0.3 + absIR * 0.3);
    // OA: baseline narrowing (~+0.30) plus stronger rise with flexion
    // — cartilage is thinned, so each degree compresses more.
    if (pathology === 'oa') {
      jointCompression = Math.min(1, jointCompression * 1.25 + 0.30);
    }
    if (pathology === 'cam') jointCompression = Math.min(1, jointCompression + camContact * 0.25);
    if (pathology === 'pincer') jointCompression = Math.min(1, jointCompression + 0.10);
    // Clearance: nominal 4 mm joint-space, drops with global compression.
    // OA also reduces the *baseline* clearance to model joint-space narrowing.
    const baselineClearance = pathology === 'oa' ? 2.5 : 4.0;
    const clearance = Math.max(0, baselineClearance - baselineClearance * jointCompression);
    return {
      labralPct: Math.round(labralCompression * 100),
      jointPct: Math.round(jointCompression * 100),
      clearanceMm: Math.round(clearance * 10) / 10,
      camContact,                                              // 0–1, drives bump tint
    };
  }, [angles, pathology]);

  // ---------- one-time scene build ----------
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const width = mount.clientWidth || 360;
    const height = mount.clientHeight || 360;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1a);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.01, 100);
    camera.position.set(0.45, 0.15, 0.55);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0, 0);
    controls.minDistance = 0.25;
    controls.maxDistance = 1.5;

    // Lights
    const amb = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(amb);
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(0.6, 0.8, 0.7);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x88aaff, 0.35);
    rim.position.set(-0.7, 0.2, -0.6);
    scene.add(rim);

    // Materials
    const boneCol = 0xf2e7d0;
    const boneMat = new THREE.MeshStandardMaterial({ color: boneCol, roughness: 0.55, metalness: 0.05 });
    const femoralHeadMat = new THREE.MeshStandardMaterial({ color: boneCol, roughness: 0.4, metalness: 0.05 });
    const labrumMat = new THREE.MeshStandardMaterial({ color: 0xc97a8a, roughness: 0.6, metalness: 0.0 });
    const cartilageMat = new THREE.MeshStandardMaterial({ color: 0xa9d4ff, roughness: 0.45, metalness: 0.0, transparent: true, opacity: 0.55 });

    // ---------- Hemi-pelvis (acetabular block) ----------
    // A simplified ilium/ischium/pubis "block" with a hemispherical
    // acetabulum carved into its medial face. Acetabulum center sits at
    // local origin (0,0,0) — that is also the hip joint centre.
    const pelvisGroup = new THREE.Group();

    // Iliac wing (flat plate above the acetabulum)
    const ilium = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.22, 0.12),
      boneMat,
    );
    ilium.position.set(0.08, 0.15, 0);
    pelvisGroup.add(ilium);

    // Pubic ramus (anterior-inferior)
    const pubic = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.05, 0.05),
      boneMat,
    );
    pubic.position.set(0.05, -0.07, 0.06);
    pubic.rotation.z = 0.25;
    pelvisGroup.add(pubic);

    // Ischial ramus (posterior-inferior)
    const ischium = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.06, 0.05),
      boneMat,
    );
    ischium.position.set(0.06, -0.08, -0.06);
    ischium.rotation.z = 0.30;
    pelvisGroup.add(ischium);

    // Acetabular cup — open hemisphere facing -X (medial→lateral so the
    // femoral head sits at origin and is visible from +X side).
    const acetabRadius = 0.075;
    const acetab = new THREE.Mesh(
      new THREE.SphereGeometry(acetabRadius, 48, 32, 0, Math.PI, 0, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xe7dcc2, roughness: 0.6, metalness: 0.05, side: THREE.DoubleSide }),
    );
    acetab.rotation.y = Math.PI / 2; // open face points -X
    pelvisGroup.add(acetab);

    // Acetabular cartilage — slightly thicker shell on the cup
    const acetabCart = new THREE.Mesh(
      new THREE.SphereGeometry(acetabRadius - 0.005, 32, 24, 0, Math.PI, 0.2, Math.PI - 0.4),
      cartilageMat,
    );
    acetabCart.rotation.y = Math.PI / 2;
    pelvisGroup.add(acetabCart);

    // Labrum — torus around the rim of the acetabulum
    // Pincer pathology = wider labrum; labral tear = arc gap.
    const labArc = pathology === 'pincer' ? Math.PI * 2 : (pathology === 'labral_tear' ? Math.PI * 1.55 : Math.PI * 1.95);
    const labTube = pathology === 'pincer' ? 0.014 : 0.010;
    const labrum = new THREE.Mesh(
      new THREE.TorusGeometry(acetabRadius, labTube, 12, 48, labArc),
      labrumMat,
    );
    // Torus lies in XY plane → rotate so it sits on the cup rim (cup opens -X)
    labrum.rotation.y = Math.PI / 2;
    // Rotate around its tube to position the gap (if any) at antero-superior
    labrum.rotation.x = pathology === 'labral_tear' ? -Math.PI * 0.25 : 0;
    pelvisGroup.add(labrum);

    // Pincer "extra rim" — a second thin ring just outside the labrum
    const pincerRing = new THREE.Mesh(
      new THREE.TorusGeometry(acetabRadius + 0.008, 0.006, 10, 40),
      new THREE.MeshStandardMaterial({ color: 0xcc6666, roughness: 0.6 }),
    );
    pincerRing.rotation.y = Math.PI / 2;
    pincerRing.visible = pathology === 'pincer';
    pelvisGroup.add(pincerRing);

    scene.add(pelvisGroup);

    // ---------- Femoral subgroup ----------
    // Origin = hip joint centre (= acetabulum centre). Resting pose:
    // femur points straight down (-Y) with shaft along -Y axis.
    const femurGroup = new THREE.Group();

    // Femoral head — sphere just smaller than acetabulum so it nests
    const headRadius = acetabRadius - 0.006;
    const femoralHead = new THREE.Mesh(
      new THREE.SphereGeometry(headRadius, 36, 28),
      femoralHeadMat,
    );
    femoralHead.position.set(0, 0, 0);
    femurGroup.add(femoralHead);

    // Femoral neck — angled cylinder from head down-laterally to trochanter
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.025, 0.10, 20),
      boneMat,
    );
    // Neck-shaft angle ≈ 130° — neck rises laterally
    neck.position.set(0.05, -0.045, 0);
    neck.rotation.z = -1.0;  // ~57° from vertical, pointing lateral-inferior
    femurGroup.add(neck);

    // Greater trochanter — chunky lateral knob
    const trochanter = new THREE.Mesh(
      new THREE.SphereGeometry(0.038, 20, 16),
      boneMat,
    );
    trochanter.position.set(0.105, -0.082, 0);
    trochanter.scale.set(1, 1.1, 0.85);
    femurGroup.add(trochanter);

    // Femoral shaft — long cylinder going inferiorly from the trochanteric region
    const shaftLen = 0.42;
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.024, shaftLen, 22),
      boneMat,
    );
    shaft.position.set(0.075, -0.082 - shaftLen / 2, 0);
    femurGroup.add(shaft);

    // CAM bump — bony deposit on antero-superior femoral head-neck junction
    const camBumpMat = new THREE.MeshStandardMaterial({ color: 0xe8a86b, roughness: 0.6 });
    const camBump = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 16, 12),
      camBumpMat,
    );
    camBump.position.set(0.035, -0.02, 0.045);
    camBump.scale.set(1.1, 0.7, 1.1);
    camBump.visible = pathology === 'cam';
    femurGroup.add(camBump);

    // OA osteophytes — small cone "spikes" along the femoral head margin
    const osteophytes = new THREE.Group();
    if (pathology === 'oa') {
      const ostMat = new THREE.MeshStandardMaterial({ color: 0xb8a684, roughness: 0.7 });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.022, 6), ostMat);
        spike.position.set(
          Math.cos(a) * (headRadius + 0.005),
          -0.005,
          Math.sin(a) * (headRadius + 0.005),
        );
        spike.lookAt(spike.position.clone().multiplyScalar(2));
        osteophytes.add(spike);
      }
      // Slight head deformity
      femoralHead.scale.set(1.0, 0.92, 1.02);
    }
    femurGroup.add(osteophytes);

    // Side mirror — left hip is rendered as mirrored geometry of the right
    if (side === 'left') {
      pelvisGroup.scale.x = -1;
      femurGroup.scale.x = -1;
      // Fix winding for mirrored materials
      [boneMat, femoralHeadMat, labrumMat, cartilageMat].forEach(m => { m.side = THREE.DoubleSide; });
    }

    scene.add(femurGroup);

    // Centre marker (acetabulum)  — subtle reference cross
    const axesHelper = new THREE.AxesHelper(0.04);
    (axesHelper.material as THREE.LineBasicMaterial).transparent = true;
    (axesHelper.material as THREE.LineBasicMaterial).opacity = 0.35;
    scene.add(axesHelper);

    let rafId = 0;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };
    animate();

    sceneStateRef.current = {
      scene, camera, renderer, controls,
      femurGroup, femoralHead, femoralHeadMat,
      labrum, labrumMat,
      camBump, camBumpMat, osteophytes, pincerRing,
      rafId,
    };

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
      scene.traverse(obj => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const m = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(m)) m.forEach(mm => mm.dispose());
        else if (m) m.dispose();
      });
      sceneStateRef.current = null;
    };
    // Rebuild when side or pathology changes (geometry differs)
  }, [side, pathology]);

  // ---------- live joint-angle sync ----------
  useEffect(() => {
    const s = sceneStateRef.current;
    if (!s) return;
    const toRad = (d: number) => d * Math.PI / 180;
    // Local convention: X=lateral (+X for right side), Y=superior, Z=anterior
    // - Flexion = leg swings anterior = rotation about +X axis
    //   (since shaft is -Y, +X rotation tips it toward +Z)
    // - Adduction = rotation about -Z axis (femur swings medially toward midline)
    //   For right-side build: medial = -X. Rotating about -Z brings -Y toward -X.
    //   For mirrored left side, scale.x=-1 already flips sign correctly.
    // - IR = rotation about -Y axis for the right side
    //   (shaft stays vertical; trochanter rotates anteriorly).
    s.femurGroup.rotation.order = 'YXZ';
    s.femurGroup.rotation.x = toRad(angles.flex);
    s.femurGroup.rotation.z = -toRad(angles.add);
    s.femurGroup.rotation.y = -toRad(angles.ir);

    // OA joint-space narrowing — physically pull the femur ~3 mm into
    // the acetabulum so the visible joint space collapses (in addition
    // to the metric-side baseline clearance reduction).
    const oaInset = pathology === 'oa' ? 0.003 : 0;
    s.femurGroup.position.set(-oaInset, 0, 0);

    // Red contact tint as joint compression rises
    const t = metrics.jointPct / 100;
    const base = new THREE.Color(0xf2e7d0);
    const hot = new THREE.Color(0xff4a3a);
    s.femoralHeadMat.color.copy(base).lerp(hot, Math.min(1, t * 1.1));
    // Labrum reddens with antero-superior compression
    const lt = metrics.labralPct / 100;
    const labBase = new THREE.Color(0xc97a8a);
    s.labrumMat.color.copy(labBase).lerp(hot, Math.min(1, lt * 1.0));
    // CAM bump glows red on contact (deep flexion + IR), dim otherwise.
    if (pathology === 'cam') {
      const camBase = new THREE.Color(0xe8a86b);
      s.camBumpMat.color.copy(camBase).lerp(hot, Math.min(1, metrics.camContact));
      s.camBumpMat.emissive = new THREE.Color(0xff2a1a).multiplyScalar(metrics.camContact * 0.6);
    }
  }, [angles, metrics, pathology]);

  const sideLabel = side === 'left' ? 'Left Hip' : 'Right Hip';
  const compressionTone = metrics.jointPct >= 70 ? 'text-rose-300' : metrics.jointPct >= 40 ? 'text-amber-300' : 'text-emerald-300';
  const labralTone = metrics.labralPct >= 70 ? 'text-rose-300' : metrics.labralPct >= 40 ? 'text-amber-300' : 'text-emerald-300';
  const clearanceTone = metrics.clearanceMm <= 1.0 ? 'text-rose-300' : metrics.clearanceMm <= 2.5 ? 'text-amber-300' : 'text-emerald-300';

  // Drag-to-move (Task #393). Mirrors the DraggableShell pattern used by
  // MovementFindingsStream / SFV: viewer-relative absolute positioning,
  // header-only drag (handle gates via the grip wrapper), clamping based
  // on the panel's offsetParent (the Movement Mode frame). Compact size
  // (no longer fills viewer height) so the skeleton stays visible.
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragStateRef = useRef<{
    pointerStartX: number;
    pointerStartY: number;
    panelStartLeft: number;
    panelStartTop: number;
    container: HTMLElement | null;
  } | null>(null);

  const onHeaderMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const container = (panel.offsetParent as HTMLElement | null) ?? null;
    const containerRect = container?.getBoundingClientRect();
    dragStateRef.current = {
      pointerStartX: e.clientX,
      pointerStartY: e.clientY,
      panelStartLeft: rect.left - (containerRect?.left ?? 0),
      panelStartTop: rect.top - (containerRect?.top ?? 0),
      container,
    };
    setDragging(true);
    e.preventDefault();
  }, []);

  const onHeaderDoubleClick = useCallback(() => {
    onPositionChange?.(null);
  }, [onPositionChange]);

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (ev: MouseEvent) => {
      const ds = dragStateRef.current;
      if (!ds) return;
      const dx = ev.clientX - ds.pointerStartX;
      const dy = ev.clientY - ds.pointerStartY;
      const panel = panelRef.current;
      const w = panel?.offsetWidth ?? 360;
      const h = panel?.offsetHeight ?? 200;
      const containerRect = ds.container?.getBoundingClientRect();
      const containerW = containerRect?.width ?? window.innerWidth;
      const containerH = containerRect?.height ?? window.innerHeight;
      const minX = 4;
      const minY = 4;
      const maxX = Math.max(minX, containerW - w - 4);
      const maxY = Math.max(minY, containerH - h - 4);
      const nextLeft = Math.max(minX, Math.min(maxX, ds.panelStartLeft + dx));
      const nextTop = Math.max(minY, Math.min(maxY, ds.panelStartTop + dy));
      onPositionChange?.({ left: nextLeft, top: nextTop });
    };
    const handleUp = () => {
      setDragging(false);
      dragStateRef.current = null;
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [dragging, onPositionChange]);

  const positionStyle: React.CSSProperties = position
    ? { left: position.left, top: position.top }
    : { left: 8, top: 8 };

  return (
    <div
      ref={panelRef}
      className={`absolute z-40 w-[320px] max-w-[42vw] max-h-[70vh] rounded-lg overflow-hidden shadow-2xl border border-emerald-400/40 bg-slate-950/95 backdrop-blur-md pointer-events-auto flex flex-col ${dragging ? 'ring-1 ring-emerald-400/60 shadow-emerald-500/30' : ''}`}
      style={positionStyle}
      data-testid="hip-zoom-panel"
    >
      <div
        className={`flex items-center justify-between px-3 py-2 bg-emerald-600/30 border-b border-emerald-400/30 select-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={onHeaderMouseDown}
        onDoubleClick={onHeaderDoubleClick}
        data-testid="hip-zoom-drag-handle"
        title="Drag to move · Double-click to reset position"
      >
        <div className="flex items-center gap-2 pointer-events-none">
          <GripVertical className="h-3 w-3 text-emerald-200/80" />
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[12px] font-semibold text-white">Joint Zoom — {sideLabel}</span>
        </div>
        <Button size="icon" variant="ghost" className="h-6 w-6 text-white hover:bg-white/15" onClick={onClose} data-testid="hip-zoom-close">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div ref={mountRef} className="h-[180px] shrink-0 bg-[#0a0f1a]" data-testid="hip-zoom-canvas" />

      <div className="px-3 py-2 border-t border-emerald-400/20 bg-slate-900/80 text-[11px] text-slate-200 space-y-1.5">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <div className="text-[9px] uppercase tracking-wide text-slate-400">Flexion</div>
            <div className="font-mono text-white">{Math.round(angles.flex)}°</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wide text-slate-400">Add/Abd</div>
            <div className="font-mono text-white">{angles.add >= 0 ? '+' : ''}{Math.round(angles.add)}°</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wide text-slate-400">IR/ER</div>
            <div className="font-mono text-white">{angles.ir >= 0 ? '+' : ''}{Math.round(angles.ir)}°</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/5">
          <div>
            <div className="text-[9px] uppercase tracking-wide text-slate-400">Clearance</div>
            <div className={`font-mono ${clearanceTone}`}>{metrics.clearanceMm.toFixed(1)} mm</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wide text-slate-400">Labral A-S</div>
            <div className={`font-mono ${labralTone}`}>{metrics.labralPct}%</div>
          </div>
          <div>
            <div className="text-[9px] uppercase tracking-wide text-slate-400">Joint comp.</div>
            <div className={`font-mono ${compressionTone}`}>{metrics.jointPct}%</div>
          </div>
        </div>
        <div className="pt-1.5 border-t border-white/5">
          <div className="text-[9px] uppercase tracking-wide text-slate-400">Pathology (auto)</div>
          <div className="text-[11px] font-semibold text-emerald-300">{PATHOLOGY_LABEL[pathology]}</div>
          <div className="text-[10px] text-slate-300 leading-tight mt-0.5">{PATHOLOGY_BLURB[pathology]}</div>
        </div>
      </div>
    </div>
  );
}
