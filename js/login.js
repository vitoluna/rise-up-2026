/* ==========================================================
   SecView — lógica da tela de Login
   Autenticação SIMULADA (sem backend), conforme o escopo do projeto.
   ========================================================== */

(() => {
  const { CHAVES, ler, gravar, remover, mostrarAlerta, esconderAlerta, configurarOlhos } = window.SecView;

  /* ---------- Configuração ---------- */
  const CONFIG = {
    emailDemo: "secview@gmail.com",   // usuário simulado
    senhaDemo: "@Sec123",             // senha inicial (pode ser trocada em "Redefinir senha")
    falhasParaBloquear: 4,            // a 4ª falha bloqueia → após a 3ª o usuário é avisado
    bloqueioSegundos: 60,             // duração do bloqueio
    destino: "dashboard.html",        // para onde ir após logar
  };

  /* ---------- Elementos ---------- */
  const form = document.getElementById("form-login");
  const inputEmail = document.getElementById("email");
  const inputSenha = document.getElementById("senha");
  const campoEmail = document.getElementById("campo-email");
  const campoSenha = document.getElementById("campo-senha");
  const erroEmail = document.getElementById("erro-email");
  const erroSenha = document.getElementById("erro-senha");
  const btnEntrar = document.getElementById("btn-entrar");
  const alerta = document.getElementById("alerta");
  const botoesSociais = document.querySelectorAll(".btn-social");

  let timerBloqueio = null;

  configurarOlhos();

  /* ---------- Helpers ---------- */
  const emailValido = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const senhaAtual = () => ler(CHAVES.senha) || CONFIG.senhaDemo;

  const getFalhas = () => Number(ler(CHAVES.falhas)) || 0;

  function setErroCampo(campo, msgEl, texto) {
    campo.classList.toggle("invalido", Boolean(texto));
    msgEl.textContent = texto || "";
    campo.querySelector("input").setAttribute("aria-invalid", texto ? "true" : "false");
  }

  function limparErros() {
    setErroCampo(campoEmail, erroEmail, "");
    setErroCampo(campoSenha, erroSenha, "");
  }

  function formatarTempo(seg) {
    const m = Math.floor(seg / 60);
    const s = String(seg % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  function travarFormulario(travar) {
    inputEmail.disabled = travar;
    inputSenha.disabled = travar;
    btnEntrar.disabled = travar;
    botoesSociais.forEach((b) => { b.disabled = travar; });
  }

  /* ---------- Aviso de tentativas restantes ---------- */
  function mostrarTentativas(falhas) {
    const restantes = CONFIG.falhasParaBloquear - falhas;

    if (restantes <= 1) {
      // Última chance: destaque máximo
      mostrarAlerta(
        alerta,
        "critico",
        "Senha ou e-mail incorretos.",
        "Você possui mais 1 tentativa antes de bloquear. Na próxima falha, o acesso será bloqueado por " +
          CONFIG.bloqueioSegundos + " segundos."
      );
    } else {
      mostrarAlerta(
        alerta,
        "erro",
        "Senha ou e-mail incorretos.",
        `Você possui mais ${restantes} tentativas antes de bloquear.`
      );
    }
  }

  /* ---------- Bloqueio ---------- */
  function iniciarBloqueio(ateTimestamp) {
    travarFormulario(true);
    clearInterval(timerBloqueio);

    const atualizar = () => {
      const restante = Math.ceil((ateTimestamp - Date.now()) / 1000);

      if (restante <= 0) {
        clearInterval(timerBloqueio);
        remover(CHAVES.bloqueioAte);
        remover(CHAVES.falhas);
        travarFormulario(false);
        mostrarAlerta(alerta, "ok", "Acesso liberado.", "Você já pode tentar entrar novamente.");
        inputEmail.focus();
        return;
      }

      mostrarAlerta(
        alerta,
        "critico",
        "Acesso bloqueado temporariamente.",
        `Muitas tentativas incorretas. Tente novamente em ${formatarTempo(restante)}.`
      );
    };

    atualizar();
    timerBloqueio = setInterval(atualizar, 500);
  }

  function bloquear() {
    const ate = Date.now() + CONFIG.bloqueioSegundos * 1000;
    gravar(CHAVES.bloqueioAte, String(ate));
    inputSenha.value = "";
    iniciarBloqueio(ate);
  }

  function registrarFalha() {
    const falhas = getFalhas() + 1;
    gravar(CHAVES.falhas, String(falhas));

    if (falhas >= CONFIG.falhasParaBloquear) {
      bloquear();
      return;
    }

    mostrarTentativas(falhas);
    inputSenha.value = "";
    inputSenha.focus();
  }

  /* ---------- Sucesso ---------- */
  function entrar(email) {
    remover(CHAVES.falhas);
    remover(CHAVES.bloqueioAte);

    try {
      sessionStorage.setItem(
        CHAVES.sessao,
        JSON.stringify({ usuario: email, entrada: new Date().toISOString() })
      );
    } catch { /* ignora */ }

    travarFormulario(true);
    btnEntrar.textContent = "Entrando…";
    mostrarAlerta(alerta, "ok", "Login realizado com sucesso.", "Redirecionando para o dashboard…");

    setTimeout(() => { window.location.href = CONFIG.destino; }, 800);
  }

  /* ---------- Envio do formulário ---------- */
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (inputEmail.disabled) return; // bloqueado

    limparErros();
    esconderAlerta(alerta);

    const email = inputEmail.value.trim();
    const senha = inputSenha.value;
    let primeiroInvalido = null;

    // Validação de formato (não conta como tentativa falha)
    if (!email) {
      setErroCampo(campoEmail, erroEmail, "Informe seu e-mail.");
      primeiroInvalido = inputEmail;
    } else if (!emailValido(email)) {
      setErroCampo(campoEmail, erroEmail, "Digite um e-mail válido.");
      primeiroInvalido = inputEmail;
    }

    if (!senha) {
      setErroCampo(campoSenha, erroSenha, "Informe sua senha.");
      primeiroInvalido = primeiroInvalido || inputSenha;
    }

    if (primeiroInvalido) {
      primeiroInvalido.focus();
      return;
    }

    // Conferência das credenciais (simulada)
    const ok = email.toLowerCase() === CONFIG.emailDemo && senha === senhaAtual();

    if (ok) {
      entrar(email);
    } else {
      registrarFalha();
    }
  });

  /* ---------- Entrar com Google / Apple (SIMULADO) ---------- */
  botoesSociais.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;

      const provedor = btn.dataset.provedor;
      limparErros();
      mostrarAlerta(alerta, "ok", `Conectando com ${provedor}…`, "Login social simulado, sem conta real.");
      entrar(`Conta ${provedor} (simulada)`);
    });
  });

  // Limpa o erro do campo assim que o usuário volta a digitar
  inputEmail.addEventListener("input", () => setErroCampo(campoEmail, erroEmail, ""));
  inputSenha.addEventListener("input", () => setErroCampo(campoSenha, erroSenha, ""));

  /* ---------- Estado inicial (ao carregar / recarregar) ---------- */
  (function iniciar() {
    // Veio da tela de redefinir senha?
    const params = new URLSearchParams(window.location.search);
    const bloqueioSalvo = Number(ler(CHAVES.bloqueioAte)) || 0;

    if (bloqueioSalvo > Date.now()) {
      // Continua bloqueado mesmo após recarregar a página
      iniciarBloqueio(bloqueioSalvo);
      return;
    }

    if (bloqueioSalvo) {
      // Bloqueio já expirou
      remover(CHAVES.bloqueioAte);
      remover(CHAVES.falhas);
    }

    if (params.get("senha") === "alterada") {
      mostrarAlerta(alerta, "ok", "Senha alterada com sucesso.", "Entre com a sua nova senha.");
      return;
    }

    const falhas = getFalhas();
    if (falhas > 0) mostrarTentativas(falhas);
  })();
})();