/* Galeria dos gráficos gerados pelo notebook (img/*.png). */
(function () {
  'use strict';
  const IP = window.IP;

  const SHOTS = [
    ['01_preco_medio_por_uf', 'Preço médio por UF', 'Panorama', 'Média bruta dos itens em cada UF; reflete o mix.'],
    ['01_lojas_por_uf', 'Lojas por UF', 'Panorama', 'Onde a coleta tem mais lojas com catálogo.'],
    ['01_produtos_por_corredor', 'Produtos por corredor', 'Panorama', 'Tamanho de cada corredor no catálogo coletado.'],
    ['02_dispersao_top30_produto', 'Dispersão dos 30 produtos mais comuns', 'Dispersão', 'Coeficiente de variação do preço do mesmo produto entre lojas.'],
    ['03_redes_preco_medio_e_indice', 'Redes: preço médio e preço relativo', 'Redes', 'Preço médio bruto (cestas diferentes) ao lado do preço dos mesmos itens contra a mediana da UF.'],
    ['03_redes_distribuicao_indice', 'Redes: distribuição do índice', 'Redes', 'Preço da loja ÷ mediana do produto na UF, loja a loja, em cada rede.'],
    ['04_corredores_media_mediana', 'Corredores: média e mediana', 'Corredores', 'Nos 15 maiores corredores. Média acima da mediana indica itens caros puxando a média.'],
    ['05_basicos_por_uf', 'Itens básicos por UF', 'Referências', 'Preço de arroz, feijão, leite, café e óleo por UF, com cor relativa à mediana das UFs.'],
    ['05_cesta_dieese_vs_ifood', 'Cesta DIEESE × iFood', 'Referências', 'Cesta mensal do DIEESE contra a aproximação com produtos coletados, por capital.'],
    ['05_indice_preco_vs_pib', 'Índice de preço × PIB per capita', 'Referências', 'Índice de preço dos mesmos itens por UF contra o PIB per capita da capital.'],
    ['06_mapa_preco_uf', 'Mapa: preço médio e índice por UF', 'Mapa', 'Preço médio bruto ao lado do índice de preço dos mesmos itens.'],
  ];

  IP.sections.analises = function () {
    const box = document.getElementById('gallery');
    SHOTS.forEach(([file, title, group, desc], i) => {
      const src = 'img/' + file + '.png';
      const img = IP.el('img', { src, alt: title + '. ' + desc, loading: 'lazy', decoding: 'async' });
      box.append(IP.el('figure', { class: 'shot spotlight reveal', style: '--reveal-delay:' + Math.min((i % 3) * 80, 240) + 'ms' },
        IP.el('a', { href: src, target: '_blank', rel: 'noopener', 'aria-label': 'Abrir ' + title + ' em tamanho original' }, img),
        IP.el('figcaption', null, IP.el('b', null, title), IP.el('span', null, group + ' · ' + desc))
      ));
    });
    IP.observeReveal(box);
  };
})();
