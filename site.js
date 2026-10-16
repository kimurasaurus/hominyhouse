/* ============================================================
   Hominy House - shared behaviour for every page.
   Loaded at the end of <body>, so the DOM is already parsed.
   ============================================================ */
(function () {
  'use strict';

  /* ---- Mobile nav toggle ---- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('nav--open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('nav--open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---- Reveal on scroll ---- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.15 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---- Flip the hero artwork to reveal the tracklisting ---- */
  var heroArt = document.getElementById('hero-art');
  if (heroArt) {
    var backFace = heroArt.querySelector('.hero__logo--back');
    var flip = function () {
      var flipped = heroArt.classList.toggle('is-flipped');
      heroArt.setAttribute('aria-pressed', String(flipped));
      if (backFace) backFace.setAttribute('aria-hidden', String(!flipped));
    };
    heroArt.addEventListener('click', flip);
    heroArt.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); }
    });
  }

  /* ---- "Jump to a review" dropdown (custom, themed) ---- */
  var recJump = document.getElementById('rec-jump');
  var recTrigger = document.getElementById('rec-jump-trigger');
  var recMenu = document.getElementById('rec-jump-menu');
  if (recJump && recTrigger && recMenu) {
    var recOptions = Array.prototype.slice.call(recMenu.querySelectorAll('.rec-jump__option'));

    var setRecOpen = function (open) {
      recMenu.classList.toggle('is-open', open);
      recTrigger.setAttribute('aria-expanded', String(open));
      if (open && recOptions[0]) {
        // Defer: the browser's own focus fix-up for the clicked button would
        // otherwise override this and leave focus on <body>.
        requestAnimationFrame(function () { recOptions[0].focus(); });
      }
    };
    var chooseRec = function (opt) {
      var target = document.getElementById(opt.dataset.target);
      setRecOpen(false);
      // preventScroll keeps the focus change from fighting the smooth scroll
      recTrigger.focus({ preventScroll: true });
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    recTrigger.addEventListener('click', function (e) {
      e.stopPropagation();
      setRecOpen(!recMenu.classList.contains('is-open'));
    });
    recTrigger.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setRecOpen(true);
      }
    });

    recOptions.forEach(function (opt, i) {
      opt.addEventListener('click', function () { chooseRec(opt); });
      opt.addEventListener('focus', function () { opt.setAttribute('aria-selected', 'true'); });
      opt.addEventListener('blur', function () { opt.setAttribute('aria-selected', 'false'); });
      opt.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          chooseRec(opt);
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          var step = e.key === 'ArrowDown' ? 1 : -1;
          recOptions[(i + step + recOptions.length) % recOptions.length].focus();
        } else if (e.key === 'Escape') {
          setRecOpen(false);
          recTrigger.focus();
        }
      });
    });

    document.addEventListener('click', function (e) {
      if (!recJump.contains(e.target)) setRecOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setRecOpen(false);
    });
  }

  /* ---- Genre chips: filter the Release Radar ---- */
  var chips = document.querySelector('.chips');
  var relList = document.getElementById('releases-list');
  if (chips && relList) {
    var relItems = Array.prototype.slice.call(relList.querySelectorAll('.releases__item'));
    chips.addEventListener('click', function (e) {
      var btn = e.target.closest('.chip');
      if (!btn) return;
      chips.querySelectorAll('.chip').forEach(function (c) {
        c.classList.toggle('is-on', c === btn);
      });
      var want = (btn.getAttribute('data-filter') || '*').toLowerCase();
      relItems.forEach(function (it) {
        var toks = (it.getAttribute('data-genre') || '')
          .toLowerCase()
          .split('/')
          .map(function (s) { return s.trim(); });
        it.hidden = !(want === '*' || toks.indexOf(want) !== -1);
      });
    });
  }

  /* ---- Subscribe form -> Formspree (AJAX, so the page never navigates) ---- */
  var subscribeForm = document.getElementById('subscribe-form');
  if (subscribeForm) {
    var subStatus = document.getElementById('subscribe-status');
    var subInput = subscribeForm.querySelector('input[type="email"]');
    var subBtn = subscribeForm.querySelector('button[type="submit"]');
    var subLabel = subBtn.textContent;

    var subSay = function (message, state) {
      subStatus.textContent = message;
      // keep the non-ASCII ellipsis/em-dash out of the source: built from escapes
      if (state) subStatus.dataset.state = state;
      else delete subStatus.dataset.state;
    };
    var subIdle = function () {
      subBtn.disabled = false;
      subBtn.textContent = subLabel;
    };

    subscribeForm.addEventListener('submit', function (e) {
      e.preventDefault();
      subInput.removeAttribute('aria-invalid');
      if (!subscribeForm.reportValidity()) return;

      subBtn.disabled = true;
      subBtn.textContent = 'Sending\u2026';
      subSay('', null);

      fetch(subscribeForm.action, {
        method: 'POST',
        body: new FormData(subscribeForm),
        headers: { Accept: 'application/json' }
      })
        .then(function (res) { return res.json().catch(function () { return {}; }).then(function (data) { return { ok: res.ok, data: data }; }); })
        .then(function (r) {
          if (r.ok) {
            subscribeForm.reset();
            subSay('Thanks \u2014 you are on the list.', 'success');
            subBtn.textContent = 'Joined';
            setTimeout(subIdle, 4000);
            return;
          }
          var detail = r.data && r.data.errors
            ? r.data.errors.map(function (err) { return err.message; }).join(' ')
            : 'Something went wrong. Please try again.';
          subInput.setAttribute('aria-invalid', 'true');
          subSay(detail, 'error');
          subIdle();
        })
        .catch(function () {
          subSay('Network error \u2014 please try again in a moment.', 'error');
          subIdle();
        });
    });
  }

  /* ---- Cursor-follow glow on every container/box ---- */
  document.querySelectorAll(
    '.card, .news, .releases, .feature-card, .subscribe__box, .hero__playlist, .hero__youtube'
  ).forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
      card.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
    });
  });

  /* ---- Section rail: highlight the entry you are reading ---- */
  var railLinks = Array.prototype.slice.call(document.querySelectorAll('.rail__list a[href^="#"]'));
  if (railLinks.length && 'IntersectionObserver' in window) {
    var byId = {};
    railLinks.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var a = byId[en.target.id];
        if (!a || !en.isIntersecting) return;
        railLinks.forEach(function (x) { x.classList.remove('is-active'); });
        a.classList.add('is-active');
      });
    }, { rootMargin: '-25% 0px -65% 0px' });
    Object.keys(byId).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) so.observe(el);
    });
  }

  /* ---- Rail disclosure rows: fold/unfold subsections (contents + band tree) ---- */
  var rails = document.querySelectorAll('.rail');
  rails.forEach(function (rail) {
    rail.addEventListener('click', function (e) {
      var btn = e.target.closest('.rail-plus');
      if (!btn) return;
      var list = document.getElementById(btn.getAttribute('aria-controls'));
      if (!list) return;
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      btn.textContent = open ? '+' : '\u2212';
      if (open) list.setAttribute('hidden', '');
      else list.removeAttribute('hidden');
    });
  });

  /* ---- Hominypedia rail: fold the menu boxes shut on phones ---- */
  var foldBoxes = Array.prototype.slice.call(
    document.querySelectorAll('.hp .rail details.rail-box')
  );
  if (foldBoxes.length) {
    var phone = window.matchMedia('(max-width: 980px)');

    /* Wide layout: always open. Phone: folded shut with the article on top. */
    var syncFolds = function () {
      foldBoxes.forEach(function (box) { box.open = !phone.matches; });
    };
    syncFolds();
    if (phone.addEventListener) phone.addEventListener('change', syncFolds);
    else if (phone.addListener) phone.addListener(syncFolds);

    /* One box at a time on phones, so the menu never becomes a wall of links. */
    foldBoxes.forEach(function (box) {
      box.addEventListener('toggle', function () {
        if (!phone.matches || !box.open) return;
        foldBoxes.forEach(function (other) { if (other !== box) other.open = false; });
      });
      var sum = box.querySelector('summary');
      if (sum) {
        sum.addEventListener('keydown', function (e) {
          if (!phone.matches && (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar')) {
            e.preventDefault();
          }
        });
      }
    });
  }

  /* ---- Open a folded box when something inside it is linked to ----
     Reference lists sit in a closed <details>; a citation in the body, or the
     "References" entry in the sidebar, has to open it before the jump lands. */
  var byHash = function (hash) {
    var id = hash.slice(1);
    try { id = decodeURIComponent(id); } catch (err) { /* keep it raw */ }
    return document.getElementById(id);
  };

  var openEnclosingFolds = function (el) {
    if (!el || !el.closest) return false;
    var opened = false;
    var fold = el.closest('details');
    while (fold) {
      if (!fold.open) { fold.open = true; opened = true; }
      var parent = fold.parentElement;
      fold = parent && parent.closest ? parent.closest('details') : null;
    }
    return opened;
  };

  document.addEventListener('click', function (e) {
    var link = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!link) return;
    var id = link.getAttribute('href');
    if (!id || id.length < 2) return;

    /* A <summary> opens or closes on any click inside it, links included, so a
       "Back to Top" link sitting in a foldable heading must not be allowed to
       unfold the list it belongs to. Do the jump ourselves instead. */
    if (link.closest('summary')) {
      e.preventDefault();
      if (id === '#page-top') {
        window.scrollTo(0, 0);
      } else {
        var inner = byHash(id);
        if (inner) {
          openEnclosingFolds(inner);
          if (inner.scrollIntoView) inner.scrollIntoView();
        }
      }
      return;
    }

    if (id === '#page-top') return;
    var target = byHash(id);
    if (!target) return;
    if (openEnclosingFolds(target)) {
      /* The entry was folded away when the browser worked out where to jump,
         so cancel that and do the jump ourselves now that it is on screen. */
      e.preventDefault();
      if (target.scrollIntoView) target.scrollIntoView({ block: 'start' });
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', id);
      }
    }
  });

  var revealFromHash = function () {
    if (window.location.hash.length < 2) return;
    var target = byHash(window.location.hash);
    if (!target) return;
    if (openEnclosingFolds(target)) {
      /* The fold was shut when the browser first tried to jump, so go again now
         that the cited entry is on screen. */
      window.requestAnimationFrame(function () {
        if (target.scrollIntoView) target.scrollIntoView();
      });
    }
  };
  revealFromHash();
  window.addEventListener('hashchange', revealFromHash);
})();
