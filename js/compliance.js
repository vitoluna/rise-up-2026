/* =========================================================
   Tela de Compliance — SecView (estática, sem dependências)
   ========================================================= */

/* ---------- Dados ---------- */

// Dados compartilhados com Dashboard e Feed (js/dados.js)
const DADOS = window.SecViewDados;

// Cards de aderência: só os frameworks marcados como "destaque"
const FRAMEWORKS = DADOS.FRAMEWORKS.filter((f) => f.destaque);

const LIMITE_VERDE = 80; // >= 80% verde, abaixo laranja

// Categorias exibidas no gráfico (ordem fixa)
const CATEGORIAS = ["Acesso", "Dados", "Rede", "Sistema"];

// Eventos dos últimos 30 dias (mesma fonte do Feed de alertas)
const EVENTOS = DADOS.EVENTOS;

/* ---------- Helpers ---------- */

const $ = (sel) => document.querySelector(sel);

function classePorAderencia(valor) {
  return valor >= LIMITE_VERDE ? "ok" : "warn";
}

/** Conta os eventos de cada categoria a partir do array EVENTOS. */
function contarPorCategoria(eventos) {
  const contagem = Object.fromEntries(CATEGORIAS.map((c) => [c, 0]));
  eventos.forEach((e) => {
    if (e.categoria in contagem) contagem[e.categoria] += 1;
  });
  return contagem;
}

/** Cor da barra conforme a proporção em relação à maior barra. */
function classePorProporcao(qtd, max) {
  const p = max ? qtd / max : 0;
  if (p >= 0.75) return "crit";
  if (p >= 0.35) return "warn";
  return "ok";
}

/* ---------- Render: cards de framework ---------- */

function renderFrameworks() {
  const container = $("#frameworks");
  container.innerHTML = FRAMEWORKS.map((f) => {
    const cls = classePorAderencia(f.valor);
    return `
      <article class="card">
        <div class="label">${f.nome}</div>
        <div class="value">${f.valor}%</div>
        <div class="progress" role="progressbar"
             aria-label="Aderência ${f.nome}"
             aria-valuenow="${f.valor}" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-bar ${cls}" style="width:0%" data-width="${f.valor}"></div>
        </div>
      </article>`;
  }).join("");

  // anima as barras de progresso
  requestAnimationFrame(() => {
    container.querySelectorAll(".progress-bar").forEach((el) => {
      el.style.width = el.dataset.width + "%";
    });
  });
}

/* ---------- Render: gráfico de incidentes ---------- */

function renderGrafico() {
  const contagem = contarPorCategoria(EVENTOS);
  const max = Math.max(...Object.values(contagem));
  const chart = $("#chart");

  chart.innerHTML = CATEGORIAS.map((cat) => {
    const qtd = contagem[cat];
    const pct = max ? (qtd / max) * 100 : 0;
    return `
      <div class="bar-col">
        <span class="bar-count">${qtd}</span>
        <div class="bar ${classePorProporcao(qtd, max)}"
             style="height:0%" data-height="${pct}"
             title="${cat}: ${qtd} incidentes"></div>
      </div>`;
  }).join("");

  // rótulos logo abaixo do eixo
  const labels = document.createElement("div");
  labels.className = "bar-labels";
  labels.innerHTML = CATEGORIAS.map((c) => `<span>${c}</span>`).join("");
  chart.after(labels);

  chart.setAttribute(
    "aria-label",
    "Incidentes por categoria: " + CATEGORIAS.map((c) => `${c} ${contagem[c]}`).join(", ")
  );

  requestAnimationFrame(() => {
    chart.querySelectorAll(".bar").forEach((el) => {
      // reserva ~20px no topo para o número
      el.style.height = `calc(${el.dataset.height}% - ${el.dataset.height > 0 ? 20 : 0}px * ${el.dataset.height / 100})`;
    });
  });
}

/* ---------- Exportar CSV ---------- */

function escaparCSV(valor) {
  const s = String(valor ?? "");
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function gerarCSV() {
  const contagem = contarPorCategoria(EVENTOS);
  const linhas = [];

  linhas.push(["Relatório de Compliance — SecView"]);
  linhas.push(["Gerado em", new Date().toLocaleString("pt-BR")]);
  linhas.push([]);

  linhas.push(["Aderência por framework"]);
  linhas.push(["Framework", "Aderência (%)", "Status"]);
  FRAMEWORKS.forEach((f) =>
    linhas.push([f.nome, f.valor, f.valor >= LIMITE_VERDE ? "Conforme" : "Atenção"])
  );
  linhas.push([]);

  linhas.push(["Incidentes por categoria (últimos 30 dias)"]);
  linhas.push(["Categoria", "Incidentes"]);
  CATEGORIAS.forEach((c) => linhas.push([c, contagem[c]]));
  linhas.push([]);

  linhas.push(["Eventos"]);
  linhas.push(["Há (dias)", "Categoria", "Origem", "Descrição", "Severidade"]);
  EVENTOS.forEach((e) =>
    linhas.push([e.dia, e.categoria, e.origem, e.descricao, DADOS.SEVERIDADES[e.severidade]])
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
  a.download = `relatorio-compliance-${hoje}.csv`;
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
  renderFrameworks();
  renderGrafico();
  $("#btn-csv").addEventListener("click", exportarCSV);
  $("#btn-pdf").addEventListener("click", exportarPDF);
});