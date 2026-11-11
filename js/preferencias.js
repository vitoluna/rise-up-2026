/* ==========================================================
   SecView — preferências do usuário (tela Configurações)
   Carregado no <head> de todas as telas, ANTES do CSS ser pintado,
   para o tema e o tamanho do texto já abrirem certos (sem piscar).

   Marca o <html> com atributos que o CSS usa:
     data-tema="claro|escuro"        (tema efetivo; "sistema" resolve aqui)
     data-texto="grande|maior"       data-contraste="alto"
     data-daltonismo="protanopia|deuteranopia|tritanopia|acromatopsia|dicromatismo|tricromatismo-anomalo"
     data-movimento="reduzido"       data-links="destaque"
     data-menu="compacto"            data-densidade="compacta"
   Seções do Dashboard ocultas: elementos com data-secao recebem hidden.

   Fica no localStorage deste navegador (sem servidor).
   ========================================================== */

window.SecViewPreferencias = (() => {
  const CHAVE = "secview_preferencias";

  // Telas que podem abrir depois do login (lista fechada: o valor salvo
  // nunca vira um endereço qualquer)
  const PAGINAS = [
    { href: "index.html", nome: "Dashboard" },
    { href: "feed/index.html", nome: "Feed de alertas" },
    { href: "fim.html", nome: "FIM" },
    { href: "regras/regras.html", nome: "Regras custom" },
    { href: "compliance.html", nome: "Compliance" },
    { href: "mitre.html", nome: "MITRE ATT&CK" },
  ];

  const PADRAO = {
    tema: "sistema",          // claro | escuro | sistema
    texto: "normal",          // normal | grande | maior
    contraste: false,
    daltonismo: "nenhum",
    movimento: false,         // true = reduzir animações
    links: false,             // true = links sublinhados e foco reforçado
    menu: "completo",         // completo | compacto
    densidade: "confortavel", // confortavel | compacta
    inicio: "index.html",
    dashOcultas: [],
  };

  const OPCOES = {
    tema: ["claro", "escuro", "sistema"],
    texto: ["normal", "grande", "maior"],
    daltonismo: ["nenhum", "protanopia", "deuteranopia", "tritanopia", "acromatopsia", "dicromatismo", "tricromatismo-anomalo"],
    menu: ["completo", "compacto"],
    densidade: ["confortavel", "compacta"],
  };

  // Lê e valida: valores desconhecidos voltam ao padrão
  function ler() {
    let salvo = {};
    try { salvo = JSON.parse(localStorage.getItem(CHAVE) || "{}") || {}; } catch { salvo = {}; }
    const p = { ...PADRAO };
    for (const k of Object.keys(OPCOES)) if (OPCOES[k].includes(salvo[k])) p[k] = salvo[k];
    for (const k of ["contraste", "movimento", "links"]) if (typeof salvo[k] === "boolean") p[k] = salvo[k];
    if (PAGINAS.some((pg) => pg.href === salvo.inicio)) p.inicio = salvo.inicio;
    if (Array.isArray(salvo.dashOcultas)) p.dashOcultas = salvo.dashOcultas.filter((s) => typeof s === "string");
    return p;
  }

  const midiaEscura = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function marcar(raiz, nome, valor) {
    if (valor) raiz.setAttribute(nome, valor); else raiz.removeAttribute(nome);
  }

  function aplicar(p = ler()) {
    const raiz = document.documentElement;
    const escuro = p.tema === "escuro" || (p.tema === "sistema" && !!(midiaEscura && midiaEscura.matches));
    raiz.setAttribute("data-tema", escuro ? "escuro" : "claro");
    marcar(raiz, "data-texto", p.texto === "normal" ? "" : p.texto);
    marcar(raiz, "data-contraste", p.contraste ? "alto" : "");
    marcar(raiz, "data-daltonismo", p.daltonismo === "nenhum" ? "" : p.daltonismo);
    marcar(raiz, "data-movimento", p.movimento ? "reduzido" : "");
    marcar(raiz, "data-links", p.links ? "destaque" : "");
    marcar(raiz, "data-menu", p.menu === "compacto" ? "compacto" : "");
    marcar(raiz, "data-densidade", p.densidade === "compacta" ? "compacta" : "");
    document.querySelectorAll("[data-secao]").forEach((el) => {
      el.hidden = p.dashOcultas.includes(el.dataset.secao);
    });
  }

  function avisar(p) {
    window.dispatchEvent(new CustomEvent("secview:preferencias", { detail: p }));
  }

  function salvar(parcial) {
    const p = { ...ler(), ...parcial };
    try { localStorage.setItem(CHAVE, JSON.stringify(p)); } catch { /* modo privado: vale só nesta página */ }
    aplicar(p);
    avisar(p);
    return p;
  }

  function restaurar() {
    try { localStorage.removeItem(CHAVE); } catch { /* ignora */ }
    const p = ler();
    aplicar(p);
    avisar(p);
    return p;
  }

  // "Seguir o sistema" acompanha a troca de tema do sistema operacional
  if (midiaEscura && midiaEscura.addEventListener) {
    midiaEscura.addEventListener("change", () => { if (ler().tema === "sistema") aplicar(); });
  }
  // Mudou em outra aba: aplica aqui também
  window.addEventListener("storage", (e) => { if (e.key === CHAVE) aplicar(); });

  aplicar();
  // as seções do Dashboard só existem depois que o HTML carrega
  document.addEventListener("DOMContentLoaded", () => aplicar());

  return { PADRAO, PAGINAS, ler, salvar, restaurar, aplicar };
})();
