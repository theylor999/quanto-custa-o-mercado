(function () {
  const dados = window.DADOS;
  const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const reais = (centavos) => moeda.format(centavos / 100);
  const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const rotuloMes = (periodo) => {
    const [ano, mes] = periodo.split("-");
    return MESES[Number(mes) - 1] + "/" + ano;
  };
  const dataBr = (iso) => iso.split("-").reverse().join("/");

  const guardar = (chave, valor) => {
    try { localStorage.setItem(chave, valor); } catch (e) { return; }
  };
  const ler = (chave) => {
    try { return localStorage.getItem(chave); } catch (e) { return null; }
  };

  const raiz = document.documentElement;
  const TAMANHOS = ["normal", "grande", "enorme"];

  function aplicarTamanho(nome) {
    raiz.dataset.tamanho = nome;
    guardar("guia:tamanho", nome);
    document.getElementById("menos").disabled = nome === TAMANHOS[0];
    document.getElementById("mais").disabled = nome === TAMANHOS[TAMANHOS.length - 1];
  }

  function aplicarContraste(ligado) {
    if (ligado) raiz.dataset.contraste = "alto";
    else delete raiz.dataset.contraste;
    document.getElementById("contraste").setAttribute("aria-pressed", String(ligado));
    guardar("guia:contraste", ligado ? "alto" : "normal");
  }

  function iniciarAjustes() {
    const salvo = ler("guia:tamanho");
    aplicarTamanho(TAMANHOS.includes(salvo) ? salvo : "normal");
    aplicarContraste(ler("guia:contraste") === "alto");

    document.getElementById("menos").addEventListener("click", () => {
      const i = TAMANHOS.indexOf(raiz.dataset.tamanho);
      aplicarTamanho(TAMANHOS[Math.max(0, i - 1)]);
    });
    document.getElementById("mais").addEventListener("click", () => {
      const i = TAMANHOS.indexOf(raiz.dataset.tamanho);
      aplicarTamanho(TAMANHOS[Math.min(TAMANHOS.length - 1, i + 1)]);
    });
    document.getElementById("contraste").addEventListener("click", () => {
      aplicarContraste(raiz.dataset.contraste !== "alto");
    });
    document.getElementById("imprimir").addEventListener("click", () => window.print());
  }

  function desenharCesta() {
    const serie = dados.dieese;
    const ultimo = serie[serie.length - 1];
    const anterior = serie[0];
    document.getElementById("cesta-mes").textContent = rotuloMes(ultimo.periodo);
    document.getElementById("cesta-valor").textContent = reais(ultimo.centavos);

    const diferenca = ultimo.centavos - anterior.centavos;
    const percentual = Math.abs((diferenca / anterior.centavos) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
    const sentido = diferenca > 0 ? "subiu" : diferenca < 0 ? "caiu" : "ficou igual";
    const detalhe = diferenca === 0
      ? "O valor ficou igual ao de " + rotuloMes(anterior.periodo) + "."
      : "Em " + rotuloMes(anterior.periodo) + " era " + reais(anterior.centavos) + ". O valor " + sentido + " " + percentual + "% em 12 meses.";
    document.getElementById("cesta-variacao").textContent = detalhe;

    const maior = Math.max(...serie.map((p) => p.centavos));
    const lista = document.getElementById("cesta-barras");
    lista.replaceChildren(
      ...serie.map((ponto, i) => {
        const li = document.createElement("li");
        if (i === serie.length - 1) li.className = "atual";
        const mes = document.createElement("span");
        mes.className = "mes";
        mes.textContent = rotuloMes(ponto.periodo);
        const trilho = document.createElement("span");
        trilho.className = "trilho";
        const cheio = document.createElement("span");
        cheio.className = "preenchido";
        cheio.style.width = (ponto.centavos / maior) * 100 + "%";
        const valor = document.createElement("span");
        valor.className = "valor";
        valor.textContent = reais(ponto.centavos);
        trilho.append(cheio, valor);
        li.append(mes, trilho);
        return li;
      })
    );
  }

  function desenharReferencias() {
    const lista = document.getElementById("ref-pa");
    lista.replaceChildren(
      ...dados.portoAlegre.referencias.map((item) => {
        const li = document.createElement("li");
        const nome = document.createElement("span");
        nome.textContent = item.nome;
        const preco = document.createElement("span");
        preco.className = "preco";
        preco.textContent = reais(item.centavos);
        const nota = document.createElement("small");
        nota.textContent = "Preço de referência, com base em " + item.produtos + " produtos encontrados no iFood.";
        li.append(nome, preco, nota);
        return li;
      })
    );

    const corpo = document.querySelector("#tabela-itens tbody");
    corpo.replaceChildren(
      ...dados.itens.map((item) => {
        const tr = document.createElement("tr");
        const celulas = [item.id, reais(item.mediana), reais(item.p10) + " a " + reais(item.p90), String(item.lojas)];
        celulas.forEach((texto) => {
          const td = document.createElement("td");
          td.textContent = texto;
          tr.append(td);
        });
        return tr;
      })
    );
    document.getElementById("coleta").textContent = dataBr(dados.coleta);
  }

  function lerPreco(texto) {
    const limpo = texto.replace(/R\$/gi, "").replace(/\s/g, "");
    if (!/^\d{1,4}([.,]\d{1,2})?$/.test(limpo)) return null;
    const numero = Number(limpo.replace(",", "."));
    if (!(numero > 0)) return null;
    return Math.round(numero * 100);
  }

  function mostrar(classe, titulo, linhas) {
    const caixa = document.getElementById("resultado");
    caixa.hidden = false;
    caixa.className = "resultado " + classe;
    const veredito = document.createElement("p");
    veredito.className = "veredito";
    veredito.textContent = titulo;
    caixa.replaceChildren(veredito, ...linhas.map((texto) => {
      const p = document.createElement("p");
      p.textContent = texto;
      return p;
    }));
  }

  function iniciarComparador() {
    const seletor = document.getElementById("produto");
    seletor.replaceChildren(
      ...dados.itens.map((item, i) => {
        const opcao = document.createElement("option");
        opcao.value = String(i);
        opcao.textContent = item.id;
        return opcao;
      })
    );

    document.getElementById("form-comparar").addEventListener("submit", (evento) => {
      evento.preventDefault();
      const item = dados.itens[Number(seletor.value)];
      const campo = document.getElementById("preco");
      const centavos = lerPreco(campo.value);

      if (centavos === null) {
        mostrar("erro", "Não entendi o preço", ["Digite só o valor, com números. Exemplo: 7,50."]);
        campo.focus();
        return;
      }

      const faixa = "Faixa comum para " + item.id + ": de " + reais(item.p10) + " a " + reais(item.p90) + ". O preço do meio é " + reais(item.mediana) + ".";
      const contexto = "Entre as " + item.lojas + " lojas pesquisadas, o preço mais baixo foi " + reais(item.min) + " e o mais alto foi " + reais(item.max) + ".";

      if (centavos < item.p10) {
        mostrar("baixo", "Preço BAIXO", ["Você viu " + reais(centavos) + ". Está abaixo da faixa comum.", faixa, contexto]);
      } else if (centavos > item.p90) {
        mostrar("alto", "Preço ALTO", ["Você viu " + reais(centavos) + ". Está acima da faixa comum. Vale olhar outra loja.", faixa, contexto]);
      } else {
        mostrar("comum", "Preço COMUM", ["Você viu " + reais(centavos) + ". Está dentro da faixa comum.", faixa, contexto]);
      }
    });
  }

  iniciarAjustes();
  desenharCesta();
  desenharReferencias();
  iniciarComparador();
})();
