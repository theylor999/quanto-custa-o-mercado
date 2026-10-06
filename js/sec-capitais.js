/* Capitais: lista para escolher uma capital (capitais.json) e painel de detalhe com radar iFood × DIEESE por item
   (itens vêm de cesta_estado.json, da UF da capital). A tabela completa fica em tabelas.html. ?uf=XX abre uma capital. */
(function () {
  'use strict';
  const IP = window.IP;

  const money = (v) => (v == null ? 'n/d' : IP.fmt.money(v));
  const int = (v) => (v == null ? 'n/d' : IP.fmt.int(v));
  const COLS = [
    { key: 'capital', label: 'Nome (A–Z)', text: true },
    { key: 'populacao', label: 'População', fmt: int },
    { key: 'pib_per_capita', label: 'PIB per capita', fmt: money },
    { key: 'lojas', label: 'Lojas', fmt: int },
    { key: 'preco_medio', label: 'Preço médio bruto', fmt: money },
    { key: 'cesta_dieese', label: 'Cesta DIEESE', fmt: money },
    { key: 'cesta_ifood', label: 'Cesta iFood (aprox.)', fmt: money },
    { key: '_arroz', label: 'Arroz (preço do pacote)', fmt: money },
    { key: '_leite', label: 'Leite (1 L)', fmt: money },
    { key: '_cafe', label: 'Café (pacote 500 g ou 250 g)', fmt: money },
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
      if (!rows.length) list.append(IP.el('li', { class: 'muted pad' }, 'Nenhuma capital encontrada com esse filtro.'));
      for (const r of rows) {
        const btn = IP.el('button', { type: 'button', class: 'rk cap' + (r.uf === state.sel ? ' sel' : ''), 'data-cap': r.uf, 'aria-pressed': String(r.uf === state.sel), 'aria-label': r.capital + ' (' + r.uf + '), ver o detalhe' },
          IP.el('b', null, r.uf), IP.el('span', { class: 'nm' }, r.capital),
          IP.el('span', { class: 'val' + (col.text ? ' muted' : '') }, col.text ? int(r.populacao) : col.fmt(r[col.key])));
        btn.addEventListener('click', () => {
          select(r.uf);
          if (window.matchMedia('(max-width: 1020px)').matches) detail.scrollIntoView({ behavior: IP.reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
        });
        list.append(IP.el('li', null, btn));
      }
      count.textContent = 'Mostrando ' + IP.fmt.int(rows.length) + ' de ' + IP.fmt.int(all.length) + ' capitais' + (col.text ? ', com a população ao lado.' : ', com ' + col.label.toLowerCase() + ' ao lado.');
      if (keepUf) { const b = list.querySelector('[data-cap="' + keepUf + '"]'); if (b) b.focus({ preventScroll: true }); }
    }

    /* ── Detalhe ── */
    function rankText(r, key, label, dir) {
      const vals = all.filter((x) => x[key] != null).sort((a, b) => (dir === 'asc' ? a[key] - b[key] : b[key] - a[key]));
      const pos = vals.findIndex((x) => x.uf === r.uf) + 1;
      return pos ? pos + 'º ' + label + ' (de ' + vals.length + ')' : null;
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
            { label: 'DIEESE = 100%', data: ratios.map(() => 100), borderColor: dieese, backgroundColor: 'transparent', borderDash: [5, 4], borderWidth: 1.5, pointRadius: 0 },
            { label: 'iFood, mais barato', data: ratios.map((x) => +(x.ratio * 100).toFixed(1)), borderColor: ifood, backgroundColor: ifood + '33', borderWidth: 2, pointRadius: 3, pointBackgroundColor: ifood },
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
        detail.append(IP.el('h3', null, 'Escolha uma capital'), IP.el('p', { class: 'muted' }, 'Clique em uma capital da lista para ver os números dela e comparar, item a item, o iFood com o DIEESE.'));
        return;
      }
      const razao = r.cesta_dieese && r.cesta_ifood != null ? r.cesta_ifood / r.cesta_dieese : null;
      const ranks = [
        rankText(r, 'populacao', 'em população', 'desc'),
        rankText(r, 'pib_per_capita', 'em PIB per capita', 'desc'),
        rankText(r, 'lojas', 'em lojas', 'desc'),
        rankText(r, 'cesta_dieese', 'cesta DIEESE mais barata', 'asc'),
      ].filter(Boolean);
      detail.append(
        IP.el('p', { class: 'eyebrow', style: 'margin:0' }, r.uf),
        IP.el('h3', null, r.capital),
        IP.el('dl', { class: 'dl-grid' },
          ...[
            ['População (Censo 2022)', int(r.populacao)], ['PIB per capita', money(r.pib_per_capita)], ['Lojas', int(r.lojas)],
            ['Preços coletados', int(r.produtos)], ['Preço médio bruto', money(r.preco_medio)], ['Cesta DIEESE (13 itens)', money(r.cesta_dieese)],
            ['Cesta iFood (aprox.)', money(r.cesta_ifood)], ['iFood vs DIEESE', razao == null ? 'n/d' : IP.fmt.ratioPct(razao, 0)],
          ].flatMap(([k, v]) => [IP.el('dt', null, k), IP.el('dd', null, v)])),
        IP.el('div', { class: 'pack-list', role: 'group', 'aria-label': 'Preço de pacotes de arroz, leite e café' },
          ['arroz', 'leite', 'cafe'].map((k) => {
            const p = IP.pack(r, k);
            return IP.el('div', { class: 'pack' + (p.empty ? ' empty-pack' : '') },
              IP.el('p', { class: 'pack-main' }, p.empty ? p.main : [p.label + ': ', IP.el('b', null, IP.fmt.money(p.shown))]),
              p.small ? IP.el('p', { class: 'pack-small' }, p.small) : null);
          })),
        ranks.length ? IP.el('div', { class: 'ranks' }, ranks.map((t) => IP.el('span', { class: 'tag' }, t))) : null
      );

      const ratios = itemRatios(r.uf);
      const more = IP.el('a', { class: 'more-link', href: 'tabelas.html#t-capitais' }, 'ver todas as capitais na tabela ', IP.el('span', { 'aria-hidden': 'true' }, '→'));
      if (!Array.isArray(d.cesta)) {
        detail.append(IP.el('p', { class: 'hint' }, 'O detalhe por item precisa de cesta_estado.json, que não está neste export.'), more);
        return;
      }
      if (ratios.length < 3) {
        detail.append(IP.el('p', { class: 'hint' }, 'Poucos itens da cesta casados com o iFood nesta UF: sem comparação item a item.'), more);
        return;
      }
      const canvas = IP.el('canvas', { role: 'img', 'aria-label': 'Radar do preço por item no iFood como porcentagem do DIEESE em ' + r.capital });
      detail.append(
        IP.el('h4', { class: 'sub-h' }, 'Cesta do iFood contra o DIEESE, por item'),
        IP.el('p', { class: 'hint', style: 'margin:0' }, '100% = mesmo preço do DIEESE; abaixo, o iFood sai mais barato.'),
        IP.el('div', { class: 'canvas-wrap radar' }, canvas),
        IP.el('ul', { class: 'ratio-bars', 'aria-label': 'Itens da cesta em ' + r.capital }, ratios.map((x) => {
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
