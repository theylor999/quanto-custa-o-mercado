/* Utilitários compartilhados. Scripts clássicos (sem módulos ES) para funcionar
   em qualquer servidor estático, inclusive com tipos MIME imprecisos. */
(function () {
  'use strict';

  const IP = (window.IP = { data: {}, sections: {}, themeListeners: [] });

  IP.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const nfInt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
  const nfBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const nfDec1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const nfDec2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  IP.fmt = {
    int: (n) => nfInt.format(n),
    money: (centavos) => nfBRL.format(centavos / 100),
    brl: (reais) => nfBRL.format(reais),
    dec1: (n) => nfDec1.format(n),
    dec2: (n) => nfDec2.format(n),
    pct: (frac) => nfDec1.format(frac * 100) + '%',
    /* Variação com sinal: 10,2 -> "+10,2%"; -6,6 -> "−6,6%" (menos tipográfico) */
    signed: (p, digits) => {
      const n = digits === 0 ? nfInt.format(Math.abs(p)) : nfDec1.format(Math.abs(p));
      if (Number(n.replace(',', '.')) === 0) return '0%';
      return (p < 0 ? '\u2212' : '+') + n + '%';
    },
    /* Índice com 100 = mediana -> variação contra a mediana (110,2 -> "+10,2%") */
    idxPct: (ix) => IP.fmt.signed(ix - 100),
    /* Razão iFood ÷ DIEESE -> diferença (1,23 -> "+23,0%") */
    ratioPct: (r, digits) => IP.fmt.signed((r - 1) * 100, digits),
    date: (iso) => {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return String(iso);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    },
    monthYear: (iso) => {
      // 'AAAA-MM-DD' lido como data local, sem deslocamento de fuso
      const [y, m] = iso.split('-').map(Number);
      return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', '');
    },
  };

  /* Preço de pacote (capitais.json): arroz, leite e café. Valor principal = pacote; linha pequena = valor por unidade e nº de produtos.
     Devolve { nome, label, price, main, small, empty }. price = preço do pacote (centavos) ou null. */
  const nProd = (n) => (n == null ? null : n + (n === 1 ? ' produto' : ' produtos'));
  IP.pack = function (r, kind) {
    const money = IP.fmt.money;
    let nome, pkg = null, label = '', unit = null, unitTxt = '', n;
    if (kind === 'arroz') {
      nome = 'Arroz'; n = r.n_arroz; unit = r.preco_arroz_kg; unitTxt = '/kg';
      if (r.arroz_5kg != null) { pkg = r.arroz_5kg; label = 'pacote ' + (r.arroz_pacote_kg || 5) + ' kg'; }
    } else if (kind === 'leite') {
      nome = 'Leite'; n = r.n_leite; unit = r.preco_leite_l; unitTxt = '/L';
      if (r.leite_1l != null) { pkg = r.leite_1l; label = '1 L'; }
    } else {
      nome = 'Café'; n = r.n_cafe; unit = r.preco_cafe_kg; unitTxt = '/kg';
      if (r.cafe_500g != null) { pkg = r.cafe_500g; label = 'pacote 500 g'; }
      else if (r.cafe_250g != null) { pkg = r.cafe_250g; label = 'pacote 250 g'; }
    }
    const sample = n != null && n < 5 ? ' (amostra pequena)' : '';
    const out = { nome, price: pkg, shown: pkg != null ? pkg : unit, empty: false };
    if (pkg != null) {
      out.label = nome + ' · ' + label;
      out.main = out.label + ': ' + money(pkg);
      const parts = [];
      // o leite de 1 L já é o valor por litro: não repete
      if (unit != null && kind !== 'leite') parts.push(money(unit) + unitTxt);
      if (nProd(n)) parts.push(nProd(n));
      out.small = parts.length ? parts.join(' · ') + sample : null;
    } else if (unit != null) {
      out.label = nome + ' · por ' + (unitTxt === '/L' ? 'litro' : 'kg');
      out.main = out.label + ': ' + money(unit);
      out.small = (nProd(n) ? nProd(n) : '') + sample || null;
    } else {
      out.empty = true; out.label = nome; out.main = nome + ': sem dados suficientes'; out.small = null;
    }
    out.pkgLabel = label;
    out.unitLine = pkg != null && unit != null && kind !== 'leite' ? money(unit) + unitTxt : null;
    return out;
  };

  /** Cria um elemento: IP.el('div', {class:'x', 'aria-label':'y'}, 'texto', outroNo) */
  IP.el = function (tag, attrs, ...children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === false || v == null) continue;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      node.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return node;
  };

  IP.norm = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  IP.cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  IP.theme = () => document.documentElement.getAttribute('data-theme');
  IP.onTheme = (fn) => IP.themeListeners.push(fn);

  IP.fetchJSON = async function (url) {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(url + ': HTTP ' + r.status);
    return r.json();
  };

  IP.clear = (node) => { while (node.firstChild) node.removeChild(node.firstChild); return node; };

  IP.showError = function (container, msg) {
    IP.clear(container).append(IP.el('p', { class: 'error', role: 'alert' }, msg));
  };
  IP.showEmpty = function (container, msg) {
    IP.clear(container).append(IP.el('p', { class: 'empty' }, msg));
  };

  /* Arquivo ausente do export: mensagem de estado vazio, com os avisos de _meta.json que citam o arquivo. */
  IP.emptyFile = function (container, file, extra) {
    const meta = IP.data.meta;
    const avisos = meta && Array.isArray(meta.avisos) ? meta.avisos.filter((a) => String(a).includes(file.replace('.json', ''))) : [];
    IP.clear(container).append(IP.el('div', { class: 'empty' },
      IP.el('p', { style: 'margin:0 0 .35rem' }, IP.el('b', null, 'Sem dados neste export. '), IP.el('code', null, file), ' não está disponível.' + (extra ? ' ' + extra : '')),
      IP.el('p', { style: 'margin:0' }, 'Gere o export de uma coleta completa no pipeline de dados (fora deste repositório) e recarregue a página.'),
      avisos.length ? IP.el('ul', null, avisos.map((a) => IP.el('li', null, a))) : null
    ));
  };

  /* Capital DIEESE -> UF (Macaé fica de fora: não é capital) */
  IP.CAPITAL_UF = {
    'Aracaju': 'SE', 'Belém': 'PA', 'Belo Horizonte': 'MG', 'Boa Vista': 'RR', 'Brasília': 'DF', 'Campo Grande': 'MS',
    'Cuiabá': 'MT', 'Curitiba': 'PR', 'Florianópolis': 'SC', 'Fortaleza': 'CE', 'Goiânia': 'GO', 'João Pessoa': 'PB',
    'Macapá': 'AP', 'Maceió': 'AL', 'Manaus': 'AM', 'Natal': 'RN', 'Palmas': 'TO', 'Porto Alegre': 'RS',
    'Porto Velho': 'RO', 'Recife': 'PE', 'Rio Branco': 'AC', 'Rio de Janeiro': 'RJ', 'Salvador': 'BA',
    'São Luís': 'MA', 'São Paulo': 'SP', 'Teresina': 'PI', 'Vitória': 'ES',
  };

  /* Rampa sequencial colorida dos mapas (índigo → ciano → verde → âmbar → rosa). t em [0,1].
     Devolve a cor e a cor de texto com melhor contraste sobre ela. */
  const RAMP = ['#4f46e5', '#06b6d4', '#22c55e', '#f59e0b', '#f43f5e'].map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
  IP.RAMP_CSS = 'linear-gradient(90deg, ' + ['#4f46e5', '#06b6d4', '#22c55e', '#f59e0b', '#f43f5e'].join(', ') + ')';
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  IP.ramp = function (t) {
    const x = Math.min(1, Math.max(0, t)) * (RAMP.length - 1);
    const i = Math.min(RAMP.length - 2, Math.floor(x)), f = x - i;
    const rgb = RAMP[i].map((v, k) => Math.round(v + (RAMP[i + 1][k] - v) * f));
    const L = 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
    // contraste com branco (1.05 / (L+.05)) contra preto ((L+.05)/.05)
    const darkText = (L + 0.05) / 0.05 > 1.05 / (L + 0.05);
    return { css: 'rgb(' + rgb.join(',') + ')', darkText };
  };

  /* Ordenação com locale pt-BR; nulos sempre no fim. */
  const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });
  IP.compare = function (a, b, dir) {
    const an = a == null, bn = b == null;
    if (an || bn) return an && bn ? 0 : an ? 1 : -1;
    const r = typeof a === 'number' && typeof b === 'number' ? a - b : collator.compare(String(a), String(b));
    return dir === 'desc' ? -r : r;
  };

  /* ───── Tooltip único, usado por mapa e corredores ───── */
  const tip = {
    node: null,
    fill(title, rows) {
      const n = tip.node || (tip.node = document.getElementById('tip'));
      IP.clear(n);
      n.append(IP.el('b', null, title));
      for (const [k, v] of rows) n.append(IP.el('div', { class: 'row' }, IP.el('span', null, k), IP.el('span', null, v)));
      n.hidden = false;
      return n;
    },
    place(n, x, y) {
      const pad = 12, r = n.getBoundingClientRect();
      let left = x + 14, top = y + 16;
      if (left + r.width > window.innerWidth - pad) left = x - r.width - 14;
      if (left < pad) left = pad;
      if (top + r.height > window.innerHeight - pad) top = y - r.height - 14;
      if (top < pad) top = pad;
      n.style.left = left + 'px';
      n.style.top = top + 'px';
      requestAnimationFrame(() => n.classList.add('on'));
    },
    showAt(title, rows, x, y) { tip.place(tip.fill(title, rows), x, y); },
    showFor(title, rows, el) {
      const r = el.getBoundingClientRect();
      tip.place(tip.fill(title, rows), r.left + r.width / 2, r.top + r.height / 2);
    },
    hide() {
      const n = tip.node || (tip.node = document.getElementById('tip'));
      n.classList.remove('on');
      n.hidden = true;
    },
  };
  IP.tip = tip;
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') tip.hide(); });
})();
