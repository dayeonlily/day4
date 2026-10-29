import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { BBOX, CATEGORIES, PLACES, WIND_FARMS, OLLE, CITRUS_ZONES } from "../data/jejuPlaces.js";
import visitors from "../data/seogwipo_visitors.json";

const base = import.meta.env.BASE_URL;
const WORLD_W = (BBOX.E - BBOX.W) * 111.32 * Math.cos((33.35 * Math.PI) / 180); // km
const WORLD_D = (BBOX.N - BBOX.S) * 110.95;
const KM_PER_M = 0.001;
const SEA_Y = -0.04;

const mid = (a, b) => (a + b) / 2;
const fmt = (n) => n.toLocaleString("ko-KR");

// ── 지도에 올릴 항목 (모든 카테고리를 같은 형태로) ──────────────────────────
const ITEMS = [
  ...PLACES,
  ...WIND_FARMS.map((w) => ({ ...w, cat: "wind", kind: "wind" })),
  ...OLLE.map((o) => ({ ...o, cat: "olle", kind: "olle", ll: o.pts[0], name: `${o.name} (${o.sub})` })),
  ...CITRUS_ZONES.map((z) => ({ ...z, cat: "citrus", kind: "citrus", ll: [mid(z.box[0], z.box[1]), mid(z.box[2], z.box[3])] })),
];

function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function loadImage(src) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error(`이미지를 불러오지 못했어요: ${src}`));
    im.src = src;
  });
}

function iconTexture(cat) {
  const c = document.createElement("canvas");
  c.width = c.height = 96;
  const g = c.getContext("2d");
  g.beginPath(); g.arc(48, 48, 42, 0, Math.PI * 2);
  g.fillStyle = CATEGORIES[cat].color; g.fill();
  g.lineWidth = 6; g.strokeStyle = "#fff"; g.stroke();
  g.font = "44px 'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif";
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(CATEGORIES[cat].icon, 48, 52);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ── 3D 모형 ─────────────────────────────────────────────────────────────────
const M = {
  white: new THREE.MeshStandardMaterial({ color: "#f4f1ea", roughness: 0.7 }),
  red: new THREE.MeshStandardMaterial({ color: "#d9480f", roughness: 0.6 }),
  stone: new THREE.MeshStandardMaterial({ color: "#4a4540", roughness: 1 }),
  stoneLight: new THREE.MeshStandardMaterial({ color: "#6b645c", roughness: 1 }),
  lamp: new THREE.MeshBasicMaterial({ color: "#ffe066" }),
  beam: new THREE.MeshBasicMaterial({ color: "#ffe066", transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  leaf: new THREE.MeshStandardMaterial({ color: "#3f8f3a", roughness: 0.9 }),
  fruit: new THREE.MeshStandardMaterial({ color: "#fd7e14", roughness: 0.6 }),
  olle: new THREE.MeshStandardMaterial({ color: "#e64980", emissive: "#a61e4d", emissiveIntensity: 0.5, roughness: 0.5 }),
};

function makeTurbine(spinners) {
  const g = new THREE.Group();
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.022, 0.55, 8), M.white);
  tower.position.y = 0.275; g.add(tower);
  const hub = new THREE.Group(); hub.position.set(0, 0.56, 0.02); g.add(hub);
  const nac = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.06), M.white); nac.position.set(0, 0.56, 0); g.add(nac);
  const rotor = new THREE.Group(); hub.add(rotor);
  for (let i = 0; i < 3; i++) {
    const arm = new THREE.Group(); arm.rotation.z = (i * Math.PI * 2) / 3;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.27, 0.004), M.white);
    blade.position.y = 0.135; arm.add(blade); rotor.add(arm);
  }
  spinners.push({ obj: rotor, speed: 1.2 + Math.random() * 0.8 });
  return g;
}

function makeLighthouse(beams) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.07, 0.42, 14), M.white); body.position.y = 0.21; g.add(body);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.09, 14), M.red); band.position.y = 0.17; g.add(band);
  const gal = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.015, 14), M.stone); gal.position.y = 0.43; g.add(gal);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.07, 12), M.lamp); lamp.position.y = 0.47; g.add(lamp);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.07, 14), M.red); roof.position.y = 0.545; g.add(roof);
  const beam = new THREE.Group(); beam.position.y = 0.47;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.9, 16, 1, true), M.beam);
  cone.rotation.z = -Math.PI / 2; cone.position.x = 0.45; beam.add(cone); g.add(beam);
  beams.push(beam);
  return g;
}

