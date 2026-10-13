/* Riley Guitars - motion layer (GSAP + ScrollTrigger + SplitText, Lenis, Swiper from assets/vendor).
   Content is always visible without JS; the hidden "before" state is only ever set from here.
   RileyFX.carousel(el, products) renders product cards as a Swiper (falls back to the plain grid). */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var swipers = new WeakMap();

  /* ---------- carousel ---------- */
  function carousel(el, products) {
    var UI = window.RileyUI;
    var old = swipers.get(el); if (old) { old.destroy(true, true); swipers.delete(el); }
    if (!window.Swiper) { el.className = 'cards-grid'; el.innerHTML = products.map(UI.productCard).join(''); return; }
    el.className = 'cards-carousel';
    el.innerHTML =
      '<div class="swiper" role="region" aria-roledescription="carousel" aria-label="Guitars in stock">' +
      '<div class="swiper-wrapper">' + products.map(function (p) { return '<div class="swiper-slide">' + UI.productCard(p) + '</div>'; }).join('') + '</div></div>' +
      '<div class="car-bar"><div class="car-progress swiper-scrollbar"></div>' +
      '<div class="car-nav"><button class="car-btn car-prev" type="button" aria-label="Previous guitars"><span aria-hidden="true">&#8592;</span></button>' +
      '<button class="car-btn car-next" type="button" aria-label="Next guitars"><span aria-hidden="true">&#8594;</span></button></div></div>';
    swipers.set(el, new Swiper(el.querySelector('.swiper'), {
      slidesPerView: 1.5, spaceBetween: 12, grabCursor: true, watchOverflow: true, a11y: { enabled: true },
      speed: reduce ? 0 : 600,
      scrollbar: { el: el.querySelector('.car-progress'), draggable: true, hide: false },
      navigation: { nextEl: el.querySelector('.car-next'), prevEl: el.querySelector('.car-prev'), disabledClass: 'is-disabled' },
      breakpoints: { 640: { slidesPerView: 2.5, spaceBetween: 20 }, 960: { slidesPerView: 3.2, spaceBetween: 24 }, 1280: { slidesPerView: 4, spaceBetween: 24 } }
    }));
  }

  /* ---------- page motion ---------- */
  function done() { root.classList.remove('fx-pending'); }
  function init() {
    if (!window.gsap) { done(); return; }
    if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
    if (window.SplitText) gsap.registerPlugin(SplitText);
    var mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: no-preference)', function () {
      var phone = window.matchMedia('(max-width: 767px)').matches;

      /* smooth scrolling (Lenis leaves touch scrolling native) */
      var lenis = null, lock = null;
      if (window.Lenis) {
        lenis = new Lenis({ lerp: 0.1, anchors: { offset: -80 } });
        if (window.ScrollTrigger) lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
        gsap.ticker.lagSmoothing(0);
        /* pause while the cart / menu / photo viewer lock the page */
        lock = new MutationObserver(function () {
          if (/\b(nav-open|cart-open|lb-open)\b/.test(document.body.className)) lenis.stop(); else lenis.start();
        });
        lock.observe(document.body, { attributes: true, attributeFilter: ['class'] });
      }

      /* hero: home headline lines rise in, then supporting copy; inner pages fade up */
      var h1 = document.querySelector('.hero h1');
      var heroImg = document.querySelector('.hero-media img');
      if (heroImg) gsap.from(heroImg, { scale: 1.08, duration: 1.8, ease: 'expo.out' });
      if (h1 && window.SplitText) {
        var rest = gsap.utils.toArray('.hero .eyebrow, .hero-inner p, .hero .cluster');
        SplitText.create(h1, { type: 'lines', mask: 'lines', autoSplit: true,
          onSplit: function (s) { return gsap.from(s.lines, { yPercent: 105, duration: 1.1, ease: 'expo.out', stagger: 0.09, delay: 0.15 }); } });
        done();
        gsap.from(rest, { y: 24, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1, delay: 0.5 });
      } else {
        var targets = gsap.utils.toArray('.page-hero .container > *');
        done();
        if (targets.length) gsap.from(targets, { y: phone ? 20 : 30, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, delay: 0.1 });
      }

      /* scroll reveals: each block under the first screen fades and slides up once */
      if (window.ScrollTrigger) {
        var sel = 'main > section:not(.hero):not(.page-hero) > .container > *, .footer-grid > *';
        gsap.utils.toArray(sel).forEach(function (el) {
          if (el.closest('.hero, .page-hero') || el.matches('form, [data-no-reveal]')) return;
          gsap.from(el, { y: phone ? 24 : 44, opacity: 0, duration: phone ? 0.7 : 0.95, ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
        });
        window.addEventListener('load', function () { ScrollTrigger.refresh(); });
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
      }

      return function () { if (lock) lock.disconnect(); if (lenis) lenis.destroy(); };
    });

    mm.add('(prefers-reduced-motion: reduce)', done);
    setTimeout(done, 3000);
  }

  window.RileyFX = { carousel: carousel };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
