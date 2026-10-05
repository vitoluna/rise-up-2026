/* ==========================================================
   SecView — lógica da tela de Redefinir Senha
   SIMULAÇÃO: a nova senha fica no localStorage do navegador
   (num sistema real, isso seria enviado a um servidor).
   ========================================================== */

(() => {
  const { CHAVES, gravar, remover, configurarOlhos } = window.SecView;

  const REDIRECIONAR_EM_MS = 2000;

  /* ---------- Requisitos da senha ---------- */
  const REQUISITOS = [
    { id: "tamanho",   texto: "8 caracteres",     testar: (s) => s.length >= 8 },
    { id: "minuscula", texto: "Letra minúscula",  testar: (s) => /[a-z]/.test(s) },
    { id: "maiuscula", texto: "Letra maiúscula",  testar: (s) => /[A-Z]/.test(s) },
    { id: "numero",    texto: "Número",           testar: (s) => /\d/.test(s) },
    { id: "simbolo",   texto: "Símbolo (@#&)",    testar: (s) => /[^A-Za-z0-9\s]/.test(s) },
  ];

  const ICONES = {
    neutro: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/></svg>',
    ok:     '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m8 12.5 3 3 5-6"/></svg>',
    falha:  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 7v6"/><path d="M12 16.5v.01"/></svg>',
  };

  const ROTULO_ESTADO = { neutro: "pendente", ok: "atendido", falha: "não atendido" };

  /* ---------- Elementos ---------- */
  const form = document.getElementById("form-redefinir");
  const inputSenha = document.getElementById("senha");
  const inputConfirmar = document.getElementById("confirmar");
  const campoConfirmar = document.getElementById("campo-confirmar");
  const erroConfirmar = document.getElementById("erro-confirmar");
  const lista = document.getElementById("lista-requisitos");
  const btnConfirmar = document.getElementById("btn-confirmar");
  const sucesso = document.getElementById("sucesso");

  configurarOlhos();

  /* ---------- Renderiza a lista de requisitos ---------- */
  const itens = REQUISITOS.map((r) => {
    const li = document.createElement("li");
    li.dataset.estado = "neutro";
    li.innerHTML = ICONES.neutro;

    const span = document.createElement("span");
    span.textContent = r.texto;
    li.appendChild(span);

    const sr = document.createElement("span");
    sr.className = "sr-only";
    li.appendChild(sr);

    lista.appendChild(li);
    return { ...r, li, sr };
  });

  function setEstado(item, estado) {
    if (item.li.dataset.estado === estado) return;
    item.li.dataset.estado = estado;
    item.li.firstElementChild.outerHTML = ICONES[estado];
    item.sr.textContent = ` (${ROTULO_ESTADO[estado]})`;
  }

  /* ---------- Validação ---------- */
  function senhaForte(s) {
    return REQUISITOS.every((r) => r.testar(s));
  }

  function atualizarRequisitos() {
    const s = inputSenha.value;
    itens.forEach((item) => {
      if (!s) return setEstado(item, "neutro");
      setEstado(item, item.testar(s) ? "ok" : "falha");
    });
  }

  function atualizarConfirmacao() {
    const s = inputSenha.value;
    const c = inputConfirmar.value;
    const diferente = c.length > 0 && c !== s;

    campoConfirmar.classList.toggle("invalido", diferente);
    inputConfirmar.setAttribute("aria-invalid", diferente ? "true" : "false");
    erroConfirmar.textContent = diferente ? "As senhas não coincidem." : "";
  }

  function atualizarBotao() {
    const s = inputSenha.value;
    const c = inputConfirmar.value;
    btnConfirmar.disabled = !(senhaForte(s) && c === s);
  }

  function atualizarTudo() {
    atualizarRequisitos();
    atualizarConfirmacao();
    atualizarBotao();
  }

  inputSenha.addEventListener("input", atualizarTudo);
  inputConfirmar.addEventListener("input", atualizarTudo);

  /* ---------- Envio ---------- */
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const s = inputSenha.value;
    const c = inputConfirmar.value;

    // Revalida (caso alguém force o botão habilitado)
    if (!senhaForte(s)) {
      atualizarRequisitos();
      inputSenha.focus();
      return;
    }
    if (s !== c) {
      atualizarConfirmacao();
      inputConfirmar.focus();
      return;
    }

    // Salva a nova senha (simulação) e libera o login
    gravar(CHAVES.senha, s);
    remover(CHAVES.falhas);
    remover(CHAVES.bloqueioAte);

    form.hidden = true;
    sucesso.hidden = false;

    setTimeout(() => {
      window.location.href = "login.html?senha=alterada";
    }, REDIRECIONAR_EM_MS);
  });
})();
