/* Cesta por UF: mapa + ranking sincronizados e detalhe item a item.
   Lê cesta_estado.json (iFood × DIEESE nos itens casados) e series_dieese.json (cesta completa, mês mais recente). */
(function () {
  'use strict';
  const IP = window.IP;

  const METRICS = {
    razao: { label: IP.t('cesta.m.razao'), fmt: (v) => IP.fmt.ratioPct(v, 0), needs: 'cesta' },
    dieese_total: { label: IP.t('cesta.m.total'), fmt: IP.fmt.money },
    dieese_itens: { label: IP.t('cesta.m.match'), fmt: IP.fmt.money, needs: 'cesta' },
    ifood: { label: IP.t('cesta.m.ifood'), fmt: IP.fmt.money, needs: 'cesta' },
  };
  const FIELD = { razao: 'razao', dieese_total: 'full', dieese_itens: 'match', ifood: 'ifood' };

  IP.sections.cesta = function (d) {
    const mapWrap = document.getElementById('cesta-map');
    const legend = document.getElementById('cesta-legend');
    const list = document.getElementById('cesta-rank');
    const rankLegend = document.getElementById('cesta-rank-legend');
    const rankTitle = document.getElementById('cesta-rank-title');
    const detail = document.getElementById('cesta-detail');
    const metricSel = document.getElementById('cesta-metric');
    const ufSel = document.getElementById('cesta-select');

    if (!d.geo) { IP.showError(mapWrap, IP.t('common.geoError')); return; }
    const hasCesta = Array.isArray(d.cesta) && d.cesta.length > 0;
    const hasSeries = Array.isArray(d.dieese) && d.dieese.length > 0;
    if (!hasCesta && !hasSeries) {
      IP.emptyFile(detail, 'cesta_estado.json');
      IP.showEmpty(mapWrap, IP.t('cesta.empty'));
      metricSel.disabled = true; ufSel.disabled = true;
      return;
    }

    const geo = d.geo;
    const names = new Map(geo.ufs.map((u) => [u.uf, u.nome]));

    /* DIEESE completa por UF (capital), no mês mais recente de cada cidade */
    const full = new Map();
    let fullPeriod = '';
    if (hasSeries) {
      const latest = new Map();
      for (const r of d.dieese) {
        const uf = IP.CAPITAL_UF[r.cidade];
        if (!uf || r.gasto_mensal == null) continue;
        const cur = latest.get(uf);
        if (!cur || r.periodo > cur.periodo) latest.set(uf, r);
      }
      latest.forEach((r, uf) => { full.set(uf, r.gasto_mensal); if (r.periodo > fullPeriod) fullPeriod = r.periodo; });
    }

    const byUf = new Map();
    const get = (uf) => { if (!byUf.has(uf)) byUf.set(uf, { uf, nome: names.get(uf) || uf, full: null, match: null, ifood: null, razao: null, n: 0, detalhe: [], periodo: null }); return byUf.get(uf); };
    full.forEach((v, uf) => { get(uf).full = v; });
    if (hasCesta) {
      for (const c of d.cesta) {
        const r = get(c.uf);
        r.match = c.dieese_mesmos_itens ?? null;
        r.ifood = c.ifood_mais_barato ?? null;
        r.razao = c.razao ?? (r.match ? r.ifood / r.match : null);
        r.n = c.itens_casados ?? (Array.isArray(c.detalhe) ? c.detalhe.length : 0);
        r.detalhe = Array.isArray(c.detalhe) ? c.detalhe : [];
        r.periodo = c.periodo_dieese || null;
      }
    }
    const rows = [...byUf.values()].sort((a, b) => a.uf.localeCompare(b.uf));
    const enabled = new Set(rows.map((r) => r.uf));
    const state = { metric: hasCesta ? 'razao' : 'dieese_total', sel: '' };

    /* Sem cesta_estado: só a cesta completa fica disponível */
    [...metricSel.options].forEach((o) => { if (METRICS[o.value].needs && !hasCesta) o.disabled = true; });
    metricSel.value = state.metric;
    rows.forEach((r) => ufSel.append(IP.el('option', { value: r.uf }, r.uf + ' · ' + r.nome)));

    const mfmt = (v) => (v == null ? IP.t('common.na') : IP.fmt.money(v));
    function tipRows(uf) {
      const r = byUf.get(uf);
      const out = [[IP.t('cesta.m.total'), mfmt(r.full)]];
      if (hasCesta) out.push([IP.t('cesta.m.match'), mfmt(r.match)], [IP.t('cesta.tip.ifood'), mfmt(r.ifood)], [IP.t('cesta.vs'), r.razao == null ? IP.t('common.na') : IP.fmt.ratioPct(r.razao, 0)]);
      return out;
    }
    const map = IP.makeMap({
      wrap: mapWrap, legend, geo, enabled,
      ariaLabel: IP.t('cesta.map.aria'),
      tipFor: (uf) => ({ title: uf + ' · ' + byUf.get(uf).nome, rows: tipRows(uf) }),
      ariaFor(uf) {
        const r = byUf.get(uf);
        let s = IP.t('cesta.aria.full', { nome: r.nome, full: mfmt(r.full) });
        if (hasCesta) s += IP.t('cesta.aria.match', { match: mfmt(r.match), ifood: mfmt(r.ifood) }) + (r.razao == null ? '' : ' (' + IP.fmt.ratioPct(r.razao, 0) + ')');
        return s;
      },
      onSelect: (uf) => select(uf),
    });

    /* ── Ranking ── */
    const items = new Map();
    for (const r of rows) {
      const bars = IP.el('span', { class: 'pair', 'aria-hidden': 'true' });
      const val = IP.el('span', { class: 'val' });
      const btn = IP.el('button', { type: 'button', class: 'rk', 'aria-pressed': 'false' },
        IP.el('b', null, r.uf), bars, val);
      const li = IP.el('li', null, btn);
      btn.addEventListener('click', () => select(state.sel === r.uf ? '' : r.uf));
      btn.addEventListener('pointermove', (e) => IP.tip.showAt(r.uf + ' · ' + r.nome, tipRows(r.uf), e.clientX, e.clientY));
      btn.addEventListener('pointerleave', () => IP.tip.hide());
      items.set(r.uf, { li, btn, bars, val });
    }
    function renderRank() {
      const m = METRICS[state.metric], key = FIELD[state.metric];
      const sorted = [...rows].sort((a, b) => IP.compare(a[key], b[key], 'desc') || a.uf.localeCompare(b.uf));
      const dual = state.metric === 'razao';
      const max = Math.max(1, ...rows.map((r) => (dual ? Math.max(r.match || 0, r.ifood || 0) : r[key] || 0)));
      IP.clear(rankLegend);
      if (dual) {
        rankLegend.append(
          IP.el('span', null, IP.el('i', { style: 'background:var(--c-dieese)' }), IP.t('cesta.m.match')),
          IP.el('span', null, IP.el('i', { style: 'background:var(--c-ifood)' }), IP.t('cesta.m.ifood'))
        );
      } else {
        rankLegend.append(IP.el('span', null, IP.el('i', { style: 'background:var(--c-dieese)' }), m.label));
      }
      rankTitle.textContent = IP.t('cesta.rankTitle', { label: m.label });
      sorted.forEach((r) => {
        const it = items.get(r.uf);
        list.append(it.li);
        IP.clear(it.bars);
        const pct = (v) => (v ? Math.max(1, (v / max) * 100).toFixed(1) + '%' : '0%');
        if (dual) {
          const a = IP.el('span', { class: 'd' }), b = IP.el('span', { class: 'i' });
          a.style.setProperty('--w', pct(r.match)); b.style.setProperty('--w', pct(r.ifood));
          it.bars.append(a, b);
        } else {
          const a = IP.el('span', { class: 's' });
          a.style.setProperty('--w', pct(r[key]));
          it.bars.append(a);
        }
        it.val.textContent = r[key] == null ? IP.t('common.na') : m.fmt(r[key]);
        it.val.classList.toggle('na', r[key] == null);
        it.btn.setAttribute('aria-label', r.nome + ': ' + m.label + ' ' + (r[key] == null ? IP.t('cesta.noValue') : m.fmt(r[key])));
      });
      list.setAttribute('aria-label', IP.t('cesta.rank.aria', { label: m.label }));
    }

    function paint() {
      const m = METRICS[state.metric], key = FIELD[state.metric];
      map.paint(new Map(rows.map((r) => [r.uf, r[key]])), m.fmt, m.label);
    }

    /* ── Detalhe item a item ── */
    function diffCell(dif) {
      if (dif == null) return IP.el('span', { class: 'muted' }, IP.t('common.na'));
      const w = Math.min(Math.abs(dif), 1) * 50;
      const bar = IP.el('span', { class: 'diff-bar ' + (dif < 0 ? 'neg' : 'pos') });
      bar.style.width = w.toFixed(1) + '%';
      return IP.el('div', { class: 'diff-cell' },
        IP.el('span', { class: 'v ' + (dif < 0 ? 'diff-neg' : 'diff-pos') }, IP.fmt.signed(dif * 100)),
        IP.el('span', { class: 'diff-track', 'aria-hidden': 'true' }, bar));
    }

    function renderDetail() {
      IP.clear(detail);
      if (!hasCesta) {
        IP.emptyFile(detail, 'cesta_estado.json', IP.t('cesta.needsFile'));
        return;
      }
      const withIfood = rows.filter((r) => r.razao != null);
      if (!state.sel) {
        const sorted = [...withIfood].sort((a, b) => a.razao - b.razao);
        const mid = sorted.length ? sorted[Math.floor(sorted.length / 2)].razao : null;
        detail.append(
          IP.el('div', { class: 'item-head' },
            IP.el('div', null,
              IP.el('h3', null, IP.t('cesta.items.title')),
              IP.el('p', null, IP.t('cesta.items.hint'))),
            mid == null ? null : IP.el('div', { class: 'ratio-chip' }, IP.fmt.ratioPct(mid, 0), IP.el('small', null, IP.t('cesta.medianChip', { ufs: IP.t('count.uf', { count: withIfood.length }) }))))
        );
        if (sorted.length) {
          detail.append(IP.el('p', { class: 'hint' },
            IP.t('cesta.hint', { low: sorted[0].uf, lowPct: IP.fmt.ratioPct(sorted[0].razao, 0), high: sorted[sorted.length - 1].uf, highPct: IP.fmt.ratioPct(sorted[sorted.length - 1].razao, 0), period: fullPeriod ? IP.fmt.monthYear(fullPeriod) : IP.t('common.na') })));
        }
        return;
      }
      const r = byUf.get(state.sel);
      const head = IP.el('div', { class: 'item-head' },
        IP.el('div', null,
          IP.el('h3', null, r.nome + ' (' + r.uf + ')'),
          IP.el('p', null, r.n ? IP.t('cesta.detail.matched', { count: r.n }) + (r.periodo ? IP.t('cesta.detail.period', { period: IP.fmt.monthYear(r.periodo) }) : '') + '. ' + IP.t('cesta.detail.unit') : IP.t('cesta.detail.few'))),
        r.razao == null ? null : IP.el('div', { class: 'ratio-chip' }, IP.fmt.ratioPct(r.razao, 0), IP.el('small', null, IP.t('cesta.chip', { ifood: mfmt(r.ifood), dieese: mfmt(r.match) })))
      );
      detail.append(head);
      if (!r.detalhe.length) return;

      const ul = IP.el('ul', { class: 'item-list', 'aria-label': IP.t('cesta.list.aria', { nome: r.nome }) });
      ul.append(IP.el('li', { class: 'head', 'aria-hidden': 'true' },
        IP.el('span', null, IP.t('cesta.h.item')), IP.el('span', { class: 'n' }, 'DIEESE'), IP.el('span', { class: 'n' }, IP.t('cesta.h.ifood')), IP.el('span', null, IP.t('cesta.vs'))));
      for (const it of r.detalhe) {
        const di = it.dieese_preco_unit_centavos, ifd = it.preco_unit_centavos;
        const dif = di && ifd != null ? ifd / di - 1 : null;
        ul.append(IP.el('li', null,
          IP.el('span', { class: 'nm' }, IP.el('b', null, it.item), IP.el('small', null, it.qtd == null ? '' : IP.t('cesta.perMonth', { qty: IP.fmt.qty(it.qtd) }))),
          IP.el('span', { class: 'n' }, mfmt(di)),
          IP.el('span', { class: 'n' }, mfmt(ifd)),
          diffCell(dif)
        ));
      }
      detail.append(ul,
        IP.el('p', { class: 'hint' }, IP.t('cesta.barHint') + ' ',
          IP.el('a', { href: 'tabelas.html#t-cesta' }, IP.t('cesta.allTable'))));
    }

    function select(uf) {
      state.sel = uf;
      ufSel.value = uf;
      map.select(uf);
      items.forEach((it, k) => {
        it.btn.classList.toggle('sel', k === uf);
        it.btn.classList.toggle('dim', !!uf && k !== uf);
        it.btn.setAttribute('aria-pressed', String(k === uf));
      });
      if (uf) { // rola só a lista, nunca a página
        const li = items.get(uf).li;
        const top = li.offsetTop - list.offsetTop;
        if (top < list.scrollTop || top + li.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = Math.max(0, top - list.clientHeight / 2);
      }
      renderDetail();
    }

    metricSel.addEventListener('change', () => { state.metric = metricSel.value; renderRank(); paint(); });
    ufSel.addEventListener('change', () => select(ufSel.value));

    renderRank();
    paint();
    renderDetail();
    const wanted = (new URLSearchParams(location.search).get('uf') || '').toUpperCase();
    if (wanted && byUf.has(wanted)) select(wanted);
  };
})();
