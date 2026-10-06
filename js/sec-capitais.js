/* Capitais: lista para escolher uma capital (capitais.json) e painel de detalhe com radar iFood × DIEESE por item
   (itens vêm de cesta_estado.json, da UF da capital). A tabela completa fica em tabelas.html. ?uf=XX abre uma capital. */
(function () {
  'use strict';
  const IP = window.IP;

  const money = (v) => (v == null ? IP.t('common.na') : IP.fmt.money(v));
  const int = (v) => (v == null ? IP.t('common.na') : IP.fmt.int(v));
  const COLS = [
    { key: 'capital', label: IP.t('cap.col.capital'), text: true },
    { key: 'populacao', label: IP.t('cap.col.populacao'), fmt: int },
    { key: 'pib_per_capita', label: IP.t('cap.col.pib'), fmt: money },
    { key: 'lojas', label: IP.t('cap.col.lojas'), fmt: int },
    { key: 'preco_medio', label: IP.t('cap.col.precoMedio'), fmt: money },
    { key: 'cesta_dieese', label: IP.t('cap.col.cestaDieese'), fmt: money },
    { key: 'cesta_ifood', label: IP.t('cap.col.cestaIfood'), fmt: money },
    { key: '_arroz', label: IP.t('cap.col.arroz'), fmt: money },
    { key: '_leite', label: IP.t('cap.col.leite'), fmt: money },
    { key: '_cafe', label: IP.t('cap.col.cafe'), fmt: money },
  ];

  IP.sections.capitais = function (d) {
    const detail = document.getElementById('cap-detail');
    const list = document.getElementById('cap-list');
    const q = document.getElementById('cap-q');
    const sortSel = document.getElementById('cap-sort');
    const count = document.getElementById('cap-count');

    if (!Array.isArray(d.capitais) || !d.capitais.length) {
      IP.emptyFile(list.closest('.cap-grid'), 'capitais.json');
      q.disabled = true; sortSel.disabled = true;
      return;
    }
    const all = d.capitais.map((r) => ({ ...r, _k: IP.norm(r.capital + ' ' + r.uf), _arroz: IP.pack(r, 'arroz').shown, _leite: IP.pack(r, 'leite').shown, _cafe: IP.pack(r, 'cafe').shown }));
    const state = { sort: { key: 'populacao', dir: 'desc' }, sel: '' };
    const cestaByUf = new Map((Array.isArray(d.cesta) ? d.cesta : []).map((c) => [c.uf, c]));
    let radar = null;

    COLS.forEach((c) => sortSel.append(IP.el('option', { value: c.key }, c.label)));
    sortSel.value = state.sort.key;
    sortSel.addEventListener('change', () => {
      const c = COLS.find((x) => x.key === sortSel.value);
      state.sort = { key: c.key, dir: c.text ? 'asc' : 'desc' };
      render();
    });
    q.addEventListener('input', render);

    function visible() {
      const term = IP.norm(q.value);
      const { key, dir } = state.sort;
      return all.filter((r) => !term || r._k.includes(term)).sort((a, b) => IP.compare(a[key], b[key], dir) || IP.compare(a.capital, b.capital));
    }

    function render() {
      const rows = visible();
      const col = COLS.find((c) => c.key === state.sort.key);
      const act = document.activeElement;
      const keepUf = act && act.classList && act.classList.contains('rk') && list.contains(act) ? act.dataset.cap : null;
      IP.clear(list);
      if (!rows.length) list.append(IP.el('li', { class: 'muted pad' }, IP.t('cap.noMatch')));
      for (const r of rows) {
        const btn = IP.el('button', { type: 'button', class: 'rk cap' + (r.uf === state.sel ? ' sel' : ''), 'data-cap': r.uf, 'aria-pressed': String(r.uf === state.sel), 'aria-label': IP.t('cap.btnAria', { capital: r.capital, uf: r.uf }) },
          IP.el('b', null, r.uf), IP.el('span', { class: 'nm' }, r.capital),
          IP.el('span', { class: 'val' + (col.text ? ' muted' : '') }, col.text ? int(r.populacao) : col.fmt(r[col.key])));
        btn.addEventListener('click', () => {
          select(r.uf);
          if (window.matchMedia('(max-width: 1020px)').matches) detail.scrollIntoView({ behavior: IP.reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
        });
        list.append(IP.el('li', null, btn));
      }
      count.textContent = col.text ? IP.t('cap.count.pop', { n: IP.fmt.int(rows.length), total: IP.fmt.int(all.length) }) : IP.t('cap.count.col', { n: IP.fmt.int(rows.length), total: IP.fmt.int(all.length), col: IP.lcFirst(col.label) });
      if (keepUf) { const b = list.querySelector('[data-cap="' + keepUf + '"]'); if (b) b.focus({ preventScroll: true }); }
    }

    /* ── Detalhe ── */
    function rankText(r, key, label, dir) {
      const vals = all.filter((x) => x[key] != null).sort((a, b) => (dir === 'asc' ? a[key] - b[key] : b[key] - a[key]));
      const pos = vals.findIndex((x) => x.uf === r.uf) + 1;
      return pos ? IP.t('cap.rank', { pos: IP.fmt.ordinal(pos), label, total: vals.length }) : null;
    }

    function itemRatios(uf) {
      const c = cestaByUf.get(uf);
      if (!c || !Array.isArray(c.detalhe)) return [];
      return c.detalhe
        .filter((x) => x.dieese_preco_unit_centavos && x.preco_unit_centavos != null)
        .map((x) => ({ item: x.item, ratio: x.preco_unit_centavos / x.dieese_preco_unit_centavos }));
    }

    function drawRadar(canvas, ratios) {
      const ifood = IP.cssVar('--c-ifood'), dieese = IP.cssVar('--c-dieese');
      const text = IP.cssVar('--chart-text'), grid = IP.cssVar('--chart-grid');
      radar = new Chart(canvas, {
        type: 'radar',
        data: {
          labels: ratios.map((x) => x.item),
          datasets: [
            { label: IP.t('cap.radar.dieese'), data: ratios.map(() => 100), borderColor: dieese, backgroundColor: 'transparent', borderDash: [5, 4], borderWidth: 1.5, pointRadius: 0 },
            { label: IP.t('cap.radar.ifood'), data: ratios.map((x) => +(x.ratio * 100).toFixed(1)), borderColor: ifood, backgroundColor: ifood + '33', borderWidth: 2, pointRadius: 3, pointBackgroundColor: ifood },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          animation: IP.reducedMotion.matches ? false : { duration: 600, easing: 'easeOutCubic' },
          scales: { r: { beginAtZero: true, suggestedMax: 120, grid: { color: grid }, angleLines: { color: grid }, pointLabels: { color: text, font: { size: 11 } }, ticks: { display: false, maxTicksLimit: 5 } } },
          plugins: {
            legend: { position: 'bottom', labels: { color: text, boxWidth: 8, boxHeight: 8, usePointStyle: true } },
            tooltip: { backgroundColor: IP.cssVar('--chart-tip-bg'), titleColor: IP.cssVar('--chart-tip-fg'), bodyColor: IP.cssVar('--chart-tip-fg'), borderColor: grid, borderWidth: 1, callbacks: { label: (c) => ' ' + c.dataset.label + ': ' + IP.fmt.dec1(c.parsed.r) + '%' } },
          },
        },
      });
    }

    function renderDetail() {
      if (radar) { radar.destroy(); radar = null; }
      IP.clear(detail);
      const r = all.find((x) => x.uf === state.sel);
      if (!r) {
        detail.append(IP.el('h3', null, IP.t('cap.choose.title')), IP.el('p', { class: 'muted' }, IP.t('cap.choose.text')));
        return;
      }
      const razao = r.cesta_dieese && r.cesta_ifood != null ? r.cesta_ifood / r.cesta_dieese : null;
      const ranks = [
        rankText(r, 'populacao', IP.t('cap.rank.pop'), 'desc'),
        rankText(r, 'pib_per_capita', IP.t('cap.rank.pib'), 'desc'),
        rankText(r, 'lojas', IP.t('cap.rank.lojas'), 'desc'),
        rankText(r, 'cesta_dieese', IP.t('cap.rank.cesta'), 'asc'),
      ].filter(Boolean);
      detail.append(
        IP.el('p', { class: 'eyebrow', style: 'margin:0' }, r.uf),
        IP.el('h3', null, r.capital),
        IP.el('dl', { class: 'dl-grid' },
          ...[
            [IP.t('cap.dl.populacao'), int(r.populacao)], [IP.t('cap.dl.pib'), money(r.pib_per_capita)], [IP.t('cap.dl.lojas'), int(r.lojas)],
            [IP.t('cap.dl.precos'), int(r.produtos)], [IP.t('cap.dl.precoMedio'), money(r.preco_medio)], [IP.t('cap.dl.cestaDieese'), money(r.cesta_dieese)],
            [IP.t('cap.dl.cestaIfood'), money(r.cesta_ifood)], [IP.t('cap.dl.vs'), razao == null ? IP.t('common.na') : IP.fmt.ratioPct(razao, 0)],
          ].flatMap(([k, v]) => [IP.el('dt', null, k), IP.el('dd', null, v)])),
        IP.el('div', { class: 'pack-list', role: 'group', 'aria-label': IP.t('cap.packs.aria') },
          ['arroz', 'leite', 'cafe'].map((k) => {
            const p = IP.pack(r, k);
            return IP.el('div', { class: 'pack' + (p.empty ? ' empty-pack' : '') },
              IP.el('p', { class: 'pack-main' }, p.empty ? p.main : [p.label + ': ', IP.el('b', null, IP.fmt.money(p.shown))]),
              p.small ? IP.el('p', { class: 'pack-small' }, p.small) : null);
          })),
        ranks.length ? IP.el('div', { class: 'ranks' }, ranks.map((t) => IP.el('span', { class: 'tag' }, t))) : null
      );

      const ratios = itemRatios(r.uf);
      const more = IP.el('a', { class: 'more-link', href: 'tabelas.html#t-capitais' }, IP.t('cap.more') + ' ', IP.el('span', { 'aria-hidden': 'true' }, '→'));
      if (!Array.isArray(d.cesta)) {
        detail.append(IP.el('p', { class: 'hint' }, IP.t('cap.noCesta')), more);
        return;
      }
      if (ratios.length < 3) {
        detail.append(IP.el('p', { class: 'hint' }, IP.t('cap.fewItems')), more);
        return;
      }
      const canvas = IP.el('canvas', { role: 'img', 'aria-label': IP.t('cap.radar.aria', { capital: r.capital }) });
      detail.append(
        IP.el('h4', { class: 'sub-h' }, IP.t('cap.items.title')),
        IP.el('p', { class: 'hint', style: 'margin:0' }, IP.t('cap.radar.hint')),
        IP.el('div', { class: 'canvas-wrap radar' }, canvas),
        IP.el('ul', { class: 'ratio-bars', 'aria-label': IP.t('cap.items.aria', { capital: r.capital }) }, ratios.map((x) => {
          const dif = x.ratio - 1;
          const bar = IP.el('span', { class: 'diff-bar ' + (dif < 0 ? 'neg' : 'pos') });
          bar.style.width = (Math.min(Math.abs(dif), 1) * 50).toFixed(1) + '%';
          return IP.el('li', null, IP.el('span', null, x.item), IP.el('span', { class: 'diff-track', 'aria-hidden': 'true' }, bar),
            IP.el('span', { class: 'v ' + (dif < 0 ? 'diff-neg' : 'diff-pos') }, IP.fmt.signed(dif * 100, 0)));
        })),
        more
      );
      if (typeof Chart !== 'undefined') drawRadar(canvas, ratios);
    }

    function select(uf) {
      state.sel = uf;
      list.querySelectorAll('[data-cap]').forEach((b) => {
        b.classList.toggle('sel', b.dataset.cap === uf);
        b.setAttribute('aria-pressed', String(b.dataset.cap === uf));
      });
      renderDetail();
    }

    IP.onTheme(() => { if (state.sel) renderDetail(); });
    const wanted = (new URLSearchParams(location.search).get('uf') || '').toUpperCase();
    const first = [...all].sort((a, b) => IP.compare(a.populacao, b.populacao, 'desc'))[0];
    state.sel = all.some((r) => r.uf === wanted) ? wanted : (first ? first.uf : '');
    render();
    renderDetail();
    const cur = list.querySelector('[data-cap="' + state.sel + '"]');
    if (wanted && cur) list.scrollTop = Math.max(0, cur.parentElement.offsetTop - list.offsetTop - list.clientHeight / 2);
  };
})();
