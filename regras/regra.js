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

renderizar();