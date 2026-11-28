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
function gerarEvento(modelos = MODELOS) {
  const modelo = modelos[Math.floor(Math.random() * modelos.length)];
  contador += 1;
  const ev = { id: contador, data: new Date(), ...modelo };
  ev.severidade = severidadePorRegras(ev); // aplica as regras customizadas
  return ev;
}

/* ---------- Estado ---------- */
let eventos = [];      // o mais novo fica na posição 0
let pausado = false;
let filtro = "todos";
let busca = "";        // texto do campo "Buscar no feed" (evento ou host), já normalizado
let timer = null;
let pausadoPeloPainel = false; // o feed para enquanto a recomendação está aberta
const feitas = new Map();       // id do alerta → ações já marcadas (só em memória)

/* ---------- Elementos ---------- */
const $ = (id) => document.getElementById(id);
const el = {
  placar: $("placar"), placarN: $("placar-n"), placarT: $("placar-t"),
  total: $("total"), sevLista: $("sev-lista"), ultimo: $("ultimo"),
  ponto: $("ponto"), statusTxt: $("status-txt"), atual: $("atual"),
  filtro: $("filtro"), busca: $("busca-feed"), btnPausa: $("btn-pausa"), corpo: $("corpo"), limite: $("limite"),
  rec: $("rec"), recTitulo: $("rec-titulo"), recMeta: $("rec-meta"), recPrior: $("rec-prior"),
  recOque: $("rec-oque"), recAcoes: $("rec-acoes"), recProg: $("rec-prog"), recRefs: $("rec-refs"),
  recIa: $("rec-ia"),
};

