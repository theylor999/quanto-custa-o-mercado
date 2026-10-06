/* Destaques: cinco perguntas respondidas de relance, em linguagem simples. Tudo é calculado dos JSON em tempo de execução
   (indice_uf, por_uf, redes, cesta_estado, cotidiano ou dispersao_por_produto). */
(function () {
  'use strict';
  const IP = window.IP;
  const el = IP.el;

  const MENOS = '\u2212';
  const plural = (n, um, varios) => IP.fmt.int(n) + ' ' + (n === 1 ? um : varios);

  function ufNome(d, uf) {
    const g = d.geo && Array.isArray(d.geo.ufs) ? d.geo.ufs.find((x) => x.uf === uf) : null;
    return g && g.nome ? g.nome : uf;
  }
  /* "em Mato Grosso", "no Maranhão": só para os nomes sem preposição fixa usamos "em" */
  const EM = { 'Maranhão': 'no Maranhão', 'Pará': 'no Pará', 'Amazonas': 'no Amazonas', 'Acre': 'no Acre', 'Amapá': 'no Amapá', 'Ceará': 'no Ceará', 'Piauí': 'no Piauí', 'Paraná': 'no Paraná', 'Tocantins': 'no Tocantins', 'Espírito Santo': 'no Espírito Santo', 'Distrito Federal': 'no Distrito Federal', 'Rio de Janeiro': 'no Rio de Janeiro', 'Rio Grande do Norte': 'no Rio Grande do Norte', 'Rio Grande do Sul': 'no Rio Grande do Sul', 'Mato Grosso': 'em Mato Grosso', 'Mato Grosso do Sul': 'em Mato Grosso do Sul' };
  const emUf = (nome) => (nome === 'Bahia' ? 'na Bahia' : nome === 'Paraíba' ? 'na Paraíba' : EM[nome] || 'em ' + nome);
  const emCap = (nome) => { const s = emUf(nome); return s[0].toUpperCase() + s.slice(1); };

  function mediana(valores) {
    const v = valores.slice().sort((a, b) => a - b);
    const m = Math.floor(v.length / 2);
    return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
  }

  function card(o) {
    const link = el('a', { class: 'hl-link', href: o.href, 'aria-label': (o.linkText || 'ver detalhe') + ': ' + o.q }, (o.linkText || 'ver detalhe') + ' ', el('span', { 'aria-hidden': 'true' }, '→'));
    return el('article', { class: 'card hl spotlight reveal' },
      el('p', { class: 'hl-tag' }, o.tag || 'Dos dados'),
      el('h3', { class: 'hl-q' }, o.q),
      o.body,
      o.note ? el('p', { class: 'hl-note' }, o.note) : null,
      link
    );
  }

  const vazio = (msg) => el('p', { class: 'hl-empty' }, msg);

  /* 1 · UFs mais caras e mais baratas nos mesmos itens (indice_uf.json; 100 = mediana nacional) */
  function cardUf(d) {
    const base = { q: 'Quais estados são mais caros?', href: 'estados.html#mapa' };
    const lista = Array.isArray(d.indice_uf) ? d.indice_uf.filter((u) => u.indice != null) : [];
    if (!lista.length) return card(Object.assign(base, { body: vazio('Sem índice de preço por UF neste export.') }));
    const n = Math.min(3, Math.floor(lista.length / 2));
    if (!n) {
      const u = lista[0];
      return card(Object.assign(base, {
        body: el('div', { class: 'hl-body' }, el('p', { class: 'hl-lead' }, 'Só ' + ufNome(d, u.uf) + ' tem comparação neste export: ' + IP.fmt.idxPct(u.indice) + ' contra a mediana do país.')),
        note: 'Sem outras UFs, não há comparação.',
      }));
    }
    const ord = lista.slice().sort((a, b) => b.indice - a.indice);
    const caros = ord.slice(0, n);
    const baratos = ord.slice(-n).reverse();
    const pct0 = (ix) => Math.round(Math.abs(ix - 100));
    const linhas = (arr) => el('ol', { class: 'hl-rows' }, arr.map((u) =>
      el('li', null,
        el('b', null, u.uf),
        el('span', { class: 'hl-name' }, ufNome(d, u.uf), el('small', null, plural(u.produtos, 'produto comparado', 'produtos comparados'))),
        el('span', { class: 'hl-val ' + (u.indice >= 100 ? 'bad' : 'good') }, IP.fmt.idxPct(u.indice))
      )));
    const topo = caros[0], fundo = baratos[0];
    const corpo = [
      el('p', { class: 'hl-lead' },
        'Comprando os mesmos produtos, ', el('b', null, ufNome(d, topo.uf)), ' sai ' + pct0(topo.indice) + '% mais caro que a média do país; ',
        el('b', null, ufNome(d, fundo.uf)), ', ' + pct0(fundo.indice) + '% mais barato.'),
      el('div', { class: 'hl-cols' },
        el('div', null, el('p', { class: 'hl-sub' }, 'Mais caros'), linhas(caros)),
        el('div', null, el('p', { class: 'hl-sub' }, 'Mais baratos'), linhas(baratos))
      ),
    ];
    const brutos = Array.isArray(d.por_uf) ? d.por_uf.filter((u) => u.preco_medio != null) : [];
    if (brutos.length) {
      const alto = brutos.reduce((a, b) => (b.preco_medio > a.preco_medio ? b : a));
      const ix = lista.find((u) => u.uf === alto.uf);
      if (ix) corpo.push(el('p', { class: 'hl-aside' }, 'A média bruta engana: ' + ufNome(d, alto.uf) + ' tem a mais alta (' + IP.fmt.money(alto.preco_medio) + '), mas nos mesmos itens fica em ' + IP.fmt.idxPct(ix.indice) + '.'));
    }
    return card(Object.assign(base, {
      body: el('div', { class: 'hl-body' }, corpo),
      note: 'A referência é a mediana dos estados. Estados com poucos produtos comparáveis ficam de fora.',
    }));
  }

  /* 2 · Redes: índice dos mesmos itens contra a mediana da UF (redes.json; 100 = mediana, menor = mais barato) */
  const BASICOS = [['leite', 'Leite'], ['cafe', 'Café'], ['arroz', 'Arroz'], ['feijao', 'Feijão'], ['oleo', 'Óleo']];
  const MIN_REDES_ITEM = 2;
  const N_HEADLINE = 5;
  const N_FRACO = 3;

  function juntar(nomes) {
    if (nomes.length <= 1) return nomes.join('');
    return nomes.slice(0, -1).join(', ') + ' e ' + nomes[nomes.length - 1];
  }

  function cardRedes(d) {
    const base = { q: 'Qual rede é mais barata?', href: 'tabelas.html#t-redes', linkText: 'ver tabela completa' };
    const redes = Array.isArray(d.redes) ? d.redes : [];
    const geral = redes.filter((r) => r.indice != null);
    if (!geral.length) return card(Object.assign(base, { body: vazio('Sem índice por rede neste export.') }));

    const views = [{ key: 'geral', label: 'Geral', rows: geral.map((r) => ({ rede: r.rede, indice: r.indice, n: r.lojas_com_indice })) }];
    const fora = [];
    for (const [key, label] of BASICOS) {
      const rows = redes
        .filter((r) => r.basicos && r.basicos[key] && r.basicos[key].indice != null)
        .map((r) => ({ rede: r.rede, indice: r.basicos[key].indice, n: r.basicos[key].n }));
      if (rows.length >= MIN_REDES_ITEM) views.push({ key, label, rows });
      else fora.push(label);
    }
    views.forEach((v) => v.rows.sort((a, b) => a.indice - b.indice));

    const abaixo = (ix) => 100 - ix;
    const naMediana = (ix) => Math.abs(abaixo(ix)) < 0.05;
    const valTxt = (ix) => (naMediana(ix) ? 'na mediana' : (abaixo(ix) > 0 ? MENOS : '+') + IP.fmt.dec1(Math.abs(abaixo(ix))) + '%');

    function manchete(v) {
      const ok = v.rows.filter((r) => r.n >= N_HEADLINE);
      const alvo = v.key === 'geral' ? 'Nos mesmos itens' : 'No ' + v.label.toLowerCase();
      if (!ok.length) return alvo + ': poucas lojas comparadas por rede, sem destaque seguro.';
      const m = ok[0];
      const lojas = '(' + plural(m.n, 'loja comparada', 'lojas comparadas') + ')';
      if (naMediana(m.indice) || abaixo(m.indice) < 0) return alvo + ', nenhuma rede com amostra razoável fica abaixo da mediana da UF ' + lojas + '.';
      return alvo + ', ' + m.rede + ' fica ' + IP.fmt.dec1(abaixo(m.indice)) + '% abaixo da mediana da UF ' + lojas + '.';
    }

    function lista(v) {
      const maxPct = Math.max(...v.rows.map((r) => abaixo(r.indice)), 0.1);
      return el('ol', { class: 'hl-rows redes' }, v.rows.map((r) => {
        const fraco = r.n <= N_FRACO;
        const pct = Math.max(abaixo(r.indice), 0);
        return el('li', { class: fraco ? 'weak' : false },
          el('span', { class: 'hl-name' }, r.rede,
            el('small', null, plural(r.n, 'loja comparada', 'lojas comparadas') + (fraco ? ' · amostra pequena' : ''))),
          el('span', { class: 'hl-track', 'aria-hidden': 'true' }, el('i', { style: 'width:' + (pct / maxPct * 100).toFixed(1) + '%' })),
          el('span', { class: 'hl-val' + (abaixo(r.indice) > 0.05 ? ' good' : (abaixo(r.indice) < -0.05 ? ' bad' : '')) }, valTxt(r.indice))
        );
      }));
    }

    const lead = el('p', { class: 'hl-lead', 'aria-live': 'polite' });
    const out = el('div', { class: 'hl-view' });
    const tabs = el('div', { class: 'hl-tabs', role: 'group', 'aria-label': 'Item comparado' });
    const botoes = views.map((v) => el('button', { type: 'button', class: 'chip-btn', 'aria-pressed': 'false', onclick: () => mostrar(v) }, v.label));
    function mostrar(v) {
      botoes.forEach((b, i) => b.setAttribute('aria-pressed', String(views[i] === v)));
      lead.textContent = manchete(v);
      IP.clear(out).append(lista(v));
    }
    if (views.length > 1) tabs.append(...botoes);
    mostrar(views[0]);

    const nota = 'Cada loja contra a mediana das lojas da sua UF, no mesmo item. Valor negativo = mais barata.'
      + (fora.length ? ' ' + juntar(fora) + ' ficam de fora (poucas lojas comparáveis).' : '');
    return card(Object.assign(base, {
      body: el('div', { class: 'hl-body' }, views.length > 1 ? tabs : null, lead, el('p', { class: 'hl-sub' }, '% abaixo da mediana da UF'), out),
      note: nota,
    }));
  }

  /* 3 · Cesta em reais: onde a cesta do iFood fica mais acima e mais abaixo da pesquisa do DIEESE */
  function cardCesta(d) {
    const base = { q: 'Onde a cesta básica pesa mais?', href: 'estados.html#cesta' };
    const lista = Array.isArray(d.cesta) ? d.cesta.filter((c) => c.razao != null && c.ifood_mais_barato != null && c.dieese_mesmos_itens != null) : [];
    if (!lista.length) return card(Object.assign(base, { body: vazio('Sem comparação com o DIEESE neste export.') }));
    const ord = lista.slice().sort((a, b) => b.razao - a.razao);
    const alto = ord[0], baixo = ord[ord.length - 1];
    const frase = (c) => {
      const p = Math.round(Math.abs(c.razao - 1) * 100);
      const rel = p === 0 ? 'igual à' : p + '% ' + (c.razao > 1 ? 'acima da' : 'abaixo da');
      return [
        emCap(ufNome(d, c.uf)) + ', a cesta montada no iFood custa ',
        el('b', null, IP.fmt.money(c.ifood_mais_barato)),
        ' por mês, ' + rel + ' pesquisa do DIEESE (' + IP.fmt.money(c.dieese_mesmos_itens) + ').',
      ];
    };
    const stat = (rotulo, c) => el('div', { class: 'hl-stat' },
      el('p', { class: 'hl-sub' }, rotulo),
      el('p', { class: 'hl-big' }, IP.fmt.ratioPct(c.razao, 0)),
      el('p', { class: 'hl-cap' }, ...frase(c))
    );
    return card(Object.assign(base, {
      body: el('div', { class: 'hl-body' }, lista.length > 1 ? [stat('Mais acima do DIEESE', alto), stat('Mais abaixo do DIEESE', baixo)] : stat('Única UF no export', alto)),
      note: 'Só os itens da cesta que consegui casar com o iFood (' + IP.fmt.int(Math.min(...lista.map((c) => c.itens_casados || 0))) + ' a ' + IP.fmt.int(Math.max(...lista.map((c) => c.itens_casados || 0))) + ' por estado), sempre com o produto mais barato. Entram ' + IP.fmt.int(lista.length) + ' estados.',
    }));
  }

  /* 4 · Itens do dia a dia: faixa em que o preço costuma ficar entre as lojas */
  const FAMILIAS_PREFERIDAS = ['Leite', 'Café', 'Arroz', 'Coca-Cola'];
  const N_COTIDIANO = 4;
  const FALLBACK_PREFIXOS = ['leite', 'arroz', 'feijao', 'cafe', 'acucar', 'oleo', 'refrigerante'];

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
    const base = { q: 'Quanto o mesmo item varia de loja para loja?', href: 'produtos.html#cotidiano', linkText: 'ver todos os itens' };
    const itens = itensCotidiano(d);
    if (!itens.length) return null;
    const maior = Math.max(...itens.map((p) => (p.razao_p90_p10 != null ? p.razao_p90_p10 : p.p90 / p.p10)));
    const linhas = el('ul', { class: 'hl-items' }, itens.map((p) => el('li', null,
      el('b', null, p.nome),
      el('span', null, 'normalmente entre ', el('strong', null, IP.fmt.money(p.p10)), ' e ', el('strong', null, IP.fmt.money(p.p90)),
        ' (mediana ' + IP.fmt.money(p.preco_mediano) + '), em ' + plural(p.lojas, 'loja', 'lojas'))
    )));
    return card(Object.assign(base, {
      body: el('div', { class: 'hl-body' },
        el('p', { class: 'hl-lead' }, 'Nos itens do dia a dia, o preço típico das lojas mais caras chega a ser ' + Math.round((maior - 1) * 100) + '% maior que o das mais baratas.'),
        linhas),
      note: '“Normalmente” deixa de fora os 10% mais baratos e os 10% mais caros de cada produto.',
    }));
  }

  /* 5 · Mediana da diferença iFood × DIEESE, em frase */
  function cardMercado(d) {
    const base = { q: 'O iFood é mais caro que o mercado?', href: 'estados.html#cesta' };
    const lista = Array.isArray(d.cesta) ? d.cesta.filter((c) => c.razao != null) : [];
    if (!lista.length) return card(Object.assign(base, { body: vazio('Sem comparação com o DIEESE neste export.') }));
    const med = mediana(lista.map((c) => c.razao));
    const acima = lista.filter((c) => c.razao > 1).length;
    const p = Math.round(Math.abs(med - 1) * 100);
    const rel = p === 0 ? 'no mesmo nível da' : p + '% ' + (med > 1 ? 'acima da' : 'abaixo da');
    const pontos = el('div', { class: 'hl-strip', role: 'img', 'aria-label': 'Cada ponto é um estado: à esquerda, cesta do iFood mais barata que a do DIEESE; à direita, mais cara' },
      el('span', { class: 'mid', 'aria-hidden': 'true' }),
      lista.map((c) => {
        const dif = Math.max(-0.45, Math.min(0.45, c.razao - 1));
        const i = el('i', { class: c.razao > 1 ? 'up' : 'down', title: ufNome(d, c.uf) + ': ' + IP.fmt.ratioPct(c.razao, 0) });
        i.style.left = ((dif + 0.5) * 100).toFixed(1) + '%';
        return i;
      }));
    const body = el('div', { class: 'hl-body' },
      el('p', { class: 'hl-lead' }, 'Montando a cesta com o produto mais barato do iFood, ela sai em média ', el('b', null, rel + ' pesquisa de preços do DIEESE'),
        '. Em ' + IP.fmt.int(acima) + ' dos ' + IP.fmt.int(lista.length) + ' estados sai acima.'),
      pontos,
      el('p', { class: 'hl-axis', 'aria-hidden': 'true' }, el('span', null, 'iFood mais barato'), el('span', null, 'iFood mais caro'))
    );
    return card(Object.assign(base, {
      body,
      note: 'Cada ponto é um estado. Só nos itens casados; é aproximação, não índice oficial.',
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
