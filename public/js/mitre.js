/* =========================================================
   Tela MITRE ATT&CK — SecView (estática, sem dependências)
   Mapeia os EVENTOS de js/dados.js para técnicas do ATT&CK.
   Quando houver backend, o campo "tecnica" virá junto do evento
   e as REGRAS abaixo deixam de ser necessárias.
   ========================================================= */

const DADOS = window.SecViewDados;
const $ = (sel) => document.querySelector(sel);

/* ---------- Catálogo (reduzido) ---------- */

// Ordem oficial das táticas do ATT&CK Enterprise
const TATICAS = [
  { id: "TA0043", nome: "Reconhecimento" },
  { id: "TA0042", nome: "Desenvolvimento de recursos" },
  { id: "TA0001", nome: "Acesso inicial" },
  { id: "TA0002", nome: "Execução" },
  { id: "TA0003", nome: "Persistência" },
  { id: "TA0004", nome: "Escalação de privilégio" },
  { id: "TA0005", nome: "Evasão de defesa" },
  { id: "TA0006", nome: "Acesso a credenciais" },
  { id: "TA0007", nome: "Descoberta" },
  { id: "TA0008", nome: "Movimento lateral" },
  { id: "TA0009", nome: "Coleta" },
  { id: "TA0011", nome: "Comando e controle" },
  { id: "TA0010", nome: "Exfiltração" },
  { id: "TA0040", nome: "Impacto" },
];

const TECNICAS = {
  T1595: "Active Scanning",
  T1592: "Gather Victim Host Information",
  T1583: "Acquire Infrastructure",
  T1587: "Develop Capabilities",
  T1078: "Valid Accounts",
  T1190: "Exploit Public-Facing Application",
  T1566: "Phishing",
  T1133: "External Remote Services",
  T1059: "Command and Scripting Interpreter",
  T1204: "User Execution",
  T1053: "Scheduled Task/Job",
  T1136: "Create Account",
  T1098: "Account Manipulation",
  T1543: "Create or Modify System Process",
  T1068: "Exploitation for Privilege Escalation",
  T1548: "Abuse Elevation Control Mechanism",
  T1070: "Indicator Removal",
  T1562: "Impair Defenses",
  T1110: "Brute Force",
  T1003: "OS Credential Dumping",
  T1555: "Credentials from Password Stores",
  T1046: "Network Service Discovery",
  T1057: "Process Discovery",
  T1018: "Remote System Discovery",
  T1021: "Remote Services",
  T1570: "Lateral Tool Transfer",
  T1213: "Data from Information Repositories",
  T1005: "Data from Local System",
  T1074: "Data Staged",
  T1071: "Application Layer Protocol",
  T1571: "Non-Standard Port",
  T1090: "Proxy",
  T1041: "Exfiltration Over C2 Channel",
  T1048: "Exfiltration Over Alternative Protocol",
  T1498: "Network Denial of Service",
  T1565: "Data Manipulation",
  T1486: "Data Encrypted for Impact",
};

// Técnicas exibidas em cada tática
const MATRIZ = {
  TA0043: ["T1595", "T1592"],
  TA0042: ["T1583", "T1587"],
  TA0001: ["T1078", "T1190", "T1566", "T1133"],
  TA0002: ["T1059", "T1204", "T1053"],
  TA0003: ["T1136", "T1098", "T1078", "T1543"],
  TA0004: ["T1068", "T1078", "T1548"],
  TA0005: ["T1070", "T1078", "T1562"],
  TA0006: ["T1110", "T1003", "T1555"],
  TA0007: ["T1046", "T1057", "T1018"],
  TA0008: ["T1021", "T1570"],
  TA0009: ["T1213", "T1005", "T1074"],
  TA0011: ["T1071", "T1571", "T1090"],
  TA0010: ["T1041", "T1048"],
  TA0040: ["T1498", "T1565", "T1486"],
};

/* ---------- Mapeamento evento → técnica ---------- */

