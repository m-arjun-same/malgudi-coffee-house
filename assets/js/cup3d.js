/* Malgudi — 3D cup driver (own code). Wires the brass tumbler scene to the
   reference's scrub model: rotation 0→180 while the figures section enters,
   colour tint white→green, front/back logo swap, then an exit timeline
   (+180° and offscreen drop from 35%) that ends exactly at formats top.
   A second instance flies through the package section (170°→530°). */
import { createCupScene } from './cup-scene.js';

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function init() {
  if (!gsap || !ScrollTrigger || reduceMotion.matches) return;
  gsap.registerPlugin(ScrollTrigger);

  /* reload when crossing the 768 mode switch, like the reference */
  const mode = window.matchMedia('(min-width: 768px)');
  mode.addEventListener && mode.addEventListener('change', () => window.location.reload());
  if (!mode.matches) return; /* mobile uses the frame sequence (main.js) */

  /* ---------------- hero cup ---------------- */
  const modelEl = document.getElementById('cup3d');
  const canvas = document.getElementById('cupCanvas');
  const features = document.querySelector('.figures');
  const formats = document.querySelector('.formats');
  const transition = document.querySelector('.hero-transition');
  if (modelEl && canvas && features && formats) {
    const cup = createCupScene(canvas);
    const anim = { rotation: 0, exitRotation: 0, exitY: 0, colorMix: 0, frontOpacity: 1, backOpacity: 0 };
    const orbit = { yaw: -20, pitch: 75 };

    function fit() {
      const w = modelEl.clientWidth, h = modelEl.clientHeight;
      if (w) cup.resize(w, h);
    }
    fit();
    window.addEventListener('resize', fit);

    const offscreen = () => (window.innerHeight + modelEl.getBoundingClientRect().height) / 2 + 20;

    gsap.timeline({
      scrollTrigger: { trigger: features, start: 'top bottom', end: 'top top', scrub: true, invalidateOnRefresh: true }
    })
      .fromTo(anim, { rotation: 0 }, { rotation: 180, duration: 1, ease: 'none' }, 0)
      .fromTo(anim, { colorMix: 0 }, { colorMix: 1, duration: 1, ease: 'none' }, 0)
      .fromTo(anim, { frontOpacity: 1 }, { frontOpacity: 0, duration: 0.5, ease: 'none' }, 0)
      .fromTo(anim, { backOpacity: 0 }, { backOpacity: 1, duration: 0.5, ease: 'none' }, 0.5);

    gsap.timeline({
      scrollTrigger: { trigger: features, start: 'top top', endTrigger: formats, end: 'top top', scrub: true, invalidateOnRefresh: true }
    })
      .fromTo(anim, { exitRotation: 0 }, { exitRotation: 180, duration: 1, ease: 'none', immediateRender: false }, 0)
      .fromTo(anim, { exitY: 0 }, { exitY: () => offscreen(), duration: 0.65, ease: 'none', immediateRender: false }, 0.35);

    /* camera parallax — pointer over hero / figures / formats, ±15°, .8s power3.out */
    if (window.matchMedia('(pointer: fine)').matches) {
      const yawTo = gsap.quickTo(orbit, 'yaw', { duration: 0.8, ease: 'power3.out' });
      const pitchTo = gsap.quickTo(orbit, 'pitch', { duration: 0.8, ease: 'power3.out' });
      document.querySelectorAll('.hero, .figures, .formats').forEach(el => {
        el.addEventListener('pointermove', e => {
          if (e.pointerType !== 'mouse') return;
          const r = el.getBoundingClientRect();
          const nx = gsap.utils.clamp(-1, 1, (e.clientX - r.left) / r.width * 2 - 1);
          const ny = gsap.utils.clamp(-1, 1, (e.clientY - r.top) / r.height * 2 - 1);
          yawTo(-20 + nx * 15);
          pitchTo(75 - ny * 15);
        });
        el.addEventListener('pointerleave', () => { yawTo(-20); pitchTo(75); });
      });
    }

    let heroVisible = true;
    new IntersectionObserver(en => { heroVisible = en[0].isIntersecting; }, { rootMargin: '20% 0px' }).observe(transition);

    window.__cupProbe = () => ({
      rotation: Math.round((anim.rotation + anim.exitRotation) * 100) / 100,
      exitY: Math.round(anim.exitY * 100) / 100,
      colorMix: Math.round(anim.colorMix * 1000) / 1000,
      frontOpacity: anim.frontOpacity, backOpacity: anim.backOpacity
    });

    gsap.ticker.add(() => {
      if (!heroVisible) return;
      cup.state.rotation = anim.rotation + anim.exitRotation;
      cup.state.colorMix = anim.colorMix;
      cup.state.frontOpacity = anim.frontOpacity;
      cup.state.backOpacity = anim.backOpacity;
      cup.state.orbitYaw = orbit.yaw;
      cup.state.orbitPitch = orbit.pitch;
      const scale = window.innerWidth >= 768 && window.innerWidth < 1024 ? 0.9 : 1;
      modelEl.style.transform = `translate3d(0, ${-40 + anim.exitY}px, 0) scale(${scale})`;
      cup.render();
    });
  }

  /* ---------------- package flight cup ---------------- */
  const flightRoot = document.querySelector('[data-cup-flight]');
  const flightCanvas = document.getElementById('flightCanvas');
  const flightModel = document.getElementById('flightCup');
  if (flightRoot && flightCanvas && flightModel) {
    const cup = createCupScene(flightCanvas);
    cup.state.colorMix = 0.12;
    cup.state.frontOpacity = 1;
    const flight = { progress: 0 };
    const START = 170, END = 530;

    function fit() {
      if (flightModel.clientWidth) cup.resize(flightModel.clientWidth, flightModel.clientHeight);
    }
    fit();
    window.addEventListener('resize', fit);

    function renderFlight() {
      const p = flight.progress;
      const vh = window.innerHeight;
      const modelH = flightModel.getBoundingClientRect().height;
      const ratio = vh / (flightRoot.offsetHeight + vh);
      const enterEnd = Math.min(ratio, 0.5);
      const exitStart = Math.max(1 - ratio, 0.5);
      const off = (vh + modelH) / 2 + 20;
      let y;
      if (p <= enterEnd) y = gsap.utils.interpolate(-off, 0, enterEnd ? p / enterEnd : 1);
      else if (p >= exitStart) y = gsap.utils.interpolate(0, off, (p - exitStart) / (1 - exitStart));
      else y = 0;
      cup.state.rotation = gsap.utils.interpolate(START, END, p);
      /* logo faces viewer mid-flight: front fades out / back in over the spin */
      cup.state.frontOpacity = 1;
      cup.state.backOpacity = 0;
      flightModel.style.transform = `translate3d(0, ${y}px, 0)`;
      window.__flightProbe = () => ({ progress: p, rotation: cup.state.rotation, y: Math.round(y) });
    }
    renderFlight();

    ScrollTrigger.create({
      trigger: flightRoot, start: 'top bottom', end: 'bottom top',
      onUpdate: self => { flight.progress = self.progress; renderFlight(); },
      onRefresh: self => { flight.progress = self.progress; renderFlight(); }
    });

    let flightVisible = false;
    new IntersectionObserver(en => { flightVisible = en[0].isIntersecting; }, { rootMargin: '30% 0px' }).observe(flightRoot);
    gsap.ticker.add(() => { if (flightVisible) cup.render(); });
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
