/* Malgudi Coffee House — own-code behaviour layer.
   Motion spec: measured values from the reference dossier (easings, durations, scrub model). */
(function () {
  'use strict';
  document.documentElement.classList.add('js');
  var EASE = 'cubic-bezier(.22,1,.36,1)';
  var hasGsap = typeof window.gsap !== 'undefined';
  var lenis = null;

  /* ---------- smooth scroll ---------- */
  if (typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    if (hasGsap && typeof window.ScrollTrigger !== 'undefined') {
      lenis.on('scroll', window.ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
    }
  }
  if (hasGsap && typeof window.ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);

  function scrollToTarget(sel) {
    var el = document.querySelector(sel);
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.2 });
    else el.scrollIntoView({ behavior: 'smooth' });
  }

  /* ---------- preloader ---------- */
  var preloader = document.getElementById('preloader');
  var counter = document.getElementById('preCount');
  function finishPreloader() {
    if (!preloader) { document.documentElement.classList.add('is-loaded'); return; }
    if (window.__loaderFailsafe) { clearTimeout(window.__loaderFailsafe); window.__loaderFailsafe = null; }
    preloader.classList.add('is-done');
    document.documentElement.classList.add('is-loaded');
    setTimeout(function () { if (preloader.parentNode) preloader.parentNode.removeChild(preloader); }, 550);
  }
  if (preloader) {
    if (window.innerWidth <= 1023) {
      /* reference skips the preloader on small screens */
      preloader.parentNode && preloader.parentNode.removeChild(preloader);
      document.documentElement.classList.add('is-loaded');
      if (window.__loaderFailsafe) clearTimeout(window.__loaderFailsafe);
    } else {
      var start = performance.now();
      (function tick(now) {
        var t = (now - start) / 700; /* 700ms up to 90% */
        if (t < 1) { counter.textContent = Math.round(t * 90); requestAnimationFrame(tick); }
        else {
          var s2 = performance.now();
          (function tick2(n2) {
            var t2 = (n2 - s2) / 250; /* then 250ms to 100% */
            if (t2 < 1) { counter.textContent = Math.round(90 + t2 * 10); requestAnimationFrame(tick2); }
            else { counter.textContent = 100; finishPreloader(); }
          })(performance.now());
        }
      })(performance.now());
      /* fonts race, 1500ms cap like the reference */
      Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(function (r) { setTimeout(r, 1500); })]).then(function () {});
    }
  }

  /* ---------- header theme per section ---------- */
  var header = document.getElementById('header');
  var themed = document.querySelectorAll('[data-header-theme]');
  if (header && 'IntersectionObserver' in window) {
    var hObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) header.classList.toggle('is-light', en.target.getAttribute('data-header-theme') === 'light');
      });
    }, { rootMargin: '-70px 0px -80% 0px' });
    themed.forEach(function (s) { hObs.observe(s); });
  }

  /* ---------- full-screen menu ---------- */
  var burger = document.getElementById('burger');
  var menu = document.getElementById('menu');
  function setMenu(open) {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-hidden', String(!open));
    if (lenis) { open ? lenis.stop() : lenis.start(); }
  }
  burger && burger.addEventListener('click', function () { setMenu(!document.body.classList.contains('menu-open')); });

  document.querySelectorAll('[data-scroll]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var href = a.getAttribute('href');
      if (href && href.charAt(0) === '#') { e.preventDefault(); setMenu(false); setTimeout(function () { scrollToTarget(href === '#top' ? 'main' : href); }, 60); }
    });
  });

  /* ---------- reveals + counters ---------- */
  if (hasGsap && typeof window.ScrollTrigger !== 'undefined') {
    document.querySelectorAll('.reveal').forEach(function (el) {
      gsap.to(el, {
        opacity: 1, y: 0, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%' }
      });
    });
    document.querySelectorAll('[data-count]').forEach(function (el) {
      var end = parseFloat(el.getAttribute('data-count'));
      var dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
      var obj = { v: 0 };
      gsap.to(obj, {
        v: end, duration: 1.6, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%' },
        onUpdate: function () { el.textContent = obj.v.toFixed(dec); }
      });
    });

    /* ---------- cup stage: sticky scrub crossfade ---------- */
    var stage = document.querySelector('.cupstage');
    if (stage) {
      var tl = gsap.timeline({
        scrollTrigger: { trigger: stage, start: 'top top', end: 'bottom bottom', scrub: true }
      });
      tl.fromTo('.cupstage__img--a', { scale: 1.18 }, { scale: 1, ease: 'none', duration: 1 }, 0)
        .fromTo('.cupstage__tumbler', { y: 90, rotate: 6, scale: .82, opacity: 0 }, { y: 0, rotate: 0, scale: 1, opacity: 1, ease: 'none', duration: .8 }, 0)
        .to('.cupstage__img--a', { opacity: 0, ease: 'none', duration: .45 }, .55)
        .fromTo('.cupstage__img--b', { opacity: 0, scale: 1.12 }, { opacity: 1, scale: 1, ease: 'none', duration: .45 }, .55)
        .to('.cupstage__cap', { opacity: 1, duration: .2 }, .6);
    }

    /* ---------- formats scrub reveal ---------- */
    document.querySelectorAll('[data-format-slide]').forEach(function (card) {
      gsap.fromTo(card, { y: 90, opacity: 0, clipPath: 'inset(6% 3% 6% 3% round 24px)' }, {
        y: 0, opacity: 1, clipPath: 'inset(0% 0% 0% 0% round 24px)', ease: 'none',
        scrollTrigger: { trigger: card, start: 'top 96%', end: 'top 55%', scrub: true }
      });
    });
  } else {
    /* fallback: IntersectionObserver reveals */
    var rObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.style.opacity = 1; en.target.style.transform = 'none'; rObs.unobserve(en.target); } });
    }, { threshold: .12 });
    document.querySelectorAll('.reveal').forEach(function (el) { rObs.observe(el); });
    document.querySelectorAll('[data-count]').forEach(function (el) {
      el.textContent = el.getAttribute('data-count');
    });
  }

  /* ---------- benefits metric pulse (IO .45, 1800ms) ---------- */
  var bObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.intersectionRatio >= .45) {
        en.target.classList.add('is-metric-visible');
        setTimeout(function () { en.target.classList.remove('is-metric-visible'); }, 1800);
        setTimeout(function () { en.target.classList.add('is-metric-visible'); }, 2000);
      }
    });
  }, { threshold: [.45] });
  document.querySelectorAll('[data-benefit]').forEach(function (c) { bObs.observe(c); });

  /* ---------- FAQ accordion: WAAPI 600ms, single-open ---------- */
  document.querySelectorAll('.faq__item').forEach(function (item) {
    var summary = item.querySelector('summary');
    var body = item.querySelector('.faq__body');
    body.style.height = '0px';
    summary.addEventListener('click', function (e) {
      e.preventDefault();
      var isOpen = item.hasAttribute('open');
      document.querySelectorAll('.faq__item[open]').forEach(function (other) {
        if (other !== item) closeItem(other);
      });
      isOpen ? closeItem(item) : openItem(item);
    });
    function openItem(it) {
      var b = it.querySelector('.faq__body');
      it.setAttribute('open', '');
      var h = b.scrollHeight;
      b.animate([{ height: '0px' }, { height: h + 'px' }], { duration: 600, easing: EASE, fill: 'forwards' })
        .onfinish = function () { b.style.height = 'auto'; };
    }
    function closeItem(it) {
      var b = it.querySelector('.faq__body');
      var h = b.scrollHeight;
      var anim = b.animate([{ height: h + 'px' }, { height: '0px' }], { duration: 600, easing: EASE, fill: 'forwards' });
      anim.onfinish = function () { it.removeAttribute('open'); b.style.height = '0px'; };
    }
  });

  /* ---------- modal ---------- */
  var modal = document.getElementById('visitModal');
  function setModal(open) {
    modal.setAttribute('aria-hidden', String(!open));
    if (lenis) { open ? lenis.stop() : lenis.start(); }
    if (open) { var f = modal.querySelector('input'); f && f.focus(); }
  }
  document.querySelectorAll('[data-open-modal]').forEach(function (b) { b.addEventListener('click', function () { setModal(true); }); });
  document.querySelectorAll('[data-close-modal]').forEach(function (b) { b.addEventListener('click', function () { setModal(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { setModal(false); setMenu(false); } });

  /* ---------- visit forms (page + modal), static submit ---------- */
  document.querySelectorAll('[data-visit-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      form.querySelectorAll('[data-err]').forEach(function (n) { n.textContent = ''; n.classList.remove('show'); });
      var formErr = form.querySelector('[data-err-form]'); formErr.textContent = ''; formErr.classList.remove('show');
      function fail(input, msg) {
        ok = false;
        var note = input.closest('.field') && input.closest('.field').querySelector('[data-err]');
        if (note) { note.textContent = msg; note.classList.add('show'); }
      }
      var name = form.querySelector('[name="name"]');
      var phone = form.querySelector('[name="phone"]');
      var consent = form.querySelector('[name="consent"]');
      if (!name.value.trim()) fail(name, 'Please tell us your name.');
      if (!/^[+\d][\d\s-]{7,15}$/.test(phone.value.trim())) fail(phone, 'Please enter a valid phone number.');
      if (!consent.checked) { ok = false; formErr.textContent = 'Please tick the consent box so we can contact you.'; formErr.classList.add('show'); }
      var status = form.querySelector('[data-status]');
      if (!ok) { status.textContent = ''; return; }
      try {
        var plans = JSON.parse(localStorage.getItem('malgudi-visits') || '[]');
        plans.push({ name: name.value.trim(), phone: phone.value.trim(), date: form.querySelector('[name="date"]').value, time: form.querySelector('[name="time"]').value, saved: new Date().toISOString() });
        localStorage.setItem('malgudi-visits', JSON.stringify(plans));
      } catch (err) {}
      status.textContent = 'Saved! See you at the counter, ' + name.value.trim().split(' ')[0] + ' — open daily 7:30 AM – 10:30 PM.';
      form.reset();
    });
  });

  /* ---------- cookie banner ---------- */
  var banner = document.getElementById('cookies');
  var KEY = 'malgudi-cookie-consent';
  var seen = null;
  try { seen = localStorage.getItem(KEY); } catch (err) {}
  if (!seen && banner) {
    setTimeout(function () { banner.hidden = false; }, 1400);
    document.getElementById('cookieOk').addEventListener('click', function () {
      try { localStorage.setItem(KEY, '1;max-age=' + 365 * 24 * 3600); } catch (err) {}
      banner.hidden = true;
    });
  }

  /* refresh triggers once images settle */
  window.addEventListener('load', function () {
    if (typeof window.ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
  });
})();
