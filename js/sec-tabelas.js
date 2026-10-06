/* Tabelas: todas as tabelas do site numa página só (UF, capitais, produtos, corredores, redes, itens da cesta).
   Cabeçalhos e substantivos saem de IP.t (chaves tbl.*); nomes de produto, corredor, rede e item do DIEESE vêm dos dados. */
(function () {
  'use strict';
  const IP = window.IP;
  const el = IP.el;

  const nd = (v, f) => (v == null ? IP.t('common.na') : f(v));
  const money = (v) => nd(v, IP.fmt.money);
  const int = (v) => nd(v, IP.fmt.int);
  const diffSpan = (txt, v) => el('span', { class: v < 0 ? 'diff-neg' : v > 0 ? 'diff-pos' : false }, txt);

  /* Mostra a tabela ou, sem o arquivo, o aviso padrão no lugar dela. */
  function guard(id, data, file) {
    const sec = document.getElementById(id);
    if (!sec) return null;
    const box = sec.querySelector('.table-card');
    if (!Array.isArray(data)) { IP.emptyFile(box, file); sec.querySelectorAll('input').forEach((i) => { i.disabled = true; }); return null; }
    return { sec, table: sec.querySelector('table'), q: sec.querySelector('input[type="search"]'), count: sec.querySelector('.count') };
  }

  function ufNames(d) {
    return new Map(d.geo && Array.isArray(d.geo.ufs) ? d.geo.ufs.map((u) => [u.uf, u.nome]) : []);
  }

  function tabelaUf(d) {
    const g = guard('t-uf', d.por_uf, 'por_uf.json');
    if (!g) return;
    const names = ufNames(d);
    const idx = new Map(Array.isArray(d.indice_uf) ? d.indice_uf.map((r) => [r.uf, r.indice]) : []);
    const rows = d.por_uf.map((r) => ({ ...r, nome: names.get(r.uf) || r.uf, indice: idx.get(r.uf) ?? null }));
    IP.table({
      table: g.table, rows, count: g.count, noun: IP.t('tbl.noun.uf'), search: { input: g.q, text: (r) => r.uf + ' ' + r.nome },
      sort: { key: 'uf', dir: 'asc' },
      columns: [
        { key: 'uf', label: IP.t('tbl.col.uf'), text: true, row: true, cell: (r) => el('a', { href: 'estados.html?uf=' + r.uf, title: IP.t('tbl.uf.linkTitle', { nome: r.nome }) }, el('b', null, r.uf), ' ', el('span', { class: 'muted' }, r.nome)) },
        { key: 'lojas', label: IP.t('tbl.col.stores'), cell: (r) => int(r.lojas) },
        { key: 'produtos', label: IP.t('tbl.col.prices'), cell: (r) => int(r.produtos) },
        { key: 'indice', label: IP.t('tbl.col.vsNational'), unit: IP.t('tbl.unit.sameItems'), cell: (r) => (r.indice == null ? '—' : diffSpan(IP.fmt.idxPct(r.indice), r.indice - 100)) },
        { key: 'preco_medio', label: IP.t('tbl.col.rawAvg'), cell: (r) => money(r.preco_medio) },
        { key: 'populacao', label: IP.t('tbl.col.population'), cell: (r) => int(r.populacao) },
        { key: 'pib_per_capita_medio_ponderado', label: IP.t('tbl.col.gdp'), unit: IP.t('tbl.unit.weighted'), cell: (r) => money(r.pib_per_capita_medio_ponderado) },
      ],
    });
  }

  function tabelaCapitais(d) {
    const g = guard('t-capitais', d.capitais, 'capitais.json');
    if (!g) return;
    const pk = (kind) => (r) => {
      const p = IP.pack(r, kind);
      if (p.empty) return el('span', { class: 'muted' }, IP.t('pack.empty'));
      return el('span', { class: 'pk' }, el('b', null, IP.fmt.money(p.shown)), el('small', null, [p.type, p.small].filter(Boolean).join(' · ')));
    };
    const rows = d.capitais.map((r) => ({ ...r, _arroz: IP.pack(r, 'arroz').shown, _leite: IP.pack(r, 'leite').shown, _cafe: IP.pack(r, 'cafe').shown }));
    IP.table({
      table: g.table, rows, count: g.count, noun: IP.t('tbl.noun.capitais'), search: { input: g.q, text: (r) => r.capital + ' ' + r.uf },
      sort: { key: 'populacao', dir: 'desc' },
      columns: [
        { key: 'capital', label: IP.t('tbl.col.capital'), text: true, row: true, cell: (r) => el('a', { href: 'capitais.html?uf=' + r.uf, title: IP.t('tbl.cap.linkTitle', { capital: r.capital }) }, el('b', null, r.capital), ' ', el('span', { class: 'muted' }, r.uf)) },
        { key: 'populacao', label: IP.t('tbl.col.population'), cell: (r) => int(r.populacao) },
        { key: 'pib_per_capita', label: IP.t('tbl.col.gdp'), cell: (r) => money(r.pib_per_capita) },
        { key: 'lojas', label: IP.t('tbl.col.stores'), cell: (r) => int(r.lojas) },
        { key: 'preco_medio', label: IP.t('tbl.col.rawAvg'), cell: (r) => money(r.preco_medio) },
        { key: 'cesta_dieese', label: IP.t('tbl.col.dieeseBasket'), cell: (r) => money(r.cesta_dieese) },
        { key: 'cesta_ifood', label: IP.t('tbl.col.ifoodBasket'), unit: IP.t('tbl.unit.approx'), cell: (r) => money(r.cesta_ifood) },
        { key: '_arroz', label: IP.t('item.arroz'), unit: IP.t('tbl.unit.pack'), cell: pk('arroz') },
        { key: '_leite', label: IP.t('item.leite'), unit: '1 L', cell: pk('leite') },
        { key: '_cafe', label: IP.t('item.cafe'), unit: IP.t('tbl.unit.pack'), cell: pk('cafe') },
      ],
    });
  }

  function tabelaProdutos(d) {
    const g = guard('t-produtos', d.produtos, 'produtos_mais_comuns.json');
    if (!g) return;
    IP.table({
      table: g.table, rows: d.produtos, count: g.count, noun: IP.t('tbl.noun.produtos'), search: { input: g.q, text: (r) => r.nome },
      sort: { key: 'lojas', dir: 'desc' },
      columns: [
        { key: 'nome', label: IP.t('tbl.col.product'), text: true, row: true, cls: 'name' },
        { key: 'lojas', label: IP.t('tbl.col.stores'), cell: (r) => int(r.lojas) },
        { key: 'preco_medio', label: IP.t('tbl.col.avgPrice'), cell: (r) => IP.el('b', null, money(r.preco_medio)) },
        { key: 'preco_min', label: IP.t('tbl.col.min'), cell: (r) => money(r.preco_min) },
        { key: 'preco_max', label: IP.t('tbl.col.max'), cell: (r) => money(r.preco_max) },
      ],
    });
  }

  function tabelaCorredores(d) {
    const g = guard('t-corredores', d.corredores, 'corredores.json');
    if (!g) return;
    const rows = d.corredores.map((r) => ({ ...r, cv: r.desvio_padrao != null && r.preco_medio ? r.desvio_padrao / r.preco_medio : null }));
    IP.table({
      table: g.table, rows, count: g.count, noun: IP.t('tbl.noun.corredores'),
      sort: { key: 'produtos', dir: 'desc' },
      columns: [
        { key: 'corredor', label: IP.t('tbl.col.aisle'), text: true, row: true },
        { key: 'produtos', label: IP.t('tbl.col.products'), cell: (r) => int(r.produtos) },
        { key: 'preco_medio', label: IP.t('tbl.col.rawAvg'), cell: (r) => money(r.preco_medio) },
        { key: 'desvio_padrao', label: IP.t('tbl.col.stdev'), cell: (r) => money(r.desvio_padrao) },
        { key: 'cv', label: IP.t('tbl.col.cv'), cell: (r) => nd(r.cv, IP.fmt.pct) },
      ],
    });
  }

  const BASICOS = ['leite', 'arroz', 'cafe', 'feijao', 'oleo'];

  function tabelaRedes(d) {
    const g = guard('t-redes', d.redes, 'redes.json');
    if (!g) return;
    const rows = d.redes.map((r) => {
      const o = { ...r };
      BASICOS.forEach((k) => { o['b_' + k] = r.basicos && r.basicos[k] ? r.basicos[k].indice : null; o['n_' + k] = r.basicos && r.basicos[k] ? r.basicos[k].n : 0; });
      return o;
    });
    const pct = (ix, n) => (ix == null ? el('span', { class: 'muted' }, '—') : el('span', { class: n != null && n <= 3 ? 'weak' : false, title: n != null && n <= 3 ? IP.t('tbl.smallSample') : false }, diffSpan(IP.fmt.idxPct(ix), ix - 100)));
    IP.table({
      table: g.table, rows, count: g.count, noun: IP.t('tbl.noun.redes'), search: { input: g.q, text: (r) => r.rede },
      sort: { key: 'lojas', dir: 'desc' },
      columns: [
        { key: 'rede', label: IP.t('tbl.col.chain'), text: true, row: true },
        { key: 'lojas', label: IP.t('tbl.col.stores'), cell: (r) => int(r.lojas) },
        { key: 'ufs', label: IP.t('tbl.col.ufs'), cell: (r) => int(r.ufs) },
        { key: 'indice', label: IP.t('tbl.col.overall'), unit: IP.t('tbl.unit.vsStateMedian'), cell: (r) => pct(r.indice, r.lojas_com_indice) },
        { key: 'lojas_com_indice', label: IP.t('tbl.col.storesCompared'), cell: (r) => int(r.lojas_com_indice) },
        ...BASICOS.map((k) => ({ key: 'b_' + k, label: IP.t('item.' + k), unit: IP.t('tbl.unit.vsStateMedian'), cell: (r) => pct(r['b_' + k], r['n_' + k]) })),
      ],
    });
  }

  function tabelaCesta(d) {
    const g = guard('t-cesta', d.cesta, 'cesta_estado.json');
    if (!g) return;
    const names = ufNames(d);
    const rows = [];
    for (const c of d.cesta) {
      (Array.isArray(c.detalhe) ? c.detalhe : []).forEach((it, i) => {
        const dif = it.dieese_preco_unit_centavos && it.preco_unit_centavos != null ? it.preco_unit_centavos / it.dieese_preco_unit_centavos - 1 : null;
        rows.push({ uf: c.uf, nome: names.get(c.uf) || c.uf, ordem: i, item: it.item, qtd: it.qtd, dieese: it.dieese_preco_unit_centavos, ifood: it.preco_unit_centavos, dif });
      });
    }
    IP.table({
      table: g.table, rows, count: g.count, noun: IP.t('tbl.noun.rows'), search: { input: g.q, text: (r) => r.uf + ' ' + r.nome + ' ' + r.item },
      sort: { key: 'uf', dir: 'asc' },
      columns: [
        { key: 'uf', label: IP.t('tbl.col.uf'), text: true, row: true, cell: (r) => el('a', { href: 'estados.html?uf=' + r.uf + '#cesta', title: IP.t('tbl.cesta.linkTitle', { nome: r.nome }) }, el('b', null, r.uf), ' ', el('span', { class: 'muted' }, r.nome)) },
        { key: 'item', label: IP.t('tbl.col.item'), text: true, cell: (r) => r.item },
        { key: 'qtd', label: IP.t('tbl.col.monthlyQty'), unit: IP.t('tbl.unit.kgOrL'), cell: (r) => nd(r.qtd, IP.fmt.qty) },
        { key: 'dieese', label: 'DIEESE', unit: IP.t('tbl.unit.rsKgOrL'), cell: (r) => money(r.dieese) },
        { key: 'ifood', label: IP.t('tbl.col.ifoodCheapest'), unit: IP.t('tbl.unit.rsKgOrL'), cell: (r) => money(r.ifood) },
        { key: 'dif', label: IP.t('tbl.col.vs'), cell: (r) => (r.dif == null ? IP.t('common.na') : diffSpan(IP.fmt.signed(r.dif * 100), r.dif)) },
      ],
    });
  }

  function tabelaCotidiano(d) {
    const g = guard('t-cotidiano', d.cotidiano, 'cotidiano.json');
    if (!g) return;
    IP.table({
      table: g.table, rows: d.cotidiano, count: g.count, noun: IP.t('tbl.noun.produtos'), search: { input: g.q, text: (r) => r.nome + ' ' + r.familia },
      sort: { key: 'lojas', dir: 'desc' },
      columns: [
        { key: 'nome', label: IP.t('tbl.col.product'), text: true, row: true, cls: 'name' },
        { key: 'familia', label: IP.t('tbl.col.family'), text: true, cell: (r) => r.familia },
        { key: 'lojas', label: IP.t('tbl.col.stores'), cell: (r) => int(r.lojas) },
        { key: 'ufs', label: IP.t('tbl.col.ufs'), cell: (r) => int(r.ufs) },
        { key: 'preco_mediano', label: IP.t('tbl.col.median'), cell: (r) => el('b', null, money(r.preco_mediano)) },
        { key: 'p10', label: IP.t('tbl.col.typLow'), unit: 'p10', cell: (r) => money(r.p10) },
        { key: 'p90', label: IP.t('tbl.col.typHigh'), unit: 'p90', cell: (r) => money(r.p90) },
        { key: 'razao_p90_p10', label: IP.t('tbl.col.highLow'), cell: (r) => nd(r.razao_p90_p10, (v) => IP.fmt.dec2(v) + '×') },
        { key: 'preco_min', label: IP.t('tbl.col.min'), cell: (r) => money(r.preco_min) },
        { key: 'preco_max', label: IP.t('tbl.col.max'), cell: (r) => money(r.preco_max) },
      ],
    });
  }

  /* Sumário fixo: destaca a tabela que está na tela */
  function toc() {
    const links = [...document.querySelectorAll('.toc a')];
    if (!links.length || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        links.forEach((a) => { if (a.getAttribute('href') === '#' + e.target.id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
      }
    }, { rootMargin: '-30% 0px -60% 0px' });
    links.forEach((a) => { const s = document.querySelector(a.getAttribute('href')); if (s) io.observe(s); });
  }

  IP.sections.tabelas = function (d) {
    tabelaUf(d); tabelaCapitais(d); tabelaProdutos(d); tabelaCotidiano(d); tabelaCorredores(d); tabelaRedes(d); tabelaCesta(d);
    toc();
  };
})();
