/* =========================================================
   Compliance PCI-DSS — SecView (estática, sem dependências)
   Dashboard por requisito (PCI-DSS v4.0) + eventos relacionados.
   ========================================================= */

/* ---------- Dados ---------- */

const DADOS = window.SecViewDados;
const PCI = DADOS.PCI;
const GERAL = DADOS.FRAMEWORKS.find((f) => f.nome === "PCI-DSS");

const LIMITE_VERDE = 80;   // >= 80% conforme
const LIMITE_LARANJA = 60; // 60–79% atenção, abaixo disso revisar

// Categorias exibidas no gráfico (ordem fixa)
const CATEGORIAS = ["Acesso", "Dados", "Rede", "Sistema"];

const PESO = { critico: 3, alto: 2, medio: 1, info: 0 };
const SEV_POR_PESO = ["info", "medio", "alto", "critico"];

/* ---------- Eventos → requisitos PCI-DSS ---------- */
// A primeira regra que casar com a descrição vence. Eventos sem regra
// (ex.: "Novo processo iniciado") ficam sem requisito associado.
// Quando houver backend, o requisito virá junto do evento.
const REGRAS = [
  { teste: /login falha|brute force|conta privilegiada|senha alterada|nova conta|sessão simultânea|fora do horário|ip desconhecido/i, req: 8 },
  { teste: /escalação de privilégio/i,                                  req: 7 },
  { teste: /consulta massiva|dump de banco|download volumoso/i,         req: 3 },
  { teste: /passwd|arquivo crítico/i,                                   req: 11 }, // detecção de alteração de arquivos
  { teste: /log removido/i,                                            req: 10 },
  { teste: /porta 4444|varredura|dns tunnel|blocklist|exfiltração|fora da lista|pico de tráfego/i, req: 1 },
  { teste: /powershell/i,                                              req: 5 },
];

function requisitoDoEvento(e) {
  const regra = REGRAS.find((r) => r.teste.test(e.descricao));
  return regra ? regra.req : null;
}

/* ---------- Estado ---------- */

const estado = { periodo: 30, soAtencao: false, selecionado: null, objetivo: null, ordem: "numero", modo: "cartoes" };

/* ---------- Helpers ---------- */

const $ = (sel) => document.querySelector(sel);
const plural = (n, um, varios) => (n === 1 ? um : varios);

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/** ok | warn | bad conforme o percentual. */
function statusPorPct(p) {
  if (p >= LIMITE_VERDE) return { cls: "ok", txt: "Conforme" };
  if (p >= LIMITE_LARANJA) return { cls: "warn", txt: "Atenção" };
  return { cls: "bad", txt: "Revisar" };
}

const pct = (ok, total) => (total ? Math.round((ok / total) * 100) : 0);

function eventosDoPeriodo() {
  return DADOS.EVENTOS
    .filter((e) => e.dia <= estado.periodo)
    .map((e) => ({ ...e, req: requisitoDoEvento(e) }));
}

/** { 8: { eventos: [...], sev: "critico" } } */
function agruparPorRequisito(eventos) {
  const mapa = {};
  eventos.forEach((e) => {
    if (!e.req) return;
    const g = (mapa[e.req] ??= { eventos: [], peso: 0 });
    g.eventos.push(e);
    g.peso = Math.max(g.peso, PESO[e.severidade] ?? 0);
  });
  Object.values(mapa).forEach((g) => (g.sev = SEV_POR_PESO[g.peso]));
  return mapa;
}

const reqPorNumero = (n) => PCI.requisitos.find((r) => r.n === n);
const objetivoDoReq = (n) => PCI.objetivos.find((o) => o.reqs.includes(n));

/* ---------- Render: indicadores ---------- */

