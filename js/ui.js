/* Comportamento global: tema, cabeçalho (progresso, seção ativa, menu), revelação ao rolar,
   contagem animada, spotlight e inclinação 3D. Tudo respeita prefers-reduced-motion. */
(function () {
  'use strict';
  const IP = window.IP;
  const KEY = 'ifood-precos:tema';
  const root = document.documentElement;

  /* ───── Tema (escuro por padrão; escolha salva em localStorage) ───── */
  function applyTheme(t, persist) {
    root.setAttribute('data-theme', t);
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.setAttribute('aria-pressed', String(t === 'dark'));
      btn.title = IP.t(t === 'dark' ? 'ui.theme.toLight' : 'ui.theme.toDark');
    }
    if (persist) { try { localStorage.setItem(KEY, t); } catch (e) { /* modo privado */ } }
    IP.themeListeners.forEach((fn) => { try { fn(t); } catch (e) { console.error(e); } });
  }

  function animateThemeSwitch() {
    if (IP.reducedMotion.matches) return;
    root.classList.add('theme-anim');
    window.setTimeout(() => root.classList.remove('theme-anim'), 450);
  }

  IP.initTheme = function () {
    const btn = document.getElementById('theme-toggle');
    applyTheme(IP.theme() === 'light' ? 'light' : 'dark', false);
    btn.addEventListener('click', () => {
      animateThemeSwitch();
      applyTheme(IP.theme() === 'dark' ? 'light' : 'dark', true);
    });
  };

  /* ───── Revelação ao rolar: data-reveal="pending" → "done" ───── */
  let revealIO = null;
  IP.observeReveal = function (scope) {
    const nodes = (scope || document).querySelectorAll('.reveal:not([data-reveal])');
    if (!('IntersectionObserver' in window) || IP.reducedMotion.matches) {
      nodes.forEach((n) => n.setAttribute('data-reveal', 'done'));
      return;
    }
    revealIO = revealIO || new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          const n = e.target;
          n.setAttribute('data-reveal', 'done');
          revealIO.unobserve(n);
          // o atraso só vale na entrada; depois disso não pode atrasar hover nem transições do cartão
          window.setTimeout(() => n.style.removeProperty('--reveal-delay'), 1600);
        }
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    nodes.forEach((n) => { n.setAttribute('data-reveal', 'pending'); revealIO.observe(n); });
  };

  IP.unobserveReveal = function (scope) {
    if (revealIO) scope.querySelectorAll('.reveal').forEach((n) => revealIO.unobserve(n));
  };

  /* Atraso escalonado para filhos de uma grade (via --reveal-delay). */
  IP.stagger = function (nodes, step, max) {
    [...nodes].forEach((n, i) => n.style.setProperty('--reveal-delay', Math.min(i * (step || 60), max || 420) + 'ms'));
  };

  /* ───── Contagem animada (easeOutExpo; valor final lido por leitores de tela) ───── */
  function easeOut(t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); }

  IP.countUp = function (node, target, format, duration) {
    const finalText = format(target);
    // Leitor de tela lê o valor final; o número animado fica oculto para ele.
    node.setAttribute('aria-hidden', 'true');
    if (!node.nextElementSibling || !node.nextElementSibling.classList.contains('sr-only')) {
      node.after(IP.el('span', { class: 'sr-only' }, finalText));
    } else node.nextElementSibling.textContent = finalText;
    const render = (v) => { node.textContent = format(v); };
    if (IP.reducedMotion.matches || !('IntersectionObserver' in window)) { render(target); return; }
    render(0);
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const t0 = performance.now(), dur = duration || 1500;
      (function tick(now) {
        const p = Math.min(1, (now - t0) / dur);
        render(target * easeOut(p));
        if (p < 1) requestAnimationFrame(tick); else render(target);
      })(t0);
    }, { threshold: 0.5 });
    io.observe(node);
  };

  /* ───── Cabeçalho: estado de rolagem, barra de progresso, voltar ao topo ───── */
  function initHeader() {
    const bar = document.querySelector('.topbar');
    const progress = document.querySelector('.scroll-progress');
    const toTop = document.getElementById('to-top');
    let frame = 0;
    function update() {
      frame = 0;
      const y = window.scrollY, h = window.innerHeight;
      const max = document.documentElement.scrollHeight - h;
      progress.style.setProperty('--scroll-progress', String(max > 0 ? Math.min(1, y / max) : 0));
      bar.classList.toggle('is-scrolled', y > 8);
      toTop.classList.toggle('show', y > h * 0.8);
    }
    function onScroll() { if (!frame) frame = requestAnimationFrame(update); }
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

  }

  /* ───── Menu (mobile/tablet) ───── */
  function initMenu() {
    const btn = document.getElementById('menu-btn');
    const panel = document.getElementById('menu-panel');
    document.querySelectorAll('#nav .nav-link').forEach((a) => {
      panel.append(IP.el('a', { href: a.getAttribute('href'), 'aria-current': a.getAttribute('aria-current') || false }, a.textContent));
    });
    function set(open) {
      panel.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', IP.t(open ? 'ui.menu.close' : 'ui.menu.open'));
    }
    btn.addEventListener('click', () => set(panel.hidden));
    panel.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { set(false); btn.focus(); } });
    document.addEventListener('pointerdown', (e) => { if (!panel.hidden && !e.target.closest('#menu-root')) set(false); });
    window.matchMedia('(min-width: 1040px)').addEventListener('change', (e) => { if (e.matches) set(false); });
  }

  /* ───── Navegação: o link da página atual já vem com aria-current="page" no HTML ───── */
  IP.initNav = function () {
    initHeader();
    initMenu();
  };

  /* ───── Spotlight e inclinação 3D ───── */
  IP.initPointerFx = function () {
    let frame = 0, last = null;
    document.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      const el = e.target.closest && e.target.closest('.spotlight');
      if (!el) return;
      last = { el, x: e.clientX, y: e.clientY };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = last.el.getBoundingClientRect();
        last.el.style.setProperty('--spot-x', (last.x - r.left) + 'px');
        last.el.style.setProperty('--spot-y', (last.y - r.top) + 'px');
      });
    }, { passive: true });

    const card = document.getElementById('tilt-card');
    if (!card) return;
    const wrap = card.parentElement;
    const canTilt = () => !IP.reducedMotion.matches && window.matchMedia('(hover: hover)').matches;
    wrap.addEventListener('pointermove', (e) => {
      if (!canTilt()) return;
      const r = wrap.getBoundingClientRect(); // mede o invólucro parado, o alvo não se move sozinho
      const x = e.clientX - r.left, y = e.clientY - r.top;
      card.style.setProperty('--rotate-x', ((y - r.height / 2) / 30).toFixed(2) + 'deg');
      card.style.setProperty('--rotate-y', ((r.width / 2 - x) / 30).toFixed(2) + 'deg');
      card.style.setProperty('--spot-x', x + 'px');
      card.style.setProperty('--spot-y', y + 'px');
    });
    wrap.addEventListener('pointerleave', () => {
      card.style.setProperty('--rotate-x', '0deg');
      card.style.setProperty('--rotate-y', '0deg');
    });
  };
})();
