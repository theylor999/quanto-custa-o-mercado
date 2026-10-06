/* Mapa por UF: coroplético em SVG (geo/br_uf.json, via map.js) e painel de detalhe (por_uf.json + indice_uf.json).
   A tabela completa fica em tabelas.html. ?uf=XX seleciona uma UF ao abrir. */
(function () {
  'use strict';
  const IP = window.IP;

  const METRICS = {
    indice: { label: 'Preço vs mediana do país (mesmos itens)', fmt: IP.fmt.idxPct },
    preco_medio: { label: 'Preço médio bruto', fmt: IP.fmt.money },
    lojas: { label: 'Lojas', fmt: IP.fmt.int },
    produtos: { label: 'Preços coletados', fmt: IP.fmt.int },
    populacao: { label: 'População', fmt: IP.fmt.int },
  };

  IP.sections.uf = function (d) {
    const wrap = document.getElementById('map-wrap');
    const legend = document.getElementById('map-legend');
    const detail = document.getElementById('uf-detail');
    const metricSel = document.getElementById('uf-metric');
    const ufSel = document.getElementById('uf-select');

    if (!d.geo) { IP.showError(wrap, 'Não foi possível carregar geo/br_uf.json.'); return; }
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
    const vsMed = (r) => (r.indice == null ? 'n/d' : IP.fmt.idxPct(r.indice));

    for (const u of geo.ufs) {
      if (byUf.has(u.uf)) ufSel.append(IP.el('option', { value: u.uf }, u.uf + ' · ' + u.nome));
    }
    ufSel.disabled = !hasData;
    metricSel.disabled = !hasData;

    const map = IP.makeMap({
      wrap, legend, geo,
      enabled: new Set(rows.map((r) => r.uf)),
      ariaLabel: 'Mapa do Brasil por UF',
      tipFor(uf) {
        const r = byUf.get(uf);
        return { title: uf + ' · ' + names.get(uf), rows: [
          ...(hasIndice ? [['Preço vs mediana (mesmos itens)', vsMed(r)]] : []),
          ['Preço médio bruto', r.preco_medio == null ? 'n/d' : IP.fmt.money(r.preco_medio)],
          ['Lojas', IP.fmt.int(r.lojas)],
          ['Preços coletados', IP.fmt.int(r.produtos)],
        ] };
      },
      ariaFor(uf) {
        const r = byUf.get(uf);
        const preco = r.preco_medio == null ? 'n/d' : IP.fmt.money(r.preco_medio);
        return names.get(uf) + (hasIndice && r.indice != null ? ': ' + vsMed(r) + ' contra a mediana do país nos mesmos itens; ' : ': ') + preco + ' de preço médio bruto, ' + IP.fmt.int(r.lojas) + ' lojas, ' + IP.fmt.int(r.produtos) + ' preços';
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
          IP.el('h3', null, 'Sem dados por UF'),
          IP.el('p', { class: 'empty' }, 'O export atual não trouxe linhas em por_uf.json (a coleta usada não tem lojas com UF). Gere o export de uma coleta completa no pipeline de dados (fora deste repositório) para preencher o mapa.')
        );
        return;
      }
      const m = METRICS[state.metric];
      const tabela = IP.el('a', { class: 'more-link', href: 'tabelas.html#t-uf' }, 'ver tabela completa ', IP.el('span', { 'aria-hidden': 'true' }, '→'));
      if (!state.sel) {
        const byPrice = [...rows].filter((r) => r.preco_medio != null).sort((a, b) => a.preco_medio - b.preco_medio);
        const byIdx = hasIndice ? [...rows].filter((r) => r.indice != null).sort((a, b) => a.indice - b.indice) : [];
        const byLojas = [...rows].sort((a, b) => b.lojas - a.lojas);
        const mini = (titulo, arr) => IP.el('div', null,
          IP.el('p', { class: 'hl-sub' }, titulo),
          IP.el('ol', { class: 'mini-rank' }, arr.map((r) => IP.el('li', null,
            IP.el('button', { type: 'button', onclick: () => select(r.uf), 'aria-label': names.get(r.uf) + ', ' + IP.fmt.idxPct(r.indice) + ', ver o detalhe' },
              IP.el('b', null, r.uf), IP.el('span', null, names.get(r.uf)), IP.el('em', { class: r.indice >= 100 ? 'bad' : 'good' }, IP.fmt.idxPct(r.indice)))))));
        const n3 = Math.min(3, Math.floor(byIdx.length / 2));
        detail.append(
          IP.el('h3', null, 'Panorama das UFs'),
          IP.el('p', { class: 'muted' }, 'Clique em uma UF no mapa, na lista ou no filtro para ver o detalhe.'),
          n3 ? mini('Mais caras, nos mesmos itens', byIdx.slice(-n3).reverse()) : null,
          n3 ? mini('Mais baratas, nos mesmos itens', byIdx.slice(0, n3)) : null,
          IP.el('dl', null,
            IP.el('dt', null, 'UFs com dados'), IP.el('dd', null, IP.fmt.int(rows.length)),
            byPrice.length ? IP.el('dt', null, 'Média bruta mais alta') : null,
            byPrice.length ? IP.el('dd', null, byPrice[byPrice.length - 1].uf + ' · ' + IP.fmt.money(byPrice[byPrice.length - 1].preco_medio)) : null,
            IP.el('dt', null, 'Mais lojas'), IP.el('dd', null, byLojas[0].uf + ' · ' + IP.fmt.int(byLojas[0].lojas))
          ),
          IP.el('p', { class: 'rank' }, 'Preço vs mediana compara os mesmos itens. A média bruta depende do que cada UF vende e engana.'),
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
          IP.el('div', { class: 'big' }, r[state.metric] == null ? 'n/d' : m.fmt(r[state.metric])),
          IP.el('p', { class: 'rank' }, m.label + (rk.pos ? ' · ' + rk.pos + 'º entre ' + rk.total + ' UFs' : ''))
        ),
        IP.el('dl', null,
          hasIndice ? IP.el('dt', null, 'Preço vs mediana (mesmos itens)') : null, hasIndice ? IP.el('dd', null, vsMed(r)) : null,
          IP.el('dt', null, 'Preço médio bruto'), IP.el('dd', null, r.preco_medio == null ? 'n/d' : IP.fmt.money(r.preco_medio)),
          IP.el('dt', null, 'Lojas'), IP.el('dd', null, IP.fmt.int(r.lojas)),
          IP.el('dt', null, 'Preços coletados'), IP.el('dd', null, IP.fmt.int(r.produtos)),
          IP.el('dt', null, 'População (Censo 2022)'), IP.el('dd', null, r.populacao == null ? 'n/d' : IP.fmt.int(r.populacao)),
          IP.el('dt', null, 'PIB per capita (pond.)'), IP.el('dd', null, r.pib_per_capita_medio_ponderado == null ? 'n/d' : IP.fmt.money(r.pib_per_capita_medio_ponderado))
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
