/* ==========================================================
   SecView — servidor (páginas estáticas + rotas de IA)
   Uso: npm run ia   →   http://localhost:3000

   - Serve os arquivos do projeto (HTML, CSS, JS, imagens). Só
     extensões da lista abaixo; .env, server/, node_modules e
     arquivos ocultos nunca saem.
   - POST /api/ia/<ação> chama o Claude Haiku 5.5 (server/ia.mjs).
     A chave fica só aqui, no ambiente do servidor (.env).
   - Proteções das rotas de IA: só aceita pedidos vindos das
     próprias páginas (mesma origem), corpo JSON de até 32 KB
     validado, limite por IP e limite diário total.
   ========================================================== */

import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const RAIZ = resolve(fileURLToPath(new URL("..", import.meta.url)));
if (existsSync(join(RAIZ, ".env"))) process.loadEnvFile(join(RAIZ, ".env"));

const ia = await import("./ia.mjs");

const PORTA = Number(process.env.PORT) || 3000;
const LIMITE_POR_MINUTO = Number(process.env.IA_LIMITE_MINUTO) || 15;  // por IP
const LIMITE_POR_DIA = Number(process.env.IA_LIMITE_DIA) || 500;       // total do servidor
const MAX_CORPO = 32 * 1024;

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn("[ia] ANTHROPIC_API_KEY não definida: as páginas abrem, mas as análises com IA vão falhar.");
}

/* ---------- Dados de referência (os mesmos de js/dados.js) ---------- */
function carregarDados() {
  const ctx = { window: {} };
  vm.runInNewContext(readFileSync(join(RAIZ, "js", "dados.js"), "utf8"), ctx, { timeout: 1000 });
  return ctx.window.SecViewDados;
}
const BASE = carregarDados();

/* ---------- Arquivos estáticos ---------- */
const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
};
const BLOQUEADOS = ["server", "node_modules", "app", "components", "lib"];

async function servirArquivo(req, res, caminhoUrl) {
  let relativo;
  try { relativo = decodeURIComponent(caminhoUrl); } catch { return responder(res, 400, "Endereço inválido"); }
  if (relativo.endsWith("/")) relativo += "index.html";

  const partes = relativo.split("/").filter(Boolean);
  if (partes.some((p) => p.startsWith(".")) || BLOQUEADOS.includes(partes[0])) return responder(res, 404, "Não encontrado");

  const absoluto = normalize(join(RAIZ, ...partes));
  if (!absoluto.startsWith(RAIZ + sep)) return responder(res, 404, "Não encontrado");

  const tipo = TIPOS[extname(absoluto).toLowerCase()];
  if (!tipo) return responder(res, 404, "Não encontrado");

  try {
    const info = await stat(absoluto);
    if (!info.isFile()) return responder(res, 404, "Não encontrado");
    res.writeHead(200, { "Content-Type": tipo, "Cache-Control": "no-cache" });
    res.end(req.method === "HEAD" ? undefined : await readFile(absoluto));
  } catch {
    responder(res, 404, "Não encontrado");
  }
}

function responder(res, status, texto) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(texto);
}

function json(res, status, corpo) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(corpo));
}

/* ---------- Limites de uso ---------- */
const porIp = new Map(); // ip → [timestamps do último minuto]
let dia = new Date().toDateString();
let usoDoDia = 0;

function dentroDoLimite(ip) {
  const agora = Date.now();
  if (new Date().toDateString() !== dia) { dia = new Date().toDateString(); usoDoDia = 0; }
  if (usoDoDia >= LIMITE_POR_DIA) return "A vigIA encerrou o turno: acabou o limite diário de análises deste servidor. Ela volta amanhã.";

  const recentes = (porIp.get(ip) || []).filter((t) => agora - t < 60_000);
  if (recentes.length >= LIMITE_POR_MINUTO) return "Muitas análises seguidas: até a vigIA precisa respirar. Espere um minuto e tente de novo.";
  recentes.push(agora);
  porIp.set(ip, recentes);
  usoDoDia += 1;
  return null;
}
setInterval(() => {
  const agora = Date.now();
  for (const [ip, lista] of porIp) if (!lista.some((t) => agora - t < 60_000)) porIp.delete(ip);
}, 60_000).unref();