function renderKpis(eventos, porReq) {
  const conformes = PCI.requisitos.filter((r) => pct(r.atendidos, r.total) >= LIMITE_VERDE).length;
  const pendentes = GERAL.total - GERAL.atendidos;
  const mapeados = eventos.filter((e) => e.req).length;
  const semReq = eventos.length - mapeados;
  const topo = Object.entries(porReq).sort((a, b) => b[1].eventos.length - a[1].eventos.length)[0];
  const precisam = PCI.requisitos.length - conformes;

  $("#kpis").innerHTML = `
    <article class="card">
      <div class="label">Requisitos conformes</div>
      <div class="value">${conformes}<small>de ${PCI.requisitos.length}</small></div>
      <div class="sub">${precisam} ${plural(precisam, "requisito precisa", "requisitos precisam")} de atenção</div>
    </article>
    <article class="card">
      <div class="label">Controles pendentes</div>
      <div class="value">${pendentes}</div>
      <div class="sub">${GERAL.atendidos} de ${GERAL.total} controles atendidos</div>
    </article>
    <article class="card">
      <div class="label">Eventos relacionados</div>
      <div class="value">${mapeados}<small>de ${eventos.length}</small></div>
      <div class="sub">${topo ? `Mais frequente: Req. ${topo[0]} (${topo[1].eventos.length})` : "Nenhum evento no período"}${semReq ? ` · ${semReq} sem requisito` : ""}</div>
    </article>`;
}

/* ---------- Render: visão geral (rosca + objetivos) ---------- */

function renderVisao() {
  // rosca: um arco por status, proporcional ao nº de requisitos
  const cont = { ok: 0, warn: 0, bad: 0 };
  PCI.requisitos.forEach((r) => (cont[statusPorPct(pct(r.atendidos, r.total)).cls] += 1));
  const total = PCI.requisitos.length;
  const R = 52, C = 2 * Math.PI * R, folga = 3;
  const cores = { ok: "var(--st-ok)", warn: "var(--st-warn)", bad: "var(--st-bad)" };

  let desloc = 0;
  const arcos = ["ok", "warn", "bad"].filter((k) => cont[k]).map((k) => {
    const len = (cont[k] / total) * C;
    const vis = Math.max(len - (Object.values(cont).filter(Boolean).length > 1 ? folga : 0), 0.1);
    const arco = `<circle cx="65" cy="65" r="${R}" fill="none" stroke="${cores[k]}" stroke-width="14"
      stroke-dasharray="${vis} ${C}" stroke-dashoffset="${-desloc}"/>`;
    desloc += len;
    return arco;
  }).join("");

  const nomes = { ok: "Conforme", warn: "Atenção", bad: "Revisar" };
  $("#rosca").innerHTML = `
    <div class="rosca" role="img"
         aria-label="Aderência geral ${GERAL.valor}%. ${cont.ok} requisitos conformes, ${cont.warn} em atenção, ${cont.bad} a revisar">
      <svg viewBox="0 0 130 130" aria-hidden="true">
        <circle class="rosca-trilho" cx="65" cy="65" r="${R}" fill="none" stroke-width="14"/>${arcos}
      </svg>
      <div class="rosca-centro"><strong>${GERAL.valor}%</strong><span>aderência geral</span></div>
    </div>
    <ul class="rosca-leg" aria-label="Requisitos por status">
      ${["ok", "warn", "bad"].map((k) => `<li><i class="sw ${k}"></i><b>${cont[k]}</b>${nomes[k]}</li>`).join("")}
    </ul>`;

  // barras por objetivo (clicáveis: filtram os requisitos)
  $("#objetivos").innerHTML = PCI.objetivos.map((o) => {
    const reqs = o.reqs.map(reqPorNumero);
    const ok = reqs.reduce((a, r) => a + r.atendidos, 0);
    const tot = reqs.reduce((a, r) => a + r.total, 0);
    const p = pct(ok, tot);
    const st = statusPorPct(p);
    const faixa = o.reqs.length > 1 ? `Req. ${o.reqs[0]}–${o.reqs[o.reqs.length - 1]}` : `Req. ${o.reqs[0]}`;
    return `
      <button type="button" class="obj" data-obj="${o.id}" aria-pressed="${estado.objetivo === o.id}"
              aria-label="Objetivo ${o.id}, ${esc(o.curto)}, ${p}% de aderência. Filtrar requisitos">
        <span class="obj-nome">${esc(o.curto)}<small>Objetivo ${o.id} · ${faixa}</small></span>
        <span class="progress" aria-hidden="true"><span class="progress-bar ${st.cls}" style="width:${p}%"></span></span>
        <span class="obj-valor"><strong>${p}%</strong>${ok} de ${tot}</span>
      </button>`;
  }).join("");
}

/* ---------- Render: requisitos (cartões ou lista) ---------- */

