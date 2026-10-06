/* Corredores: ranking em barras horizontais (corredores.json). */
(function () {
  'use strict';
  const IP = window.IP;

  const METRICS = {
    produtos: { label: IP.t('cor.metric.produtos'), fmt: IP.fmt.int },
    preco_medio: { label: IP.t('cor.metric.precoMedio'), fmt: IP.fmt.money },
  };

  IP.sections.corredores = function (d) {
    const list = document.getElementById('cor-bars');
    if (!d.corredores) { IP.emptyFile(list, 'corredores.json'); return; }
    const data = d.corredores;
    if (!data.length) { IP.showEmpty(list, IP.t('cor.empty')); return; }

    let metric = 'produtos';
    const items = new Map();

    function details(r) {
      const cv = r.desvio_padrao != null && r.preco_medio ? r.desvio_padrao / r.preco_medio : null;
      return [
        [IP.t('cor.detail.produtos'), IP.fmt.int(r.produtos)],
        [IP.t('cor.detail.precoMedio'), IP.fmt.money(r.preco_medio)],
        [IP.t('cor.detail.desvio'), r.desvio_padrao == null ? IP.t('cor.detail.naOne') : IP.fmt.money(r.desvio_padrao)],
        [IP.t('cor.detail.cv'), cv == null ? IP.t('common.na') : IP.fmt.pct(cv)],
      ];
    }

    for (const r of data) {
      const fill = IP.el('span', { class: 'bar-fill' });
      const val = IP.el('span', { class: 'bar-val' });
      const li = IP.el('li', { class: 'bar-row', tabindex: 0 },
        IP.el('span', { class: 'bar-label' }, r.corredor),
        IP.el('span', { class: 'bar-track', 'aria-hidden': 'true' }, fill),
        val
      );
      const rows = details(r);
      li.setAttribute('aria-label', r.corredor + ': ' + rows.map(([k, v]) => k + ' ' + v).join(', '));
      li.addEventListener('pointermove', (e) => IP.tip.showAt(r.corredor, rows, e.clientX, e.clientY));
      li.addEventListener('pointerleave', () => IP.tip.hide());
      li.addEventListener('focus', () => IP.tip.showFor(r.corredor, rows, li));
      li.addEventListener('blur', () => IP.tip.hide());
      items.set(r.corredor, { li, fill, val, r });
    }

    function render() {
      const key = metric, m = METRICS[key];
      const sorted = [...data].sort((a, b) => IP.compare(a[key], b[key], 'desc'));
      const max = Math.max(...sorted.map((r) => r[key] || 0)) || 1;
      items.forEach((it) => { it.fill.style.setProperty('--w', '0%'); });
      sorted.forEach((r, i) => {
        const it = items.get(r.corredor);
        list.append(it.li); // reordena
        it.val.textContent = m.fmt(r[key]);
        it.li.style.setProperty('--i', i);
        it.fill.dataset.w = ((r[key] || 0) / max * 100).toFixed(2) + '%';
        // cor pela magnitude: baixo = índigo, alto = rosa (mesma rampa dos mapas)
        const t = (r[key] || 0) / max;
        it.fill.style.background = 'linear-gradient(90deg, ' + IP.ramp(0).css + ', ' + IP.ramp(t).css + ')';
      });
      void list.offsetWidth; // força o recálculo para a barra animar do zero
      sorted.forEach((r) => {
        const it = items.get(r.corredor);
        it.fill.style.setProperty('--w', it.fill.dataset.w);
      });
      list.setAttribute('aria-label', IP.t('cor.sortedBy', { metric: m.label }));
    }

    document.querySelectorAll('input[name="cor-metric"]').forEach((inp) =>
      inp.addEventListener('change', () => { if (inp.checked) { metric = inp.value; render(); } })
    );
    IP.clear(list);
    render();
  };
})();
