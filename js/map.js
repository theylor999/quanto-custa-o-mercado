/* Mapa coroplético em SVG (geo/br_uf.json), compartilhado pelas seções "Mapa por UF" e "Cesta por UF". */
(function () {
  'use strict';
  const IP = window.IP;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  /**
   * opts: { wrap, legend, geo, enabled:Set<uf>, tipFor(uf)->{title,rows}|null, ariaFor(uf)->string, onSelect(uf) }
   * Devolve { paint(values:Map<uf,number|null>, fmt, label), select(uf) }
   */
  IP.makeMap = function (opts) {
    const { wrap, legend, geo, enabled, tipFor, ariaFor, onSelect } = opts;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', geo.viewBox.join(' '));
    svg.setAttribute('role', 'group');
    svg.setAttribute('aria-label', opts.ariaLabel || 'Mapa do Brasil por UF');
    const gPaths = document.createElementNS(SVG_NS, 'g');
    const gLabels = document.createElementNS(SVG_NS, 'g');
    gLabels.setAttribute('aria-hidden', 'true');
    const paths = new Map();
    const labels = new Map();
    let current = '';

    for (const u of geo.ufs) {
      const p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('d', u.d);
      p.setAttribute('data-uf', u.uf);
      if (enabled.has(u.uf)) {
        p.setAttribute('class', 'uf-path');
        p.setAttribute('tabindex', '0');
        p.setAttribute('role', 'button');
      } else {
        p.setAttribute('class', 'uf-path nodata');
        p.setAttribute('role', 'img');
        p.setAttribute('aria-label', u.nome + ': sem dados neste export');
      }
      gPaths.append(p);
      paths.set(u.uf, p);
      const t = document.createElementNS(SVG_NS, 'text');
      t.setAttribute('x', u.cx);
      t.setAttribute('y', u.cy);
      t.setAttribute('class', 'uf-label');
      t.textContent = u.uf;
      gLabels.append(t);
      labels.set(u.uf, t);
    }
    svg.append(gPaths, gLabels);
    IP.clear(wrap).append(svg);

    const ufOf = (e) => { const p = e.target.closest && e.target.closest('.uf-path'); return p && enabled.has(p.dataset.uf) ? p.dataset.uf : null; };
    const toggle = (uf) => onSelect(current === uf ? '' : uf);

    gPaths.addEventListener('pointermove', (e) => {
      const uf = ufOf(e), t = uf && tipFor(uf);
      if (!t) { IP.tip.hide(); return; }
      IP.tip.showAt(t.title, t.rows, e.clientX, e.clientY);
    });
    gPaths.addEventListener('pointerleave', () => IP.tip.hide());
    gPaths.addEventListener('click', (e) => { const uf = ufOf(e); if (uf) toggle(uf); });
    gPaths.addEventListener('keydown', (e) => {
      const uf = ufOf(e);
      if (uf && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(uf); }
    });
    gPaths.addEventListener('focusin', (e) => {
      const uf = ufOf(e), t = uf && tipFor(uf);
      if (t) IP.tip.showFor(t.title, t.rows, paths.get(uf));
    });
    gPaths.addEventListener('focusout', () => IP.tip.hide());

    return {
      paint(values, fmt, label) {
        const vals = [...values.values()].filter((v) => v != null);
        const lo = Math.min(...vals), hi = Math.max(...vals);
        for (const u of geo.ufs) {
          const p = paths.get(u.uf), lb = labels.get(u.uf);
          if (!enabled.has(u.uf)) continue;
          p.setAttribute('aria-label', ariaFor(u.uf));
          const v = values.get(u.uf);
          if (v == null) { p.style.fill = 'var(--map-base)'; lb.setAttribute('class', 'uf-label'); continue; }
          const c = IP.ramp(hi === lo ? 0.5 : (v - lo) / (hi - lo));
          p.style.fill = c.css;
          lb.setAttribute('class', 'uf-label ' + (c.darkText ? 'on-light' : 'on-dark'));
        }
        IP.clear(legend);
        if (vals.length) {
          const bar = IP.el('span', { class: 'legend-bar' });
          bar.style.setProperty('--ramp', IP.RAMP_CSS);
          legend.append(IP.el('span', null, fmt(lo)), bar, IP.el('span', null, fmt(hi)));
          legend.setAttribute('aria-hidden', 'false');
          legend.setAttribute('aria-label', label + ': de ' + fmt(lo) + ' a ' + fmt(hi));
        } else legend.setAttribute('aria-hidden', 'true');
      },
      select(uf) {
        const active = document.activeElement;
        const keep = active && active.classList && active.classList.contains('uf-path') && wrap.contains(active) ? active : null;
        current = uf;
        paths.forEach((p, k) => {
          p.classList.toggle('sel', k === uf);
          p.classList.toggle('dim', !!uf && k !== uf && enabled.has(k));
        });
        if (uf && paths.get(uf)) gPaths.append(paths.get(uf)); // traz a UF para cima dos vizinhos (borda inteira)
        if (keep) keep.focus({ preventScroll: true });
      },
      focusUf(uf) { const p = paths.get(uf); if (p && enabled.has(uf)) p.focus({ preventScroll: true }); },
    };
  };
})();
