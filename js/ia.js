/* ==========================================================
   SecView — cliente das análises com IA
   As páginas chamam SecViewIA.pedir("acao", dados); o pedido vai
   para o servidor do SecView (server/servidor.mjs), que guarda a
   chave e fala com o Claude. A chave nunca chega ao navegador.

   Enquanto a IA trabalha, abre a "tela da IA": a fechadura do
   SecView olhando para os lados e piscando, e a lista do que a
   análise está fazendo. As etapas descrevem o que foi pedido à
   IA (o mesmo roteiro de server/ia.mjs); a primeira e a última
   são eventos reais (envio e resposta conferida). Se a resposta
   chega antes, as etapas que faltam não são mostradas.

   Todo texto vindo da IA entra com textContent (nunca innerHTML).
   ========================================================== */

window.SecViewIA = (() => {
  const NOME = "vigIA";       // a IA do SecView: trocadilho com "vigia"
  const MODELO = "Claude Haiku 5.5";
  const TEMPO_MAX_MS = 90_000;
  const PASSO_MS = 1700;      // intervalo entre as etapas mostradas
  const FRASE_MS = 5200;      // troca da frase bem-humorada (um ciclo do olho)
  const PRONTO_MS = 550;      // tempo mostrando "Ronda concluída" antes de fechar

  // Frases para descontrair enquanto a vigIA trabalha (somadas às de cada análise)
  const FRASES = [
    "A vigIA está de olho. Literalmente.",
    "Olho vivo: nenhum log passa sem a vigIA ver.",
    "A vigIA não dorme em serviço. No máximo, pisca.",
    "Ronda em andamento. Pode ficar tranquilo.",
    "Plantão 24 horas, sem pausa para o cafezinho.",
    "Quem vigia os hosts? A vigIA. Quem vigia a vigIA? Você.",
    "Na portaria do SecView, hacker não entra sem crachá.",
  ];

  /* ---------- Roteiro de cada análise ---------- */
  const qtd = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const ROTEIRO = {
    alerta: {
      titulo: "Analisando o alerta",
      frases: ["Alerta na área: a vigIA foi conferir pessoalmente.", "Um alarme tocou e a vigIA já levantou da cadeira."],
      passos: (d) => [
        d.recentes.length
          ? `Enviando o alerta e ${qtd(d.recentes.length, "alerta recente", "alertas recentes")} de ${d.alerta.origem}`
          : `Enviando o alerta de ${d.alerta.origem} (sem outros alertas recentes do host)`,
        "Lendo o que aconteceu no alerta",
        `Procurando uma sequência de ataque em ${d.alerta.origem}`,
        "Avaliando a severidade",
        "Montando os passos de resposta",
        "Identificando a técnica do MITRE ATT&CK",
      ],
    },
    fim: {
      titulo: "Analisando a alteração do arquivo",
      frases: ["A vigIA sabe o /etc/passwd de cor. E nota quando mudam uma vírgula.", "Arquivo mexido? A vigIA vai conferir a fechadura."],
      passos: (d) => [
        `Enviando o diff de ${d.caminho} (${d.host})`,
        "Lendo as linhas adicionadas e removidas",
        "Procurando contas, permissões e configurações perigosas",
        "Decidindo se a alteração é suspeita",
        "Escrevendo os próximos passos",
      ],
    },
    mitre: {
      titulo: "Mapeando os eventos no MITRE ATT&CK",
      frases: ["A vigIA está consultando o manual dos bandidos (o MITRE ATT&CK).", "Cada tática tem um suspeito. A vigIA está ligando os pontos."],
      passos: (d) => [
        `Enviando ${qtd(d.eventos.length, "evento", "eventos")} e ${qtd(d.tecnicas.length, "técnica", "técnicas")} do catálogo`,
        "Lendo a descrição de cada evento",
        "Comparando com as técnicas do catálogo",
        "Medindo a confiança de cada ligação",
        "Escrevendo as justificativas",
      ],
    },
    regra: {
      titulo: "Montando a regra",
      frases: ["Regra nova no posto: a vigIA anota tudo na prancheta.", "Combinado é combinado: a vigIA vai cumprir essa regra à risca."],
      passos: () => [
        "Enviando a descrição da regra",
        "Entendendo o pedido",
        "Escolhendo o tipo de regra",
        "Definindo a severidade",
      ],
    },
    resumo: {
      titulo: "Gerando o resumo do turno",
      frases: ["Passagem de turno: a vigIA conta o que aconteceu na sua ausência.", "A vigIA está revisando o livro de ocorrências."],
      passos: () => [
        "Enviando os números do Dashboard",
        "Lendo os indicadores e os gráficos",
        "Cruzando com os eventos dos últimos 7 dias",
        "Escolhendo as prioridades do turno",
        "Escrevendo o resumo",
      ],
    },
    pergunta: {
      titulo: "Respondendo à pergunta",
      frases: ["Pergunta recebida. A vigIA está vasculhando os registros.", "A vigIA tem boa memória, mas confere os registros mesmo assim."],
      passos: (d) => [
        `Enviando a pergunta “${d.pergunta.length > 60 ? d.pergunta.slice(0, 60) + "…" : d.pergunta}”`,
        "Procurando nos hosts e nos eventos",
        "Conferindo arquivos monitorados e requisitos PCI-DSS",
        "Escrevendo a resposta",
      ],
    },
  };

  /* ---------- Peças de tela ---------- */
  function criar(tag, classe, texto) {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto !== undefined && texto !== null) e.textContent = texto;
    return e;
  }

  const NS = "http://www.w3.org/2000/svg";
  function svg(tag, attrs, filhos = []) {
    const e = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    e.append(...filhos);
    return e;
  }

  // Ícone de "faísca", desenhado em SVG (marca o que vem da IA)
  function icone() {
    return svg("svg", { viewBox: "0 0 16 16", class: "ia-ic", "aria-hidden": "true", focusable: "false" }, [
      svg("path", { d: "M8 1.5 9.4 6.6 14.5 8 9.4 9.4 8 14.5 6.6 9.4 1.5 8 6.6 6.6Z" }),
      svg("path", { d: "M13 1.5l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5Z" }),
    ]);
  }

  // Fechadura do SecView com o olho (mesmo desenho do menu, js/nav.js).
  // .olho pisca (escala vertical) e .iris olha para os lados, recortada
  // pelo contorno do olho para não sair dele.
  const OLHO = "M4.6 11Q12 4.2 19.4 11 12 17.8 4.6 11Z";
  function logoAnimado() {
    return svg("svg", { viewBox: "0 0 24 32", class: "ia-logo", "aria-hidden": "true", focusable: "false" }, [
      svg("defs", {}, [svg("clipPath", { id: "ia-logo-olho" }, [svg("path", { d: OLHO })])]),
      svg("path", { class: "corpo", d: "M12 1a10 10 0 0 1 5.2 18.54l1.4 9.76a1.5 1.5 0 0 1-1.5 1.7H6.9a1.5 1.5 0 0 1-1.5-1.7l1.4-9.76A10 10 0 0 1 12 1Z" }),
      svg("g", { class: "olho" }, [
        svg("path", { class: "branco", d: OLHO }),
        svg("g", { "clip-path": "url(#ia-logo-olho)" }, [
          svg("g", { class: "iris" }, [
            svg("circle", { class: "iris-cor", cx: 12, cy: 11, r: 2.9 }),
            svg("circle", { class: "branco", cx: 12, cy: 11, r: 1.4 }),
          ]),
        ]),
      ]),
    ]);
  }

  function marcaFeito() {
    return svg("svg", { viewBox: "0 0 16 16", class: "ia-passo-marca", "aria-hidden": "true", focusable: "false" }, [
      svg("path", { d: "m3.5 8.5 3 3 6-7" }),
    ]);
  }

  /* ---------- Tela da IA (dialog modal, acima de outros dialogs) ---------- */
  let tela = null;

  function montarTela() {
    const d = criar("dialog", "ia-tela");
    d.setAttribute("aria-labelledby", "ia-tela-titulo");
    d.setAttribute("aria-describedby", "ia-tela-passos");
    const corpo = criar("div", "ia-tela-corpo");
    const titulo = criar("h2", "", "");
    titulo.id = "ia-tela-titulo";
    const frase = criar("p", "ia-tela-frase");
    frase.setAttribute("aria-hidden", "true"); // enfeite: o leitor de tela ouve as etapas
    const passos = criar("ol", "ia-tela-passos");
    passos.id = "ia-tela-passos";
    const aviso = criar("p", "so-leitor");
    aviso.setAttribute("role", "status");
    const rodape = criar("div", "ia-tela-rodape");
    const tempo = criar("span", "ia-tela-tempo", "");
    const cancelar = criar("button", "btn", "Cancelar");
    cancelar.type = "button";
    rodape.append(tempo, cancelar);
    corpo.append(logoAnimado(), titulo, frase, passos, aviso, rodape);
    d.append(corpo);
    document.body.append(d);
    return { d, titulo, frase, passos, aviso, tempo, cancelar };
  }

  /** Abre a tela para uma ação; devolve o controle da sessão. */
  function abrirTela(acao, dados) {
    const roteiro = ROTEIRO[acao];
    const controle = new AbortController();
    const sessao = { sinal: controle.signal, cancelada: false, fechada: false };
    if (!roteiro || typeof HTMLDialogElement === "undefined") {
      sessao.concluir = async () => {};
      sessao.fechar = () => {};
      return sessao;
    }

    tela ??= montarTela();
    const { d, titulo, frase, passos, aviso, tempo, cancelar } = tela;
    let lista;
    try { lista = roteiro.passos(dados); } catch { lista = ["Enviando os dados"]; }

    titulo.textContent = roteiro.titulo;
    passos.replaceChildren();

    // frase bem-humorada: sorteada ao abrir e trocada a cada ciclo do olho, sem repetir em seguida
    const frases = [...(roteiro.frases || []), ...FRASES];
    let fraseAtual = -1;
    function trocarFrase() {
      let n;
      do { n = Math.floor(Math.random() * frases.length); } while (frases.length > 1 && n === fraseAtual);
      fraseAtual = n;
      frase.textContent = frases[n];
      frase.classList.remove("entra");
      void frase.offsetWidth; // reinicia a animação de entrada
      frase.classList.add("entra");
    }
    trocarFrase();
    const rodizio = setInterval(trocarFrase, FRASE_MS);
    let atual = null;
    let indice = 0;

    function mostrarPasso(texto) {
      if (atual) {
        atual.classList.replace("atual", "feito");
        atual.prepend(marcaFeito());
        atual.querySelector(".ia-passo-ponto")?.remove();
      }
      atual = criar("li", "atual");
      atual.append(criar("span", "ia-passo-ponto"), criar("span", "", texto));
      passos.append(atual);
      aviso.textContent = texto;
    }

    mostrarPasso(lista[indice++]);
    const relogio = Date.now();
    tempo.textContent = `${NOME} · ${MODELO} · 0 s`;
    const contador = setInterval(() => {
      tempo.textContent = `${NOME} · ${MODELO} · ${Math.round((Date.now() - relogio) / 1000)} s`;
    }, 1000);
    // a última etapa do roteiro fica na tela até a resposta chegar
    const avanco = setInterval(() => {
      if (indice < lista.length) mostrarPasso(lista[indice++]);
      else clearInterval(avanco);
    }, PASSO_MS);

    function fechar() {
      if (sessao.fechada) return;
      sessao.fechada = true;
      clearInterval(contador);
      clearInterval(avanco);
      clearInterval(rodizio);
      d.removeEventListener("cancel", aoCancelar);
      cancelar.removeEventListener("click", aoCancelar);
      if (d.open) d.close();
    }
    function aoCancelar(e) {
      e.preventDefault(); // Esc não fecha sozinho: cancela o pedido primeiro
      sessao.cancelada = true;
      controle.abort();
      fechar();
    }
    d.addEventListener("cancel", aoCancelar);
    cancelar.addEventListener("click", aoCancelar);

    sessao.fechar = fechar;
    sessao.concluir = () => new Promise((ok) => {
      if (sessao.fechada) return ok();
      clearInterval(avanco);
      mostrarPasso("Ronda concluída: resposta recebida e conferida");
      atual.classList.replace("atual", "feito");
      atual.querySelector(".ia-passo-ponto")?.remove();
      atual.prepend(marcaFeito());
      setTimeout(() => { fechar(); ok(); }, PRONTO_MS);
    });

    if (!d.open) d.showModal();
    cancelar.focus();
    return sessao;
  }

  /* ---------- Pedido ao servidor ---------- */
  async function pedir(acao, dados) {
    if (location.protocol === "file:") {
      throw new Error("A vigIA só trabalha com o servidor do SecView ligado. Rode npm run ia e abra http://localhost:3000.");
    }
    const sessao = abrirTela(acao, dados);
    // o fetch para no "Cancelar" da tela ou quando o prazo acaba
    let estourou = false;
    const controlePrazo = new AbortController();
    const prazo = setTimeout(() => { estourou = true; controlePrazo.abort(); }, TEMPO_MAX_MS);
    sessao.sinal.addEventListener("abort", () => controlePrazo.abort());

    try {
      let resposta;
      try {
        resposta = await fetch(`/api/ia/${acao}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dados),
          signal: controlePrazo.signal,
        });
      } catch {
        if (sessao.cancelada) throw new Error("Ronda cancelada. Nada foi alterado.");
        if (estourou) throw new Error("A vigIA demorou demais na ronda e não respondeu a tempo. Tente de novo.");
        throw new Error("A vigIA está fora do posto: sem conexão com o servidor do SecView. Confira se ele está rodando (npm run ia).");
      }
      let corpo = null;
      try { corpo = await resposta.json(); } catch { /* resposta sem JSON */ }
      if (sessao.cancelada) throw new Error("Ronda cancelada. Nada foi alterado.");
      if (!resposta.ok) {
        if (corpo && typeof corpo.erro === "string") throw new Error(corpo.erro);
        throw new Error(resposta.status === 404 || resposta.status === 405
          ? "Este servidor não tem a vigIA. Rode o SecView com npm run ia."
          : `Erro ${resposta.status} ao pedir a análise.`);
      }
      if (!corpo || typeof corpo.resultado !== "object") throw new Error("A vigIA respondeu num formato inesperado. Tente de novo.");
      await sessao.concluir();
      return corpo.resultado;
    } finally {
      clearTimeout(prazo);
      sessao.fechar();
    }
  }

  /** true enquanto a tela da IA está aberta (a busca usa para não se fechar). */
  const ocupado = () => Boolean(tela && tela.d.open);

  function botao(texto) {
    const b = criar("button", "btn btn-ia");
    b.type = "button";
    b.append(icone(), criar("span", "", texto));
    return b;
  }

  function cabecalho(titulo) {
    const cab = criar("div", "ia-cab");
    cab.append(icone(), criar("h3", "", titulo));
    return cab;
  }

  function nota() {
    return criar("p", "ia-nota", `Gerado pela ${NOME} (${MODELO}) a partir dos dados do SecView. Até a ${NOME} pode errar: confira antes de agir.`);
  }

  function bloco(titulo) {
    const b = criar("div", "ia-bloco");
    b.append(cabecalho(titulo));
    return b;
  }

  /** Subtítulo + conteúdo (texto ou elemento) dentro de um bloco. */
  function secao(titulo, conteudo) {
    const s = criar("div", "ia-secao");
    s.append(criar("h4", "", titulo), typeof conteudo === "string" ? criar("p", "", conteudo) : conteudo);
    return s;
  }

  function lista(itens, ordenada = true) {
    const l = criar(ordenada ? "ol" : "ul", "ia-lista");
    itens.forEach((t) => l.append(criar("li", "", t)));
    return l;
  }

  function carregando(alvo, texto) {
    alvo.replaceChildren(criar("p", "ia-estado carregando", texto));
  }

  function erro(alvo, mensagem, aoTentar) {
    const p = criar("div", "ia-estado erro");
    p.setAttribute("role", "alert");
    p.append(criar("span", "", mensagem));
    if (aoTentar) {
      const b = criar("button", "btn", "Tentar de novo");
      b.type = "button";
      b.addEventListener("click", aoTentar);
      p.append(b);
    }
    alvo.replaceChildren(p);
  }

  return { NOME, MODELO, pedir, ocupado, criar, icone, botao, cabecalho, nota, bloco, secao, lista, carregando, erro };
})();
