(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Logo: po animacji wejścia przełącz na animację przy najechaniu
  var mark = document.querySelector('.brand-mark');
  if (mark) {
    if (reduce) mark.classList.add('is-ready');
    else setTimeout(function () { mark.classList.add('is-ready'); }, 1100);
  }

  // Cień pod menu po zjechaniu z góry strony
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 4); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  if (reduce) return;

  function all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  // Warstwy sekcji: [selektor, przesunięcie w px na pełnym przejeździe przez ekran]
  var layers = [];
  function addLayer(el, shift) { if (el) { el.classList.add('is-layer'); layers.push({ el: el, shift: shift }); } }
  all('.features .feature').forEach(function (el, i) { addLayer(el, i % 2 ? 150 : 50); });
  addLayer(document.querySelector('.compare'), 160);
  addLayer(document.querySelector('.compare-col.is-after'), 70);
  all('.steps li').forEach(function (el, i) { addLayer(el, 50 + i * 70); });
  addLayer(document.querySelector('.steps-top .photo'), 90);
  addLayer(document.querySelector('.faq .split-head'), 120);
  addLayer(document.querySelector('.contact'), 140);

  // Zdjęcia: obraz przesuwa się w ramce wolniej niż strona
  var photos = all('.photo').map(function (frame) {
    var img = frame.querySelector('img');
    img.classList.add('is-parallax');
    return { frame: frame, img: img };
  });

  // Hero: nagłówek zostaje w tyle i gaśnie, makieta na niego najeżdża
  var heroText = all('.hero h1, .hero .wrap > div');

  var ticking = false;
  function progressOf(r, vh) {
    var p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
    return Math.max(-1, Math.min(1, p));
  }
  function update() {
    ticking = false;
    var vh = window.innerHeight;
    var k = window.innerWidth < 900 ? 0.5 : 1;

    var y = window.scrollY;
    if (y < vh * 1.2) {
      heroText.forEach(function (el, i) {
        var t = y * (i ? 0.32 : 0.45) * k;
        el.style.transform = 'translate3d(0,' + t.toFixed(1) + 'px,0)';
        el.style.opacity = Math.max(0, 1 - y / (vh * 0.7)).toFixed(3);
      });
    }

    layers.forEach(function (l) {
      var r = l.el.getBoundingClientRect();
      if (r.bottom < -300 || r.top > vh + 300) return;
      l.el.style.setProperty('--ly', (progressOf(r, vh) * l.shift * k).toFixed(1) + 'px');
    });

    photos.forEach(function (it) {
      var r = it.frame.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100 || r.height === 0) return;
      it.img.style.setProperty('--py', (-progressOf(r, vh) * r.height * 0.13).toFixed(1) + 'px');
    });
  }
  function request() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  update();
})();
