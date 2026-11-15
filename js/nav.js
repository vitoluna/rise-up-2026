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
    { id: "fim",       texto: "FIM",             icone: "▤", href: "fim.html" },
    { id: "regras",    texto: "Regras custom",   icone: "≡", href: "regras/regras.html" },
    { id: "compliance",texto: "Compliance",      icone: "▥", href: "compliance.html" },
    { id: "mitre",     texto: "MITRE ATT&CK",    icone: "◈", href: "mitre.html" },
    { id: "config",    texto: "Configurações",   icone: "⚙", href: "configuracoes.html" },
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
    // o nome fica num span para o menu compacto escondê-lo só visualmente
    const rotulo = document.createElement("span");
    rotulo.className = "rotulo";
    rotulo.textContent = texto;
    a.appendChild(rotulo);
    a.title = texto;

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
      a.className = "active";
      a.setAttribute("aria-current", "page");
    }
    return a;
  }

  // usado pela busca global (js/busca.js)
  window.SecViewNav = { ITENS, base };

  // Logo: o símbolo da marca (fechadura com olho, de css/logoSite.JPG)
  // redesenhado em SVG, à esquerda do nome. Decorativo: o nome já é lido.
  const marca = raiz.closest(".sidebar")?.querySelector(".brand");
  if (marca && !marca.querySelector(".brand-logo")) {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "brand-logo");
    svg.setAttribute("viewBox", "0 0 24 32");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    const forma = (tag, attrs) => {
      const el = document.createElementNS(NS, tag);
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
      return el;
    };
    svg.append(
      forma("path", { d: "M12 1a10 10 0 0 1 5.2 18.54l1.4 9.76a1.5 1.5 0 0 1-1.5 1.7H6.9a1.5 1.5 0 0 1-1.5-1.7l1.4-9.76A10 10 0 0 1 12 1Z" }),
      forma("path", { class: "furo", d: "M4.6 11Q12 4.2 19.4 11 12 17.8 4.6 11Z" }),
      forma("circle", { cx: 12, cy: 11, r: 2.9 }),
      forma("circle", { class: "furo", cx: 12, cy: 11, r: 1.4 })
    );
    marca.prepend(svg);
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
