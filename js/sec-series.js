/* Séries: Cesta Básica DIEESE por capital e IPCA (Chart.js local, vendor/). */
(function () {
  'use strict';
  const IP = window.IP;

  const MAIN_CITIES = ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Belo Horizonte', 'Salvador', 'Porto Alegre'];
  const IPCA_NAMES = { '0': 'ipca.name.0', '11': 'ipca.name.11' };
  const ipcaName = (code) => (IPCA_NAMES[code] ? IP.t(IPCA_NAMES[code]) : IP.t('ipca.item', { code }));

  function cityColor(i) {
    const hue = (i * 137.508 + 8) % 360;
    return IP.theme() === 'dark' ? 'hsl(' + hue.toFixed(0) + ' 78% 66%)' : 'hsl(' + hue.toFixed(0) + ' 70% 42%)';
  }
  function ipcaColor(code) {
    const dark = IP.theme() === 'dark';
    return code === '0' ? (dark ? '#7fb0ff' : '#1f5fd1') : (dark ? '#ff6b4f' : '#c92d19');
  }

  function baseOptions(yFmt, tipFmt) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: IP.reducedMotion.matches ? false : { duration: 650, easing: 'easeOutCubic' },
      interaction: { mode: 'index', intersect: false },
      elements: { point: { radius: 0, hoverRadius: 4, hitRadius: 12 }, line: { borderWidth: 2, tension: 0.25 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          itemSort: (a, b) => (b.parsed.y ?? -Infinity) - (a.parsed.y ?? -Infinity),
          filter: (item) => item.dataIndex != null && item.parsed.y != null,
          callbacks: { label: (ctx) => ' ' + ctx.dataset.label + ': ' + tipFmt(ctx.parsed.y) },
          padding: 10, boxPadding: 4, cornerRadius: 8,
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } },
        y: { grid: {}, ticks: { callback: (v) => yFmt(v) } },
      },
    };
  }

  function themeChart(chart) {
    const muted = IP.cssVar('--chart-text'), line = IP.cssVar('--chart-grid');
    const s = chart.options.scales;
    s.x.ticks.color = muted; s.y.ticks.color = muted;
    s.y.grid.color = line; s.y.border = { display: false };
    s.x.border = { color: line };
    const tip = chart.options.plugins.tooltip;
    tip.backgroundColor = IP.cssVar('--chart-tip-bg');
    tip.titleColor = IP.cssVar('--chart-tip-fg');
    tip.bodyColor = IP.cssVar('--chart-tip-fg');
    tip.borderColor = line;
    tip.borderWidth = 1;
  }

  function checkChip(name, label, checked, color, onChange) {
    const input = IP.el('input', { type: 'checkbox', name, value: label, checked: checked ? true : false });
    const span = IP.el('span', null, label);
    const wrap = IP.el('label', null, input, span);
    wrap.style.setProperty('--c', color);
    input.addEventListener('change', onChange);
    return { wrap, input };
  }

  /* ───────── DIEESE ───────── */
  function dieese(rowsRaw) {
    const canvas = document.getElementById('die-canvas');
    const chipsBox = document.getElementById('die-chips');
    const fromSel = document.getElementById('die-from');
    const foot = document.getElementById('die-foot');

    const periods = [...new Set(rowsRaw.map((r) => r.periodo))].sort();
    const cities = [...new Set(rowsRaw.map((r) => r.cidade))].sort((a, b) => IP.compare(a, b));
    const byCity = new Map(cities.map((c) => [c, new Map()]));
    rowsRaw.forEach((r) => byCity.get(r.cidade).set(r.periodo, r.gasto_mensal));
    const main = MAIN_CITIES.filter((c) => byCity.has(c));

    const years = [...new Set(periods.map((p) => p.slice(0, 4)))];
    years.forEach((y, i) => fromSel.append(IP.el('option', { value: y }, i === 0 ? IP.t('die.allPeriod', { year: y }) : y)));

    const chips = new Map();
    const selected = new Set(main);

    cities.forEach((c, i) => {
      const chip = checkChip('die-city', c, selected.has(c), cityColor(i), () => {
        if (chip.input.checked) selected.add(c); else selected.delete(c);
        draw();
      });
      chips.set(c, chip);
      chipsBox.append(chip.wrap);
    });

    function setSelection(list) {
      selected.clear();
      list.forEach((c) => selected.add(c));
      chips.forEach((chip, c) => { chip.input.checked = selected.has(c); });
      draw();
    }
    document.getElementById('die-main').addEventListener('click', () => setSelection(main));
    document.getElementById('die-all').addEventListener('click', () => setSelection(cities));
    document.getElementById('die-none').addEventListener('click', () => setSelection([]));

    const chart = new Chart(canvas, { type: 'line', data: { labels: [], datasets: [] }, options: baseOptions((v) => IP.fmt.brl0(v), (v) => IP.fmt.brl(v)) });

    function draw() {
      const from = fromSel.value + '-01-01';
      const ps = periods.filter((p) => p >= from);
      chart.data.labels = ps.map(IP.fmt.monthYear);
      chart.data.datasets = cities.filter((c) => selected.has(c)).map((c) => {
        const col = cityColor(cities.indexOf(c));
        const m = byCity.get(c);
        return { label: c, data: ps.map((p) => (m.has(p) ? m.get(p) / 100 : null)), borderColor: col, backgroundColor: col, spanGaps: true };
      });
      themeChart(chart);
      chart.update();

      const last = ps[ps.length - 1];
      const vals = [...selected].map((c) => [c, byCity.get(c).get(last)]).filter(([, v]) => v != null).sort((a, b) => b[1] - a[1]);
      if (!vals.length) {
        foot.textContent = IP.t(selected.size ? 'die.noData' : 'die.noneSelected');
        canvas.setAttribute('aria-label', IP.t('die.canvasNone'));
        return;
      }
      const hi = vals[0], lo = vals[vals.length - 1];
      foot.textContent = IP.t('die.foot', { date: IP.fmt.monthYear(last), hiCity: hi[0], hiPrice: IP.fmt.money(hi[1]), loCity: lo[0], loPrice: IP.fmt.money(lo[1]) });
      canvas.setAttribute('aria-label', IP.t('die.canvas', { from: IP.fmt.monthYear(ps[0]), to: IP.fmt.monthYear(last), count: vals.length, hiCity: hi[0], hiPrice: IP.fmt.money(hi[1]), loCity: lo[0], loPrice: IP.fmt.money(lo[1]) }));
    }

    fromSel.addEventListener('change', draw);
    IP.onTheme(() => {
      cities.forEach((c, i) => chips.get(c).wrap.style.setProperty('--c', cityColor(i)));
      draw();
    });
    draw();
  }

  /* ───────── IPCA ───────── */
  function ipca(rowsRaw) {
    const canvas = document.getElementById('ipca-canvas');
    const chipsBox = document.getElementById('ipca-chips');
    const foot = document.getElementById('ipca-foot');

    const periods = [...new Set(rowsRaw.map((r) => r.periodo))].sort();
    const codes = [...new Set(rowsRaw.map((r) => r.item_codigo))].sort((a, b) => Number(a) - Number(b));
    const byCode = new Map(codes.map((c) => [c, new Map()]));
    rowsRaw.forEach((r) => byCode.get(r.item_codigo).set(r.periodo, r.variacao_mensal));
    const selected = new Set(codes);
    let mode = 'mensal';

    const chips = new Map();
    codes.forEach((code) => {
      const chip = checkChip('ipca-series', ipcaName(code), true, ipcaColor(code), () => {
        if (chip.input.checked) selected.add(code); else selected.delete(code);
        draw();
      });
      chips.set(code, chip);
      chipsBox.append(chip.wrap);
    });

    const pctFmt = (v) => IP.fmt.dec2(v) + '%';
    const chart = new Chart(canvas, { type: 'line', data: { labels: [], datasets: [] }, options: baseOptions((v) => IP.fmt.dec1(v) + '%', pctFmt) });

    const monthKey = (n) => Math.floor(n / 12) + '-' + String((n % 12) + 1).padStart(2, '0') + '-01';
    const monthNum = (p) => { const [y, mo] = p.split('-').map(Number); return y * 12 + mo - 1; };

    function accumulate12(m) {
      return periods.map((p) => {
        const end = monthNum(p);
        let acc = 1;
        for (let n = end - 11; n <= end; n++) {
          const v = m.get(monthKey(n));
          if (v == null) return null;
          acc *= 1 + v / 100;
        }
        return Math.round((acc - 1) * 10000) / 100;
      });
    }

    function draw() {
      chart.data.labels = periods.map(IP.fmt.monthYear);
      chart.data.datasets = codes.filter((c) => selected.has(c)).map((code) => {
        const m = byCode.get(code), col = ipcaColor(code);
        const data = mode === 'mensal' ? periods.map((p) => (m.has(p) ? m.get(p) : null)) : accumulate12(m);
        return { label: ipcaName(code), data, borderColor: col, backgroundColor: col, spanGaps: true };
      });
      themeChart(chart);
      chart.update();

      const parts = chart.data.datasets.map((ds) => {
        let i = ds.data.length - 1;
        while (i >= 0 && ds.data[i] == null) i--;
        return i < 0 ? null : IP.t('ipca.point', { label: ds.label, value: pctFmt(ds.data[i]), date: chart.data.labels[i] });
      }).filter(Boolean);
      const modeTxt = IP.t(mode === 'mensal' ? 'ipca.mode.monthly' : 'ipca.mode.yearly');
      foot.textContent = (parts.length ? IP.t('ipca.last', { mode: modeTxt, parts: parts.join('; ') }) + ' ' : IP.t('ipca.none') + ' ') + IP.t('ipca.source');
      canvas.setAttribute('aria-label', IP.t('ipca.canvas', { mode: modeTxt }) + (parts.length ? '. ' + parts.join('; ') : ''));
    }

    document.querySelectorAll('input[name="ipca-mode"]').forEach((inp) =>
      inp.addEventListener('change', () => { if (inp.checked) { mode = inp.value; draw(); } })
    );
    IP.onTheme(() => {
      codes.forEach((c) => chips.get(c).wrap.style.setProperty('--c', ipcaColor(c)));
      draw();
    });
    draw();
  }

  IP.sections.series = function (d) {
    const dieBox = document.getElementById('die-chips');
    const ipcaBox = document.getElementById('ipca-chips');
    if (typeof Chart === 'undefined') {
      IP.showError(dieBox, IP.t('series.chartError'));
      IP.showError(ipcaBox, IP.t('series.chartError'));
      return;
    }
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.font.size = 12;

    if (d.dieese && d.dieese.length) dieese(d.dieese);
    else if (d.dieese) IP.showError(dieBox, IP.t('series.emptyFile', { file: 'series_dieese.json' }));
    else IP.emptyFile(dieBox, 'series_dieese.json');

    if (d.ipca && d.ipca.length) ipca(d.ipca);
    else if (d.ipca) IP.showError(ipcaBox, IP.t('series.emptyFile', { file: 'series_ipca.json' }));
    else IP.emptyFile(ipcaBox, 'series_ipca.json');
  };
})();
