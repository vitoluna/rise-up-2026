const CHAVE_REGRAS = "sentinela:regras";
const CHAVE_ALERTAS = "sentinela:alertas";

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

/* Alertas gerados fora do feed (ex.: login.html). O feed lê esta chave. */
function publicarAlerta(alerta) {
  let lista = [];
  try { lista = JSON.parse(localStorage.getItem(CHAVE_ALERTAS)) || []; } catch {}
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  lista = [...lista, { id, data: new Date().toISOString(), ...alerta }].slice(-100);
  try { localStorage.setItem(CHAVE_ALERTAS, JSON.stringify(lista)); } catch {}
}
