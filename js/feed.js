/* ---------- Configuração ---------- */
// Severidades e eventos vêm de js/dados.js (compartilhado com Dashboard e Compliance)
const SEVERIDADES = window.SecViewDados.SEVERIDADES;
const MAX_EVENTOS = 100;   // limite do feed
const INTERVALO_MS = 2500; // frequência da simulação

/* ---------- Dados de exemplo ----------
   Os modelos vêm dos eventos compartilhados (hosts e descrições iguais aos do Compliance).
   Troque gerarEvento() pela sua fonte real (fetch, WebSocket, SSE).
   Formato: { id, data: Date, evento, origem, severidade } */
const MODELOS = window.SecViewDados.EVENTOS.map((e) => ({
  evento: e.descricao,
  origem: e.origem,
  severidade: e.severidade,
}));

let contador = 0;
function gerarEvento() {
  const modelo = MODELOS[Math.floor(Math.random() * MODELOS.length)];
  contador += 1;
  const ev = { id: contador, data: new Date(), ...modelo };
  ev.severidade = severidadePorRegras(ev); // aplica as regras customizadas
  return ev;
}

/* ---------- Estado ---------- */
let eventos = [];      // o mais novo fica na posição 0
let pausado = false;
let filtro = "todos";
let timer = null;
let pausadoPeloPainel = false; // o feed para enquanto a recomendação está aberta
const feitas = new Map();       // id do alerta → ações já marcadas (só em memória)

/* ---------- Elementos ---------- */
const $ = (id) => document.getElementById(id);
const el = {
  placar: $("placar"), placarN: $("placar-n"), placarT: $("placar-t"),
  total: $("total"), sevLista: $("sev-lista"), ultimo: $("ultimo"),
  ponto: $("ponto"), statusTxt: $("status-txt"), atual: $("atual"),
  filtro: $("filtro"), btnPausa: $("btn-pausa"), corpo: $("corpo"), limite: $("limite"),
  rec: $("rec"), recTitulo: $("rec-titulo"), recMeta: $("rec-meta"), recPrior: $("rec-prior"),
  recOque: $("rec-oque"), recAcoes: $("rec-acoes"), recProg: $("rec-prog"), recRefs: $("rec-refs"),
};

