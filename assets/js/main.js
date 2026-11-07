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

  /* ---------- full-screen menu (reference values: panel .5 power1.out
     clip-path wipe; links x:100 stagger .04; footer delay .3) ---------- */
  var burger = document.getElementById('burger');
  var menu = document.getElementById('menu');
  var menuOpen = false;
  var menuLinks = menu ? menu.querySelectorAll('.menu__list a') : [];
  var menuFoot = menu ? menu.querySelectorAll('.menu__foot > *') : [];
  var panelTl = null;
  if (hasGsap && menu) {
    gsap.set(menuFoot, { autoAlpha: 0 });
    panelTl = gsap.timeline({ paused: true })
      .fromTo(menu, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: .5, ease: 'power1.out' });
    panelTl.eventCallback('onReverseComplete', function () {
      if (!menuOpen) { menu.style.visibility = 'hidden'; }
    });
  }
  function openMenu() {
    menuOpen = true;
    document.body.classList.add('menu-open');
    document.documentElement.classList.add('is-lock');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Close menu');
    menu.setAttribute('aria-hidden', 'false');
    if (lenis) lenis.stop();
    if (panelTl) {
      menu.style.visibility = 'visible';
      panelTl.timeScale(1).play(0);
      gsap.timeline()
        .fromTo(menuLinks, { x: 100, opacity: 0 }, { x: 0, opacity: 1, duration: .5, stagger: .04, ease: 'power2.out' }, 0)
        .to(menuFoot, { autoAlpha: 1, duration: .1, stagger: .08, ease: 'sine.out' }, .3);
    } else { menu.style.visibility = 'visible'; }
  }
  function closeMenu() {
    if (!menuOpen) return;
    menuOpen = false;
    document.body.classList.remove('menu-open');
    document.documentElement.classList.remove('is-lock');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Open menu');
    menu.setAttribute('aria-hidden', 'true');
    if (lenis) lenis.start();
    if (panelTl) {
      gsap.timeline()
        .to(menuFoot, { autoAlpha: 0, duration: .1, ease: 'sine.in' }, 0)
        .to(menuLinks, { x: 100, opacity: 0, duration: .5, stagger: { each: .04, from: 'end' }, ease: 'power2.in' }, 0)
        .call(function () { panelTl.timeScale(1).reverse(); }, null, .3);
    } else { menu.style.visibility = 'hidden'; }
  }
  burger && burger.addEventListener('click', function () { menuOpen ? closeMenu() : openMenu(); });

  document.querySelectorAll('[data-scroll]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var href = a.getAttribute('href');
      if (href && href.charAt(0) === '#') { e.preventDefault(); closeMenu(); setTimeout(function () { scrollToTarget(href === '#top' ? 'main' : href); }, 60); }
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

    /* ---------- headings: split-line mask reveal (reference values:
       lines from yPercent 140, .9s power3.out, stagger .09, start "top 85%";
       exclusions: .formats, .terms, .faq, .modal) ---------- */
    var headingEls = Array.prototype.filter.call(document.querySelectorAll('h1, h2'), function (h) {
      return !h.closest('.formats, .terms, .faq, .modal');
    });
    var headingTweens = [];
    function splitHeading(el) {
      if (!el.getAttribute('data-original')) el.setAttribute('data-original', el.innerHTML);
      var segments = [[]];
      Array.prototype.forEach.call(el.childNodes, function (node) {
        if (node.nodeType === 3) {
          node.textContent.split(/\s+/).filter(Boolean).forEach(function (w) { segments[segments.length - 1].push(w); });
        } else if (node.tagName === 'BR') { segments.push([]); }
        else if (node.textContent) { node.textContent.split(/\s+/).filter(Boolean).forEach(function (w) { segments[segments.length - 1].push(w); }); }
      });
      /* pass 1: word spans to measure line breaks */
      el.innerHTML = '';
      var wordSpans = [];
      segments.forEach(function (words, si) {
        if (si > 0) { var br = document.createElement('span'); br.setAttribute('data-br', ''); br.style.display = 'block'; el.appendChild(br); }
        words.forEach(function (w, wi) {
          var s = document.createElement('span');
          s.textContent = w;
          el.appendChild(s);
          if (wi < words.length - 1) el.appendChild(document.createTextNode(' '));
          wordSpans.push(s);
        });
      });
      /* group by offsetTop */
      var lines = [], cur = null, curTop = null;
      wordSpans.forEach(function (s) {
        var segBreak = s.previousSibling && s.previousSibling.hasAttribute && s.previousSibling.hasAttribute('data-br');
        if (cur === null || s.offsetTop !== curTop || segBreak) { cur = []; lines.push(cur); curTop = s.offsetTop; }
        cur.push(s.textContent);
      });
      /* pass 2: masked lines */
      el.innerHTML = '';
      var lineEls = lines.filter(function (l) { return l.length; }).map(function (words) {
        var mask = document.createElement('span'); mask.className = 'reveal-line-mask';
        var line = document.createElement('span'); line.className = 'reveal-line';
        line.textContent = words.join(' ');
        mask.appendChild(line);
        el.appendChild(mask);
        return line;
      });
      return lineEls;
    }
    function killHeadingTweens() {
      headingTweens.forEach(function (t) { if (t.scrollTrigger) t.scrollTrigger.kill(); t.kill(); });
      headingTweens = [];
    }
    function armHeadings() {
      killHeadingTweens();
      headingEls.forEach(function (h) {
        var lines = splitHeading(h);
        gsap.set(h, { autoAlpha: 1 });
        if (!lines.length) return;
        headingTweens.push(gsap.from(lines, {
          yPercent: 140, duration: .9, ease: 'power3.out', stagger: .09,
          scrollTrigger: { trigger: h, start: 'top 85%' }
        }));
      });
      ScrollTrigger.refresh();
    }
    if (headingEls.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(headingEls, { autoAlpha: 0 });
      var gateDone = false;
      var gate = new Promise(function (resolve) {
        var done = function () { if (!gateDone) { gateDone = true; resolve(); } };
        if (document.documentElement.classList.contains('is-loaded')) done();
        else {
          var mo = new MutationObserver(function () {
            if (document.documentElement.classList.contains('is-loaded')) { mo.disconnect(); done(); }
          });
          mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
          setTimeout(function () { mo.disconnect(); done(); }, 4000);
        }
      });
      Promise.all([gate, document.fonts ? document.fonts.ready : Promise.resolve()]).then(armHeadings);
      var resizeTimer = null;
      window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
          headingEls.forEach(function (h) { h.innerHTML = h.getAttribute('data-original'); });
          armHeadings();
        }, 300);
      });
    }

    /* ---------- formats: pinned stacking slides (reference Vc values) ---------- */
    var formatsEl = document.querySelector('.formats');
    if (formatsEl && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      var slides = formatsEl.querySelectorAll('.format-slide');
      if (slides.length > 1) {
        var ftl = gsap.timeline({
          scrollTrigger: { trigger: formatsEl, start: 'top top', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true }
        });
        Array.prototype.forEach.call(slides, function (slide, i) {
          if (i === 0) return;
          var rev = slide.querySelector('.format-slide__reveal');
          ftl.fromTo(slide, { yPercent: 100 }, { yPercent: 0, duration: 1, ease: 'none' }, i - 1);
          if (rev) ftl.fromTo(rev, { yPercent: -100 }, { yPercent: 0, duration: 1, ease: 'none' }, i - 1);
        });
      }
    }

    /* ---------- package images: scrub zoom (tablet 240/135, desktop 370/240) ---------- */
    var packMM = gsap.matchMedia();
    packMM.add({
      tablet: '(min-width: 768px) and (max-width: 1023.98px)',
      desktop: '(min-width: 1024px)',
      motion: '(prefers-reduced-motion: no-preference)'
    }, function (ctx) {
      var c = ctx.conditions;
      if (!c.motion || (!c.tablet && !c.desktop)) return;
      var target = c.desktop ? 370 / 240 : 240 / 135;
      var tweens = gsap.utils.toArray('.pack__img img').map(function (img) {
        return gsap.fromTo(img, { scale: 1 }, {
          scale: target, ease: 'none', transformOrigin: '100% 100%',
          scrollTrigger: { trigger: img, start: 'top 85%', end: 'top 55%', scrub: true }
        });
      });
      return function () { tweens.forEach(function (t) { if (t.scrollTrigger) t.scrollTrigger.kill(); t.kill(); }); };
    });

    /* ---------- footer wordmark: height reveal + legal slide (scrub .05) ---------- */
    var fFill = document.querySelector('.footer__fill');
    var fWrap = document.querySelector('.footer__wordwrap');
    var fWord = document.querySelector('.footer__word');
    var fLegal = document.querySelector('.footer__base');
    if (fFill && fWrap && fWord && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      var fOff = window.innerWidth >= 1024 ? 51 : 53;
      gsap.fromTo(fWrap, { height: 0 }, {
        height: function () { return fWord.offsetHeight; }, duration: 1, ease: 'none',
        scrollTrigger: { trigger: fFill, start: 'top bottom-=' + fOff + 'px', end: 'bottom bottom-=' + fOff + 'px', scrub: .05, invalidateOnRefresh: true }
      });
      if (window.innerWidth >= 768 && fLegal) {
        gsap.fromTo(fLegal, { y: function () { return -fFill.offsetHeight; } }, {
          y: 0, duration: 1, ease: 'none',
          scrollTrigger: { trigger: fFill, start: 'top bottom-=' + fOff + 'px', end: 'bottom bottom-=' + fOff + 'px', scrub: true, invalidateOnRefresh: true }
        });
      }
    }
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

  /* ---------- mobile cup sequence: 60 own-rendered frames, canvas scrub
     (frame = round(progress × 59), trigger figures "top bottom"→"top top") ---------- */
  var seqCanvas = document.getElementById('cupSeq');
  window.__seqProbe = function () { return null; };
  if (seqCanvas && window.innerWidth < 768 && hasGsap && typeof window.ScrollTrigger !== 'undefined'
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var seqFrames = new Array(60), seqLastProgress = 0, seqDrawn = -1;
    var seqCtx = seqCanvas.getContext('2d');
    var seqState = { progress: 0, frame: 0, drawn: -1 };
    function seqDraw(p) {
      seqLastProgress = p;
      var idx = Math.round(p * 59);
      seqState.progress = p; seqState.frame = idx;
      for (var t = 0; t < 60; t++) {
        var cand = seqFrames[idx - t] ? idx - t : (seqFrames[idx + t] ? idx + t : -1);
        if (cand >= 0) {
          if (cand !== seqDrawn) {
            seqDrawn = cand; seqState.drawn = cand;
            seqCtx.clearRect(0, 0, 480, 625);
            seqCtx.drawImage(seqFrames[cand], 0, 0, 480, 625);
          }
          break;
        }
      }
    }
    function seqLoad(i, priority) {
      var im = new Image();
      try { im.fetchPriority = priority; } catch (e) {}
      im.onload = function () { seqFrames[i] = im; seqDraw(seqLastProgress); };
      im.src = 'assets/img/cup-frames/' + String(i).padStart(3, '0') + '.webp';
    }
    seqLoad(0, 'high');
    for (var si = 1; si < 60; si++) seqLoad(si, 'low');
    ScrollTrigger.create({
      trigger: '.figures', start: 'top bottom', end: 'top top', scrub: true,
      onUpdate: function (self) { seqDraw(self.progress); },
      onRefresh: function (self) { seqDraw(self.progress); }
    });
    seqDraw(0);
    window.__seqProbe = function () { return { progress: seqState.progress, frame: seqState.frame, drawn: seqState.drawn }; };
  }

  /* ---------- digital phone video: IO autoplay (rootMargin 200px), replay on pause ---------- */
  var dVideo = document.querySelector('[data-inside-video]');
  if (dVideo) {
    var playIt = function () {
      if (!dVideo.getAttribute('src')) dVideo.src = dVideo.getAttribute('data-src');
      if (dVideo.paused) { var pr = dVideo.play(); if (pr) pr.catch(function () {}); }
    };
    new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) playIt();
    }, { rootMargin: '200px 0px' }).observe(dVideo);
    dVideo.addEventListener('pause', function () { setTimeout(playIt, 60); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) playIt(); });
  }
  /* .is-ending: benefits entering fades the inside content out */
  var dWrap = document.querySelector('[data-digital]');
  var benefitsSection = document.querySelector('.benefits');
  if (dWrap && benefitsSection) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { dWrap.classList.toggle('is-ending', e.isIntersecting); });
    }, { rootMargin: '0px 0px -20% 0px', threshold: 0 }).observe(benefitsSection);
  }

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
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { setModal(false); closeMenu(); } });

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