function requisitosVisiveis(porReq) {
  let lista = PCI.requisitos.map((r) => ({
    ...r,
    p: pct(r.atendidos, r.total),
    obj: objetivoDoReq(r.n),
    g: porReq[r.n],
  }));

  if (estado.soAtencao) lista = lista.filter((r) => r.p < LIMITE_VERDE);
  if (estado.objetivo) lista = lista.filter((r) => r.obj.id === estado.objetivo);

  const ordens = {
    numero: (a, b) => a.n - b.n,
    aderencia: (a, b) => a.p - b.p || a.n - b.n,
    eventos: (a, b) => (b.g?.eventos.length ?? 0) - (a.g?.eventos.length ?? 0) || a.n - b.n,
  };
  return lista.sort(ordens[estado.ordem]);
}

const textoEventos = (g) =>
  g ? `${g.eventos.length} ${plural(g.eventos.length, "evento", "eventos")} · maior: ${DADOS.SEVERIDADES[g.sev]}` : "Sem eventos no período";
const pontoEvento = (g) => `<span class="dot${g ? " sev-" + g.sev : ""}"></span>`;

function renderRequisitos(porReq) {
  const lista = requisitosVisiveis(porReq);
  const alvo = $("#reqs");

  const obj = estado.objetivo && PCI.objetivos.find((o) => o.id === estado.objetivo);
  $("#req-sub").textContent = obj
    ? `Filtrando pelo objetivo ${obj.id} · ${obj.curto}. Clique no objetivo de novo para limpar.`
    : "Clique em um requisito para ver os eventos relacionados";

  if (!lista.length) {
    alvo.innerHTML = '<p class="vazio">Nenhum requisito corresponde ao filtro.</p>';
    return;
  }

  if (estado.modo === "lista") {
    alvo.innerHTML = `
      <div class="lista-box">
        <table class="lista">
          <thead><tr><th>Req.</th><th>Requisito</th><th>Controles</th><th>Aderência</th><th>Status</th><th>Eventos</th></tr></thead>
          <tbody>${lista.map((r) => {
            const st = statusPorPct(r.p);
            const sel = estado.selecionado === r.n;
            return `
              <tr data-req="${r.n}" class="${sel ? "sel" : ""}" style="border-left-color:var(--st-${st.cls})">
                <td class="n">${r.n}</td>
                <td><button type="button" class="l-nome" data-req="${r.n}" aria-pressed="${sel}">${esc(r.nome)}</button>
                    <span class="l-obj">Objetivo ${r.obj.id} · ${esc(r.obj.curto)}</span></td>
                <td>${r.atendidos} de ${r.total}</td>
                <td><div class="l-barra"><span class="progress" aria-hidden="true"><span class="progress-bar ${st.cls}" style="width:${r.p}%"></span></span><b>${r.p}%</b></div></td>
                <td><span class="tag ${st.cls}">${st.txt}</span></td>
                <td class="ev">${pontoEvento(r.g)}${r.g ? r.g.eventos.length : 0}</td>
              </tr>`;
          }).join("")}</tbody>
        </table>
      </div>`;
    return;
  }

  alvo.innerHTML = `<div class="reqs">${lista.map((r) => {
    const st = statusPorPct(r.p);
    const aria = `Requisito ${r.n}, ${r.nome}, ${r.p}% de aderência, ${st.txt}, ${r.g ? r.g.eventos.length : 0} eventos`;
    return `
      <button type="button" class="req ${st.cls}" data-req="${r.n}"
              aria-pressed="${estado.selecionado === r.n}" aria-label="${esc(aria)}">
        <span class="req-topo"><span class="req-num">Requisito ${r.n}</span><span class="tag ${st.cls}">${st.txt}</span></span>
        <span class="req-obj">Objetivo ${r.obj.id} · ${esc(r.obj.curto)}</span>
        <span class="req-nome">${esc(r.nome)}</span>
        <span class="req-valor"><strong>${r.p}%</strong><small>${r.atendidos} de ${r.total} controles</small></span>
        <span class="progress" aria-hidden="true"><span class="progress-bar ${st.cls}" style="width:${r.p}%"></span></span>
        <span class="req-eventos">${pontoEvento(r.g)}${textoEventos(r.g)}</span>
      </button>`;
  }).join("")}</div>`;
}

/* ---------- Render: detalhe do requisito ---------- */

