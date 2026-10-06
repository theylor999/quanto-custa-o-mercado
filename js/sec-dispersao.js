/* Dispersão de preço por produto (dispersao_por_produto.json):
   nome, lojas, preco_min, preco_max, razao_max_min, coeficiente_variacao, redes_distintas. */
(function () {
  'use strict';
  const IP = window.IP;

  const razao = (r) => (r.razao_max_min != null ? r.razao_max_min : r.preco_min > 0 ? r.preco_max / r.preco_min : null);
  const byRazao = (a, b) => {
    const x = razao(a), y = razao(b);
    if (x == null || y == null) return x == null && y == null ? 0 : x == null ? 1 : -1;
    return y - x;
  };
  const SORTS = {
    cv: (a, b) => b.coeficiente_variacao - a.coeficiente_variacao || b.lojas - a.lojas,
    razao: (a, b) => byRazao(a, b) || b.lojas - a.lojas,
    lojas: (a, b) => b.lojas - a.lojas || b.coeficiente_variacao - a.coeficiente_variacao,
    nome: (a, b) => IP.compare(a.nome, b.nome),
  };

  function median(xs) {
    const s = xs.filter((x) => x != null).sort((a, b) => a - b), n = s.length;
    return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null;
  }

  IP.sections.dispersao = function (d) {
    const list = document.getElementById('disp-cards');
    const note = document.getElementById('disp-note');
    const sortSel = document.getElementById('disp-sort');
    const q = document.getElementById('disp-q');
    if (!d.dispersao) {
      IP.emptyFile(list, 'dispersao_por_produto.json');
      list.style.display = 'block';
      sortSel.disabled = true; q.disabled = true;
      return;
    }
    const data = d.dispersao.map((r) => ({ ...r, _k: IP.norm(r.nome) }));
    if (data.some((r) => r.razao_p90_p10 != null)) {
      SORTS.p9010 = (a, b) => (b.razao_p90_p10 ?? -1) - (a.razao_p90_p10 ?? -1) || b.lojas - a.lojas;
      sortSel.append(IP.el('option', { value: 'p9010' }, IP.t('disp.sort.p9010')));
    }
    if (!data.length) { list.style.display = 'block'; IP.showEmpty(list, IP.t('disp.empty')); sortSel.disabled = true; q.disabled = true; return; }

    const maxLojas = Math.max(...data.map((r) => r.lojas));
    const med = median(data.map((r) => r.coeficiente_variacao));
    const intro = maxLojas <= 1
      ? IP.t('disp.introSingle')
      : IP.t('disp.intro', { count: data.length, cv: med == null ? IP.t('common.na') : IP.fmt.pct(med) });

    function render() {
      const term = IP.norm(q.value);
      const rows = data.filter((r) => !term || r._k.includes(term)).sort(SORTS[sortSel.value]);
      note.textContent = rows.length === data.length ? intro : IP.t('disp.showing', { n: IP.fmt.int(rows.length), total: IP.fmt.int(data.length) }) + ' ' + intro;
      IP.unobserveReveal(list);
      IP.clear(list);
      if (!rows.length) { list.append(IP.el('li', { class: 'muted' }, IP.t('disp.noMatch'))); return; }
      rows.forEach((r) => {
        const ratio = razao(r);
        const minPct = r.preco_max > 0 ? (r.preco_min / r.preco_max) * 100 : 0;
        const fill = IP.el('span', { class: 'span-fill' });
        fill.style.left = minPct.toFixed(2) + '%';
        fill.style.right = '0';
        const cap = IP.el('span', { class: 'span-cap' });
        cap.style.left = 'calc(' + minPct.toFixed(2) + '% - 1px)';
        const tags = [IP.el('span', { class: 'tag' }, IP.t('count.store', { count: r.lojas }))];
        if (r.lojas > 1) {
          tags.push(IP.el('span', { class: 'tag' }, ratio == null ? IP.t('disp.ratioNa') : IP.t('disp.ratio', { ratio: IP.fmt.dec2(ratio) })));
        }
        if (r.redes_distintas > 0) tags.push(IP.el('span', { class: 'tag' }, IP.t('count.chain', { count: r.redes_distintas })));

        list.append(IP.el('li', { class: 'card spotlight reveal' },
          IP.el('div', { class: 'card-top' },
            IP.el('h3', null, r.nome),
            IP.el('div', { class: 'cv', 'aria-label': IP.t('disp.cvAria', { cv: IP.fmt.pct(r.coeficiente_variacao) }) }, IP.fmt.pct(r.coeficiente_variacao), IP.el('small', null, IP.t('disp.cv')))
          ),
          IP.el('div', { class: 'span-bar', role: 'img', 'aria-label': IP.t('disp.rangeAria', { min: IP.fmt.money(r.preco_min), max: IP.fmt.money(r.preco_max) }) }, fill, cap),
          IP.el('div', { class: 'minmax' },
            IP.el('div', null, IP.el('span', null, IP.t('disp.min')), IP.el('b', null, IP.fmt.money(r.preco_min))),
            IP.el('div', null, IP.el('span', null, IP.t('disp.max')), IP.el('b', null, IP.fmt.money(r.preco_max)))
          ),
          r.p10 != null && r.p90 != null && r.lojas > 1
            ? IP.el('p', { class: 'typical' }, IP.tn('common.typicalBetween', { low: IP.el('b', null, IP.fmt.money(r.p10)), high: IP.el('b', null, IP.fmt.money(r.p90)) }), r.preco_mediano != null ? ' ' + IP.t('common.medianParen', { price: IP.fmt.money(r.preco_mediano) }) : '')
            : null,
          IP.el('div', { class: 'card-foot' }, tags)
        ));
      });
      IP.stagger(list.children, 40, 360);
      IP.observeReveal(list);
    }

    sortSel.addEventListener('change', render);
    q.addEventListener('input', render);
    render();
  };
})();
