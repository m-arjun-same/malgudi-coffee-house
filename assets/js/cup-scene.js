/* Malgudi — own-code 3D brass tumbler & davara scene (three.js).
   Geometry: LatheGeometry profiles written for this build. Brass PBR material,
   RoomEnvironment studio lighting. State is driven externally (GSAP scrub):
   rotation (deg), colour tint lerp, front/back logo decal opacity, camera orbit. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const BRASS_WHITE = new THREE.Color('#f9f7f7'); /* reference scroll start tint */
const BRASS_GREEN = new THREE.Color('#afab8e'); /* reference scroll end tint */
const BRASS_BASE = new THREE.Color('#c9973f');

function lathe(points, segments = 128) {
  const pts = points.map(p => new THREE.Vector2(p[0], p[1]));
  return new THREE.LatheGeometry(pts, segments);
}

function logoTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 512, 256);
  g.fillStyle = '#f0dcae';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '800 64px "Unbounded", "Arial Black", sans-serif';
  g.fillText('MALGUDI', 256, 104);
  g.font = '700 30px "Courier Prime", monospace';
  g.fillText('· K A A P I ·', 256, 168);
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createCupScene(canvas, opts = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: true,
    preserveDrawingBuffer: !!opts.preserve
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);

  const key = new THREE.DirectionalLight(0xfff1da, 2.4);
  key.position.set(2.5, 4.5, 2.5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xdfb98a, 1.1);
  rim.position.set(-3, 2, -2.5);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0xfff6e8, 0.35));

  const brass = new THREE.MeshStandardMaterial({
    color: BRASS_BASE.clone().lerp(BRASS_WHITE, 0.4),
    metalness: 1.0, roughness: 0.19, envMapIntensity: 1.4,
    side: THREE.DoubleSide
  });

  const spin = new THREE.Group();
  scene.add(spin);

  /* davara — wide shallow bowl, profile walks out the underside and back in */
  const davara = new THREE.Mesh(lathe([
    [0.0, 0.0], [0.28, 0.0], [0.32, 0.016], [0.48, 0.05], [0.66, 0.112],
    [0.76, 0.2], [0.775, 0.226], [0.75, 0.232], [0.675, 0.18],
    [0.48, 0.106], [0.28, 0.082], [0.0, 0.078]
  ]), brass);
  spin.add(davara);

  /* tumbler — flared South-Indian kaapi tumbler sitting in the davara */
  const tumbler = new THREE.Mesh(lathe([
    [0.0, 0.1], [0.252, 0.1], [0.278, 0.128], [0.296, 0.34], [0.318, 0.58],
    [0.352, 0.78], [0.362, 0.812], [0.35, 0.822], [0.33, 0.792],
    [0.3, 0.56], [0.272, 0.3], [0.238, 0.158], [0.0, 0.148]
  ]), brass);
  spin.add(tumbler);

  /* coffee surface + froth */
  const coffee = new THREE.Mesh(
    new THREE.CircleGeometry(0.332, 64),
    new THREE.MeshStandardMaterial({ color: 0x2a160b, roughness: 0.22, metalness: 0.0 })
  );
  coffee.rotation.x = -Math.PI / 2;
  coffee.position.y = 0.782;
  spin.add(coffee);
  const froth = new THREE.Mesh(
    new THREE.CircleGeometry(0.2, 48),
    new THREE.MeshStandardMaterial({ color: 0x7a4a22, roughness: 0.6, transparent: true, opacity: 0.4 })
  );
  froth.rotation.x = -Math.PI / 2;
  froth.position.set(0.05, 0.784, 0.03);
  spin.add(froth);

  /* front / back printed logos (opacity swapped by scroll, like the reference) */
  const logoTex = logoTexture();
  function decal(thetaStart) {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(0.337, 0.312, 0.3, 32, 1, true, thetaStart, 1.5),
      new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, opacity: 0, depthWrite: false })
    );
    m.position.y = 0.47;
    return m;
  }
  const frontLogo = decal(-0.75);
  const backLogo = decal(Math.PI - 0.75);
  spin.add(frontLogo, backLogo);

  const state = {
    rotation: 0,          /* deg, turntable Y */
    colorMix: 0,          /* 0 = white tint, 1 = green tint */
    frontOpacity: 1,
    backOpacity: 0,
    orbitYaw: -20,        /* deg azimuth */
    orbitPitch: 75        /* deg polar */
  };
  const tint = new THREE.Color();

  function applyState() {
    spin.rotation.y = THREE.MathUtils.degToRad(state.rotation);
    tint.copy(BRASS_WHITE).lerp(BRASS_GREEN, state.colorMix);
    brass.color.copy(BRASS_BASE).lerp(tint, 0.4);
    frontLogo.material.opacity = state.frontOpacity;
    backLogo.material.opacity = state.backOpacity;
    const phi = THREE.MathUtils.degToRad(state.orbitPitch);
    const theta = THREE.MathUtils.degToRad(state.orbitYaw);
    const R = 3.35;
    camera.position.set(
      R * Math.sin(phi) * Math.sin(theta),
      R * Math.cos(phi) + 0.42,
      R * Math.sin(phi) * Math.cos(theta)
    );
    camera.lookAt(0, 0.42, 0);
  }

  function resize(w, h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function render() {
    applyState();
    renderer.render(scene, camera);
  }

  applyState();
  return { state, render, resize, renderer, scene, camera };
}