/* ---------- Rotas de IA ---------- */
const ACOES = {
  alerta: (d) => ia.analisarAlerta(d),
  fim: (d) => ia.analisarFim(d),
  mitre: (d) => ia.mapearMitre(d),
  regra: (d) => ia.montarRegra(d),
  resumo: (d) => ia.resumirTurno(d, BASE),
  pergunta: (d) => ia.responderPergunta(d, BASE),
};

function lerCorpo(req) {
  return new Promise((ok, falha) => {
    let tamanho = 0;
    const pedacos = [];
    req.on("data", (c) => {
      tamanho += c.length;
      if (tamanho > MAX_CORPO) { falha(new ia.ErroIA(413, "Pedido grande demais.")); req.destroy(); return; }
      pedacos.push(c);
    });
    req.on("end", () => ok(Buffer.concat(pedacos).toString("utf8")));
    req.on("error", falha);
  });
}

// Só aceita chamadas das próprias páginas: o navegador manda Origin em todo POST
function mesmaOrigem(req) {
  const origem = req.headers.origin;
  if (!origem) return false;
  try { return new URL(origem).host === req.headers.host; } catch { return false; }
}

async function rotaIA(req, res, acao) {
  if (req.method !== "POST") return json(res, 405, { erro: "Use POST." });
  if (!Object.hasOwn(ACOES, acao)) return json(res, 404, { erro: "Ação de IA desconhecida." });
  if (!mesmaOrigem(req)) return json(res, 403, { erro: "Pedido de outra origem recusado." });
  if (!(req.headers["content-type"] || "").startsWith("application/json")) return json(res, 415, { erro: "Envie JSON." });

  const ip = req.socket.remoteAddress || "?";
  const bloqueio = dentroDoLimite(ip);
  if (bloqueio) return json(res, 429, { erro: bloqueio });

  try {
    let dados;
    try { dados = JSON.parse(await lerCorpo(req)); } catch (e) {
      if (e instanceof ia.ErroIA) throw e;
      throw new ia.ErroIA(400, "JSON inválido.");
    }
    const validado = ia.ENTRADAS[acao].safeParse(dados);
    if (!validado.success) throw new ia.ErroIA(400, "Dados do pedido em formato inesperado.");

    const inicio = Date.now();
    const resultado = await ACOES[acao](validado.data);
    console.log(`[ia] ${acao} ok em ${Date.now() - inicio} ms`);
    json(res, 200, { modelo: ia.MODELO, resultado });
  } catch (erro) {
    if (erro instanceof ia.ErroIA) return json(res, erro.status, { erro: erro.message });
    console.error(`[ia] ${acao} falhou:`, erro);
    json(res, 500, { erro: "Erro interno ao gerar a análise." });
  }
}

/* ---------- Servidor ---------- */
const servidor = http.createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");
  res.setHeader("X-Frame-Options", "DENY");

  const url = new URL(req.url, "http://localhost");
  const rota = url.pathname.match(/^\/api\/ia\/([a-z]+)$/);
  if (rota) return rotaIA(req, res, rota[1]);
  if (url.pathname.startsWith("/api/")) return json(res, 404, { erro: "Rota desconhecida." });
  if (req.method !== "GET" && req.method !== "HEAD") return responder(res, 405, "Método não permitido");
  return servirArquivo(req, res, url.pathname === "/" ? "/index.html" : url.pathname);
});

// Porta ocupada: explica em vez de despejar o erro do Node
servidor.on("error", (erro) => {
  if (erro.code === "EADDRINUSE") {
    console.error(`A porta ${PORTA} já está em uso: provavelmente o SecView já está rodando em outro terminal.`);
    console.error(`Feche o outro terminal (Ctrl+C nele) ou use outra porta, ex.: PORT=3001 no arquivo .env.`);
    process.exit(1);
  }
  throw erro;
});

servidor.listen(PORTA, () => {
  console.log(`SecView em http://localhost:${PORTA}  (vigIA: ${ia.MODELO})`);
});
