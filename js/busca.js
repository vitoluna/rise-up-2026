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

  /* ---------- Perguntar à IA ----------
     A última opção da lista manda o texto como pergunta ao servidor
     (js/ia.js). A resposta aparece no lugar dos resultados, com links
     para o que ela citar (resolvidos pelo próprio índice da busca). */
  const GRUPO_IA = { host: "Hosts", evento: "Eventos", arquivo: "Arquivos monitorados", requisito: "Requisitos PCI-DSS", tela: "Telas" };
  let pedidoIA = 0;

  function novaOpcao(classe) {
    const a = criar("a", `busca-op ${classe || ""}`.trim());
    a.id = `busca-op-${opcoes.length}`;
    a.tabIndex = -1;
    a.setAttribute("role", "option");
    a.setAttribute("aria-selected", "false");
    opcoes.push(a);
    return a;
  }

  function grupoIA(texto) {
    const grupo = criar("div", "busca-grupo");
    grupo.setAttribute("role", "group");
    grupo.setAttribute("aria-label", "Perguntar à IA");
    grupo.append(criar("p", "busca-grupo-nome", "Perguntar à IA"));
    const op = novaOpcao("busca-op-ia");
    op.dataset.pergunta = texto.slice(0, 300);
    const corpo = criar("span", "busca-corpo");
    corpo.append(criar("b", "busca-titulo", `“${texto}”`), criar("span", "busca-detalhe", "A IA responde com base nos dados do SecView"));
    op.append(window.SecViewIA.icone(), corpo);
    grupo.append(op);
    return grupo;
  }

  async function perguntar(pergunta) {
    const IA = window.SecViewIA;
    const n = ++pedidoIA;
    opcoes = [];
    ativa = -1;
    campo.removeAttribute("aria-activedescendant");
    const area = criar("div", "busca-ia");
    lista.replaceChildren(area);
    lista.hidden = false;
    campo.setAttribute("aria-expanded", "true");
    IA.carregando(area, "A IA está procurando a resposta nos dados…");
    aviso.textContent = "Perguntando à IA.";

    let r;
    try {
      r = await IA.pedir("pergunta", { pergunta });
    } catch (e) {
      if (n !== pedidoIA || !area.isConnected) return;
      IA.erro(area, e.message, () => perguntar(pergunta));
      aviso.textContent = e.message;
      return;
    }
    if (n !== pedidoIA || !area.isConnected) return; // o texto mudou ou a lista fechou

    const bloco = IA.bloco("Resposta da IA");
    bloco.append(criar("p", "busca-ia-pergunta", `“${pergunta}”`));
    r.resposta.split(/\n+/).filter(Boolean).forEach((par) => bloco.append(criar("p", "", par)));

    const vistos = new Set();
    const links = [];
    r.itens.forEach((it) => {
      const grupo = GRUPO_IA[it.tipo];
      const alvo = norm(it.nome);
      const item = indice.find((x) => x.grupo === grupo && x.tituloNorm === alvo) || procurar(it.nome).find((x) => x.grupo === grupo);
      if (item && !vistos.has(item.href)) { vistos.add(item.href); links.push(item); }
    });
    if (links.length) {
      const g = criar("div", "busca-ia-links");
      g.append(criar("h4", "", "Abrir"));
      links.slice(0, 5).forEach((item) => {
        const a = novaOpcao();
        a.href = item.href;
        const corpo = criar("span", "busca-corpo");
        corpo.append(criar("b", "busca-titulo", item.titulo), criar("span", "busca-detalhe", item.detalhe));
        a.append(corpo);
        if (item.sev && SEV[item.sev]) a.append(criar("span", `badge b-${item.sev}`, SEV[item.sev]));
        g.append(a);
      });
      bloco.append(g);
    }
    bloco.append(IA.nota());
    area.replaceChildren(bloco);
    aviso.textContent = `Resposta da IA: ${r.resposta}`;
  }

  function mostrar() {
    const texto = campo.value.trim();
    if (!texto) { fechar(); aviso.textContent = ""; return; }

    const achados = procurar(texto);
    const termo = norm(texto).split(/\s+/)[0];
    lista.replaceChildren();
    opcoes = [];

    const comIA = Boolean(window.SecViewIA) && texto.length >= 3;

    if (!achados.length) {
      const vazio = criar("p", "busca-vazio");
      vazio.append("Nada encontrado para ", criar("b", "", `“${texto}”`), comIA
        ? ". Faça a pergunta à IA, que responde com base nos dados do SecView."
        : ". Tente o nome de uma tela, um host (host-db-01), um evento (brute force) ou um arquivo (/etc/passwd).");
      lista.append(vazio);
      if (comIA) lista.append(grupoIA(texto));
      aviso.textContent = comIA ? "Nenhum resultado. Opção: perguntar à IA." : "Nenhum resultado.";
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
      if (comIA) lista.append(grupoIA(texto));
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
  // a opção "Perguntar à IA" não é link: pergunta ao servidor
  lista.addEventListener("click", (e) => {
    const op = e.target.closest(".busca-op-ia");
    if (!op) return;
    e.preventDefault();
    perguntar(op.dataset.pergunta);
  });
  // clicar na lista não tira o foco do campo antes do link abrir
  lista.addEventListener("mousedown", (e) => e.preventDefault());

  // composedPath: o clique pode trocar o conteúdo da lista (ex.: Perguntar à IA)
  // antes de chegar aqui, e aí o alvo já saiu da página
  document.addEventListener("click", (e) => { if (!e.composedPath().includes(caixa)) fechar(); });
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
