/* Tabelas: todas as tabelas do site numa página só (UF, capitais, produtos, corredores, redes, itens da cesta). */
(function () {
  'use strict';
  const IP = window.IP;
  const el = IP.el;

  const nd = (v, f) => (v == null ? 'n/d' : f(v));
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
      table: g.table, rows, count: g.count, noun: 'UFs', search: { input: g.q, text: (r) => r.uf + ' ' + r.nome },
      sort: { key: 'uf', dir: 'asc' },
      columns: [
        { key: 'uf', label: 'UF', text: true, row: true, cell: (r) => el('a', { href: 'estados.html?uf=' + r.uf, title: 'Ver ' + r.nome + ' no mapa' }, el('b', null, r.uf), ' ', el('span', { class: 'muted' }, r.nome)) },
        { key: 'lojas', label: 'Lojas', cell: (r) => int(r.lojas) },
        { key: 'produtos', label: 'Preços coletados', cell: (r) => int(r.produtos) },
        { key: 'indice', label: 'Preço vs mediana do país', unit: 'mesmos itens', cell: (r) => (r.indice == null ? '—' : diffSpan(IP.fmt.idxPct(r.indice), r.indice - 100)) },
        { key: 'preco_medio', label: 'Preço médio bruto', cell: (r) => money(r.preco_medio) },
        { key: 'populacao', label: 'População', cell: (r) => int(r.populacao) },
        { key: 'pib_per_capita_medio_ponderado', label: 'PIB per capita', unit: 'ponderado', cell: (r) => money(r.pib_per_capita_medio_ponderado) },
      ],
    });
  }

  function tabelaCapitais(d) {
    const g = guard('t-capitais', d.capitais, 'capitais.json');
    if (!g) return;
    const pk = (kind) => (r) => {
      const p = IP.pack(r, kind);
      if (p.empty) return el('span', { class: 'muted' }, 'sem dados suficientes');
      const tipo = p.label.split(' · ')[1];
      return el('span', { class: 'pk' }, el('b', null, IP.fmt.money(p.shown)), el('small', null, [tipo, p.small].filter(Boolean).join(' · ')));
    };
    const rows = d.capitais.map((r) => ({ ...r, _arroz: IP.pack(r, 'arroz').shown, _leite: IP.pack(r, 'leite').shown, _cafe: IP.pack(r, 'cafe').shown }));
    IP.table({
      table: g.table, rows, count: g.count, noun: 'capitais', search: { input: g.q, text: (r) => r.capital + ' ' + r.uf },
      sort: { key: 'populacao', dir: 'desc' },
      columns: [
        { key: 'capital', label: 'Capital', text: true, row: true, cell: (r) => el('a', { href: 'capitais.html?uf=' + r.uf, title: 'Ver o detalhe de ' + r.capital }, el('b', null, r.capital), ' ', el('span', { class: 'muted' }, r.uf)) },
        { key: 'populacao', label: 'População', cell: (r) => int(r.populacao) },
        { key: 'pib_per_capita', label: 'PIB per capita', cell: (r) => money(r.pib_per_capita) },
        { key: 'lojas', label: 'Lojas', cell: (r) => int(r.lojas) },
        { key: 'preco_medio', label: 'Preço médio bruto', cell: (r) => money(r.preco_medio) },
        { key: 'cesta_dieese', label: 'Cesta DIEESE', cell: (r) => money(r.cesta_dieese) },
        { key: 'cesta_ifood', label: 'Cesta iFood', unit: 'aprox.', cell: (r) => money(r.cesta_ifood) },
        { key: '_arroz', label: 'Arroz', unit: 'pacote', cell: pk('arroz') },
        { key: '_leite', label: 'Leite', unit: '1 L', cell: pk('leite') },
        { key: '_cafe', label: 'Café', unit: 'pacote', cell: pk('cafe') },
      ],
    });
  }

  function tabelaProdutos(d) {
    const g = guard('t-produtos', d.produtos, 'produtos_mais_comuns.json');
    if (!g) return;
    IP.table({
      table: g.table, rows: d.produtos, count: g.count, noun: 'produtos', search: { input: g.q, text: (r) => r.nome },
      sort: { key: 'lojas', dir: 'desc' },
      columns: [
        { key: 'nome', label: 'Produto', text: true, row: true, cls: 'name' },
        { key: 'lojas', label: 'Lojas', cell: (r) => int(r.lojas) },
        { key: 'preco_medio', label: 'Preço médio', cell: (r) => IP.el('b', null, money(r.preco_medio)) },
        { key: 'preco_min', label: 'Mínimo', cell: (r) => money(r.preco_min) },
        { key: 'preco_max', label: 'Máximo', cell: (r) => money(r.preco_max) },
      ],
    });
  }

  function tabelaCorredores(d) {
    const g = guard('t-corredores', d.corredores, 'corredores.json');
    if (!g) return;
    const rows = d.corredores.map((r) => ({ ...r, cv: r.desvio_padrao != null && r.preco_medio ? r.desvio_padrao / r.preco_medio : null }));
    IP.table({
      table: g.table, rows, count: g.count, noun: 'corredores',
      sort: { key: 'produtos', dir: 'desc' },
      columns: [
        { key: 'corredor', label: 'Corredor', text: true, row: true },
        { key: 'produtos', label: 'Produtos', cell: (r) => int(r.produtos) },
        { key: 'preco_medio', label: 'Preço médio bruto', cell: (r) => money(r.preco_medio) },
        { key: 'desvio_padrao', label: 'Desvio padrão', cell: (r) => money(r.desvio_padrao) },
        { key: 'cv', label: 'Desvio ÷ média', cell: (r) => nd(r.cv, IP.fmt.pct) },
      ],
    });
  }

  const BASICOS = [['leite', 'Leite'], ['arroz', 'Arroz'], ['cafe', 'Café'], ['feijao', 'Feijão'], ['oleo', 'Óleo']];

  function tabelaRedes(d) {
    const g = guard('t-redes', d.redes, 'redes.json');
    if (!g) return;
    const rows = d.redes.map((r) => {
      const o = { ...r };
      BASICOS.forEach(([k]) => { o['b_' + k] = r.basicos && r.basicos[k] ? r.basicos[k].indice : null; o['n_' + k] = r.basicos && r.basicos[k] ? r.basicos[k].n : 0; });
      return o;
    });
    const pct = (ix, n) => (ix == null ? el('span', { class: 'muted' }, '—') : el('span', { class: n != null && n <= 3 ? 'weak' : false, title: n != null && n <= 3 ? 'Amostra pequena' : false }, diffSpan(IP.fmt.idxPct(ix), ix - 100)));
    IP.table({
      table: g.table, rows, count: g.count, noun: 'redes', search: { input: g.q, text: (r) => r.rede },
      sort: { key: 'lojas', dir: 'desc' },
      columns: [
        { key: 'rede', label: 'Rede', text: true, row: true },
        { key: 'lojas', label: 'Lojas', cell: (r) => int(r.lojas) },
        { key: 'ufs', label: 'UFs', cell: (r) => int(r.ufs) },
        { key: 'indice', label: 'Geral', unit: 'vs mediana da UF', cell: (r) => pct(r.indice, r.lojas_com_indice) },
        { key: 'lojas_com_indice', label: 'Lojas comparadas', cell: (r) => int(r.lojas_com_indice) },
        ...BASICOS.map(([k, label]) => ({ key: 'b_' + k, label, unit: 'vs mediana da UF', cell: (r) => pct(r['b_' + k], r['n_' + k]) })),
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
      table: g.table, rows, count: g.count, noun: 'linhas', search: { input: g.q, text: (r) => r.uf + ' ' + r.nome + ' ' + r.item },
      sort: { key: 'uf', dir: 'asc' },
      columns: [
        { key: 'uf', label: 'UF', text: true, row: true, cell: (r) => el('a', { href: 'estados.html?uf=' + r.uf + '#cesta', title: 'Ver a cesta de ' + r.nome }, el('b', null, r.uf), ' ', el('span', { class: 'muted' }, r.nome)) },
        { key: 'item', label: 'Item', text: true, cell: (r) => r.item },
        { key: 'qtd', label: 'Qtd. mensal', unit: 'kg ou L', cell: (r) => nd(r.qtd, (v) => IP.fmt.dec1(v).replace(',0', '')) },
        { key: 'dieese', label: 'DIEESE', unit: 'R$/kg ou L', cell: (r) => money(r.dieese) },
        { key: 'ifood', label: 'iFood, mais barato', unit: 'R$/kg ou L', cell: (r) => money(r.ifood) },
        { key: 'dif', label: 'iFood vs DIEESE', cell: (r) => (r.dif == null ? 'n/d' : diffSpan(IP.fmt.signed(r.dif * 100), r.dif)) },
      ],
    });
  }

  function tabelaCotidiano(d) {
    const g = guard('t-cotidiano', d.cotidiano, 'cotidiano.json');
    if (!g) return;
    IP.table({
      table: g.table, rows: d.cotidiano, count: g.count, noun: 'produtos', search: { input: g.q, text: (r) => r.nome + ' ' + r.familia },
      sort: { key: 'lojas', dir: 'desc' },
      columns: [
        { key: 'nome', label: 'Produto', text: true, row: true, cls: 'name' },
        { key: 'familia', label: 'Família', text: true, cell: (r) => r.familia },
        { key: 'lojas', label: 'Lojas', cell: (r) => int(r.lojas) },
        { key: 'ufs', label: 'UFs', cell: (r) => int(r.ufs) },
        { key: 'preco_mediano', label: 'Mediana', cell: (r) => el('b', null, money(r.preco_mediano)) },
        { key: 'p10', label: 'Piso típico', unit: 'p10', cell: (r) => money(r.p10) },
        { key: 'p90', label: 'Teto típico', unit: 'p90', cell: (r) => money(r.p90) },
        { key: 'razao_p90_p10', label: 'Teto ÷ piso', cell: (r) => nd(r.razao_p90_p10, (v) => IP.fmt.dec2(v) + '×') },
        { key: 'preco_min', label: 'Mínimo', cell: (r) => money(r.preco_min) },
        { key: 'preco_max', label: 'Máximo', cell: (r) => money(r.preco_max) },
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
