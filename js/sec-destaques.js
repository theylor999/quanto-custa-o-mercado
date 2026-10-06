/* Destaques: cinco perguntas respondidas de relance, em linguagem simples. Tudo é calculado dos JSON em tempo de execução
   (indice_uf, por_uf, redes, cesta_estado, cotidiano ou dispersao_por_produto). Todo texto sai de IP.t (js/i18n.js). */
(function () {
  'use strict';
  const IP = window.IP;
  const el = IP.el;
  const t = IP.t;

  const MENOS = '\u2212';

  function ufNome(d, uf) {
    const g = d.geo && Array.isArray(d.geo.ufs) ? d.geo.ufs.find((x) => x.uf === uf) : null;
    return g && g.nome ? g.nome : uf;
  }
  /* "em Mato Grosso", "no Maranhão", "na Bahia": a preposição vem do dicionário (hl.where.*); em inglês é sempre "in". */
  const emLista = (key, nome) => t(key).split('|').includes(nome);
  const emUf = (nome) => t(emLista('hl.where.noList', nome) ? 'hl.where.no' : emLista('hl.where.naList', nome) ? 'hl.where.na' : 'hl.where.em', { uf: nome });
  const emCap = (nome) => { const s = emUf(nome); return s[0].toUpperCase() + s.slice(1); };

  function mediana(valores) {
    const v = valores.slice().sort((a, b) => a - b);
    const m = Math.floor(v.length / 2);
    return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
  }

  /* "N% acima da", "N% abaixo da" ou o texto de igualdade, na frente de "pesquisa do DIEESE" */
  function relDieese(razao, igualKey) {
    const p = Math.round(Math.abs(razao - 1) * 100);
    return p === 0 ? t(igualKey) : t(razao > 1 ? 'hl.rel.above' : 'hl.rel.below', { pct: IP.fmt.int(p) });
  }

  function card(o) {
    const linkText = o.linkText || t('hl.seeDetail');
    const link = el('a', { class: 'hl-link', href: o.href, 'aria-label': linkText + ': ' + o.q }, linkText + ' ', el('span', { 'aria-hidden': 'true' }, '→'));
    return el('article', { class: 'card hl spotlight reveal' },
      el('p', { class: 'hl-tag' }, o.tag || t('hl.tag')),
      el('h3', { class: 'hl-q' }, o.q),
      o.body,
      o.note ? el('p', { class: 'hl-note' }, o.note) : null,
      link
    );
  }

  const vazio = (msg) => el('p', { class: 'hl-empty' }, msg);

  /* 1 · UFs mais caras e mais baratas nos mesmos itens (indice_uf.json; 100 = mediana nacional) */
  function cardUf(d) {
    const base = { q: t('hl.uf.q'), href: 'estados.html#mapa' };
    const lista = Array.isArray(d.indice_uf) ? d.indice_uf.filter((u) => u.indice != null) : [];
    if (!lista.length) return card(Object.assign(base, { body: vazio(t('hl.uf.empty')) }));
    const n = Math.min(3, Math.floor(lista.length / 2));
    if (!n) {
      const u = lista[0];
      return card(Object.assign(base, {
        body: el('div', { class: 'hl-body' }, el('p', { class: 'hl-lead' }, t('hl.uf.only', { uf: ufNome(d, u.uf), pct: IP.fmt.idxPct(u.indice) }))),
        note: t('hl.uf.onlyNote'),
      }));
    }
    const ord = lista.slice().sort((a, b) => b.indice - a.indice);
    const caros = ord.slice(0, n);
    const baratos = ord.slice(-n).reverse();
    const pct0 = (ix) => IP.fmt.int(Math.round(Math.abs(ix - 100)));
    const linhas = (arr) => el('ol', { class: 'hl-rows' }, arr.map((u) =>
      el('li', null,
        el('b', null, u.uf),
        el('span', { class: 'hl-name' }, ufNome(d, u.uf), el('small', null, t('hl.uf.compared', { count: u.produtos }))),
        el('span', { class: 'hl-val ' + (u.indice >= 100 ? 'bad' : 'good') }, IP.fmt.idxPct(u.indice))
      )));
    const topo = caros[0], fundo = baratos[0];
    const corpo = [
      el('p', { class: 'hl-lead' }, IP.tn('hl.uf.lead', {
        top: el('b', null, ufNome(d, topo.uf)), pctTop: pct0(topo.indice),
        bottom: el('b', null, ufNome(d, fundo.uf)), pctBottom: pct0(fundo.indice),
      })),
      el('div', { class: 'hl-cols' },
        el('div', null, el('p', { class: 'hl-sub' }, t('hl.uf.priciest')), linhas(caros)),
        el('div', null, el('p', { class: 'hl-sub' }, t('hl.uf.cheapest')), linhas(baratos))
      ),
    ];
    const brutos = Array.isArray(d.por_uf) ? d.por_uf.filter((u) => u.preco_medio != null) : [];
    if (brutos.length) {
      const alto = brutos.reduce((a, b) => (b.preco_medio > a.preco_medio ? b : a));
      const ix = lista.find((u) => u.uf === alto.uf);
      if (ix) corpo.push(el('p', { class: 'hl-aside' }, t('hl.uf.aside', { uf: ufNome(d, alto.uf), price: IP.fmt.money(alto.preco_medio), idx: IP.fmt.idxPct(ix.indice) })));
    }
    return card(Object.assign(base, {
      body: el('div', { class: 'hl-body' }, corpo),
      note: t('hl.uf.note'),
    }));
  }

  /* 2 · Redes: índice dos mesmos itens contra a mediana da UF (redes.json; 100 = mediana, menor = mais barato) */
  const BASICOS = ['leite', 'cafe', 'arroz', 'feijao', 'oleo'];
  const MIN_REDES_ITEM = 2;
  const N_HEADLINE = 5;
  const N_FRACO = 3;

  function cardRedes(d) {
    const base = { q: t('hl.redes.q'), href: 'tabelas.html#t-redes', linkText: t('hl.redes.link') };
    const redes = Array.isArray(d.redes) ? d.redes : [];
    const geral = redes.filter((r) => r.indice != null);
    if (!geral.length) return card(Object.assign(base, { body: vazio(t('hl.redes.empty')) }));

    const views = [{ key: 'geral', label: t('hl.redes.general'), rows: geral.map((r) => ({ rede: r.rede, indice: r.indice, n: r.lojas_com_indice })) }];
    const fora = [];
    for (const key of BASICOS) {
      const label = t('item.' + key);
      const rows = redes
        .filter((r) => r.basicos && r.basicos[key] && r.basicos[key].indice != null)
        .map((r) => ({ rede: r.rede, indice: r.basicos[key].indice, n: r.basicos[key].n }));
      if (rows.length >= MIN_REDES_ITEM) views.push({ key, label, rows });
      else fora.push(label);
    }
    views.forEach((v) => v.rows.sort((a, b) => a.indice - b.indice));

    const abaixo = (ix) => 100 - ix;
    const naMediana = (ix) => Math.abs(abaixo(ix)) < 0.05;
    const valTxt = (ix) => (naMediana(ix) ? t('hl.redes.atMedian') : (abaixo(ix) > 0 ? MENOS : '+') + IP.fmt.dec1(Math.abs(abaixo(ix))) + '%');

    function manchete(v) {
      const ok = v.rows.filter((r) => r.n >= N_HEADLINE);
      const alvo = v.key === 'geral' ? t('hl.redes.targetAll') : t('hl.redes.targetItem', { item: v.label.toLowerCase() });
      if (!ok.length) return t('hl.redes.few', { target: alvo });
      const m = ok[0];
      const lojas = '(' + t('hl.redes.compared', { count: m.n }) + ')';
      if (naMediana(m.indice) || abaixo(m.indice) < 0) return t('hl.redes.noneBelow', { target: alvo, stores: lojas });
      return t('hl.redes.leader', { target: alvo, rede: m.rede, pct: IP.fmt.dec1(abaixo(m.indice)), stores: lojas });
    }

    function lista(v) {
      const maxPct = Math.max(...v.rows.map((r) => abaixo(r.indice)), 0.1);
      return el('ol', { class: 'hl-rows redes' }, v.rows.map((r) => {
        const fraco = r.n <= N_FRACO;
        const pct = Math.max(abaixo(r.indice), 0);
        return el('li', { class: fraco ? 'weak' : false },
          el('span', { class: 'hl-name' }, r.rede,
            el('small', null, t('hl.redes.compared', { count: r.n }) + (fraco ? ' · ' + t('common.smallSample') : ''))),
          el('span', { class: 'hl-track', 'aria-hidden': 'true' }, el('i', { style: 'width:' + (pct / maxPct * 100).toFixed(1) + '%' })),
          el('span', { class: 'hl-val' + (abaixo(r.indice) > 0.05 ? ' good' : (abaixo(r.indice) < -0.05 ? ' bad' : '')) }, valTxt(r.indice))
        );
      }));
    }

    const lead = el('p', { class: 'hl-lead', 'aria-live': 'polite' });
    const out = el('div', { class: 'hl-view' });
    const tabs = el('div', { class: 'hl-tabs', role: 'group', 'aria-label': t('hl.redes.itemLabel') });
    const botoes = views.map((v) => el('button', { type: 'button', class: 'chip-btn', 'aria-pressed': 'false', onclick: () => mostrar(v) }, v.label));
    function mostrar(v) {
      botoes.forEach((b, i) => b.setAttribute('aria-pressed', String(views[i] === v)));
      lead.textContent = manchete(v);
      IP.clear(out).append(lista(v));
    }
    if (views.length > 1) tabs.append(...botoes);
    mostrar(views[0]);

    const nota = t('hl.redes.note') + (fora.length ? ' ' + t('hl.redes.left', { count: fora.length, items: IP.list(fora) }) : '');
    return card(Object.assign(base, {
      body: el('div', { class: 'hl-body' }, views.length > 1 ? tabs : null, lead, el('p', { class: 'hl-sub' }, t('hl.redes.belowMedian')), out),
      note: nota,
    }));
  }

  /* 3 · Cesta em reais: onde a cesta do iFood fica mais acima e mais abaixo da pesquisa do DIEESE */
  function cardCesta(d) {
    const base = { q: t('hl.cesta.q'), href: 'estados.html#cesta' };
    const lista = Array.isArray(d.cesta) ? d.cesta.filter((c) => c.razao != null && c.ifood_mais_barato != null && c.dieese_mesmos_itens != null) : [];
    if (!lista.length) return card(Object.assign(base, { body: vazio(t('hl.dieese.empty')) }));
    const ord = lista.slice().sort((a, b) => b.razao - a.razao);
    const alto = ord[0], baixo = ord[ord.length - 1];
    const frase = (c) => IP.tn('hl.cesta.line', {
      where: emCap(ufNome(d, c.uf)),
      ifood: el('b', null, IP.fmt.money(c.ifood_mais_barato)),
      rel: relDieese(c.razao, 'hl.rel.same'),
      dieese: IP.fmt.money(c.dieese_mesmos_itens),
    });
    const stat = (rotulo, c) => el('div', { class: 'hl-stat' },
      el('p', { class: 'hl-sub' }, rotulo),
      el('p', { class: 'hl-big' }, IP.fmt.ratioPct(c.razao, 0)),
      el('p', { class: 'hl-cap' }, ...frase(c))
    );
    const casados = lista.map((c) => c.itens_casados || 0);
    return card(Object.assign(base, {
      body: el('div', { class: 'hl-body' }, lista.length > 1 ? [stat(t('hl.cesta.mostAbove'), alto), stat(t('hl.cesta.mostBelow'), baixo)] : stat(t('hl.cesta.only'), alto)),
      note: t('hl.cesta.note', { min: IP.fmt.int(Math.min(...casados)), max: IP.fmt.int(Math.max(...casados)) }) + ' ' + t('hl.cesta.included', { count: lista.length }),
    }));
  }

  /* 4 · Itens do dia a dia: faixa em que o preço costuma ficar entre as lojas */
  const FAMILIAS_PREFERIDAS = ['Leite', 'Café', 'Arroz', 'Coca-Cola']; // nomes de família como vêm de cotidiano.json
  const N_COTIDIANO = 4;
  const FALLBACK_PREFIXOS = ['leite', 'arroz', 'feijao', 'cafe', 'acucar', 'oleo', 'refrigerante']; // início do nome do produto (dado)

  function itensCotidiano(d) {
    if (Array.isArray(d.cotidiano) && d.cotidiano.length) {
      const ok = d.cotidiano.filter((p) => p.p10 != null && p.p90 != null && p.preco_mediano != null);
      const pick = [];
      for (const f of FAMILIAS_PREFERIDAS) {
        const p = ok.find((x) => IP.norm(x.familia) === IP.norm(f));
        if (p) pick.push(p);
      }
      for (const p of ok.slice().sort((a, b) => b.lojas - a.lojas)) {
        if (pick.length >= N_COTIDIANO) break;
        if (!pick.includes(p)) pick.push(p);
      }
      return pick.slice(0, N_COTIDIANO);
    }
    if (Array.isArray(d.dispersao)) {
      const pick = [];
      const usados = new Set();
      const ok = d.dispersao
        .filter((p) => p.p10 != null && p.p90 != null && p.preco_mediano != null && FALLBACK_PREFIXOS.some((x) => IP.norm(p.nome).startsWith(x)))
        .sort((a, b) => b.lojas - a.lojas);
      for (const p of ok) {
        const k = IP.norm(p.nome).split(/\s+/)[0];
        if (usados.has(k)) continue;
        usados.add(k); pick.push(p);
        if (pick.length >= N_COTIDIANO) break;
      }
      return pick;
    }
    return [];
  }

  function cardVariacao(d) {
    const base = { q: t('hl.var.q'), href: 'produtos.html#cotidiano', linkText: t('hl.var.link') };
    const itens = itensCotidiano(d);
    if (!itens.length) return null;
    const maior = Math.max(...itens.map((p) => (p.razao_p90_p10 != null ? p.razao_p90_p10 : p.p90 / p.p10)));
    const linhas = el('ul', { class: 'hl-items' }, itens.map((p) => el('li', null,
      el('b', null, p.nome),
      el('span', null, IP.tn('hl.var.item', {
        low: el('strong', null, IP.fmt.money(p.p10)),
        high: el('strong', null, IP.fmt.money(p.p90)),
        median: IP.fmt.money(p.preco_mediano),
        stores: t('count.store', { count: p.lojas }),
      }))
    )));
    return card(Object.assign(base, {
      body: el('div', { class: 'hl-body' },
        el('p', { class: 'hl-lead' }, t('hl.var.lead', { pct: IP.fmt.int(Math.round((maior - 1) * 100)) })),
        linhas),
      note: t('hl.var.note'),
    }));
  }

  /* 5 · Mediana da diferença iFood × DIEESE, em frase */
  function cardMercado(d) {
    const base = { q: t('hl.mkt.q'), href: 'estados.html#cesta' };
    const lista = Array.isArray(d.cesta) ? d.cesta.filter((c) => c.razao != null) : [];
    if (!lista.length) return card(Object.assign(base, { body: vazio(t('hl.dieese.empty')) }));
    const med = mediana(lista.map((c) => c.razao));
    const acima = lista.filter((c) => c.razao > 1).length;
    const rel = relDieese(med, 'hl.rel.level');
    const pontos = el('div', { class: 'hl-strip', role: 'img', 'aria-label': t('hl.mkt.strip') },
      el('span', { class: 'mid', 'aria-hidden': 'true' }),
      lista.map((c) => {
        const dif = Math.max(-0.45, Math.min(0.45, c.razao - 1));
        const i = el('i', { class: c.razao > 1 ? 'up' : 'down', title: ufNome(d, c.uf) + ': ' + IP.fmt.ratioPct(c.razao, 0) });
        i.style.left = ((dif + 0.5) * 100).toFixed(1) + '%';
        return i;
      }));
    const body = el('div', { class: 'hl-body' },
      el('p', { class: 'hl-lead' }, IP.tn('hl.mkt.lead', { rel: el('b', null, t('hl.mkt.survey', { rel })) }), ' ', t('hl.mkt.above', { above: IP.fmt.int(acima), total: IP.fmt.int(lista.length) })),
      pontos,
      el('p', { class: 'hl-axis', 'aria-hidden': 'true' }, el('span', null, t('hl.mkt.cheaper')), el('span', null, t('hl.mkt.pricier')))
    );
    return card(Object.assign(base, {
      body,
      note: t('hl.mkt.note'),
    }));
  }

  IP.sections.destaques = function (d) {
    const grid = document.getElementById('hl-grid');
    /* Ordem pensada para as colunas ficarem equilibradas (alturas parecidas) */
    const cards = [cardUf(d), cardMercado(d), cardRedes(d), cardCesta(d), cardVariacao(d)].filter(Boolean);
    IP.clear(grid).append(...cards);
    IP.stagger(grid.children, 70, 280);
  };
})();