/* ---------- Utilitários ---------- */
function formatarHora(data) {
  return data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function criar(tag, classe, texto) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

function badge(severidade) {
  return criar("span", `badge b-${severidade}`, SEVERIDADES[severidade]);
}

/* ---------- Renderização ---------- */
function renderizar() {
  // contagem por severidade (sempre sobre todos os eventos, sem filtro)
  const contagem = { critico: 0, alto: 0, medio: 0, info: 0 };
  eventos.forEach((e) => { contagem[e.severidade] += 1; });
  const criticos = contagem.critico;

  // placar de críticos
  el.placarN.textContent = criticos;
  el.placarT.textContent = criticos === 1 ? "crítico" : "críticos";
  el.placar.classList.toggle("tem-critico", criticos > 0);

  // cards
  el.total.textContent = eventos.length;

  el.sevLista.replaceChildren(
    ...Object.entries(SEVERIDADES).map(([chave, nome]) => {
      const li = criar("li");
      const lado = criar("span", "sev-nome");
      lado.append(criar("span", `sev-ponto p-${chave}`), nome);
      li.append(lado, criar("span", "sev-n", contagem[chave]));
      return li;
    })
  );

  const ult = eventos[0];
  if (ult) {
    el.ultimo.replaceChildren(
      criar("p", "card-evento", ult.evento),
      criar("p", "card-sub", `${ult.origem} · ${formatarHora(ult.data)}`),
      badge(ult.severidade)
    );
    el.atual.textContent = ` · última atualização às ${formatarHora(ult.data)}`;
  } else {
    el.ultimo.replaceChildren(criar("p", "card-sub", "Aguardando o primeiro alerta."));
  }

  // tabela (aplica o filtro)
  const visiveis = filtro === "todos" ? eventos : eventos.filter((e) => e.severidade === filtro);

  if (visiveis.length === 0) {
    const tr = criar("tr");
    const td = criar("td", "vazio", "Nenhum alerta com essa severidade. Escolha outro filtro para ver mais eventos.");
    td.colSpan = 5;
    tr.append(td);
    el.corpo.replaceChildren(tr);
    return;
  }

  el.corpo.replaceChildren(
    ...visiveis.map((e) => {
      const tr = criar("tr", e.severidade === "critico" ? "linha-critica" : "");
      const tdSev = criar("td");
      tdSev.append(badge(e.severidade));
      const tdRec = criar("td");
      const btn = criar("button", `botao-rec${e.severidade === "critico" ? " destaque" : ""}`, "Ver recomendação");
      btn.type = "button";
      btn.dataset.id = e.id;
      btn.setAttribute("aria-label", `Ver recomendação para ${e.evento} em ${e.origem}`);
      tdRec.append(btn);
      tr.append(
        criar("td", "hora", formatarHora(e.data)),
        criar("td", "", e.evento),
        criar("td", "origem", e.origem),
        tdSev,
        tdRec
      );
      return tr;
    })
  );
}

/* ---------- Feed: iniciar / pausar ---------- */
function iniciarFeed() {
  timer = setInterval(() => {
    eventos = [gerarEvento(), ...eventos].slice(0, MAX_EVENTOS);
    renderizar();
  }, INTERVALO_MS);
}

function pararFeed() {
  clearInterval(timer);
  timer = null;
}

function atualizarPausa() {
  el.btnPausa.textContent = pausado ? "Retomar" : "Pausar";
  el.btnPausa.setAttribute("aria-pressed", String(pausado));
  const parado = pausado || pausadoPeloPainel;
  el.statusTxt.textContent = parado ? "Feed pausado" : "Ao vivo";
  el.ponto.classList.toggle("parado", parado);
}

/* ---------- Eventos de interface ---------- */
el.btnPausa.addEventListener("click", () => {
  pausado = !pausado;
  pausado ? pararFeed() : iniciarFeed();
  atualizarPausa();
});

el.filtro.addEventListener("change", () => {
  filtro = el.filtro.value;
  renderizar();
});


/* ---------- Painel de recomendação ---------- */
let alertaAberto = null;

function renderizarAcoes() {
  const rec = window.SecViewRecomendacoes.para(alertaAberto);
  const marcadas = feitas.get(alertaAberto.id) ?? new Set();

  el.recAcoes.replaceChildren(
    ...rec.acoes.map((texto, i) => {
      const li = criar("li");
      const rotulo = criar("label", marcadas.has(i) ? "feita" : "");
      const caixa = document.createElement("input");
      caixa.type = "checkbox";
      caixa.checked = marcadas.has(i);
      caixa.addEventListener("change", () => {
        const atual = feitas.get(alertaAberto.id) ?? new Set();
        caixa.checked ? atual.add(i) : atual.delete(i);
        feitas.set(alertaAberto.id, atual);
        renderizarAcoes();
        el.recAcoes.querySelectorAll("input")[i]?.focus(); // o render recria a lista
      });
      rotulo.append(caixa, criar("span", "", texto));
      li.append(rotulo);
      return li;
    })
  );
  el.recProg.textContent = `${marcadas.size} de ${rec.acoes.length} concluídas`;
}

function abrirRecomendacao(id) {
  const alerta = eventos.find((e) => e.id === id);
  if (!alerta) return;
  alertaAberto = alerta;
  const rec = window.SecViewRecomendacoes.para(alerta);

  el.recTitulo.textContent = alerta.evento;
  el.recMeta.replaceChildren(
    badge(alerta.severidade),
    document.createTextNode(` ${alerta.origem} · ${formatarHora(alerta.data)}`)
  );
  el.recPrior.textContent = `Prioridade: ${rec.prioridade}`;
  el.recPrior.className = `rec-prior p-${alerta.severidade}`;
  el.recOque.textContent = rec.oQue;

  // referências (MITRE ATT&CK e PCI-DSS)
  const refs = [];
  if (rec.mitre) refs.push(criar("span", "chip", `MITRE ATT&CK · ${rec.mitre.id} ${rec.mitre.nome}`));
  if (rec.pci) refs.push(criar("span", "chip", `PCI-DSS · Requisito ${rec.pci}`));
  el.recRefs.replaceChildren(...refs);
  el.recRefs.hidden = refs.length === 0;

  renderizarAcoes();

  // pausa o feed para a tabela não mudar por baixo do painel
  if (!pausado && timer) {
    pararFeed();
    pausadoPeloPainel = true;
    atualizarPausa();
  }
  el.rec.showModal();
}

function fecharRecomendacao() {
  el.rec.close();
}

el.rec.addEventListener("close", () => {
  alertaAberto = null;
  if (pausadoPeloPainel) {
    pausadoPeloPainel = false;
    if (!pausado) iniciarFeed();
    atualizarPausa();
  }
});

// clique fora do painel fecha
el.rec.addEventListener("click", (e) => {
  if (e.target === el.rec) fecharRecomendacao();
});
$("rec-fechar").addEventListener("click", fecharRecomendacao);
$("rec-ok").addEventListener("click", fecharRecomendacao);

// botão "Ver recomendação" de cada linha
el.corpo.addEventListener("click", (e) => {
  const btn = e.target.closest(".botao-rec");
  if (btn) abrirRecomendacao(Number(btn.dataset.id));
});

/* ---------- Início ---------- */
function iniciar() {
  // opções do filtro
  el.filtro.append(new Option("Todas", "todos"));
  Object.entries(SEVERIDADES).forEach(([chave, nome]) => el.filtro.append(new Option(nome, chave)));

  el.limite.textContent = `Mostrando até ${MAX_EVENTOS} alertas recentes`;

  // 8 eventos iniciais, espaçados de 15 s para trás (mais novo no topo)
  const agora = Date.now();
  eventos = Array.from({ length: 8 }, (_, i) => {
    const e = gerarEvento();
    e.data = new Date(agora - (8 - i) * 15000);
    return e;
  }).reverse();

  atualizarPausa();
  renderizar();
  iniciarFeed();
}

iniciar();