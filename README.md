**Português** · [English](README.en.md)

# Preços de supermercado no iFood, nas capitais do Brasil

Projeto pessoal de ciência de dados de [Theylor Machado](https://theylor.vercel.app). Ele compara preços de supermercados publicados no site do iFood nas 27 capitais brasileiras. A coleta mais recente, de 6 de outubro de 2026, tem 161.220 preços de 1.179 lojas, em 20 corredores. Este repositório tem só o site, estático, que lê os JSON exportados em `data/`.

![Página inicial](docs/screenshots/home-dark-1366.png)

## Páginas

| Página | O que tem |
|---|---|
| `index.html` (Início) | A pergunta do projeto, os números gerais e cinco destaques em linguagem simples |
| `estados.html` | Mapa de preços por UF nos mesmos itens e a cesta do iFood contra a do DIEESE, estado a estado |
| `capitais.html` | Uma capital por vez: população, lojas, preço de pacote de arroz, leite e café |
| `produtos.html` | Itens do dia a dia, corredores, produtos mais comuns e variação de preço entre lojas |
| `tabelas.html` | Todas as tabelas, com busca e ordenação |
| `series.html` | Cesta Básica do DIEESE por capital e IPCA ao longo do tempo |
| `graficos.html` | Galeria dos gráficos do notebook de análise |
| `sobre.html` | Metodologia, ressalvas, fontes e autor |

Outras capturas: [estados](docs/screenshots/estados-dark.png), [tabelas](docs/screenshots/tabelas-dark.png), [tema claro](docs/screenshots/home-light.png) e [celular](docs/screenshots/home-mobile-375.png).

## Destaques

Todas as comparações usam os mesmos itens em cada lugar.

- **Estados:** comprando os mesmos produtos, Mato Grosso sai 10% mais caro que a mediana do país e Sergipe, 7% mais barato.
- **Redes:** no leite, o Atacadão fica 14,4% abaixo da mediana da própria UF (12 lojas comparadas).
- **Cesta básica:** montada com o produto mais barato do iFood, a cesta sai em mediana 6% abaixo da pesquisa do DIEESE; em 6 dos 21 estados comparados ela sai acima.
- **Itens do dia a dia:** o leite integral Piracanjuba de 1 L custa normalmente entre R$ 6,03 e R$ 11,10, com mediana de R$ 7,98, em 109 lojas.

Esses números saem dos JSON em `data/` e mudam quando os dados mudam.

## Como rodar

O site é estático e não tem build. Ele usa `fetch` para ler os JSON, então precisa de um servidor HTTP; abrir o arquivo direto (`file://`) não funciona.

```bash
python -m http.server 8321    # ou: npx serve .
```

Abra `http://localhost:8321` no navegador.

## Idiomas / Languages

O site tem versões em português (pt-BR) e inglês. O botão **PT · EN** no cabeçalho troca o idioma; a página recarrega já no idioma escolhido, na mesma posição. / The site comes in Brazilian Portuguese and English. The **PT · EN** button in the header switches the language and reloads the page at the same scroll position.

- **Qual idioma abre.** Vale o primeiro que existir: `?lang=pt` ou `?lang=en` na URL (a escolha também fica salva), a escolha salva em `localStorage` (`ifood-precos:lang`), ou o idioma do navegador (começa com `pt` → português; qualquer outro → inglês). A tag `<html lang>` vira `pt-BR` ou `en`.
- **Formatos.** Número, data e porcentagem seguem o idioma. A moeda é sempre o real: `R$ 7,98` em português e `R$7.98` em inglês.
- **Onde ficam os textos.** Todos os textos estão em `js/i18n.js`, nos objetos `pt` e `en`, com as mesmas chaves (`pagina.secao.nome`).
- **Texto fixo do HTML.** `data-i18n="chave"` troca o texto do elemento; `data-i18n-html="chave"` troca o HTML interno (links, `<strong>`); `data-i18n-attr="aria-label:chave,placeholder:outra"` troca atributos. O texto em português fica no HTML como reserva. `<title>` e a meta descrição usam `<pagina>.title` e `<pagina>.meta`.
- **Texto montado em `js/sec-*.js`.** Use `IP.t('chave', { nome: valor })`, que troca `{nome}` no texto. Com `count`, escolhe `chave.one` (1) ou `chave.other` e mostra o número em `{count}`. `IP.tn` aceita nós DOM nas variáveis. Chave que falta aparece no console como `[i18n] missing key` e na tela como `⟦chave⟧`.
- **Dados não são traduzidos.** Nomes de produto, corredor, rede, item do DIEESE, UF e cidade ficam como vêm dos JSON. As exceções são a regra de limpeza (`_meta.json`, `limpeza.regra`) e dois formatos de aviso de `avisos`, que têm tradução em inglês quando o texto é o conhecido; qualquer outro aparece como veio no arquivo. Se a regra mudar no pipeline, atualize a chave `meta.limpeza.regra`.
- **Imagens.** Os gráficos em `img/` saem do notebook com texto em português e não são traduzidos.
- **Como adicionar um texto.** Crie a chave nos dois objetos de `js/i18n.js`, use-a no HTML ou em `IP.t`, e abra a página nos dois idiomas.

## De onde vêm os dados

Um pipeline separado, que não está neste repositório, coleta os preços (Python, PostgreSQL e Jupyter). Ele lê preços públicos do site do iFood, sem login, a cerca de 1 requisição por segundo. Depois remove preços extremos pela regra do MAD (desvio absoluto mediano) e exporta os arquivos abaixo. Este site só lê o resultado.

| Arquivo em `data/` | O que tem |
|---|---|
| `_meta.json` | Data do export, lista de arquivos, avisos e resumo da limpeza de preços |
| `kpis.json` | Totais do projeto: lojas, preços, data da última coleta |
| `por_uf.json` | Lojas, preços coletados, preço médio bruto, população e PIB per capita por UF |
| `indice_uf.json` | Preço dos mesmos itens em cada UF contra a mediana do país (100 = mediana) |
| `capitais.json` | Uma linha por capital: população, lojas, cestas e preços de pacote de arroz, leite e café |
| `cesta_estado.json` | Cesta do iFood contra a do DIEESE por UF, item a item |
| `corredores.json` | Número de produtos, preço médio e desvio padrão por corredor |
| `produtos_mais_comuns.json` | Os 50 produtos presentes em mais lojas, com preço médio, mínimo e máximo |
| `cotidiano.json` | Itens do dia a dia de marca conhecida, com mediana e faixa típica (percentis 10 e 90) |
| `dispersao_por_produto.json` | Variação do preço do mesmo produto entre lojas |
| `redes.json` | Preço de cada rede contra a mediana da UF, nos mesmos itens |
| `series_dieese.json` | Gasto mensal com a Cesta Básica do DIEESE por capital |
| `series_ipca.json` | IPCA mensal do Brasil (índice geral e alimentação no domicílio) |

Valores em dinheiro nesses arquivos estão em centavos.

## Metodologia e ressalvas

- **Mesmos itens.** Estados, redes e capitais só são comparados em produtos iguais ou parecidos. A média bruta depende do que cada lugar vende e aparece só como referência.
- **Itens casados com o DIEESE.** Cada item da cesta do DIEESE é ligado a um produto do iFood pelo nome, usando o mais barato por quilo ou litro. É ordem de grandeza, não índice oficial, e estados com poucos itens casados ficam de fora.
- **Itens por peso.** Produto vendido por peso mostra o preço de uma quantidade mínima, não de 1 kg. Os preços por quilo ou litro usados nas comparações são convertidos no pipeline.
- **Uma foto, só capitais.** Cada coleta é a foto de um dia, só das capitais e só do que o iFood lista e entrega nos pontos escolhidos. Preço de aplicativo pode ter margem e promoção e diferir do preço da prateleira.
- **Redes.** A API quase não informa a rede, então ela é deduzida do nome da loja.

Mais detalhes na página `sobre.html`.

## Estrutura de pastas

```
index.html ... sobre.html   as oito páginas
css/        estilos
js/         scripts de cada página (JS puro, sem módulos); i18n.js tem os textos pt e en
vendor/     Chart.js 4.5.1 (local)
fonts/      Space Grotesk e Inter (local)
geo/        malha simplificada das UFs para o mapa
data/       JSON exportados pelo pipeline
img/        foto do autor e gráficos do notebook
docs/       capturas de tela
```

## Tecnologias

HTML, CSS e JavaScript puro, sem build. Gráficos em Chart.js 4.5.1 e mapa em SVG. Fontes, bibliotecas e mapa são arquivos locais: o site não faz requisições a servidores externos.

## Fontes e licenças de terceiros

- [IBGE SIDRA](https://sidra.ibge.gov.br/): população (Censo 2022), IPCA, PIB dos municípios e rendimento.
- [DIEESE](https://www.dieese.org.br/cesta/): Pesquisa Nacional da Cesta Básica de Alimentos.
- [kelvins/municipios-brasileiros](https://github.com/kelvins/municipios-brasileiros): código IBGE, nome, UF e coordenadas dos municípios.
- Malha das UFs: IBGE, simplificada para o mapa.
- [Chart.js](https://www.chartjs.org/) 4.5.1, licença MIT (`vendor/chart.js.LICENSE.md`).
- [Space Grotesk](https://github.com/floriankarsten/space-grotesk) e [Inter](https://github.com/rsms/inter), licença SIL OFL 1.1 (`fonts/*.LICENSE.txt`).

## Autor

**Theylor Machado**, Cientista de Dados | Previsão de Demanda e Séries Temporais.

- Portfólio: [theylor.vercel.app](https://theylor.vercel.app)
- GitHub: [theylor999](https://github.com/theylor999)
- LinkedIn: [theylor921](https://www.linkedin.com/in/theylor921)

## Aviso

Projeto pessoal e sem fins comerciais. Não tem vínculo com o iFood.
