/* Tabela ordenável e filtrável, usada por tabelas.html.
   IP.table({ table, columns, rows, sort, search, count, noun, empty })
   columns: [{ key, label, unit, text, row, value(r), cell(r) }]
     key    campo da linha (e chave de ordenação)
     text   coluna de texto (alinhada à esquerda, ordena A–Z primeiro)
     row    a célula vira <th scope="row"> (primeira coluna)
     value  valor usado na ordenação (padrão: r[key])
     cell   devolve texto ou nó para a célula (padrão: r[key] ou "n/d")
   search: { input, text(r) -> string }   count: elemento com "Mostrando X de Y …" */
(function () {
  'use strict';
  const IP = window.IP;

  IP.table = function (o) {
    const { table, columns, rows } = o;
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');
    const state = { sort: Object.assign({ key: columns[0].key, dir: 'asc' }, o.sort) };
    const all = rows.map((r) => (o.search ? { r, k: IP.norm(o.search.text(r)) } : { r, k: '' }));
    const val = (c, r) => (c.value ? c.value(r) : r[c.key]);

    const tr = IP.el('tr');
    const ths = columns.map((c) => {
      const th = IP.el('th', { scope: 'col', class: c.text ? false : 'r', 'aria-sort': 'none', 'data-key': c.key },
        IP.el('button', { type: 'button' }, c.label, c.unit ? IP.el('small', null, c.unit) : null));
      th.querySelector('button').addEventListener('click', () => {
        state.sort = state.sort.key === c.key
          ? { key: c.key, dir: state.sort.dir === 'asc' ? 'desc' : 'asc' }
          : { key: c.key, dir: c.text ? 'asc' : 'desc' };
        render();
      });
      tr.append(th);
      return th;
    });
    IP.clear(thead).append(tr);

    function render() {
      const term = o.search ? IP.norm(o.search.input.value) : '';
      const col = columns.find((c) => c.key === state.sort.key) || columns[0];
      const list = all
        .filter((x) => !term || x.k.includes(term))
        .map((x) => x.r)
        .sort((a, b) => IP.compare(val(col, a), val(col, b), state.sort.dir));
      IP.clear(tbody);
      if (!list.length) {
        tbody.append(IP.el('tr', null, IP.el('td', { colspan: columns.length, class: 'muted' }, o.empty || IP.t('table.noMatch'))));
      }
      for (const r of list) {
        tbody.append(IP.el('tr', null, columns.map((c) => {
          const v = c.cell ? c.cell(r) : (r[c.key] == null ? IP.t('common.na') : r[c.key]);
          return c.row ? IP.el('th', { scope: 'row', class: c.cls || false }, v) : IP.el('td', { class: c.text ? false : 'r' }, v);
        })));
      }
      ths.forEach((th) => th.setAttribute('aria-sort', th.dataset.key === state.sort.key ? (state.sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'));
      if (o.count) o.count.textContent = IP.t('table.count', { n: IP.fmt.int(list.length), total: IP.fmt.int(all.length), noun: o.noun || IP.t('tbl.noun.rows') });
    }

    if (o.search) o.search.input.addEventListener('input', render);
    render();
    return { render };
  };
})();