function renderDetalhe(porReq) {
  const alvo = $("#detalhe");
  const r = estado.selecionado && reqPorNumero(estado.selecionado);

  if (!r) {
    alvo.innerHTML = `
      <h2 id="detalhe-titulo">Detalhes do requisito</h2>
      <p class="detalhe-vazio">Selecione um requisito acima para ver os eventos relacionados.</p>`;
    return;
  }

  const p = pct(r.atendidos, r.total);
  const st = statusPorPct(p);
  const g = porReq[r.n];
  const pend = r.total - r.atendidos;

  const corpo = g
    ? `<div class="tabela-rolagem"><table class="tabela">
         <thead><tr><th>Há</th><th>Origem</th><th>Descrição</th><th>Severidade</th></tr></thead>
         <tbody>${[...g.eventos].sort((a, b) => a.dia - b.dia).map((e) => `
           <tr>
             <td>${e.dia === 1 ? "1 dia" : e.dia + " dias"}</td>
             <td>${esc(e.origem)}</td>
             <td class="desc">${esc(e.descricao)}</td>
             <td><span class="sev sev-${e.severidade}">${DADOS.SEVERIDADES[e.severidade]}</span></td>
           </tr>`).join("")}</tbody>
       </table></div>`
    : '<p class="detalhe-vazio">Nenhum evento relacionado a este requisito no período selecionado.</p>';

  alvo.innerHTML = `
    <div class="detalhe-topo">
      <div>
        <h2 id="detalhe-titulo">Requisito ${r.n} — ${esc(r.nome)}</h2>
        <div class="resumo-req">
          <span class="tag ${st.cls}">${st.txt} · ${p}%</span>
          <span class="chip">${r.atendidos} de ${r.total} controles atendidos</span>
          <span class="chip">${pend} ${plural(pend, "controle pendente", "controles pendentes")}</span>
        </div>
      </div>
    </div>
    ${corpo}`;
}

/* ---------- Render: gráfico de incidentes ---------- */

function contarPorCategoria(eventos) {
  const contagem = Object.fromEntries(CATEGORIAS.map((c) => [c, 0]));
  eventos.forEach((e) => { if (e.categoria in contagem) contagem[e.categoria] += 1; });
  return contagem;
}

function classePorProporcao(qtd, max) {
  const p = max ? qtd / max : 0;
  if (p >= 0.75) return "crit";
  if (p >= 0.35) return "warn";
  return "ok";
}

function renderGrafico(eventos) {
  const contagem = contarPorCategoria(eventos);
  const max = Math.max(...Object.values(contagem));
  const chart = $("#chart");

  $("#chart-title").textContent = `Incidentes por categoria (últimos ${estado.periodo} dias)`;
  document.querySelectorAll(".bar-labels").forEach((el) => el.remove());

  chart.innerHTML = CATEGORIAS.map((cat) => {
    const qtd = contagem[cat];
    const h = max ? (qtd / max) * 100 : 0;
    return `
      <div class="bar-col">
        <span class="bar-count">${qtd}</span>
        <div class="bar ${classePorProporcao(qtd, max)}" style="height:0%" data-height="${h}"
             title="${cat}: ${qtd} incidentes"></div>
      </div>`;
  }).join("");

  const labels = document.createElement("div");
  labels.className = "bar-labels";
  labels.innerHTML = CATEGORIAS.map((c) => `<span>${c}</span>`).join("");
  chart.after(labels);

  chart.setAttribute("aria-label", "Incidentes por categoria: " + CATEGORIAS.map((c) => `${c} ${contagem[c]}`).join(", "));

  requestAnimationFrame(() => {
    chart.querySelectorAll(".bar").forEach((el) => {
      const h = Number(el.dataset.height);
      el.style.height = `calc(${h}% - ${h > 0 ? 20 : 0}px * ${h / 100})`; // reserva espaço para o número
    });
  });
}

/* ---------- Ciclo de render ---------- */

function renderPainel() {
  const eventos = eventosDoPeriodo();
  const porReq = agruparPorRequisito(eventos);
  renderKpis(eventos, porReq);
  renderVisao();
  renderRequisitos(porReq);
  renderDetalhe(porReq);
  return eventos;
}

/* ---------- Exportar CSV ---------- */

