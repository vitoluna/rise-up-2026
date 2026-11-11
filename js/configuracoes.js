/* ==========================================================
   SecView — tela de Configurações
   Lê e grava as preferências por js/preferencias.js; cada mudança
   vale na hora (o <html> é remarcado) e fica salva no navegador.
   Conta: só interface — trocar e excluir confirmam e saem para o login.
   ========================================================== */

(() => {
  const P = window.SecViewPreferencias;
  const $ = (sel) => document.querySelector(sel);
  const form = $("#prefs");

  // Blocos do Dashboard (mesmos data-secao de index.html)
  const SECOES = [
    ["kpis", "Indicadores do topo"],
    ["alertas-incidentes", "Alertas e incidentes"],
    ["categorias", "Alertas por categoria"],
    ["abertos-resolvidos", "Abertos vs. resolvidos"],
    ["severidade-hosts", "Severidade e hosts"],
    ["conformidade", "Conformidade PCI-DSS"],
    ["mitre", "Táticas MITRE ATT&CK"],
  ];

  /* ---------- Montagem ---------- */
  $("#inicio").replaceChildren(...P.PAGINAS.map((p) => new Option(p.nome, p.href)));

  $("#secoes").replaceChildren(...SECOES.map(([id, nome]) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.name = "secao";
    input.value = id;
    label.append(input, document.createTextNode(nome));
    return label;
  }));

  // E-mail da sessão (gravado pelo login)
  try {
    const sessao = JSON.parse(sessionStorage.getItem(SecView.CHAVES.sessao) || "null");
    if (sessao && sessao.usuario) {
      $("#email").textContent = sessao.usuario;
      $("#dlg-email").textContent = sessao.usuario;
    }
  } catch { /* sem sessão legível: mantém o texto padrão */ }

  /* ---------- Formulário ⇄ preferências ---------- */
  function preencher(p) {
    form.querySelectorAll('input[type="radio"]').forEach((r) => { r.checked = p[r.name] === r.value; });
    form.contraste.checked = p.contraste;
    form.movimento.checked = p.movimento;
    form.links.checked = p.links;
    form.menu.checked = p.menu === "compacto";
    form.inicio.value = p.inicio;
    form.daltonismo.value = p.daltonismo;
    form.querySelectorAll('input[name="secao"]').forEach((c) => { c.checked = !p.dashOcultas.includes(c.value); });
  }

  function lerFormulario() {
    const marcado = (nome) => (form.querySelector(`input[name="${nome}"]:checked`) || {}).value;
    return {
      tema: marcado("tema"),
      texto: marcado("texto"),
      densidade: marcado("densidade"),
      contraste: form.contraste.checked,
      movimento: form.movimento.checked,
      links: form.links.checked,
      menu: form.menu.checked ? "compacto" : "completo",
      inicio: form.inicio.value,
      daltonismo: form.daltonismo.value,
      dashOcultas: [...form.querySelectorAll('input[name="secao"]')].filter((c) => !c.checked).map((c) => c.value),
    };
  }

  let timer = 0;
  function avisarSalvo(texto = "Preferências salvas") {
    const el = $("#salvo");
    el.textContent = texto;
    clearTimeout(timer);
    timer = setTimeout(() => { el.textContent = ""; }, 2500);
  }

  form.addEventListener("change", () => {
    P.salvar(lerFormulario());
    avisarSalvo();
  });
  form.addEventListener("submit", (e) => e.preventDefault());

  $("#restaurar").addEventListener("click", () => {
    preencher(P.restaurar());
    avisarSalvo("Padrões restaurados");
  });

  // Outra aba mudou as preferências: reflete aqui
  window.addEventListener("storage", () => preencher(P.ler()));

  preencher(P.ler());

  /* ---------- Índice acompanha a rolagem ---------- */
  const links = [...document.querySelectorAll(".config-indice a")];
  const marcarIndice = (id) => links.forEach((a) => a.setAttribute("aria-current", String(a.hash === "#" + id)));
  marcarIndice("aparencia");
  if ("IntersectionObserver" in window) {
    const obs = new IntersectionObserver((entradas) => {
      const visivel = entradas.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visivel) marcarIndice(visivel.target.id);
    }, { rootMargin: "0px 0px -60% 0px" });
    document.querySelectorAll(".config-secoes .panel").forEach((s) => obs.observe(s));
  }
  links.forEach((a) => a.addEventListener("click", () => marcarIndice(a.hash.slice(1))));

  /* ---------- Conta (só interface) ---------- */
  const dlgTrocar = $("#dlg-trocar");
  const dlgExcluir = $("#dlg-excluir");
  const confirmaTexto = $("#confirma-texto");
  const btnExcluir = $("#confirmar-excluir");

  $("#btn-trocar").addEventListener("click", () => dlgTrocar.showModal());
  $("#confirmar-trocar").addEventListener("click", () => SecView.sair("login.html"));

  $("#btn-excluir").addEventListener("click", () => {
    confirmaTexto.value = "";
    btnExcluir.disabled = true;
    dlgExcluir.showModal();
    confirmaTexto.focus();
  });
  confirmaTexto.addEventListener("input", () => {
    btnExcluir.disabled = confirmaTexto.value.trim().toUpperCase() !== "EXCLUIR";
  });
  btnExcluir.addEventListener("click", () => {
    if (!btnExcluir.disabled) SecView.sair("login.html");
  });
})();
