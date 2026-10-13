/* ==========================================================================
   RILEY GUITARS mockup — shared script (vanilla JS, works from file://)

   Every page needs, in this order, at the END of <body>:
     <div id="site-footer"></div>
     <script src="assets/js/data.js"></script>
     <script src="assets/js/app.js"></script>
     <script> ...page script (may use window.RILEY and window.RileyUI)... </script>
   and at the TOP of <body>:  <div id="site-header"></div>  and  <body data-page="store">.
   Nav highlighting uses body[data-page]: home | store | custom-build | repairs | gallery | about | contact
   (product -> Store, model -> Custom Build are mapped automatically).

   What this file does
   - Injects skip link, header (+ mobile menu) into #site-header and footer into #site-footer.
   - Mobile menu: button.nav-toggle, aria-expanded, Esc closes, focus moves into the menu and back.
   - Cart drawer: localStorage key 'riley-cart' = [{id, qty}]. Guitars are one-of-one, so max qty is 1
     (change MAX_QTY to allow a stepper). Checkout only shows a "demo" notice.
   - Toast + lightbox: any <a href="big.jpg" data-lightbox="groupname" data-caption="..."><img></a> opens the lightbox.

   window.RileyUI API
     money(n)              -> "$2,650.00"
     esc(str)              -> HTML-escaped string (use for any user/data text put into innerHTML)
     param(name)           -> query-string value or null
     productCard(p)        -> HTML string for a product card (.card)  (p from RILEY.products)
     modelCard(m)          -> HTML string for a model card (.card.model-card) (m from RILEY.models)
     getProduct(slug)      -> product or undefined      getModel(slug) -> model or undefined
     addToCart(id)         -> adds, opens drawer, toast          removeFromCart(id)
     openCart() / closeCart()      cartCount()      toast(message)
     icons                 -> inline SVG strings (instagram, facebook, youtube, reverb, cart, check)
   ========================================================================== */
