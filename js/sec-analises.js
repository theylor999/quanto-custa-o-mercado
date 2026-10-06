/* Galeria dos gráficos gerados pelo notebook (img/*.png). Título e descrição de cada um: chaves gal.<arquivo>.* em js/i18n.js.
   As imagens em si têm o texto em português (saem prontas do notebook). */
(function () {
  'use strict';
  const IP = window.IP;

  const SHOTS = [
    ['01_preco_medio_por_uf', 'panorama'],
    ['01_lojas_por_uf', 'panorama'],
    ['01_produtos_por_corredor', 'panorama'],
    ['02_dispersao_top30_produto', 'dispersao'],
    ['03_redes_preco_medio_e_indice', 'redes'],
    ['03_redes_distribuicao_indice', 'redes'],
    ['04_corredores_media_mediana', 'corredores'],
    ['05_basicos_por_uf', 'referencias'],
    ['05_cesta_dieese_vs_ifood', 'referencias'],
    ['05_indice_preco_vs_pib', 'referencias'],
    ['06_mapa_preco_uf', 'mapa'],
  ];

  IP.sections.analises = function () {
    const box = document.getElementById('gallery');
    SHOTS.forEach(([file, group], i) => {
      const title = IP.t('gal.' + file + '.title');
      const desc = IP.t('gal.' + file + '.desc');
      const src = 'img/' + file + '.png';
      const img = IP.el('img', { src, alt: title + '. ' + desc, loading: 'lazy', decoding: 'async' });
      box.append(IP.el('figure', { class: 'shot spotlight reveal', style: '--reveal-delay:' + Math.min((i % 3) * 80, 240) + 'ms' },
        IP.el('a', { href: src, target: '_blank', rel: 'noopener', 'aria-label': IP.t('gal.open', { title }) }, img),
        IP.el('figcaption', null, IP.el('b', null, title), IP.el('span', null, IP.t('gal.group.' + group) + ' · ' + desc))
      ));
    });
    IP.observeReveal(box);
  };
})();
