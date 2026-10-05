/* ---------- Configuração ---------- */
const SEVERIDADES = {
  critico: "Crítico",
  alto: "Alto",
  medio: "Médio",
  info: "Info",
};
const MAX_EVENTOS = 100;   // limite do feed
const INTERVALO_MS = 2500; // frequência da simulação

/* ---------- Dados de exemplo ----------
   Troque gerarEvento() pela sua fonte real (fetch, WebSocket, SSE).
   Formato: { id, data: Date, evento, origem, severidade } */
const MODELOS = [
  { evento: "Falha de autenticação repetida", origem: "auth-service", severidade: "alto" },
  { evento: "Banco de dados sem resposta", origem: "db-primario", severidade: "critico" },
  { evento: "Uso de CPU acima de 90%", origem: "api-gateway", severidade: "medio" },
  { evento: "Deploy concluído", origem: "ci-cd", severidade: "info" },
  { evento: "Fila de mensagens acumulando", origem: "worker-pagamentos", severidade: "alto" },
  { evento: "Certificado expira em 7 dias", origem: "proxy-borda", severidade: "medio" },
  { evento: "Serviço indisponível", origem: "checkout", severidade: "critico" },
  { evento: "Backup finalizado", origem: "storage", severidade: "info" },
  { evento: "Latência acima do limite", origem: "api-gateway", severidade: "medio" },
  { evento: "Disco com 95% de uso", origem: "db-replica", severidade: "alto" },
];

let contador = 0;
function gerarEvento() {
  const modelo = MODELOS[Math.floor(Math.random() * MODELOS.length)];
  contador += 1;
  return { id: contador, data: new Date(), ...modelo };
}

/* ---------- Estado ---------- */
let eventos = [];      // o mais novo fica na posição 0
let pausado = false;
let filtro = "todos";
let timer = null;

/* ---------- Elementos ---------- */
const $ = (id) => document.getElementById(id);
const el = {
  placar: $("placar"), placarN: $("placar-n"), placarT: $("placar-t"),
  total: $("total"), sevLista: $("sev-lista"), ultimo: $("ultimo"),
  ponto: $("ponto"), statusTxt: $("status-txt"), atual: $("atual"),
  filtro: $("filtro"), btnPausa: $("btn-pausa"), corpo: $("corpo"), limite: $("limite"),
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
    td.colSpan = 4;
    tr.append(td);
    el.corpo.replaceChildren(tr);
    return;
  }

  el.corpo.replaceChildren(
    ...visiveis.map((e) => {
      const tr = criar("tr", e.severidade === "critico" ? "linha-critica" : "");
      const tdSev = criar("td");
      tdSev.append(badge(e.severidade));
      tr.append(
        criar("td", "hora", formatarHora(e.data)),
        criar("td", "", e.evento),
        criar("td", "origem", e.origem),
        tdSev
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
  el.statusTxt.textContent = pausado ? "Feed pausado" : "Ao vivo";
  el.ponto.classList.toggle("parado", pausado);
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