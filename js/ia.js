/* ==========================================================
   SecView — cliente das análises com IA
   As páginas chamam SecViewIA.pedir("acao", dados); o pedido vai
   para o servidor do SecView (server/servidor.mjs), que guarda a
   chave e fala com o Claude. A chave nunca chega ao navegador.

   Também traz as peças de tela comuns: botão, carregando, erro,
   cabeçalho e nota de rodapé. Todo texto vindo da IA entra com
   textContent (nunca innerHTML).
   ========================================================== */

window.SecViewIA = (() => {
  const MODELO = "Claude Haiku 5.5";
  const TEMPO_MAX_MS = 90_000;

  async function pedir(acao, dados) {
    if (location.protocol === "file:") {
      throw new Error("A análise com IA precisa do servidor do SecView. Rode npm run ia e abra http://localhost:3000.");
    }
    let resposta;
    try {
      resposta = await fetch(`/api/ia/${acao}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
        signal: AbortSignal.timeout(TEMPO_MAX_MS),
      });
    } catch (e) {
      throw new Error(e && e.name === "TimeoutError"
        ? "A IA demorou demais para responder. Tente de novo."
        : "Sem conexão com o servidor do SecView. Confira se ele está rodando (npm run ia).");
    }
    let corpo = null;
    try { corpo = await resposta.json(); } catch { /* resposta sem JSON */ }
    if (!resposta.ok) {
      if (corpo && typeof corpo.erro === "string") throw new Error(corpo.erro);
      throw new Error(resposta.status === 404 || resposta.status === 405
        ? "Este servidor não tem as rotas de IA. Rode o SecView com npm run ia."
        : `Erro ${resposta.status} ao pedir a análise.`);
    }
    if (!corpo || typeof corpo.resultado !== "object") throw new Error("Resposta da IA em formato inesperado.");
    return corpo.resultado;
  }

  /* ---------- Peças de tela ---------- */
  function criar(tag, classe, texto) {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto !== undefined && texto !== null) e.textContent = texto;
    return e;
  }

  // Ícone de "faísca", desenhado em SVG (marca o que vem da IA)
  function icone() {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("class", "ia-ic");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", "M8 1.5 9.4 6.6 14.5 8 9.4 9.4 8 14.5 6.6 9.4 1.5 8 6.6 6.6Z");
    const p2 = document.createElementNS(NS, "path");
    p2.setAttribute("d", "M13 1.5l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5Z");
    svg.append(p, p2);
    return svg;
  }

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
    return criar("p", "ia-nota", `Gerado por IA (${MODELO}) a partir dos dados do SecView. Pode errar: confira antes de agir.`);
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
    const p = criar("p", "ia-estado carregando", texto);
    alvo.replaceChildren(p);
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

  return { MODELO, pedir, criar, icone, botao, cabecalho, nota, bloco, secao, lista, carregando, erro };
})();
