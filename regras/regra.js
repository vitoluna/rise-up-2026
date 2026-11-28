const NOMES_SEV = { critico: "Crítico", alto: "Alto", medio: "Médio", info: "Info" };

const $ = (id) => document.getElementById(id);
const el = {
  form: $("form"), nome: $("nome"), tipo: $("tipo"), valor: $("valor"), rotulo: $("rotulo-valor"),
  severidade: $("severidade"), msg: $("msg"), lista: $("lista"), contagem: $("contagem"), restaurar: $("restaurar"),
};

let regras = lerRegras();

function criar(tag, classe, texto) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

function descrever(r) {
  return r.tipo === "login"
    ? `Senha errada ${r.valor} ${Number(r.valor) === 1 ? "vez" : "vezes"} seguidas`
    : `Evento ou origem contém "${r.valor}"`;
}

function mostrar(texto, tipo) {
  el.msg.textContent = texto;
  el.msg.className = `msg ${tipo || ""}`;
}

function persistir() {
  salvarRegras(regras);
  renderizar();
}

/* ---------- Lista ---------- */
function renderizar() {
  el.contagem.textContent = `${regras.length} ${regras.length === 1 ? "regra" : "regras"}`;

  if (regras.length === 0) {
    const tr = criar("tr");
    const td = criar("td", "vazio", "Nenhuma regra criada. Adicione uma acima ou restaure o padrão.");
    td.colSpan = 5;
    tr.append(td);
    el.lista.replaceChildren(tr);
    return;
  }

  el.lista.replaceChildren(...regras.map((r) => {
    const tr = criar("tr", r.ativa ? "" : "inativa");

    const check = criar("input");
    check.type = "checkbox";
    check.checked = r.ativa;
    check.setAttribute("aria-label", `Ativar regra ${r.nome}`);
    check.addEventListener("change", () => { r.ativa = check.checked; persistir(); });
    const tdCheck = criar("td"); tdCheck.append(check);

    const tdSev = criar("td");
    tdSev.append(criar("span", `badge b-${r.severidade}`, NOMES_SEV[r.severidade]));

    const excluir = criar("button", "excluir", "Excluir");
    excluir.type = "button";
    excluir.setAttribute("aria-label", `Excluir regra ${r.nome}`);
    excluir.addEventListener("click", () => {
      regras = regras.filter((x) => x.id !== r.id);
      persistir();
      mostrar("Regra excluída.", "ok");
    });
    const tdAcao = criar("td"); tdAcao.append(excluir);

    tr.append(tdCheck, criar("td", "nome", r.nome), criar("td", "cond", descrever(r)), tdSev, tdAcao);
    return tr;
  }));
}

/* ---------- Formulário ---------- */
function ajustarCampoValor() {
  const login = el.tipo.value === "login";
  el.rotulo.textContent = login ? "Número de tentativas erradas" : "Texto a procurar";
  el.valor.type = login ? "number" : "text";
  el.valor.placeholder = login ? "" : "ex.: indisponível";
  el.valor.value = login ? "3" : "";
  if (login) { el.valor.min = "1"; el.valor.max = "10"; } else { el.valor.removeAttribute("min"); el.valor.removeAttribute("max"); }
}

el.tipo.addEventListener("change", ajustarCampoValor);

el.form.addEventListener("submit", (ev) => {
  ev.preventDefault();
  const tipo = el.tipo.value;
  let valor = el.valor.value.trim();

  if (tipo === "login") {
    const n = Number(valor);
    if (!Number.isInteger(n) || n < 1 || n > 10) { mostrar("Informe um número de tentativas entre 1 e 10.", "erro"); return; }
    valor = n;
  } else if (valor.length < 2) {
    mostrar("Informe um texto com pelo menos 2 caracteres.", "erro");
    return;
  }

  const nova = { id: `r-${Date.now()}`, nome: "", tipo, valor, severidade: el.severidade.value, ativa: true };
  nova.nome = el.nome.value.trim() || descrever(nova);
  regras = [nova, ...regras];
  persistir();

  el.nome.value = "";
  ajustarCampoValor();
  mostrar("Regra adicionada.", "ok");
});

el.restaurar.addEventListener("click", () => {
  regras = REGRAS_PADRAO.map((r) => ({ ...r }));
  persistir();
  mostrar("Regras padrão restauradas.", "ok");
});

/* ---------- Montar a regra com IA ----------
   O analista descreve em português; a IA só PREENCHE o formulário.
   Nada é salvo até o analista conferir e clicar em "Adicionar regra". */
function montarFormIA() {
  const IA = window.SecViewIA;
  const form = $("form-ia");
  if (!IA || !form) return;

  const campo = criar("label", "campo");
  const entrada = criar("input");
  entrada.id = "ia-descricao";
  entrada.type = "text";
  entrada.maxLength = 300;
  entrada.placeholder = "ex.: 5 senhas erradas seguidas viram alerta alto";
  campo.append(criar("span", "", "Descreva a regra em português e a vigIA preenche os campos abaixo"), entrada);
  const botao = IA.botao("Montar com a vigIA");
  botao.type = "submit";
  form.append(campo, botao);
  form.hidden = false;

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const descricao = entrada.value.trim();
    if (descricao.length < 5) { mostrar("Descreva a regra com pelo menos 5 caracteres.", "erro"); entrada.focus(); return; }

    botao.disabled = true;
    botao.setAttribute("aria-busy", "true");
    mostrar("A vigIA está montando a regra…", "");
    try {
      const r = await IA.pedir("regra", { descricao });
      if (!r.entendeu) {
        mostrar(r.duvida || "A vigIA não entendeu bem esse pedido. Reescreva com mais detalhes.", "erro");
        return;
      }
      el.tipo.value = r.tipo;
      ajustarCampoValor();
      el.valor.value = r.tipo === "login" ? String(r.tentativas) : r.texto;
      el.severidade.value = r.severidade;
      el.nome.value = r.nome;
      mostrar(`A vigIA preencheu o formulário: ${r.explicacao} Confira os campos e clique em "Adicionar regra" para salvar.`, "ok");
      el.form.querySelector('button[type="submit"]').focus();
    } catch (erro) {
      mostrar(erro.message, "erro");
    } finally {
      botao.disabled = false;
      botao.removeAttribute("aria-busy");
    }
  });
}

montarFormIA();
renderizar();