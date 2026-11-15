/* ==========================================================
   SecView — busca global (barra no topo de todas as telas)
   Uso: carregar depois de js/nav.js (e de js/dados.js, se houver).
     A barra é inserida no início de <main class="content">.
   Procura em: telas do menu, hosts, eventos, arquivos do FIM e
   requisitos PCI-DSS. Cada resultado é um link que abre a tela
   certa já filtrada (?q=, ?host=, ?arquivo=, ?req=).
   Atalhos: "/" ou Ctrl+K foca · ↑ ↓ escolhe · Enter abre · Esc fecha.
   Todo texto vai para a página com textContent (nada de innerHTML).
   ========================================================== */

(() => {
  const conteudo = document.querySelector("main.content");
  const nav = window.SecViewNav;
  if (!conteudo || !nav) return;

  const base = nav.base;
  const D = window.SecViewDados || {};
  const SEV = D.SEVERIDADES || {};
  const ORDEM_SEV = ["critico", "alto", "medio", "info"];
  const MAX_POR_GRUPO = 5;

  // minúsculas e sem acento, letra a letra (mantém as posições para o realce)
  const norm = (s) => [...String(s)].map((c) => c.normalize("NFD")[0]).join("").toLowerCase();

  /* ---------- Índice ---------- */
  // Palavras que também levam a cada tela (além do nome no menu)
  const TERMOS_TELA = {
    dashboard: "inicio painel graficos indicadores kpis resumo",
    feed: "alertas tempo real eventos ao vivo recomendacao",
    fim: "integridade arquivos hash baseline diff monitoramento",
    regras: "regras customizadas severidade condicao",
    compliance: "pci-dss pci conformidade requisitos relatorio pdf csv",
    mitre: "mitre att&ck attack taticas tecnicas",
    config: "tema modo escuro claro acessibilidade preferencias contraste daltonismo conta",
  };

  const indice = [];
  const incluir = (grupo, titulo, detalhe, href, extra = {}) => {
    const chave = norm(`${titulo} ${detalhe} ${extra.termos || ""}`);
    indice.push({ grupo, titulo, detalhe, href: base + href, chave, palavras: chave.split(/[^a-z0-9]+/), tituloNorm: norm(titulo), sev: extra.sev });
  };

  // O termo vale no começo de uma palavra ("tema" acha "Tema", não "sistemas").
  // Com pontuação ("host-db", "/etc/passwd") vale em qualquer ponto do texto.
  const casa = (item, t) => (/[^a-z0-9]/.test(t) ? item.chave.includes(t) : item.palavras.some((p) => p.startsWith(t)));
  // posição do termo no título (para o realce), ou -1
  function posicao(tituloNorm, t) {
    if (/[^a-z0-9]/.test(t)) return tituloNorm.indexOf(t);
    for (let i = tituloNorm.indexOf(t); i >= 0; i = tituloNorm.indexOf(t, i + 1)) {
      if (i === 0 || /[^a-z0-9]/.test(tituloNorm[i - 1])) return i;
    }
    return -1;
  }

  nav.ITENS.filter((i) => i.href).forEach((i) =>
    incluir("Telas", i.texto, "Abrir a tela", i.href, { termos: TERMOS_TELA[i.id] })
  );

  (D.HOSTS || []).forEach((h) =>
    incluir("Hosts", h.nome, `${h.funcao} · ${h.alertas} alertas em 24h`, `feed/index.html?q=${encodeURIComponent(h.nome)}`)
  );

  // eventos repetidos em vários hosts/dias viram um resultado só
  const eventos = new Map();
  (D.EVENTOS || []).forEach((e) => {
    const ev = eventos.get(e.descricao) || { hosts: new Set(), sev: e.severidade, categoria: e.categoria };
    ev.hosts.add(e.origem);
    if (ORDEM_SEV.indexOf(e.severidade) < ORDEM_SEV.indexOf(ev.sev)) ev.sev = e.severidade;
    eventos.set(e.descricao, ev);
  });
  eventos.forEach((ev, descricao) => {
    const hosts = [...ev.hosts];
    const onde = hosts.length === 1 ? hosts[0] : `${hosts.length} hosts`;
    incluir("Eventos", descricao, `${ev.categoria} · ${onde}`, `feed/index.html?q=${encodeURIComponent(descricao)}`, { sev: ev.sev, termos: hosts.join(" ") });
  });

  (D.FIM || []).forEach((f) =>
    incluir(
      "Arquivos monitorados", f.caminho, `${f.host} · ${f.atual ? "modificado" : "íntegro"}`,
      `fim.html?host=${encodeURIComponent(f.host)}&arquivo=${encodeURIComponent(f.caminho)}`,
      { sev: f.atual ? f.severidade : undefined, termos: "fim integridade" }
    )
  );

  ((D.PCI && D.PCI.requisitos) || []).forEach((r) =>
    incluir("Requisitos PCI-DSS", `Requisito ${r.n}`, `${r.nome} · ${r.atendidos} de ${r.total} controles`, `compliance.html?req=${r.n}`, { termos: `pci req ${r.n}` })
  );

  function procurar(texto) {
    const termos = norm(texto).split(/\s+/).filter(Boolean);
    if (!termos.length) return [];
    const nota = (item) => { const pos = posicao(item.tituloNorm, termos[0]); return pos === 0 ? 0 : pos > 0 ? 1 : 2; };
    return indice
      .filter((item) => termos.every((t) => casa(item, t)))
      .map((item, i) => ({ item, nota: nota(item), i }))
      .sort((a, b) => a.nota - b.nota || a.i - b.i)
      .map((x) => x.item);
  }

  /* ---------- Marcação ---------- */
  const criar = (tag, classe, texto) => {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto !== undefined) e.textContent = texto;
    return e;
  };
  const NS = "http://www.w3.org/2000/svg";
  function lupa() {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("class", "busca-ic");
    const c = document.createElementNS(NS, "circle");
    c.setAttribute("cx", "11"); c.setAttribute("cy", "11"); c.setAttribute("r", "7");
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", "m20 20-3.6-3.6");
    svg.append(c, p);
    return svg;
  }

  const barra = criar("div", "topo-busca");
  barra.setAttribute("role", "search");
  const caixa = criar("div", "busca");

  const campo = document.createElement("input");
  campo.type = "search";
  campo.id = "busca-global";
  campo.placeholder = "Buscar telas, hosts, eventos, arquivos";
  campo.autocomplete = "off";
  campo.spellcheck = false;
  campo.setAttribute("role", "combobox");
  campo.setAttribute("aria-label", "Buscar no SecView");
  campo.setAttribute("aria-autocomplete", "list");
  campo.setAttribute("aria-controls", "busca-lista");
  campo.setAttribute("aria-expanded", "false");

  const atalho = criar("kbd", "busca-atalho", "/");
  atalho.setAttribute("aria-hidden", "true");

  const lista = criar("div", "busca-lista");
  lista.id = "busca-lista";
  lista.setAttribute("role", "listbox");
  lista.setAttribute("aria-label", "Resultados da busca");
  lista.hidden = true;

  // leitores de tela ouvem quantos resultados apareceram
  const aviso = criar("p", "so-leitor");
  aviso.setAttribute("aria-live", "polite");

  caixa.append(lupa(), campo, atalho, lista, aviso);
  barra.append(caixa);
  conteudo.prepend(barra);

  /* ---------- Resultados ---------- */
  let opcoes = [];
  let ativa = -1;

  // título com o trecho digitado em destaque
  function titulo(item, termo) {
    const b = criar("b", "busca-titulo");
    const pos = termo ? posicao(item.tituloNorm, termo) : -1;
    if (pos < 0) { b.textContent = item.titulo; return b; }
    const letras = [...item.titulo];
    b.append(
      letras.slice(0, pos).join(""),
      criar("mark", "", letras.slice(pos, pos + termo.length).join("")),
      letras.slice(pos + termo.length).join("")
    );
    return b;
  }

  function fechar() {
    lista.hidden = true;
    lista.replaceChildren();
    opcoes = [];
    ativa = -1;
    campo.setAttribute("aria-expanded", "false");
    campo.removeAttribute("aria-activedescendant");
  }

  function ativar(i) {
    if (!opcoes.length) return;
    ativa = (i + opcoes.length) % opcoes.length;
    opcoes.forEach((o, n) => o.setAttribute("aria-selected", String(n === ativa)));
    campo.setAttribute("aria-activedescendant", opcoes[ativa].id);
    opcoes[ativa].scrollIntoView({ block: "nearest" });
  }

  function mostrar() {
    const texto = campo.value.trim();
    if (!texto) { fechar(); aviso.textContent = ""; return; }

    const achados = procurar(texto);
    const termo = norm(texto).split(/\s+/)[0];
    lista.replaceChildren();
    opcoes = [];

    if (!achados.length) {
      const vazio = criar("p", "busca-vazio");
      vazio.append("Nada encontrado para ", criar("b", "", `“${texto}”`), ". Tente o nome de uma tela, um host (host-db-01), um evento (brute force) ou um arquivo (/etc/passwd).");
      lista.append(vazio);
      aviso.textContent = "Nenhum resultado.";
    } else {
      const grupos = new Map();
      achados.forEach((item) => {
        const g = grupos.get(item.grupo) || [];
        if (g.length < MAX_POR_GRUPO) g.push(item);
        grupos.set(item.grupo, g);
      });
      grupos.forEach((itens, nome) => {
        const grupo = criar("div", "busca-grupo");
        grupo.setAttribute("role", "group");
        grupo.setAttribute("aria-label", nome);
        grupo.append(criar("p", "busca-grupo-nome", nome));
        itens.forEach((item) => {
          const a = criar("a", "busca-op");
          a.href = item.href;
          a.id = `busca-op-${opcoes.length}`;
          a.tabIndex = -1; // o foco fica no campo; as setas escolhem
          a.setAttribute("role", "option");
          a.setAttribute("aria-selected", "false");
          const corpo = criar("span", "busca-corpo");
          corpo.append(titulo(item, termo), criar("span", "busca-detalhe", item.detalhe));
          a.append(corpo);
          if (item.sev && SEV[item.sev]) a.append(criar("span", `badge b-${item.sev}`, SEV[item.sev]));
          grupo.append(a);
          opcoes.push(a);
        });
        lista.append(grupo);
      });
      lista.append(criar("p", "busca-dica", "↑ ↓ para escolher · Enter para abrir · Esc para fechar"));
      aviso.textContent = `${opcoes.length} ${opcoes.length === 1 ? "resultado" : "resultados"}.`;
    }

    lista.hidden = false;
    campo.setAttribute("aria-expanded", "true");
    ativa = -1;
    if (opcoes.length) ativar(0);
  }

  /* ---------- Interação ---------- */
  campo.addEventListener("input", mostrar);
  campo.addEventListener("focus", () => { if (campo.value.trim()) mostrar(); });

  campo.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (lista.hidden) { mostrar(); return; }
      e.preventDefault();
      ativar(ativa + (e.key === "ArrowDown" ? 1 : -1));
    } else if (e.key === "Enter") {
      if (ativa >= 0 && opcoes[ativa]) { e.preventDefault(); opcoes[ativa].click(); }
    } else if (e.key === "Escape") {
      if (!lista.hidden) { e.preventDefault(); fechar(); }
      else if (campo.value) { campo.value = ""; }
      else campo.blur();
    }
  });

  // o mouse também marca a opção (um só item destacado por vez)
  lista.addEventListener("mousemove", (e) => {
    const op = e.target.closest(".busca-op");
    const i = opcoes.indexOf(op);
    if (i >= 0 && i !== ativa) ativar(i);
  });
  // clicar na lista não tira o foco do campo antes do link abrir
  lista.addEventListener("mousedown", (e) => e.preventDefault());

  document.addEventListener("click", (e) => { if (!caixa.contains(e.target)) fechar(); });
  caixa.addEventListener("focusout", (e) => { if (!caixa.contains(e.relatedTarget)) fechar(); });

  // "/" ou Ctrl+K levam ao campo, de qualquer ponto da tela
  document.addEventListener("keydown", (e) => {
    const ctrlK = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k";
    if (!ctrlK && e.key !== "/") return;
    if (document.querySelector("dialog[open]")) return;
    const alvo = e.target;
    const digitando = alvo instanceof HTMLElement && (alvo.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(alvo.tagName));
    if (!ctrlK && digitando) return;
    e.preventDefault();
    campo.focus();
    campo.select();
  });
})();
