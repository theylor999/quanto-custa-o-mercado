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
      sortSel.append(IP.el('option', { value: 'p9010' }, 'Maior diferença típica (teto ÷ piso)'));
    }
    if (!data.length) { list.style.display = 'block'; IP.showEmpty(list, 'Sem dados de dispersão neste export.'); sortSel.disabled = true; q.disabled = true; return; }

    const maxLojas = Math.max(...data.map((r) => r.lojas));
    const med = median(data.map((r) => r.coeficiente_variacao));
    const intro = maxLojas <= 1
      ? 'Neste export cada produto aparece em uma única loja, então não há variação a medir (CV = 0%). Use uma coleta com várias lojas por produto.'
      : IP.fmt.int(data.length) + ' produtos com mais lojas distintas. Mediana do CV: ' + (med == null ? 'n/d' : IP.fmt.pct(med)) + '.';

    function render() {
      const term = IP.norm(q.value);
      const rows = data.filter((r) => !term || r._k.includes(term)).sort(SORTS[sortSel.value]);
      note.textContent = rows.length === data.length ? intro : 'Mostrando ' + IP.fmt.int(rows.length) + ' de ' + IP.fmt.int(data.length) + ' produtos. ' + intro;
      IP.unobserveReveal(list);
      IP.clear(list);
      if (!rows.length) { list.append(IP.el('li', { class: 'muted' }, 'Nenhum produto encontrado com esse filtro.')); return; }
      rows.forEach((r) => {
        const ratio = razao(r);
        const minPct = r.preco_max > 0 ? (r.preco_min / r.preco_max) * 100 : 0;
        const fill = IP.el('span', { class: 'span-fill' });
        fill.style.left = minPct.toFixed(2) + '%';
        fill.style.right = '0';
        const cap = IP.el('span', { class: 'span-cap' });
        cap.style.left = 'calc(' + minPct.toFixed(2) + '% - 1px)';
        const tags = [IP.el('span', { class: 'tag' }, IP.fmt.int(r.lojas) + (r.lojas === 1 ? ' loja' : ' lojas'))];
        if (r.lojas > 1) {
          tags.push(IP.el('span', { class: 'tag' }, ratio == null ? 'máx ÷ mín: n/d' : 'máx ≈ ' + IP.fmt.dec2(ratio) + '× mín'));
        }
        if (r.redes_distintas > 0) tags.push(IP.el('span', { class: 'tag' }, IP.fmt.int(r.redes_distintas) + ' redes'));

        list.append(IP.el('li', { class: 'card spotlight reveal' },
          IP.el('div', { class: 'card-top' },
            IP.el('h3', null, r.nome),
            IP.el('div', { class: 'cv', 'aria-label': 'Coeficiente de variação ' + IP.fmt.pct(r.coeficiente_variacao) }, IP.fmt.pct(r.coeficiente_variacao), IP.el('small', null, 'variação (CV)'))
          ),
          IP.el('div', { class: 'span-bar', role: 'img', 'aria-label': 'Faixa de preço de ' + IP.fmt.money(r.preco_min) + ' a ' + IP.fmt.money(r.preco_max) }, fill, cap),
          IP.el('div', { class: 'minmax' },
            IP.el('div', null, IP.el('span', null, 'Mínimo'), IP.el('b', null, IP.fmt.money(r.preco_min))),
            IP.el('div', null, IP.el('span', null, 'Máximo'), IP.el('b', null, IP.fmt.money(r.preco_max)))
          ),
          r.p10 != null && r.p90 != null && r.lojas > 1
            ? IP.el('p', { class: 'typical' }, 'Normalmente entre ', IP.el('b', null, IP.fmt.money(r.p10)), ' e ', IP.el('b', null, IP.fmt.money(r.p90)), r.preco_mediano != null ? ' (mediana ' + IP.fmt.money(r.preco_mediano) + ')' : '')
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
