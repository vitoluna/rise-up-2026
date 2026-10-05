/* ==========================================================
   SecView — menu lateral único
   Uso: <nav data-secview-nav="dashboard" data-base="" data-icones></nav>
     data-secview-nav = id do item ativo (dashboard | feed | compliance)
     data-base        = caminho até a raiz do projeto ("" ou "../")
     data-icones      = (opcional) mostra o ícone antes do texto
   Requer js/comum.js carregado antes.
   ========================================================== */

(() => {
  const raiz = document.querySelector("[data-secview-nav]");
  if (!raiz) return;

  // href: null → tela ainda não existe (aparece desabilitada, "em breve")
  const ITENS = [
    { id: "dashboard", texto: "Dashboard",       icone: "▣", href: "index.html" },
    { id: "feed",      texto: "Feed de alertas", icone: "◉", href: "feed/index.html" },
    { id: "fim",       texto: "FIM",             icone: "▤", href: null },
    { id: "regras",    texto: "Regras custom",   icone: "≡", href: null },
    { id: "compliance",texto: "Compliance",      icone: "▥", href: "compliance.html" },
    { id: "mitre",     texto: "MITRE ATT&CK",    icone: "◈", href: null },
    { id: "config",    texto: "Configurações",   icone: "⚙", href: null },
  ];

  const ativo = raiz.dataset.secviewNav;
  const base = raiz.dataset.base || "";
  const comIcones = "icones" in raiz.dataset;

  function criarLink({ texto, icone, href, id }) {
    const a = document.createElement("a");

    if (comIcones) {
      const ic = document.createElement("span");
      ic.className = "ic";
      ic.setAttribute("aria-hidden", "true");
      ic.textContent = icone;
      a.appendChild(ic);
    }
    a.appendChild(document.createTextNode(texto));

    if (!href) {
      a.className = "nav-off";
      a.setAttribute("aria-disabled", "true");
      const breve = document.createElement("small");
      breve.className = "nav-breve";
      breve.textContent = "em breve";
      a.appendChild(breve);
      return a;
    }

    a.href = base + href;
    if (id === ativo) {
      a.className = "on active"; // "on" = dashboard.css, "active" = compliance.css
      a.setAttribute("aria-current", "page");
    }
    return a;
  }

  raiz.setAttribute("aria-label", "Navegação principal");
  raiz.replaceChildren(...ITENS.map(criarLink));

  // Sair
  const sair = criarLink({ texto: "Sair", icone: "↩", href: "login.html", id: "sair" });
  sair.classList.add("nav-sair");
  sair.addEventListener("click", (e) => {
    e.preventDefault();
    window.SecView.sair(base + "login.html");
  });
  raiz.appendChild(sair);
})();