/* ---------- Utilitários ---------- */
// minúsculas e sem acento, para a busca não depender de "é" ou "E"
const norm = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const combina = (e) => !busca || norm(`${e.evento} ${e.origem}`).includes(busca);

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

  // tabela (aplica a severidade e a busca por texto)
  const visiveis = eventos.filter((e) => (filtro === "todos" || e.severidade === filtro) && combina(e));

  if (visiveis.length === 0) {
    const tr = criar("tr");
    const td = criar("td", "vazio", busca
      ? `Nenhum alerta com “${el.busca.value.trim()}” no feed agora. Limpe a busca ou aguarde: novos alertas entram a cada instante.`
      : "Nenhum alerta com essa severidade. Escolha outro filtro para ver mais eventos.");
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
// Alertas das regras de login (fila preenchida pela tela de login, js em regras/regrabase.js).
// Já chegam com a severidade da regra; as regras de texto não mudam essa severidade.
function alertasDoLogin() {
  return consumirAlertasLogin().reverse().map((a) => {
    contador += 1;
    return { id: contador, ...a };
  });
}

function iniciarFeed() {
  timer = setInterval(() => {
    eventos = [gerarEvento(), ...alertasDoLogin(), ...eventos].slice(0, MAX_EVENTOS);
    renderizar();
  }, INTERVALO_MS);
}

// Login errado em outra aba: o alerta aparece aqui na hora (se o feed não estiver pausado)
window.addEventListener("storage", (e) => {
  if (e.key !== CHAVE_ALERTAS_LOGIN || pausado || pausadoPeloPainel) return;
  const novos = alertasDoLogin();
  if (!novos.length) return;
  eventos = [...novos, ...eventos].slice(0, MAX_EVENTOS);
  renderizar();
});

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

el.busca.addEventListener("input", () => {
  busca = norm(el.busca.value);
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

/* ---------- Análise com IA (painel de recomendação) ----------
   Só roda quando o analista pede. O resultado fica guardado por alerta,
   então reabrir o mesmo alerta não gera um novo pedido. */
const analisesIA = new Map(); // id do alerta → { estado, resultado | erro }
const paraIA = (e) => ({ evento: e.evento.slice(0, 160), origem: e.origem.slice(0, 60), severidade: e.severidade, hora: formatarHora(e.data) });

async function analisarComIA(alerta) {
  analisesIA.set(alerta.id, { estado: "carregando" });
  renderIA();
  el.recIa.focus();
  // até 10 alertas recentes do mesmo host, para a IA ver se há uma sequência de ataque
  const recentes = eventos.filter((e) => e.origem === alerta.origem && e.id !== alerta.id).slice(0, 10).map(paraIA);
  try {
    const resultado = await window.SecViewIA.pedir("alerta", { alerta: paraIA(alerta), recentes });
    analisesIA.set(alerta.id, { estado: "ok", resultado });
  } catch (erro) {
    analisesIA.set(alerta.id, { estado: "erro", erro: erro.message });
  }
  if (alertaAberto && alertaAberto.id === alerta.id) renderIA();
}

function renderIA() {
  const IA = window.SecViewIA;
  const alvo = el.recIa;
  const alerta = alertaAberto;
  alvo.hidden = !IA || !alerta;
  if (alvo.hidden) return;

  const st = analisesIA.get(alerta.id);
  if (!st) {
    const btn = IA.botao("Analisar com a vigIA");
    btn.addEventListener("click", () => analisarComIA(alerta));
    const dica = criar("span", "rec-ia-dica", "A vigIA explica o alerta e confere se outros alertas do host fazem parte da mesma história.");
    alvo.replaceChildren(btn, dica);
    return;
  }
  if (st.estado === "carregando") { IA.carregando(alvo, "A vigIA está analisando o alerta…"); return; }
  if (st.estado === "erro") { IA.erro(alvo, st.erro, () => analisarComIA(alerta)); return; }

  const r = st.resultado;
  const bloco = IA.bloco("Análise da vigIA");
  bloco.append(criar("p", "", r.resumo), IA.secao("Por que importa", r.porQueImporta));

  const sev = criar("div", "ia-linha");
  sev.append(badge(r.severidadeSugerida));
  if (r.severidadeSugerida !== alerta.severidade) sev.append(criar("small", "", `atual: ${SEVERIDADES[alerta.severidade]}`));
  const blocoSev = criar("div");
  blocoSev.append(sev, criar("p", "", r.justificativa));
  bloco.append(IA.secao("Severidade sugerida", blocoSev));

  if (r.acoes.length) bloco.append(IA.secao("O que fazer, na ordem", IA.lista(r.acoes)));
  if (r.tecnicaMitre && r.tecnicaMitre.id) {
    const chip = criar("div", "ia-linha");
    chip.append(criar("span", "chip", `MITRE ATT&CK · ${r.tecnicaMitre.id} ${r.tecnicaMitre.nome}`));
    bloco.append(IA.secao("Técnica provável", chip));
  }
  bloco.append(IA.secao("Relação com outros alertas do host", r.relacionados), IA.nota());
  alvo.replaceChildren(bloco);
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
  renderIA();

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

  // ?q=texto (vindo da busca global) já abre o feed filtrado
  const pedido = (new URLSearchParams(location.search).get("q") || "").slice(0, 80);
  el.busca.value = pedido;
  busca = norm(pedido);
  // a simulação começa com alguns alertas do que foi buscado, para a tabela não abrir vazia
  const buscados = busca ? MODELOS.filter(combina) : [];

  // 8 eventos iniciais, espaçados de 15 s para trás (mais novo no topo)
  const agora = Date.now();
  eventos = Array.from({ length: 8 }, (_, i) => {
    const e = i % 3 === 0 && buscados.length ? gerarEvento(buscados) : gerarEvento();
    e.data = new Date(agora - (8 - i) * 15000);
    return e;
  }).reverse();
  // alertas de login gerados enquanto o feed estava fechado entram no topo
  eventos = [...alertasDoLogin(), ...eventos].slice(0, MAX_EVENTOS);

  atualizarPausa();
  renderizar();
  iniciarFeed();
}

iniciar();