(function () {
  'use strict';

  var MAX_QTY = 1;
  var CART_KEY = 'riley-cart';
  var DATA = window.RILEY || { site: {}, products: [], models: [] };
  var SITE = DATA.site || {};

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var fmt = typeof Intl !== 'undefined' ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }) : null;
  function money(n) { n = Number(n) || 0; return fmt ? fmt.format(n) : '$' + n.toFixed(2); }
  function param(name) {
    try { return new URLSearchParams(window.location.search).get(name); } catch (e) { return null; }
  }
  function getProduct(slug) { return (DATA.products || []).filter(function (p) { return p.slug === slug || p.id === slug; })[0]; }
  function getModel(slug) { return (DATA.models || []).filter(function (m) { return m.slug === slug; })[0]; }

  var icons = {
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.3" cy="6.7" r="1.2"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H7v4h3v7h4v-7h3l1-4h-4V8.5c0-.3.2-.5.5-.5z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8zM10 15V9l5.2 3z"/></svg>',
    reverb: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9.5 16.5v-9h3.3a2.6 2.6 0 0 1 .4 5.2l2.3 3.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    cart: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8z"/><path d="M9 8V7a3 3 0 0 1 6 0v1"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.8"/></svg>'
  };

  /* ---------- cards ---------- */
  function productCard(p) {
    var href = 'product.html?p=' + encodeURIComponent(p.slug);
    var alt = p.images && p.images[1]
      ? '<img class="card-img card-img-alt" src="' + esc(p.images[1]) + '" alt="" width="800" height="1000" loading="lazy" aria-hidden="true">' : '';
    return '<article class="card">' +
      '<div class="card-media"><img class="card-img" src="' + esc(p.images[0]) + '" alt="' + esc(p.title + ' — ' + p.type.toLowerCase() + ' by Riley Guitars') + '" width="800" height="1000" loading="lazy">' + alt +
      '<span class="badge badge-stock">In stock</span></div>' +
      '<div class="card-body"><span class="card-eyebrow">' + esc(p.type) + '</span>' +
      '<h3 class="card-title"><a href="' + href + '">' + esc(p.title) + '</a></h3>' +
      '<span class="card-price">' + money(p.price) + '</span></div></article>';
  }
  function modelCard(m) {
    var href = 'model.html?m=' + encodeURIComponent(m.slug);
    return '<article class="card model-card">' +
      '<div class="card-media"><img class="card-img" src="' + esc(m.images[0]) + '" alt="' + esc('Riley ' + m.name + ' ' + m.category.toLowerCase() + ' guitar') + '" width="800" height="1067" loading="lazy"></div>' +
      '<div class="card-body"><span class="card-eyebrow">' + esc(m.category) + '</span>' +
      '<h3 class="card-title"><a href="' + href + '">' + esc(m.name) + '</a></h3>' +
      '<span class="card-price">Build to order</span></div></article>';
  }

  /* ---------- cart state ---------- */
  function readCart() {
    try {
      var c = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      return Array.isArray(c) ? c.filter(function (i) { return i && getProduct(i.id); }) : [];
    } catch (e) { return []; }
  }
  var cart = readCart();
  function saveCart() { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) { /* private mode */ } renderCart(); }
  function cartCount() { return cart.reduce(function (n, i) { return n + i.qty; }, 0); }

  function addToCart(id) {
    var p = getProduct(id);
    if (!p) return;
    var line = cart.filter(function (i) { return i.id === p.id; })[0];
    if (line) {
      if (line.qty >= MAX_QTY) { toast('This one-of-one guitar is already in your cart.'); openCart(); return; }
      line.qty += 1;
    } else { cart.push({ id: p.id, qty: 1 }); }
    saveCart();
    toast('Added: ' + p.title);
    openCart();
  }
  function removeFromCart(id) { cart = cart.filter(function (i) { return i.id !== id; }); saveCart(); }
  function setQty(id, q) {
    var line = cart.filter(function (i) { return i.id === id; })[0];
    if (!line) return;
    if (q <= 0) return removeFromCart(id);
    line.qty = Math.min(q, MAX_QTY); saveCart();
  }

  /* ---------- toast ---------- */
  var toastTimer, toastEl;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 3200);
  }

  /* ---------- injected markup ---------- */
  var NAV = [
    ['Store', 'store.html', 'store'], ['Custom Build', 'custom-build.html', 'custom-build'], ['Repairs', 'repairs.html', 'repairs'],
    ['Gallery', 'gallery.html', 'gallery'], ['About', 'about.html', 'about'], ['Contact', 'contact.html', 'contact']
  ];
  var PAGE_ALIAS = { product: 'store', model: 'custom-build' };
  var page = document.body.getAttribute('data-page') || '';
  var activeKey = PAGE_ALIAS[page] || page;

  function navLinks() {
    return '<ul>' + NAV.map(function (n) {
      return '<li><a href="' + n[1] + '"' + (n[2] === activeKey ? ' aria-current="page"' : '') + '>' + n[0] + '</a></li>';
    }).join('') + '</ul>';
  }
  var telHref = 'tel:' + (SITE.phoneHref || '+14255407890');
  var addr = (SITE.address || ['713 SE Everett Mall Way Suite E', 'Everett, WA 98208']);

  function headerHTML() {
    return '<a class="skip-link" href="#main">Skip to content</a>' +
      '<header class="site-header"><div class="container-wide bar">' +
      '<a class="brand" href="index.html" aria-label="Riley Custom Guitars — home"><img src="assets/img/logo.png" alt="Riley" width="1339" height="330"><span class="brand-tag">Custom<br>Guitars</span></a>' +
      '<div class="nav-panel" id="nav-panel"><nav class="nav" aria-label="Main">' + navLinks() + '</nav>' +
      '<div class="nav-contact"><a href="mailto:' + esc(SITE.email) + '">' + esc(SITE.email) + '</a><br><a href="' + telHref + '">' + esc(SITE.phone) + '</a><br>' + esc(SITE.hours) + '</div></div>' +
      '<div class="header-actions">' +
      '<button class="icon-btn cart-btn" type="button" aria-label="Open cart" aria-haspopup="dialog" aria-controls="cart-drawer">' + icons.cart + '<span class="cart-count" data-n="0" aria-hidden="true">0</span></button>' +
      '<button class="icon-btn nav-toggle" type="button" aria-expanded="false" aria-controls="nav-panel" aria-label="Open menu"><span class="bars" aria-hidden="true"><i></i><i></i><i></i></span></button>' +
      '</div></div></header>';
  }
  function footerHTML() {
    var soc = [
      ['Instagram', 'https://www.instagram.com/Riley_guitars', icons.instagram, '@Riley_guitars'],
      ['Facebook', 'https://www.facebook.com/Rileycustomguitars', icons.facebook, 'facebook.com/Rileycustomguitars'],
      ['YouTube', 'https://www.youtube.com/@RileyGuitars', icons.youtube, '@RileyGuitars'],
      ['Reverb', 'https://reverb.com/shop/rileyguitars', icons.reverb, 'Reverb shop']
    ].map(function (s) { return '<a href="' + s[1] + '" aria-label="' + s[0] + ' — ' + s[3] + '" rel="noopener"' + (s[1].charAt(0) === '#' ? '' : ' target="_blank"') + '>' + s[2] + '</a>'; }).join('');
    return '<footer class="site-footer"><div class="container"><div class="footer-grid">' +
      '<div class="footer-brand"><img src="assets/img/logo.png" alt="Riley Guitars" width="1339" height="330" loading="lazy">' +
      '<p>Boutique custom guitars and a full repair shop in Everett, Washington. Building since 2020.</p></div>' +
      '<div><h3>Visit</h3><p>' + addr.map(esc).join('<br>') + '</p><p class="muted">' + esc(SITE.hours) + '</p></div>' +
      '<div><h3>Contact</h3><p><a href="mailto:' + esc(SITE.email) + '">' + esc(SITE.email) + '</a><br><a href="' + telHref + '">' + esc(SITE.phone) + '</a></p>' +
      '<h3 style="margin-top:20px">Follow</h3><div class="socials">' + soc + '</div></div>' +
      '<div><h3>Explore</h3><nav aria-label="Footer"><ul>' + NAV.map(function (n) { return '<li><a href="' + n[1] + '">' + n[0] + '</a></li>'; }).join('') + '</ul></nav></div>' +
      '</div><div class="footer-bottom"><span>&copy; ' + new Date().getFullYear() + ' Riley Guitars. All rights reserved.</span>' +
      '<span>Concept mockup &mdash; not a live store.</span></div></div></footer>';
  }
  function overlaysHTML() {
    return '<div class="cart-overlay" data-cart-close></div>' +
      '<aside class="cart-drawer" id="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-title" tabindex="-1">' +
      '<div class="cart-head"><h2 id="cart-title">Your cart</h2><button class="icon-btn" type="button" data-cart-close aria-label="Close cart"><span aria-hidden="true" style="font-size:1.8rem;line-height:1">&times;</span></button></div>' +
      '<div class="cart-body" id="cart-body"></div>' +
      '<div class="cart-foot" id="cart-foot" hidden>' +
      '<div class="cart-total"><span>Subtotal</span><strong id="cart-subtotal">$0.00</strong></div>' +
      '<p class="form-note">Shipping and taxes calculated at checkout. Every guitar ships in a Mono case or sleeve.</p>' +
      '<p class="cart-demo" id="cart-demo" role="status" hidden>Demo site &mdash; checkout isn&rsquo;t connected.</p>' +
      '<button class="btn btn-primary btn-block" type="button" id="cart-checkout">Checkout</button></div></aside>' +
      '<div class="toast-wrap"><div class="toast" id="toast" role="status" aria-live="polite"></div></div>' +
      '<div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer"><button class="lb-close" type="button" aria-label="Close">&times;</button><button class="lb-prev" type="button" aria-label="Previous photo">&#8249;</button><figure><img alt=""><figcaption></figcaption></figure><button class="lb-next" type="button" aria-label="Next photo">&#8250;</button></div>';
  }

  /* ---------- cart rendering ---------- */
  var cartBody, cartFoot, cartSub, cartDemo, lastFocus;
  function renderCart() {
    var n = cartCount();
    [].forEach.call(document.querySelectorAll('.cart-count'), function (b) { b.textContent = n; b.setAttribute('data-n', n); });
    [].forEach.call(document.querySelectorAll('.cart-btn'), function (b) { b.setAttribute('aria-label', 'Open cart, ' + n + (n === 1 ? ' item' : ' items')); });
    if (!cartBody) return;
    if (!cart.length) {
      cartBody.innerHTML = '<div class="cart-empty"><p class="serif" style="font-size:1.5rem;color:var(--text)">Your cart is empty.</p><p class="small">Every guitar in the store is one of one.</p><a class="btn btn-outline" href="store.html">Shop current stock</a></div>';
      cartFoot.hidden = true; return;
    }
    var sub = 0;
    cartBody.innerHTML = cart.map(function (i) {
      var p = getProduct(i.id); sub += p.price * i.qty;
      var qty = MAX_QTY > 1
        ? '<div class="qty"><button type="button" data-qty="-1" data-id="' + esc(p.id) + '" aria-label="Decrease quantity">&minus;</button><span aria-live="polite">' + i.qty + '</span><button type="button" data-qty="1" data-id="' + esc(p.id) + '" aria-label="Increase quantity">+</button></div>'
        : '<p class="meta">One of one &middot; Qty 1</p>';
      return '<div class="cart-item"><a href="product.html?p=' + encodeURIComponent(p.slug) + '"><img src="' + esc(p.images[0]) + '" alt="' + esc(p.title) + '" width="76" height="95"></a>' +
        '<div><h3><a href="product.html?p=' + encodeURIComponent(p.slug) + '">' + esc(p.title) + '</a></h3>' + qty +
        '<button class="cart-remove" type="button" data-remove="' + esc(p.id) + '">Remove</button></div>' +
        '<span class="item-price">' + money(p.price * i.qty) + '</span></div>';
    }).join('');
    cartSub.textContent = money(sub);
    cartFoot.hidden = false;
  }

  var drawer;
  function focusables(root) {
    return [].filter.call(root.querySelectorAll('a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])'), function (el) { return el.offsetParent !== null || el === document.activeElement; });
  }
  function openCart() {
    if (!drawer) return;
    lastFocus = document.activeElement;
    closeMenu(true);
    document.body.classList.add('cart-open');
    cartDemo.hidden = true;
    setTimeout(function () { drawer.focus(); }, 50);
  }
  function closeCart() {
    if (!document.body.classList.contains('cart-open')) return;
    document.body.classList.remove('cart-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ---------- mobile menu ---------- */
  var toggle;
  function openMenu() {
    document.body.classList.add('nav-open');
    toggle.setAttribute('aria-expanded', 'true'); toggle.setAttribute('aria-label', 'Close menu');
    var first = document.querySelector('#nav-panel a'); if (first) first.focus();
  }
  function closeMenu(silent) {
    if (!document.body.classList.contains('nav-open')) return;
    document.body.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'Open menu');
    if (!silent) toggle.focus();
  }

  /* ---------- lightbox ---------- */
  var lb, lbImg, lbCap, lbItems = [], lbIndex = 0, lbOpener;
  function lbShow(i) {
    lbIndex = (i + lbItems.length) % lbItems.length;
    var a = lbItems[lbIndex], im = a.querySelector('img');
    lbImg.src = a.getAttribute('href'); lbImg.alt = im ? im.alt : '';
    lbCap.textContent = a.getAttribute('data-caption') || (im ? im.alt : '');
    lb.querySelector('.lb-prev').hidden = lb.querySelector('.lb-next').hidden = lbItems.length < 2;
  }
  function lbOpen(a) {
    var g = a.getAttribute('data-lightbox');
    lbItems = [].slice.call(document.querySelectorAll('[data-lightbox="' + g + '"]'));
    lbOpener = a; lb.classList.add('open'); document.body.classList.add('lb-open');
    lbShow(lbItems.indexOf(a));
    lb.querySelector('.lb-close').focus();
  }
  function lbClose() {
    lb.classList.remove('open'); document.body.classList.remove('lb-open'); lbImg.removeAttribute("src");
    if (lbOpener) lbOpener.focus();
  }

  /* ---------- init ---------- */
  function init() {
    var h = document.getElementById('site-header'); if (h) h.innerHTML = headerHTML();
    var f = document.getElementById('site-footer'); if (f) f.innerHTML = footerHTML();
    var o = document.createElement('div'); o.id = 'site-overlays'; o.innerHTML = overlaysHTML(); document.body.appendChild(o);

    toggle = document.querySelector('.nav-toggle'); drawer = document.getElementById('cart-drawer');
    cartBody = document.getElementById('cart-body'); cartFoot = document.getElementById('cart-foot');
    cartSub = document.getElementById('cart-subtotal'); cartDemo = document.getElementById('cart-demo');
    toastEl = document.getElementById('toast'); lb = document.getElementById('lightbox');
    lbImg = lb.querySelector('img'); lbCap = lb.querySelector('figcaption');

    if (toggle) toggle.addEventListener('click', function () { document.body.classList.contains('nav-open') ? closeMenu() : openMenu(); });
    var cb = document.querySelector('.cart-btn'); if (cb) cb.addEventListener('click', openCart);
    document.getElementById('cart-checkout').addEventListener('click', function () {
      cartDemo.hidden = false; toast('Demo site — checkout isn’t connected.');
    });

    document.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest('[data-cart-close]')) return closeCart();
      var rm = t.closest('[data-remove]'); if (rm) return removeFromCart(rm.getAttribute('data-remove'));
      var q = t.closest('[data-qty]');
      if (q) { var line = cart.filter(function (i) { return i.id === q.getAttribute('data-id'); })[0]; if (line) setQty(line.id, line.qty + Number(q.getAttribute('data-qty'))); return; }
      var add = t.closest('[data-add-to-cart]'); if (add) { e.preventDefault(); return addToCart(add.getAttribute('data-add-to-cart')); }
      var lba = t.closest('a[data-lightbox]'); if (lba) { e.preventDefault(); return lbOpen(lba); }
      if (t.closest('.lb-close') || t === lb) return lbClose();
      if (t.closest('.lb-prev')) return lbShow(lbIndex - 1);
      if (t.closest('.lb-next')) return lbShow(lbIndex + 1);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (lb.classList.contains('open')) lbClose();
        else if (document.body.classList.contains('cart-open')) closeCart();
        else closeMenu();
      } else if (lb.classList.contains('open')) {
        if (e.key === 'ArrowLeft') lbShow(lbIndex - 1); else if (e.key === 'ArrowRight') lbShow(lbIndex + 1);
      } else if (e.key === 'Tab' && document.body.classList.contains('cart-open')) {
        var els = focusables(drawer); if (!els.length) return;
        var first = els[0], last = els[els.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === drawer)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    window.addEventListener('resize', function () { if (window.innerWidth >= 960) closeMenu(true); });
    window.addEventListener('storage', function (e) { if (e.key === CART_KEY) { cart = readCart(); renderCart(); } });
    renderCart();
  }

  window.RileyUI = {
    money: money, esc: esc, param: param, productCard: productCard, modelCard: modelCard, getProduct: getProduct, getModel: getModel,
    addToCart: addToCart, removeFromCart: removeFromCart, openCart: openCart, closeCart: closeCart, cartCount: cartCount, toast: toast, icons: icons
  };

  if (document.getElementById('site-header')) init(); else document.addEventListener('DOMContentLoaded', init);
})();
