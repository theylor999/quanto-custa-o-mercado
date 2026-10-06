/* Produtos: itens do dia a dia (cotidiano.json, faixa típica de preço) e os mais comuns (produtos_mais_comuns.json, lista curta).
   A tabela completa de cada um fica em tabelas.html. */
(function () {
  'use strict';
  const IP = window.IP;
  const el = IP.el;

  const TOP = 10;

  function cotidiano(d) {
    const box = document.getElementById('cot-cards');
    if (!box) return;
    if (!Array.isArray(d.cotidiano)) { box.style.display = 'block'; IP.emptyFile(box, 'cotidiano.json'); return; }
    if (!d.cotidiano.length) { box.style.display = 'block'; IP.showEmpty(box, 'Sem itens do dia a dia neste export.'); return; }
    const rows = d.cotidiano.slice().sort((a, b) => b.lojas - a.lojas);
    IP.clear(box);
    rows.forEach((p) => {
      const span = p.preco_max - p.preco_min || 1;
      const pos = (v) => Math.min(100, Math.max(0, ((v - p.preco_min) / span) * 100));
      const fill = el('span', { class: 'span-fill' });
      fill.style.left = pos(p.p10).toFixed(1) + '%';
      fill.style.right = (100 - pos(p.p90)).toFixed(1) + '%';
      const med = el('span', { class: 'span-cap' });
      med.style.left = 'calc(' + pos(p.preco_mediano).toFixed(1) + '% - 1px)';
      box.append(el('li', { class: 'card spotlight reveal' },
        el('div', { class: 'card-top' },
          el('h3', null, p.nome),
          el('div', { class: 'cv', 'aria-label': 'Mediana ' + IP.fmt.money(p.preco_mediano) }, IP.fmt.money(p.preco_mediano), el('small', null, 'mediana'))
        ),
        el('p', { class: 'typical' }, 'Normalmente entre ', el('b', null, IP.fmt.money(p.p10)), ' e ', el('b', null, IP.fmt.money(p.p90))),
        el('div', { class: 'span-bar', role: 'img', 'aria-label': 'Faixa típica de ' + IP.fmt.money(p.p10) + ' a ' + IP.fmt.money(p.p90) + ', dentro do intervalo de ' + IP.fmt.money(p.preco_min) + ' a ' + IP.fmt.money(p.preco_max) }, fill, med),
        el('div', { class: 'minmax' },
          el('div', null, el('span', null, 'Mais barato'), el('b', null, IP.fmt.money(p.preco_min))),
          el('div', null, el('span', null, 'Mais caro'), el('b', null, IP.fmt.money(p.preco_max)))
        ),
        el('div', { class: 'card-foot' },
          el('span', { class: 'tag' }, p.familia),
          el('span', { class: 'tag' }, IP.fmt.int(p.lojas) + ' lojas'),
          el('span', { class: 'tag' }, IP.fmt.int(p.ufs) + ' UFs'))
      ));
    });
    IP.stagger(box.children, 40, 320);
  }

  function maisComuns(d) {
    const list = document.getElementById('prod-top');
    if (!list) return;
    if (!d.produtos) { IP.emptyFile(list, 'produtos_mais_comuns.json'); return; }
    const rows = d.produtos.slice().sort((a, b) => b.lojas - a.lojas).slice(0, TOP);
    if (!rows.length) { IP.showEmpty(list, 'Sem produtos neste export.'); return; }
    const nProd = document.getElementById('prod-n');
    if (nProd) nProd.textContent = IP.fmt.int(d.produtos.length);
    IP.clear(list).append(...rows.map((p, i) => el('li', null,
      el('b', null, String(i + 1)),
      el('span', { class: 'hl-name' }, p.nome,
        el('small', null, IP.fmt.int(p.lojas) + ' lojas · de ' + IP.fmt.money(p.preco_min) + ' a ' + IP.fmt.money(p.preco_max))),
      el('span', { class: 'hl-val' }, IP.fmt.money(p.preco_medio))
    )));
  }

  IP.sections.produtos = function (d) {
    cotidiano(d);
    maisComuns(d);
  };
})();
