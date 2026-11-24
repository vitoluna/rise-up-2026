const CHAVE_REGRAS = "sentinela:regras";

const REGRAS_PADRAO = [
  { id: "padrao-login", nome: "Senhas erradas no login", tipo: "login", valor: 3, severidade: "critico", ativa: true },
];

function lerRegras() {
  try {
    const lista = JSON.parse(localStorage.getItem(CHAVE_REGRAS));
    if (Array.isArray(lista)) return lista;
  } catch {}
  return REGRAS_PADRAO.map((r) => ({ ...r }));
}

function salvarRegras(lista) {
  try { localStorage.setItem(CHAVE_REGRAS, JSON.stringify(lista)); } catch {}
}

function normalizar(texto) {
  return String(texto).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/* Regras de texto: a primeira regra ativa que combinar define a severidade do evento. */
function severidadePorRegras(ev) {
  const alvo = normalizar(`${ev.evento} ${ev.origem}`);
  const regra = lerRegras().find((r) => r.ativa && r.tipo === "texto" && alvo.includes(normalizar(r.valor)));
  return regra ? regra.severidade : ev.severidade;
  }

/* ---------- Regras de login ----------
   A tela de login conta as senhas erradas SEGUIDAS (só zera quando o login dá certo;
   o bloqueio de 60 s não zera). A cada múltiplo de N de uma regra de login ativa,
   um alerta vai para uma fila no localStorage; o feed lê essa fila e mostra o alerta.
   Sem servidor, a fila só vale neste navegador. */
const CHAVE_FALHAS_SEGUIDAS = "secview_falhas_seguidas";
const CHAVE_ALERTAS_LOGIN = "secview_alertas_login";
const MAX_ALERTAS_LOGIN = 50;
const PESO_SEV = { info: 0, medio: 1, alto: 2, critico: 3 };

function lerFilaLogin() {
  try {
    const lista = JSON.parse(localStorage.getItem(CHAVE_ALERTAS_LOGIN));
    return Array.isArray(lista) ? lista : [];
  } catch { return []; }
}

/** Chamado pelo login a cada senha errada. Devolve o alerta gerado, ou null. */
function registrarFalhaLogin(email) {
  let seguidas = 0;
  try { seguidas = (Number(localStorage.getItem(CHAVE_FALHAS_SEGUIDAS)) || 0) + 1; } catch {}
  try { localStorage.setItem(CHAVE_FALHAS_SEGUIDAS, String(seguidas)); } catch {}

  const disparadas = lerRegras().filter((r) =>
    r.ativa && r.tipo === "login" && Number(r.valor) >= 1 && seguidas % Number(r.valor) === 0
  );
  if (!disparadas.length) return null;

  // várias regras no mesmo número de erros viram um alerta só, com a severidade mais alta
  const regra = disparadas.reduce((a, b) => (PESO_SEV[b.severidade] > PESO_SEV[a.severidade] ? b : a));
  const alerta = {
    evento: `Tentativa de login falha (${seguidas}x) · ${String(email).slice(0, 80)}`,
    origem: "login-secview",
    severidade: regra.severidade,
    regra: String(regra.nome).slice(0, 60),
    data: Date.now(),
  };
  const fila = [...lerFilaLogin(), alerta].slice(-MAX_ALERTAS_LOGIN);
  try { localStorage.setItem(CHAVE_ALERTAS_LOGIN, JSON.stringify(fila)); } catch {}
  return alerta;
}

/** Login deu certo: a sequência de erros recomeça. */
function zerarFalhasLogin() {
  try { localStorage.removeItem(CHAVE_FALHAS_SEGUIDAS); } catch {}
}

/** Usado pelo feed: devolve os alertas pendentes (já validados) e esvazia a fila. */
function consumirAlertasLogin() {
  const fila = lerFilaLogin();
  if (!fila.length) return [];
  try { localStorage.removeItem(CHAVE_ALERTAS_LOGIN); } catch {}
  // o localStorage pode ter sido editado à mão: só passa o que tem o formato esperado
  return fila
    .filter((a) => a && typeof a.evento === "string" && typeof a.origem === "string" && a.severidade in PESO_SEV)
    .map((a) => ({
      evento: a.evento.slice(0, 120),
      origem: a.origem.slice(0, 40),
      severidade: a.severidade,
      data: new Date(Number.isFinite(a.data) ? a.data : Date.now()),
    }));
}
