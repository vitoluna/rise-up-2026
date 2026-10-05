/* ==========================================================
   SecView — utilitários compartilhados
   ========================================================== */

window.SecView = (() => {
  // Chaves usadas no localStorage / sessionStorage
  const CHAVES = {
    falhas: "secview_falhas",
    bloqueioAte: "secview_bloqueio_ate",
    senha: "secview_senha", // senha redefinida (SIMULAÇÃO: sem backend)
    sessao: "secview_sessao",
  };

  // localStorage pode falhar (modo privado, política do navegador)
  const ler = (k) => {
    try { return localStorage.getItem(k); } catch { return null; }
  };
  const gravar = (k, v) => {
    try { localStorage.setItem(k, v); } catch { /* ignora */ }
  };
  const remover = (k) => {
    try { localStorage.removeItem(k); } catch { /* ignora */ }
  };

  // Ícones usados nos alertas
  const ICONES = {
    alerta:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 7v6"/><path d="M12 16.5v.01"/></svg>',
    ok:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m8 12.5 3 3 5-6"/></svg>',
  };

  /**
   * Mostra um alerta dentro de um container.
   * tipo: "erro" | "critico" | "ok"
   */
  function mostrarAlerta(el, tipo, titulo, detalhe) {
    el.className = "alerta" + (tipo === "erro" ? "" : " alerta--" + tipo);
    el.innerHTML = tipo === "ok" ? ICONES.ok : ICONES.alerta;

    const corpo = document.createElement("div");
    const t = document.createElement("strong");
    t.textContent = titulo;
    corpo.appendChild(t);

    if (detalhe) {
      const d = document.createElement("span");
      d.textContent = detalhe;
      corpo.appendChild(d);
    }
    el.appendChild(corpo);
    el.hidden = false;
  }

  function esconderAlerta(el) {
    el.hidden = true;
    el.textContent = "";
  }

  /**
   * Liga os botões de olhinho.
   * <button data-olho="id-do-input"> alterna type password <-> text
   */
  function configurarOlhos() {
    document.querySelectorAll("[data-olho]").forEach((btn) => {
      const input = document.getElementById(btn.dataset.olho);
      if (!input) return;

      btn.addEventListener("click", () => {
        const mostrar = input.type === "password";
        input.type = mostrar ? "text" : "password";
        btn.setAttribute("aria-pressed", String(mostrar));
        btn.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha");
      });
    });
  }

  /* ---------- Sessão (simulada) ---------- */
  // O login grava { usuario, entrada } no sessionStorage; as telas internas
  // chamam exigirSessao() e voltam para o login se não houver sessão.
  function sessaoAtiva() {
    try {
      const dados = JSON.parse(sessionStorage.getItem(CHAVES.sessao) || "null");
      return Boolean(dados && dados.usuario);
    } catch {
      return false;
    }
  }

  function exigirSessao(urlLogin = "login.html") {
    if (!sessaoAtiva()) window.location.replace(urlLogin);

    // Voltar pelo botão do navegador pode reabrir a tela do cache após o logout
    window.addEventListener("pageshow", (e) => {
      if (e.persisted && !sessaoAtiva()) window.location.replace(urlLogin);
    });
  }

  function sair(urlLogin = "login.html") {
    try { sessionStorage.removeItem(CHAVES.sessao); } catch { /* ignora */ }
    window.location.href = urlLogin;
  }

  return { CHAVES, ler, gravar, remover, mostrarAlerta, esconderAlerta, configurarOlhos, sessaoAtiva, exigirSessao, sair };
})();