function makeHareubang() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.2, 14), M.stone); body.position.y = 0.1; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 12), M.stoneLight); head.position.y = 0.26; g.add(head);
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.075, 0.06, 14), M.stone); hat.position.y = 0.35; g.add(hat);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.012, 14), M.stone); brim.position.y = 0.32; g.add(brim);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), M.stone); nose.position.set(0, 0.255, 0.065); g.add(nose);
  for (const s of [-1, 1]) { // 배 위에 얹은 두 손
    const arm = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), M.stoneLight); arm.position.set(s * 0.03, 0.14, 0.062); g.add(arm);
  }
  g.scale.setScalar(1.3);
  return g;
}

export default function Jeju3D() {
  const mountRef = useRef(null);
  const api = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [layers, setLayers] = useState(() => Object.fromEntries(Object.keys(CATEGORIES).map((k) => [k, true])));
  const [exag, setExag] = useState(3);
  const [spin, setSpin] = useState(false);
  const [query, setQuery] = useState("");
  const [panel, setPanel] = useState(true);

  // ── three.js 장면 구성 ────────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current;
    let disposed = false;
    let raf = 0;
    const cleanups = [];

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      setError("이 브라우저에서는 WebGL을 사용할 수 없어요.");
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    const labelRenderer = new CSS2DRenderer();
    Object.assign(labelRenderer.domElement.style, { position: "absolute", inset: "0", pointerEvents: "none" });
    mount.appendChild(labelRenderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#cfe8ee");
    scene.fog = new THREE.Fog("#cfe8ee", 170, 460);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 700);
    const HOME = { pos: new THREE.Vector3(0, 78, 92), target: new THREE.Vector3(0, 0, 4) };
    camera.position.copy(HOME.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(HOME.target);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 3;
    controls.maxDistance = 230;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.autoRotateSpeed = 0.6;

    scene.add(new THREE.HemisphereLight("#ffffff", "#8aa6a8", 1.1));
    const sun = new THREE.DirectionalLight("#fff4dd", 2.2);
    sun.position.set(-60, 80, 50); scene.add(sun);

    let exagNow = 3;
    let heights = null; // Float32Array (m)
    let HW = 0, HH = 0;
    const sampleUV = (u, v) => {
      const fx = Math.min(Math.max(u, 0), 1) * (HW - 1), fy = Math.min(Math.max(v, 0), 1) * (HH - 1);
      const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(x0 + 1, HW - 1), y1 = Math.min(y0 + 1, HH - 1);
      const tx = fx - x0, ty = fy - y0;
      const a = heights[y0 * HW + x0], b = heights[y0 * HW + x1], c = heights[y1 * HW + x0], d = heights[y1 * HW + x1];
      return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
    };
    const metersAt = (lat, lon) => sampleUV((lon - BBOX.W) / (BBOX.E - BBOX.W), (BBOX.N - lat) / (BBOX.N - BBOX.S));
    const yOf = (m) => (m > 0.5 ? m * KM_PER_M * exagNow : SEA_Y);
    const worldXZ = (lat, lon) => [
      ((lon - BBOX.W) / (BBOX.E - BBOX.W) - 0.5) * WORLD_W,
      ((BBOX.N - lat) / (BBOX.N - BBOX.S) - 0.5) * WORLD_D,
    ];
    const groundAt = (lat, lon) => yOf(metersAt(lat, lon));

    const anchors = [];        // 지형 높이를 따라 y를 맞춰야 하는 객체
    const spinners = [], beams = [];
    const layerGroups = {};
    for (const k of Object.keys(CATEGORIES)) { layerGroups[k] = new THREE.Group(); scene.add(layerGroups[k]); }
    const markers = new Map(); // id -> { item, anchor, sprite, label, pos }
    const pickables = [];
    let terrain, terrainGeo, baseHeights, segX, segY;
    const reposition = [];     // exag 변경 시 다시 계산할 함수들

    function addAnchored(parent, lat, lon, obj, dy = 0) {
      const [x, z] = worldXZ(lat, lon);
      obj.position.set(x, groundAt(lat, lon) + dy, z);
      parent.add(obj);
      anchors.push({ obj, lat, lon, dy });
      return obj;
    }

    function applyTerrain() {
      const pos = terrainGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setY(i, yOf(baseHeights[i]));
      pos.needsUpdate = true;
      terrainGeo.computeVertexNormals();
      for (const a of anchors) a.obj.position.y = groundAt(a.lat, a.lon) + a.dy;
      for (const fn of reposition) fn();
    }

    function buildMap() {
      // 지형
      segX = 388; segY = Math.round((segX * WORLD_D) / WORLD_W);
      terrainGeo = new THREE.PlaneGeometry(WORLD_W, WORLD_D, segX, segY);
      terrainGeo.rotateX(-Math.PI / 2);
      baseHeights = new Float32Array(terrainGeo.attributes.position.count);
      for (let iy = 0, i = 0; iy <= segY; iy++) for (let ix = 0; ix <= segX; ix++, i++) baseHeights[i] = sampleUV(ix / segX, iy / segY);
      const sat = textures.sat;
      sat.colorSpace = THREE.SRGBColorSpace;
      sat.anisotropy = renderer.capabilities.getMaxAnisotropy();
      terrain = new THREE.Mesh(terrainGeo, new THREE.MeshStandardMaterial({ map: sat, roughness: 1, metalness: 0 }));
      scene.add(terrain);
      const water = new THREE.Mesh(
        new THREE.PlaneGeometry(WORLD_W, WORLD_D).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: "#1d8fa8", transparent: true, opacity: 0.38, depthWrite: false }),
      );
      water.position.y = 0; water.renderOrder = 1; scene.add(water);
      // 바다 밖 배경
      const ocean = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: "#2f8aa1" }));
      ocean.position.y = SEA_Y - 0.05; scene.add(ocean);

      // 마커(스프라이트) + 라벨
      const iconCache = {};
      for (const item of ITEMS) {
        const cat = CATEGORIES[item.cat];
        iconCache[item.cat] ||= iconTexture(item.cat);
        const holder = new THREE.Group();
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconCache[item.cat], sizeAttenuation: false, transparent: true }));
        const size = item.big ? 0.062 : 0.04;
        sprite.scale.set(size, size, 1); sprite.position.y = 0.75; sprite.userData.id = item.id; sprite.userData.size = size;
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.75, 4), new THREE.MeshBasicMaterial({ color: cat.color }));
        stem.position.y = 0.375;
        holder.add(stem, sprite);
        const el = document.createElement("div");
        el.className = "j3d-label"; el.textContent = item.name.replace(/ \(.*\)$/, "");
        const label = new CSS2DObject(el); label.position.set(0, 1.12, 0); label.visible = false; holder.add(label);
        addAnchored(layerGroups[item.cat], item.ll[0], item.ll[1], holder);
        pickables.push(sprite);
        markers.set(item.id, { item, holder, sprite, label, el });
      }

      // 풍력발전기
      for (const w of WIND_FARMS) {
        const rng = mulberry32(w.id.length * 977 + 13);
        for (let i = 0; i < w.n; i++) {
          const lat = w.ll[0] + (i - (w.n - 1) / 2) * 0.0045 + (rng() - 0.5) * 0.0012;
          const lon = w.ll[1] + (i - (w.n - 1) / 2) * 0.0075 + (rng() - 0.5) * 0.0012;
          const t = makeTurbine(spinners); t.rotation.y = -0.6; t.scale.setScalar(1.15);
          addAnchored(layerGroups.wind, lat, lon, t);
        }
      }
      // 등대 · 돌하르방 모형
      for (const p of PLACES) {
        if (p.cat === "light") addAnchored(layerGroups.light, p.ll[0], p.ll[1], makeLighthouse(beams));
        if (p.cat === "statue") addAnchored(layerGroups.statue, p.ll[0] + 0.004, p.ll[1] + 0.004, makeHareubang());
      }

      // 감귤 재배지: 나무 인스턴스 + 경계선
      const CITRUS_N = 260;
      const treeSpots = [];
      for (const z of CITRUS_ZONES) {
        const rng = mulberry32(z.id.length * 7919 + 5);
        let tries = 0, got = 0;
        while (got < CITRUS_N && tries++ < CITRUS_N * 12) {
          const lat = z.box[0] + rng() * (z.box[1] - z.box[0]), lon = z.box[2] + rng() * (z.box[3] - z.box[2]);
          const m = metersAt(lat, lon);
          if (m < 8 || m > 380) continue;
          treeSpots.push({ lat, lon, s: 0.8 + rng() * 0.5 }); got++;
        }
      }
      const leafMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 6), M.leaf, treeSpots.length);
      const fruitMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.022, 6, 5), M.fruit, treeSpots.length);
      const tmp = new THREE.Object3D();
      const layoutTrees = () => {
        treeSpots.forEach((t, i) => {
          const [x, z] = worldXZ(t.lat, t.lon);
          const y = groundAt(t.lat, t.lon);
          tmp.position.set(x, y + 0.05 * t.s, z); tmp.scale.setScalar(t.s); tmp.updateMatrix(); leafMesh.setMatrixAt(i, tmp.matrix);
          tmp.position.set(x + 0.03 * t.s, y + 0.085 * t.s, z + 0.025 * t.s); tmp.updateMatrix(); fruitMesh.setMatrixAt(i, tmp.matrix);
        });
        leafMesh.instanceMatrix.needsUpdate = true; fruitMesh.instanceMatrix.needsUpdate = true;
      };
      layoutTrees(); reposition.push(layoutTrees);
      layerGroups.citrus.add(leafMesh, fruitMesh);
      for (const z of CITRUS_ZONES) {
        const [s, n, w, e] = z.box;
        const ring = [];
        const edge = (a, b) => { for (let i = 0; i < 24; i++) ring.push([a[0] + ((b[0] - a[0]) * i) / 24, a[1] + ((b[1] - a[1]) * i) / 24]); };
        edge([s, w], [s, e]); edge([s, e], [n, e]); edge([n, e], [n, w]); edge([n, w], [s, w]);
        const geo = new THREE.BufferGeometry();
        const line = new THREE.LineLoop(geo, new THREE.LineBasicMaterial({ color: "#fd7e14" }));
        const layout = () => {
          geo.setFromPoints(ring.map(([lat, lon]) => { const [x, zz] = worldXZ(lat, lon); return new THREE.Vector3(x, Math.max(groundAt(lat, lon), 0) + 0.04, zz); }));
        };
        layout(); reposition.push(layout); layerGroups.citrus.add(line);
      }

      // 올레길: 지형을 따라가는 튜브
      for (const o of OLLE) {
        const mesh = new THREE.Mesh(new THREE.BufferGeometry(), M.olle);
        mesh.userData.id = o.id;
        const layout = () => {
          const pts = [];
          for (let i = 0; i < o.pts.length - 1; i++) {
            for (let k = 0; k < 10; k++) {
              const lat = o.pts[i][0] + ((o.pts[i + 1][0] - o.pts[i][0]) * k) / 10, lon = o.pts[i][1] + ((o.pts[i + 1][1] - o.pts[i][1]) * k) / 10;
              const [x, z] = worldXZ(lat, lon);
              pts.push(new THREE.Vector3(x, Math.max(groundAt(lat, lon), 0) + 0.06, z));
            }
          }
          const last = o.pts[o.pts.length - 1]; const [lx, lz] = worldXZ(last[0], last[1]);
          pts.push(new THREE.Vector3(lx, Math.max(groundAt(last[0], last[1]), 0) + 0.06, lz));
          const curve = new THREE.CatmullRomCurve3(pts);
          mesh.geometry.dispose();
          mesh.geometry = new THREE.TubeGeometry(curve, pts.length * 3, 0.055, 6, false);
        };
        layout(); reposition.push(layout); layerGroups.olle.add(mesh); pickables.push(mesh);
        markers.get(o.id).route = mesh;
      }
      applyTerrain();
    }

    // ── 카메라 이동 ─────────────────────────────────────────────────────────
    let tween = null;
    const flyTo = (target, dist, dirOverride) => {
      const dir = dirOverride ? dirOverride.clone() : camera.position.clone().sub(controls.target);
      dir.y = Math.max(dir.y, dir.length() * 0.55);
      dir.normalize();
      tween = { t: 0, fromT: controls.target.clone(), fromP: camera.position.clone(), toT: target.clone(), toP: target.clone().addScaledVector(dir, dist) };
    };
    const stepTween = (dt) => {
      if (!tween) return;
      tween.t = Math.min(1, tween.t + dt / 1.1);
      const e = 1 - Math.pow(1 - tween.t, 3);
      controls.target.lerpVectors(tween.fromT, tween.toT, e);
      camera.position.lerpVectors(tween.fromP, tween.toP, e);
      if (tween.t >= 1) tween = null;
    };

    // ── 외부(React)에서 쓰는 API ────────────────────────────────────────────
    let selectedId = null, hoverId = null;
    const refreshMarkerStyle = () => {
      for (const [id, m] of markers) {
        const k = id === selectedId ? 1.45 : id === hoverId ? 1.25 : 1;
        m.sprite.scale.set(m.sprite.userData.size * k, m.sprite.userData.size * k, 1);
      }
    };
    api.current = {
      setLayers: (l) => { for (const k in l) layerGroups[k].visible = l[k]; },
      setExag: (v) => { exagNow = v; applyTerrain(); },
      setSpin: (b) => { controls.autoRotate = b; },
      reset: () => { selectedId = null; refreshMarkerStyle(); tween = { t: 0, fromT: controls.target.clone(), fromP: camera.position.clone(), toT: HOME.target.clone(), toP: HOME.pos.clone() }; },
      focus: (id) => {
        selectedId = id; refreshMarkerStyle();
        if (!id) return;
        const m = markers.get(id); if (!m) return;
        const it = m.item;
        if (it.kind === "olle") {
          const box = new THREE.Box3().setFromObject(m.route);
          const c = box.getCenter(new THREE.Vector3()); const s = box.getSize(new THREE.Vector3());
          flyTo(c, Math.max(8, Math.max(s.x, s.z) * 1.6));
        } else if (it.kind === "citrus") {
          flyTo(m.holder.position, 18);
        } else flyTo(m.holder.position, it.big ? 26 : it.kind === "wind" ? 12 : 9);
      },
      metersAt,
    };

    // ── 상호작용: 호버 · 클릭 ───────────────────────────────────────────────
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const pickAt = (ev) => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const live = pickables.filter((o) => { let p = o; while (p) { if (p.visible === false) return false; p = p.parent; } return true; });
      const hit = ray.intersectObjects(live, false)[0];
      return hit ? hit.object.userData.id : null;
    };
    let moveQueued = false;
    const onMove = (ev) => {
      if (moveQueued || ev.buttons) return;
      moveQueued = true;
      requestAnimationFrame(() => {
        moveQueued = false;
        const id = pickAt(ev);
        if (id !== hoverId) { hoverId = id; refreshMarkerStyle(); renderer.domElement.style.cursor = id ? "pointer" : "grab"; }
      });
    };
    let down = null;
    const onDown = (ev) => { down = { x: ev.clientX, y: ev.clientY, t: performance.now() }; };
    const onUp = (ev) => {
      if (!down) return;
      const moved = Math.hypot(ev.clientX - down.x, ev.clientY - down.y);
      const quick = performance.now() - down.t < 450;
      down = null;
      if (moved < 6 && quick) setSelected(pickAt(ev));
    };
    const el = renderer.domElement;
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    cleanups.push(() => { el.removeEventListener("pointermove", onMove); el.removeEventListener("pointerdown", onDown); el.removeEventListener("pointerup", onUp); });

    // ── 크기 · 루프 ────────────────────────────────────────────────────────
    const resize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      renderer.setSize(w, h); labelRenderer.setSize(w, h);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize); ro.observe(mount); resize();
    cleanups.push(() => ro.disconnect());

    const clock = new THREE.Clock();
    let frame = 0;
    const tv = new THREE.Vector3();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.1);
      stepTween(dt);
      controls.update();
      controls.target.x = THREE.MathUtils.clamp(controls.target.x, -WORLD_W / 2, WORLD_W / 2);
      controls.target.z = THREE.MathUtils.clamp(controls.target.z, -WORLD_D / 2, WORLD_D / 2);
      for (const s of spinners) s.obj.rotation.z -= s.speed * dt * 2;
      for (const b of beams) b.rotation.y += dt * 1.4;
      if (++frame % 6 === 0) {
        for (const [id, m] of markers) {
          const show = m.holder.parent.visible && (id === selectedId || id === hoverId || m.item.big || tv.setFromMatrixPosition(m.holder.matrixWorld).distanceTo(camera.position) < 30);
          m.label.visible = show;
          m.el.classList.toggle("on", id === selectedId);
        }
      }
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };

    // ── 자원 로딩 후 시작 ─────────────────────────────────────────────────
    const textures = {};
    (async () => {
      try {
        const [hImg, satTex] = await Promise.all([
          loadImage(`${base}terrain/height.png`),
          new Promise((res, rej) => new THREE.TextureLoader().load(`${base}terrain/sat.png`, res, undefined, () => rej(new Error("위성 지도를 불러오지 못했어요.")))),
        ]);
        if (disposed) return;
        const cv = document.createElement("canvas"); cv.width = HW = hImg.width; cv.height = HH = hImg.height;
        const cx = cv.getContext("2d", { willReadFrequently: true }); cx.drawImage(hImg, 0, 0);
        const px = cx.getImageData(0, 0, HW, HH).data;
        heights = new Float32Array(HW * HH);
        for (let i = 0; i < heights.length; i++) heights[i] = (px[i * 4] * 256 + px[i * 4 + 1]) / 30 - 100;
        textures.sat = satTex;
        buildMap();
        setReady(true);
        loop();
      } catch (e) {
        if (!disposed) setError(String(e.message || e));
      }
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cleanups.forEach((f) => f());
      controls.dispose();
      const shared = new Set(Object.values(M));
      scene.traverse((o) => {
        o.geometry?.dispose?.();
        const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
        mats.forEach((m) => { m.map?.dispose?.(); if (!shared.has(m)) m.dispose?.(); });
      });
      renderer.dispose();
      mount.replaceChildren();
      api.current = null;
    };
  }, []);

  // ── React 상태 → three.js ────────────────────────────────────────────────
  useEffect(() => { if (ready) api.current.setLayers(layers); }, [ready, layers]);
  useEffect(() => { if (ready) api.current.setExag(exag); }, [ready, exag]);
  useEffect(() => { if (ready) api.current.setSpin(spin); }, [ready, spin]);
  useEffect(() => {
    if (!ready) return;
    if (selected) {
      const it = ITEMS.find((i) => i.id === selected);
      if (it && !layers[it.cat]) setLayers((l) => ({ ...l, [it.cat]: true }));
    }
    api.current.focus(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, selected]);

  const sel = selected ? ITEMS.find((i) => i.id === selected) : null;
  const list = useMemo(() => {
    const q = query.trim();
    return ITEMS.filter((i) => layers[i.cat] && (!q || i.name.includes(q) || CATEGORIES[i.cat].label.includes(q)));
  }, [query, layers]);

  const selInfo = useMemo(() => {
    if (!sel || !ready) return null;
    const out = {};
    if (sel.cat === "oreum" || sel.cat === "spot") out.elev = Math.round(api.current.metersAt(sel.ll[0], sel.ll[1]));
    if (sel.visitorKey) {
      const rows = visitors.slice(-12);
      const max = Math.max(...rows.map((r) => r[sel.visitorKey]));
      out.bars = rows.map((r) => ({ m: `${String(r["기준연도"]).slice(2)}.${r["기준월"]}`, v: r[sel.visitorKey], h: (r[sel.visitorKey] / max) * 100 }));
      out.total = rows.reduce((a, r) => a + r[sel.visitorKey], 0);
    }
    return out;
  }, [sel, ready]);

  const counts = useMemo(() => {
    const c = {}; for (const i of ITEMS) c[i.cat] = (c[i.cat] || 0) + 1; return c;
  }, []);

  return (
    <section id="map3d" className="map3d">
      <div className="wrap">
        <h2>제주 3D 입체 지도</h2>
        <p className="sub">드래그로 회전 · 휠/핀치로 확대 · 우클릭(두 손가락)으로 이동. 마커를 눌러 관광지, 올레길, 항·포구, 감귤 재배지를 둘러보세요.</p>
      </div>
      <div className="j3d">
        <div className="j3d-canvas" ref={mountRef} />
        {!ready && !error && <div className="j3d-msg">🌋 한라산 지형을 불러오는 중…</div>}
        {error && <div className="j3d-msg err">{error}</div>}

        {ready && (
          <>
            <aside className={"j3d-panel" + (panel ? "" : " closed")}>
              <button className="j3d-toggle" type="button" onClick={() => setPanel((p) => !p)} aria-expanded={panel}>{panel ? "◀ 접기" : "▶ 레이어"}</button>
              {panel && (
                <>
                  <div className="j3d-chips">
                    {Object.entries(CATEGORIES).map(([k, c]) => (
                      <button key={k} type="button" aria-pressed={layers[k]} className={"j3d-chip" + (layers[k] ? " on" : "")}
                        style={layers[k] ? { background: c.color, borderColor: c.color } : undefined}
                        onClick={() => setLayers((l) => ({ ...l, [k]: !l[k] }))}>{c.icon} {c.label} <small>{counts[k]}</small></button>
                    ))}
                  </div>
                  <input className="j3d-search" type="search" placeholder="장소 검색 (예: 오름, 올레, 포구)" value={query} onChange={(e) => setQuery(e.target.value)} />
                  <ul className="j3d-list">
                    {list.map((i) => (
                      <li key={i.id}><button type="button" className={i.id === selected ? "on" : ""} onClick={() => setSelected(i.id)}>
                        <span style={{ background: CATEGORIES[i.cat].color }} />{i.name}
                      </button></li>
                    ))}
                    {list.length === 0 && <li className="empty">검색 결과가 없어요</li>}
                  </ul>
                  <div className="j3d-tools">
                    <label>지형 높이 ×{exag}
                      <input type="range" min="1" max="6" step="0.5" value={exag} onChange={(e) => setExag(Number(e.target.value))} />
                    </label>
                    <div className="row">
                      <button type="button" className="j3d-mini" onClick={() => setSpin((s) => !s)}>{spin ? "⏸ 회전 멈춤" : "🔄 자동 회전"}</button>
                      <button type="button" className="j3d-mini" onClick={() => { setSelected(null); api.current.reset(); }}>🏠 처음 시점</button>
                    </div>
                  </div>
                </>
              )}
            </aside>

            {sel && (
              <article className="j3d-info">
                <button type="button" className="x" aria-label="닫기" onClick={() => setSelected(null)}>×</button>
                <span className="tag" style={{ background: CATEGORIES[sel.cat].color + "22", color: CATEGORIES[sel.cat].color }}>{CATEGORIES[sel.cat].icon} {CATEGORIES[sel.cat].label}</span>
                <h3>{sel.name}</h3>
                <p>{sel.desc}</p>
                {selInfo?.elev != null && <p className="meta">지형 데이터 기준 고도 약 {fmt(selInfo.elev)}m</p>}
                {selInfo?.bars && (
                  <div className="j3d-vis">
                    <b>최근 12개월 관람객 {fmt(selInfo.total)}명</b>
                    <div className="bars">{selInfo.bars.map((b) => (
                      <div key={b.m} title={`${b.m} ${fmt(b.v)}명`}><i style={{ height: `${b.h}%` }} /><em>{b.m.slice(3)}</em></div>
                    ))}</div>
                    <small>출처: 서귀포시 직영관광지 관람객수 추이</small>
                  </div>
                )}
              </article>
            )}
          </>
        )}
      </div>
      <div className="wrap"><p className="j3d-note">지형: AWS Terrain Tiles(Terrarium) · 위성: Esri World Imagery. 마커·올레길·감귤밭·풍력단지 위치는 학습용으로 어림잡은 값이에요.</p></div>
    </section>
  );
}
