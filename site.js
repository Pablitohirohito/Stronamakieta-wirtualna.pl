(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var STRINGS = {
    pl: {
      menuOpen: 'Otwórz menu', menuClose: 'Zamknij menu',
      sending: 'Wysyłanie…',
      sent: 'Dziękujemy! Odpowiemy w ciągu 24 godzin.',
      failed: 'Nie udało się wysłać. Napisz bezpośrednio na biuro@designova.pl.',
      invalid: 'Uzupełnij wymagane pola.',
      weekend: 'Wybierz dzień roboczy (pn–pt).'
    },
    en: {
      menuOpen: 'Open menu', menuClose: 'Close menu',
      sending: 'Sending…',
      sent: 'Thank you! We will get back to you within 24 hours.',
      failed: 'Sending failed. Please email us directly at biuro@designova.pl.',
      invalid: 'Please fill in the required fields.',
      weekend: 'Please choose a weekday (Mon–Fri).'
    },
    de: {
      menuOpen: 'Menü öffnen', menuClose: 'Menü schließen',
      sending: 'Wird gesendet…',
      sent: 'Vielen Dank! Wir melden uns innerhalb von 24 Stunden.',
      failed: 'Senden fehlgeschlagen. Bitte schreiben Sie direkt an biuro@designova.pl.',
      invalid: 'Bitte füllen Sie die Pflichtfelder aus.',
      weekend: 'Bitte wählen Sie einen Werktag (Mo–Fr).'
    }
  };
  var T = STRINGS[document.documentElement.lang] || STRINGS.pl;

  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // Cień pod menu po zjechaniu z góry strony
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 4); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Zgoda na cookies
  var banner = document.getElementById('cookie');
  if (banner) {
    var KEY = 'mw_cookie_consent';
    var stored = null;
    try { stored = localStorage.getItem(KEY); } catch (e) {}
    if (!stored) banner.hidden = false;
    banner.addEventListener('click', function (e) {
      var choice = e.target.getAttribute('data-consent');
      if (!choice) return;
      try { localStorage.setItem(KEY, choice); } catch (err) {}
      banner.hidden = true;
    });
  }

  // Menu mobilne
  var toggle = document.querySelector('.menu-toggle');
  var mobileNav = document.getElementById('mobile-nav');
  if (toggle && mobileNav) {
    var setMenu = function (open) {
      mobileNav.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? T.menuClose : T.menuOpen);
    };
    toggle.addEventListener('click', function () { setMenu(mobileNav.hidden); });
    mobileNav.addEventListener('click', function (e) { if (e.target.tagName === 'A') setMenu(false); });
  }

  // Podświetlenie bieżącej sekcji w menu
  var links = all('.nav a[href^="#"]');
  if (links.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) {
          a.setAttribute('aria-current', a.getAttribute('href') === '#' + entry.target.id ? 'true' : 'false');
        });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    links.forEach(function (a) {
      var el = document.getElementById(a.getAttribute('href').slice(1));
      if (el) io.observe(el);
    });
  }

  // Formularz zapytania / umówienia prezentacji
  var form = document.getElementById('formularz');
  if (form) {
    var status = form.querySelector('.form-status');
    var submit = form.querySelector('[type="submit"]');
    var demoBox = form.querySelector('[data-when="prezentacja"]');
    var demoFields = all('input, select', demoBox);
    var day = form.querySelector('[data-weekday]');

    var setType = function (type) {
      var demo = type === 'prezentacja';
      form.querySelector('[name="typ"][value="' + type + '"]').checked = true;
      demoBox.hidden = !demo;
      demoFields.forEach(function (f) { f.required = demo; f.disabled = !demo; });
      submit.textContent = submit.getAttribute('data-label-' + type);
    };
    all('[name="typ"]', form).forEach(function (r) {
      r.addEventListener('change', function () { setType(r.value); });
    });
    setType(form.querySelector('[name="typ"]:checked').value);

    // Przyciski "Umów prezentację" i "Zapytaj o pakiet" ustawiają formularz
    all('[data-intent], [data-plan]').forEach(function (a) {
      a.addEventListener('click', function () {
        setType(a.getAttribute('data-intent') || 'wycena');
        var plan = a.getAttribute('data-plan');
        if (plan) form.pakiet.value = plan;
      });
    });

    var tomorrow = new Date(Date.now() + 864e5);
    day.min = tomorrow.toISOString().slice(0, 10);
    day.addEventListener('change', function () {
      var wd = day.valueAsDate ? day.valueAsDate.getUTCDay() : 1;
      day.setCustomValidity(wd === 0 || wd === 6 ? T.weekend : '');
    });

    var show = function (msg, kind) {
      status.textContent = msg;
      status.className = 'form-status' + (kind ? ' is-' + kind : '');
    };

    if (/[?&]wyslano=1/.test(location.search)) show(T.sent, 'ok');
    if (/[?&]blad=1/.test(location.search)) show(T.failed, 'error');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.classList.add('was-validated');
        show(day.validationMessage === T.weekend ? T.weekend : T.invalid, 'error');
        var bad = form.querySelector(':invalid');
        if (bad) bad.focus();
        return;
      }
      submit.disabled = true;
      show(T.sending);
      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json().then(function (d) { if (!r.ok || !d.ok) throw d; }); })
        .then(function () {
          form.reset();
          form.classList.remove('was-validated');
          setType('wycena');
          show(T.sent, 'ok');
        })
        .catch(function () { show(T.failed, 'error'); })
        .then(function () { submit.disabled = false; });
    });
  }

  if (reduce) return;

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
