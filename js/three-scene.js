/* ============================================================
   three-scene.js — Three.js hero scene
   Loads models/moon.glb (low-poly moon + orbit ring + blocks),
   adds a starfield, cinematic lighting and orbit controls.
   Falls back to a procedural moon if the GLB can't load.
   ============================================================ */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const wrap = document.getElementById("sceneWrap");
const canvas = document.getElementById("webgl");
const loadingEl = document.getElementById("sceneLoading");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
} catch {
  loadingEl.innerHTML = "<p>WebGL isn't available in this browser.</p>";
  throw new Error("WebGL unavailable");
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
camera.position.set(0, 1.1, 6.4);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 3.4;
controls.maxDistance = 11;
controls.autoRotate = !reducedMotion;
controls.autoRotateSpeed = 0.9;
controls.target.set(0, 0, 0);

/* ---------- lights ---------- */
scene.add(new THREE.AmbientLight(0x8fa3ff, 0.55));

const key = new THREE.DirectionalLight(0xffffff, 2.4);
key.position.set(4, 6, 5);
scene.add(key);

const rimCyan = new THREE.PointLight(0x22d3ee, 30, 40);
rimCyan.position.set(-6, -2, 3);
scene.add(rimCyan);

const rimViolet = new THREE.PointLight(0x7c5cff, 26, 40);
rimViolet.position.set(3, -4, -5);
scene.add(rimViolet);

/* ---------- starfield ---------- */
function makeStars(count, rMin, rMax) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = rMin + Math.random() * (rMax - rMin);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xcdd8ff,
    size: 0.055,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  return new THREE.Points(geo, mat);
}
const stars = makeStars(1100, 12, 34);
scene.add(stars);

/* ---------- model ---------- */
const modelGroup = new THREE.Group();
scene.add(modelGroup);

function finishLoading() {
  loadingEl.classList.add("done");
  setTimeout(() => loadingEl.remove(), 600);
}

/* Procedural fallback: textured moon + ring + blocks */
function buildFallbackMoon() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#c7cede";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 6 + Math.random() * 34;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(90,100,130,0.5)");
    g.addColorStop(1, "rgba(90,100,130,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(1, 48, 48),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0 })
  );
  modelGroup.add(moon);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.55, 0.035, 12, 90),
    new THREE.MeshStandardMaterial({ color: 0x22d3ee, metalness: 0.85, roughness: 0.25 })
  );
  ring.rotation.set(1.25, 0, 0.3);
  modelGroup.add(ring);

  const colors = [0x9d7bff, 0x22d3ee, 0x6bff8f, 0xff73bf, 0xffcc59, 0x73a6ff];
  colors.forEach((color, i) => {
    const s = 0.16 + Math.random() * 0.14;
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(s, s, s),
      new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.1 })
    );
    const t = Math.random() * Math.PI * 2;
    const r = 2.1 + Math.random();
    block.position.set(Math.cos(t) * r, (Math.random() - 0.5) * 2, Math.sin(t) * r);
    block.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    modelGroup.add(block);
  });
}

const glbUrl = new URL("../models/moon.glb", import.meta.url).href;
new GLTFLoader().load(
  glbUrl,
  (gltf) => {
    gltf.scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.material = obj.material.clone();
        if (obj.geometry.attributes.color) obj.material.vertexColors = true;
      }
    });
    modelGroup.add(gltf.scene);
    finishLoading();
  },
  undefined,
  () => {
    buildFallbackMoon();
    finishLoading();
  }
);

/* ---------- resize ---------- */
function resize() {
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(wrap);
resize();

/* ---------- render loop (pauses off-screen) ---------- */
let inView = true;
new IntersectionObserver(
  ([entry]) => {
    inView = entry.isIntersecting;
  },
  { threshold: 0.02 }
).observe(wrap);

const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  if (!inView) return;
  const t = clock.getElapsedTime();
  if (!reducedMotion) {
    modelGroup.position.y = Math.sin(t * 0.7) * 0.09;
    stars.rotation.y = t * 0.006;
  }
  controls.update();
  renderer.render(scene, camera);
}
tick();
