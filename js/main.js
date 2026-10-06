/* Ponto de entrada: lê _meta.json, carrega só os JSON que a página (body[data-page]) usa e que o export diz ter gerado,
   e entrega cada pedaço às seções da página. Arquivo ausente vira estado vazio na seção, sem requisição 404 nem erro no console. */
(function () {
  'use strict';
  const IP = window.IP;

  const FILES = {
    kpis: 'kpis.json',
    por_uf: 'por_uf.json',
    corredores: 'corredores.json',
    produtos: 'produtos_mais_comuns.json',
    dispersao: 'dispersao_por_produto.json',
    cotidiano: 'cotidiano.json',
    dieese: 'series_dieese.json',
    ipca: 'series_ipca.json',
    cesta: 'cesta_estado.json',
    capitais: 'capitais.json',
    indice_uf: 'indice_uf.json',
    redes: 'redes.json',
  };

  /* Por página: quais dados carregar ('geo' = geo/br_uf.json) e quais seções iniciar */
  const PAGES = {
    inicio: {
      data: ['kpis', 'capitais', 'corredores', 'por_uf', 'indice_uf', 'redes', 'cesta', 'cotidiano', 'dispersao', 'geo'],
      sections: ['hero', 'destaques'],
    },
    estados: { data: ['kpis', 'por_uf', 'indice_uf', 'cesta', 'dieese', 'geo'], sections: ['uf', 'cesta'] },
    capitais: { data: ['kpis', 'capitais', 'cesta'], sections: ['capitais'] },
    produtos: { data: ['kpis', 'corredores', 'produtos', 'cotidiano', 'dispersao'], sections: ['corredores', 'produtos', 'dispersao'] },
    tabelas: { data: ['kpis', 'por_uf', 'indice_uf', 'capitais', 'produtos', 'cotidiano', 'corredores', 'redes', 'cesta', 'geo'], sections: ['tabelas'] },
    series: { data: ['kpis', 'dieese', 'ipca'], sections: ['series'] },
    graficos: { data: ['kpis'], sections: ['analises'] },
    sobre: { data: ['kpis'], sections: [] },
  };

  function renderMeta(d) {
    const foot = document.getElementById('foot-meta');
    const box = document.getElementById('meta-avisos');
    const lim = document.getElementById('meta-limpeza');
    if (!d.meta) { foot.textContent = IP.t('foot.noMeta'); return; }
    const bits = [];
    if (d.meta.generated_at) bits.push(IP.t('foot.exported', { date: IP.fmt.date(d.meta.generated_at) }));
    if (d.kpis && d.kpis.data_ultima_coleta) bits.push(IP.t('foot.lastCollect', { date: IP.fmt.date(d.kpis.data_ultima_coleta) }));
    foot.textContent = IP.t('foot.data', { bits: bits.join(' · ') });

    const l = d.meta.limpeza;
    if (l && lim) {
      const raw = typeof l === 'string' ? l : l.regra;
      /* A regra vem do arquivo, em português. Em inglês, mostra a tradução, mas só se o texto for o que ela traduz. */
      const regra = raw && raw === IP.dict.pt['meta.limpeza.regra'] ? IP.t('meta.limpeza.regra') : raw;
      const parts = [];
      if (l.removidos != null) parts.push(IP.t('meta.limpeza.removidos', { n: IP.fmt.int(l.removidos) }));
      if (l.percentual != null) parts.push(IP.t('meta.limpeza.percentual', { pct: IP.fmt.dec2(l.percentual) }));
      lim.hidden = false;
      IP.clear(lim).append(
        IP.el('strong', null, IP.t('meta.limpeza.titulo')),
        parts.length ? IP.el('p', null, parts.join(' · ') + '.') : null,
        regra ? IP.el('p', null, IP.el('strong', null, IP.t('meta.limpeza.regraLabel') + ' '), regra) : null
      );
    }
    if (box && Array.isArray(d.meta.avisos) && d.meta.avisos.length) {
      box.hidden = false;
      IP.clear(box).append(
        IP.el('strong', null, IP.t('meta.avisos.titulo')),
        IP.el('ul', null, d.meta.avisos.map((a) => IP.el('li', null, IP.aviso(a))))
      );
    }
  }

  async function start() {
    IP.initTheme();
    IP.initNav();
    IP.initPointerFx();

    const page = PAGES[document.body.dataset.page] || PAGES.inicio;
    const d = IP.data;
    try { d.meta = await IP.fetchJSON('data/_meta.json'); } catch (e) { console.error('Failed to load data/_meta.json', e); }
    const listed = d.meta && Array.isArray(d.meta.files) ? new Set(d.meta.files) : null;

    const jobs = page.data.filter((k) => k === 'geo' || !listed || listed.has(FILES[k]));
    const results = await Promise.allSettled(jobs.map((k) => IP.fetchJSON(k === 'geo' ? 'geo/br_uf.json' : 'data/' + FILES[k])));
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') d[jobs[i]] = r.value;
      else console.error('Failed to load ' + jobs[i], r.reason);
    });

    for (const name of page.sections) {
      try { IP.sections[name](d); } catch (e) { console.error('Error in section ' + name, e); }
    }
    renderMeta(d);
    IP.observeReveal(document);
    IP.restoreScroll();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
