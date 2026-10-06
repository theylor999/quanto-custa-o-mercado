/* Início: números do projeto (kpis.json + tamanho de capitais.json e corredores.json) com contagem animada. */
(function () {
  'use strict';
  const IP = window.IP;

  IP.sections.hero = function (d) {
    const meta = document.getElementById('hero-meta');
    const kpis = d.kpis;
    if (!kpis) {
      document.querySelectorAll('[data-kpi-text]').forEach((n) => { n.textContent = 'n/d'; });
      document.querySelectorAll('[data-kpi]').forEach((n) => { n.textContent = 'n/d'; });
      meta.textContent = 'Não foi possível carregar kpis.json.';
      return;
    }

    // Capitais e corredores vêm do tamanho dos arquivos exportados; sem eles, cai para o que kpis.json tiver.
    const facts = Object.assign({}, kpis, {
      capitais: Array.isArray(d.capitais) && d.capitais.length ? d.capitais.length : (kpis.municipios_com_loja > 0 ? kpis.municipios_com_loja : null),
      corredores: Array.isArray(d.corredores) && d.corredores.length ? d.corredores.length : null,
    });

    document.querySelectorAll('[data-kpi-text]').forEach((n) => {
      const v = facts[n.dataset.kpiText];
      n.textContent = v == null ? 'n/d' : IP.fmt.int(v);
    });

    document.querySelectorAll('[data-kpi]').forEach((n) => {
      const v = facts[n.dataset.kpi];
      if (v == null) { n.textContent = 'n/d'; return; }
      IP.countUp(n, v, IP.fmt.int);
    });

    const parts = [];
    if (kpis.data_ultima_coleta) parts.push('Última coleta: ' + IP.fmt.date(kpis.data_ultima_coleta));
    meta.textContent = parts.join(' · ');
  };
})();