// A primeira regra que casar com a descrição vence
const REGRAS = [
  { teste: /login falha|brute force/i,                                      tecnica: "T1110" },
  { teste: /fora do horário|ip desconhecido|sessão simultânea|conta privilegiada/i, tecnica: "T1078" },
  { teste: /escalação de privilégio/i,                                      tecnica: "T1068" },
  { teste: /nova conta criada/i,                                            tecnica: "T1136" },
  { teste: /senha alterada|passwd/i,                                        tecnica: "T1098" },
  { teste: /consulta massiva/i,                                             tecnica: "T1213" },
  { teste: /dump de banco/i,                                                tecnica: "T1005" },
  { teste: /log removido/i,                                                 tecnica: "T1070" },
  { teste: /download volumoso/i,                                            tecnica: "T1048" },
  { teste: /exfiltração/i,                                                  tecnica: "T1041" },
  { teste: /arquivo crítico/i,                                              tecnica: "T1565" },
  { teste: /porta 4444|fora da lista/i,                                     tecnica: "T1571" },
  { teste: /varredura/i,                                                    tecnica: "T1046" },
  { teste: /dns tunnel|blocklist/i,                                         tecnica: "T1071" },
  { teste: /pico de tráfego/i,                                              tecnica: "T1498" },
  { teste: /powershell/i,                                                   tecnica: "T1059" },
];

const PESO = { critico: 3, alto: 2, medio: 1, info: 0 };
const SEV_POR_PESO = ["info", "medio", "alto", "critico"];

function tecnicaDoEvento(e) {
  const regra = REGRAS.find((r) => r.teste.test(e.descricao));
  return regra ? regra.tecnica : null;
}

/* ---------- Estado ---------- */

const estado = {
  periodo: 30,
  soDetectadas: false,
  selecionada: null,
};

/** Eventos dentro do período, já com a técnica associada. */
function eventosDoPeriodo() {
  return DADOS.EVENTOS
    .filter((e) => e.dia <= estado.periodo)
    .map((e) => ({ ...e, tecnica: tecnicaDoEvento(e) }));
}

/** { T1110: { eventos: [...], sev: "critico" } } — só técnicas com evento. */
function agruparPorTecnica(eventos) {
  const mapa = {};
  eventos.forEach((e) => {
    if (!e.tecnica) return;
    const g = (mapa[e.tecnica] ??= { eventos: [], peso: 0 });
    g.eventos.push(e);
    g.peso = Math.max(g.peso, PESO[e.severidade] ?? 0);
  });
  Object.values(mapa).forEach((g) => (g.sev = SEV_POR_PESO[g.peso]));
  return mapa;
}

/* ---------- Helpers ---------- */

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const plural = (n, um, varios) => (n === 1 ? um : varios);

function taticasDaTecnica(id) {
  return TATICAS.filter((t) => MATRIZ[t.id].includes(id));
}

/* ---------- Render: resumo ---------- */

function renderResumo(eventos, porTecnica) {
  const detectadas = Object.keys(porTecnica);
  const mapeados = eventos.filter((e) => e.tecnica).length;
  const semMapa = eventos.length - mapeados;

  // quantos eventos cada tática recebe (um evento conta uma vez por tática)
  const porTatica = TATICAS.map((t) => ({
    ...t,
    qtd: new Set(MATRIZ[t.id].flatMap((id) => porTecnica[id]?.eventos ?? [])).size,
  }));
  const comDeteccao = porTatica.filter((t) => t.qtd > 0);
  const topo = [...porTatica].sort((a, b) => b.qtd - a.qtd)[0];

  const cartoes = [
    {
      rotulo: "Táticas com detecção",
      valor: `${comDeteccao.length}<small>de ${TATICAS.length}</small>`,
      sub: "Cobertura do ciclo de ataque",
    },
    {
      rotulo: "Técnicas detectadas",
      valor: String(detectadas.length),
      sub: `${plural(detectadas.length, "técnica distinta", "técnicas distintas")} no período`,
    },
    {
      rotulo: "Eventos mapeados",
      valor: `${mapeados}<small>de ${eventos.length}</small>`,
      sub: semMapa ? `${semMapa} ${plural(semMapa, "evento", "eventos")} sem técnica associada` : "Todos os eventos mapeados",
    },
    {
      rotulo: "Tática mais ativa",
      valor: topo && topo.qtd ? `<span style="font-size:16px">${esc(topo.nome)}</span>` : "—",
      sub: topo && topo.qtd ? `${topo.qtd} ${plural(topo.qtd, "evento", "eventos")}` : "Nenhum evento no período",
    },
  ];

  $("#resumo").innerHTML = cartoes.map((c) => `
    <article class="card">
      <div class="label">${c.rotulo}</div>
      <div class="value">${c.valor}</div>
      <div class="sub">${c.sub}</div>
    </article>`).join("");

  return porTatica;
}

/* ---------- Render: matriz ---------- */