function escaparCSV(valor) {
  const s = String(valor ?? "");
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function gerarCSV() {
  const eventos = eventosDoPeriodo();
  const porReq = agruparPorRequisito(eventos);
  const linhas = [];

  linhas.push([`Relatório de Compliance PCI-DSS v${PCI.versao} — SecView`]);
  linhas.push(["Gerado em", new Date().toLocaleString("pt-BR")]);
  linhas.push(["Período dos eventos", `Últimos ${estado.periodo} dias`]);
  linhas.push([]);

  linhas.push(["Aderência geral"]);
  linhas.push(["Framework", "Aderência (%)", "Atendidos", "Total", "Status"]);
  linhas.push(["PCI-DSS", GERAL.valor, GERAL.atendidos, GERAL.total, statusPorPct(GERAL.valor).txt]);
  linhas.push([]);

  linhas.push(["Requisitos"]);
  linhas.push(["Objetivo", "Requisito", "Descrição", "Atendidos", "Total", "Aderência (%)", "Status", "Eventos no período"]);
  PCI.objetivos.forEach((obj) =>
    obj.reqs.map(reqPorNumero).forEach((r) => {
      const p = pct(r.atendidos, r.total);
      linhas.push([obj.nome, r.n, r.nome, r.atendidos, r.total, p, statusPorPct(p).txt, porReq[r.n]?.eventos.length ?? 0]);
    })
  );
  linhas.push([]);

  const contagem = contarPorCategoria(eventos);
  linhas.push([`Incidentes por categoria (últimos ${estado.periodo} dias)`]);
  linhas.push(["Categoria", "Incidentes"]);
  CATEGORIAS.forEach((c) => linhas.push([c, contagem[c]]));
  linhas.push([]);

  linhas.push(["Eventos"]);
  linhas.push(["Há (dias)", "Categoria", "Origem", "Descrição", "Severidade", "Requisito PCI-DSS"]);
  eventos.forEach((e) =>
    linhas.push([e.dia, e.categoria, e.origem, e.descricao, DADOS.SEVERIDADES[e.severidade], e.req ? `Req. ${e.req}` : "Sem requisito"])
  );

  // ";" como separador e BOM para o Excel brasileiro abrir com acentos corretos
  return "\uFEFF" + linhas.map((l) => l.map(escaparCSV).join(";")).join("\r\n");
}

function exportarCSV() {
  const blob = new Blob([gerarCSV()], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const hoje = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `relatorio-compliance-pci-dss-${hoje}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ---------- Exportar PDF ---------- */

function exportarPDF() {
  $("#print-date").textContent = "Gerado em " + new Date().toLocaleString("pt-BR");
  window.print(); // no diálogo, escolher "Salvar como PDF"
}

/* ---------- Init ---------- */

document.addEventListener("DOMContentLoaded", () => {
  renderGrafico(renderPainel());

  $("#periodo").addEventListener("change", (e) => {
    estado.periodo = Number(e.target.value);
    renderGrafico(renderPainel());
  });

  $("#filtro-status").addEventListener("change", (e) => {
    estado.soAtencao = e.target.value === "atencao";
    renderPainel();
  });

  $("#ordem").addEventListener("change", (e) => {
    estado.ordem = e.target.value;
    renderPainel();
  });

  // Cartões | Lista
  document.querySelectorAll(".seg-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      estado.modo = btn.dataset.view;
      document.querySelectorAll(".seg-btn").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      renderPainel();
    })
  );

  // filtro por objetivo (clicar de novo limpa)
  $("#objetivos").addEventListener("click", (e) => {
    const btn = e.target.closest(".obj");
    if (!btn) return;
    const id = Number(btn.dataset.obj);
    estado.objetivo = estado.objetivo === id ? null : id;
    renderPainel();
    $(`#objetivos .obj[data-obj="${id}"]`)?.focus();
  });

  // seleção de requisito (cartão ou linha da lista)
  $("#reqs").addEventListener("click", (e) => {
    const alvo = e.target.closest("[data-req]");
    if (!alvo) return;
    const n = Number(alvo.dataset.req);
    estado.selecionado = estado.selecionado === n ? null : n;
    renderPainel();
    $(`#reqs button[data-req="${n}"]`)?.focus(); // o render recria o DOM
    if (estado.selecionado) $("#detalhe").scrollIntoView({ block: "nearest", behavior: "smooth" });
  });

  $("#btn-csv").addEventListener("click", exportarCSV);
  $("#btn-pdf").addEventListener("click", exportarPDF);
});
