/* Mapa por UF: coroplético em SVG (geo/br_uf.json, via map.js) e painel de detalhe (por_uf.json + indice_uf.json).
   A tabela completa fica em tabelas.html. ?uf=XX seleciona uma UF ao abrir. */
(function () {
  'use strict';
  const IP = window.IP;

  const METRICS = {
    indice: { label: IP.t('uf.m.indice'), fmt: IP.fmt.idxPct },
    preco_medio: { label: IP.t('uf.m.precoMedio'), fmt: IP.fmt.money },
    lojas: { label: IP.t('uf.m.lojas'), fmt: IP.fmt.int },
    produtos: { label: IP.t('uf.m.produtos'), fmt: IP.fmt.int },
    populacao: { label: IP.t('uf.m.populacao'), fmt: IP.fmt.int },
  };

  IP.sections.uf = function (d) {
    const wrap = document.getElementById('map-wrap');
    const legend = document.getElementById('map-legend');
    const detail = document.getElementById('uf-detail');
    const metricSel = document.getElementById('uf-metric');
    const ufSel = document.getElementById('uf-select');

    if (!d.geo) { IP.showError(wrap, IP.t('common.geoError')); return; }
    if (!d.por_uf) { IP.emptyFile(detail, 'por_uf.json'); metricSel.disabled = true; ufSel.disabled = true; return; }

    const geo = d.geo;
    const idx = new Map(Array.isArray(d.indice_uf) ? d.indice_uf.map((r) => [r.uf, r.indice]) : []);
    const hasIndice = [...idx.values()].some((v) => v != null);
    if (!hasIndice) {
      const opt = metricSel.querySelector('option[value="indice"]');
      if (opt) opt.remove();
      metricSel.value = 'preco_medio';
    }
    const rows = d.por_uf.map((r) => (hasIndice ? { ...r, indice: idx.get(r.uf) ?? null } : r));
    const byUf = new Map(rows.map((r) => [r.uf, r]));
    const names = new Map(geo.ufs.map((u) => [u.uf, u.nome]));
    const state = { metric: metricSel.value, sel: '' };
    const hasData = rows.length > 0;
    const vsMed = (r) => (r.indice == null ? IP.t('common.na') : IP.fmt.idxPct(r.indice));

    for (const u of geo.ufs) {
      if (byUf.has(u.uf)) ufSel.append(IP.el('option', { value: u.uf }, u.uf + ' · ' + u.nome));
    }
    ufSel.disabled = !hasData;
    metricSel.disabled = !hasData;

    const map = IP.makeMap({
      wrap, legend, geo,
      enabled: new Set(rows.map((r) => r.uf)),
      ariaLabel: IP.t('uf.map.aria'),
      tipFor(uf) {
        const r = byUf.get(uf);
        return { title: uf + ' · ' + names.get(uf), rows: [
          ...(hasIndice ? [[IP.t('uf.tip.indice'), vsMed(r)]] : []),
          [IP.t('uf.m.precoMedio'), r.preco_medio == null ? IP.t('common.na') : IP.fmt.money(r.preco_medio)],
          [IP.t('uf.m.lojas'), IP.fmt.int(r.lojas)],
          [IP.t('uf.m.produtos'), IP.fmt.int(r.produtos)],
        ] };
      },
      ariaFor(uf) {
        const r = byUf.get(uf);
        const preco = r.preco_medio == null ? IP.t('common.na') : IP.fmt.money(r.preco_medio);
        return IP.t(hasIndice && r.indice != null ? 'uf.aria.withIdx' : 'uf.aria.noIdx', { nome: names.get(uf), vs: hasIndice && r.indice != null ? vsMed(r) : '', price: preco, stores: IP.t('count.store', { count: r.lojas }), prices: IP.t('count.price', { count: r.produtos }) });
      },
      onSelect: (uf) => select(uf),
    });

    function paint() {
      const m = METRICS[state.metric];
      map.paint(new Map(rows.map((r) => [r.uf, r[state.metric]])), m.fmt, m.label);
    }

    /* ── Detalhe ── */
    function rank(uf, key) {
      const sorted = rows.filter((r) => r[key] != null).sort((a, b) => b[key] - a[key]);
      return { pos: sorted.findIndex((r) => r.uf === uf) + 1, total: sorted.length };
    }

    function renderDetail() {
      IP.clear(detail);
      if (!hasData) {
        detail.append(
          IP.el('h3', null, IP.t('uf.noData.title')),
          IP.el('p', { class: 'empty' }, IP.t('uf.noData.text'))
        );
        return;
      }
      const m = METRICS[state.metric];
      const tabela = IP.el('a', { class: 'more-link', href: 'tabelas.html#t-uf' }, IP.t('uf.moreTable') + ' ', IP.el('span', { 'aria-hidden': 'true' }, '→'));
      if (!state.sel) {
        const byPrice = [...rows].filter((r) => r.preco_medio != null).sort((a, b) => a.preco_medio - b.preco_medio);
        const byIdx = hasIndice ? [...rows].filter((r) => r.indice != null).sort((a, b) => a.indice - b.indice) : [];
        const byLojas = [...rows].sort((a, b) => b.lojas - a.lojas);
        const mini = (titulo, arr) => IP.el('div', null,
          IP.el('p', { class: 'hl-sub' }, titulo),
          IP.el('ol', { class: 'mini-rank' }, arr.map((r) => IP.el('li', null,
            IP.el('button', { type: 'button', onclick: () => select(r.uf), 'aria-label': IP.t('uf.miniAria', { nome: names.get(r.uf), vs: IP.fmt.idxPct(r.indice) }) },
              IP.el('b', null, r.uf), IP.el('span', null, names.get(r.uf)), IP.el('em', { class: r.indice >= 100 ? 'bad' : 'good' }, IP.fmt.idxPct(r.indice)))))));
        const n3 = Math.min(3, Math.floor(byIdx.length / 2));
        detail.append(
          IP.el('h3', null, IP.t('uf.overview.title')),
          IP.el('p', { class: 'muted' }, IP.t('uf.overview.hint')),
          n3 ? mini(IP.t('uf.overview.priciest'), byIdx.slice(-n3).reverse()) : null,
          n3 ? mini(IP.t('uf.overview.cheapest'), byIdx.slice(0, n3)) : null,
          IP.el('dl', null,
            IP.el('dt', null, IP.t('uf.overview.withData')), IP.el('dd', null, IP.fmt.int(rows.length)),
            byPrice.length ? IP.el('dt', null, IP.t('uf.overview.highestRaw')) : null,
            byPrice.length ? IP.el('dd', null, byPrice[byPrice.length - 1].uf + ' · ' + IP.fmt.money(byPrice[byPrice.length - 1].preco_medio)) : null,
            IP.el('dt', null, IP.t('uf.overview.mostStores')), IP.el('dd', null, byLojas[0].uf + ' · ' + IP.fmt.int(byLojas[0].lojas))
          ),
          IP.el('p', { class: 'rank' }, IP.t('uf.overview.note')),
          tabela
        );
        return;
      }
      const r = byUf.get(state.sel);
      const rk = rank(r.uf, state.metric);
      detail.append(
        IP.el('p', { class: 'eyebrow', style: 'margin:0' }, r.uf),
        IP.el('h3', null, names.get(r.uf)),
        IP.el('div', null,
          IP.el('div', { class: 'big' }, r[state.metric] == null ? IP.t('common.na') : m.fmt(r[state.metric])),
          IP.el('p', { class: 'rank' }, m.label + (rk.pos ? ' · ' + IP.t('uf.rank', { pos: IP.fmt.ordinal(rk.pos), total: rk.total }) : ''))
        ),
        IP.el('dl', null,
          hasIndice ? IP.el('dt', null, IP.t('uf.tip.indice')) : null, hasIndice ? IP.el('dd', null, vsMed(r)) : null,
          IP.el('dt', null, IP.t('uf.m.precoMedio')), IP.el('dd', null, r.preco_medio == null ? IP.t('common.na') : IP.fmt.money(r.preco_medio)),
          IP.el('dt', null, IP.t('uf.m.lojas')), IP.el('dd', null, IP.fmt.int(r.lojas)),
          IP.el('dt', null, IP.t('uf.m.produtos')), IP.el('dd', null, IP.fmt.int(r.produtos)),
          IP.el('dt', null, IP.t('uf.dl.populacao')), IP.el('dd', null, r.populacao == null ? IP.t('common.na') : IP.fmt.int(r.populacao)),
          IP.el('dt', null, IP.t('uf.dl.pib')), IP.el('dd', null, r.pib_per_capita_medio_ponderado == null ? IP.t('common.na') : IP.fmt.money(r.pib_per_capita_medio_ponderado))
        ),
        tabela
      );
    }

    function select(uf) {
      state.sel = uf;
      ufSel.value = uf;
      map.select(uf);
      renderDetail();
    }

    metricSel.addEventListener('change', () => { state.metric = metricSel.value; paint(); renderDetail(); });
    ufSel.addEventListener('change', () => select(ufSel.value));

    paint();
    const wanted = (new URLSearchParams(location.search).get('uf') || '').toUpperCase();
    if (wanted && byUf.has(wanted)) select(wanted); else renderDetail();
  };
})();