function renderMatriz(porTecnica, porTatica) {
  const colunas = TATICAS.map((t) => {
    const ids = MATRIZ[t.id].filter((id) => !estado.soDetectadas || porTecnica[id]);
    if (estado.soDetectadas && !ids.length) return "";

    const qtd = porTatica.find((x) => x.id === t.id).qtd;
    const botoes = ids.map((id) => {
      const g = porTecnica[id];
      const classe = g ? `sev-${g.sev}` : "sem";
      const marcador = g ? `<span class="qtd">${g.eventos.length} ${plural(g.eventos.length, "evento", "eventos")}</span>` : "";
      const aria = g
        ? `${id} ${TECNICAS[id]}, ${g.eventos.length} eventos, severidade ${DADOS.SEVERIDADES[g.sev]}`
        : `${id} ${TECNICAS[id]}, sem detecção`;
      return `
        <button type="button" class="tec ${classe}" data-id="${id}"
                aria-pressed="${estado.selecionada === id}" aria-label="${esc(aria)}">
          <span class="id">${id}</span>
          <span class="nome">${esc(TECNICAS[id])}</span>
          ${marcador}
        </button>`;
    }).join("");

    return `
      <div class="tatica ${qtd ? "ativa" : ""}">
        <div class="tatica-cab">
          <b>${esc(t.nome)}</b>
          <small>${t.id} · ${qtd} ${plural(qtd, "evento", "eventos")}</small>
        </div>
        ${botoes}
      </div>`;
  }).join("");

  $("#matriz").innerHTML = colunas || '<p class="detalhe-vazio">Nenhuma técnica detectada no período.</p>';
}

/* ---------- Render: detalhe ---------- */

function renderDetalhe(porTecnica) {
  const alvo = $("#detalhe");
  const id = estado.selecionada;

  if (!id) {
    alvo.innerHTML = `
      <h2 id="detalhe-titulo">Detalhes da técnica</h2>
      <p class="detalhe-vazio" style="margin-top:8px">Selecione uma técnica na matriz para ver os eventos associados.</p>`;
    return;
  }

  const g = porTecnica[id];
  const chips = taticasDaTecnica(id).map((t) => `<span class="chip">${esc(t.nome)}</span>`).join("");
  const link = `https://attack.mitre.org/techniques/${id}/`;

  let corpo;
  if (!g) {
    corpo = '<p class="detalhe-vazio">Nenhum evento desta técnica no período selecionado.</p>';
  } else {
    const linhas = [...g.eventos]
      .sort((a, b) => a.dia - b.dia)
      .map((e) => `
        <tr>
          <td>${e.dia === 1 ? "1 dia" : e.dia + " dias"}</td>
          <td>${esc(e.origem)}</td>
          <td class="desc">${esc(e.descricao)}</td>
          <td><span class="sev sev-${e.severidade}">${DADOS.SEVERIDADES[e.severidade]}</span></td>
        </tr>`).join("");
    corpo = `
      <div class="tabela-rolagem">
        <table class="tabela">
          <thead><tr><th>Há</th><th>Origem</th><th>Descrição</th><th>Severidade</th></tr></thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>`;
  }

  alvo.innerHTML = `
    <div class="detalhe-topo">
      <div>
        <h2 id="detalhe-titulo">${id} — ${esc(TECNICAS[id])}</h2>
        <div class="chips">${chips}</div>
      </div>
      <a class="link-mitre" href="${link}" target="_blank" rel="noopener noreferrer">Ver no site do MITRE ↗</a>
    </div>
    ${corpo}`;
}

/* ---------- Ciclo de render ---------- */

function render() {
  const eventos = eventosDoPeriodo();
  const porTecnica = agruparPorTecnica(eventos);
  const porTatica = renderResumo(eventos, porTecnica);
  renderMatriz(porTecnica, porTatica);
  renderDetalhe(porTecnica);
}

/* ---------- Init ---------- */

document.addEventListener("DOMContentLoaded", () => {
  $("#periodo").addEventListener("change", (e) => {
    estado.periodo = Number(e.target.value);
    render();
  });

  $("#so-detectadas").addEventListener("change", (e) => {
    estado.soDetectadas = e.target.checked;
    render();
  });

  // delegação: um clique em qualquer botão de técnica
  $("#matriz").addEventListener("click", (e) => {
    const btn = e.target.closest(".tec");
    if (!btn) return;
    const id = btn.dataset.id;
    estado.selecionada = estado.selecionada === id ? null : id;
    render();
    // devolve o foco ao botão (o render recria o DOM)
    $(`#matriz .tec[data-id="${id}"]`)?.focus();
    if (estado.selecionada) $("#detalhe").scrollIntoView({ block: "nearest", behavior: "smooth" });
  });

  render();
});
