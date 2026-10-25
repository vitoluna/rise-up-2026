/* ==========================================================
   Tela FIM — SecView (estática, sem dependências)
   Status = hash do conteúdo atual ≠ hash do baseline.
   Dados vêm de js/dados.js (SecViewDados.FIM).
   ========================================================== */

const DADOS = window.SecViewDados;
const $ = (sel) => document.querySelector(sel);
const SEV = DADOS.SEVERIDADES;

const estado = { host: "todos", selecionado: null };
let arquivos = [];

function criar(tag, classe, texto) {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto !== undefined) e.textContent = texto;
    return e;
}

/* ---------- Hash ---------- */
// SHA-256 real quando o navegador permite (https/localhost); senão, FNV-1a só para a simulação.
async function hash(texto) {
    if (window.crypto && crypto.subtle) {
        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
        return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    let h = 0x811c9dc5;
    for (const c of texto) { h ^= c.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, "0");
}

async function atualizarStatus(f) {
    f.hashAtual = await hash(f.atual);
    f.modificado = f.hashAtual !== f.hashBase;
}

async function carregar() {
    arquivos = await Promise.all(DADOS.FIM.map(async (a) => {
        const f = { ...a, id: a.host + a.caminho, atual: a.atual ?? a.base };
        f.hashBase = await hash(f.base);
        await atualizarStatus(f);
        return f;
    }));
}

/* ---------- Diff linha a linha (LCS) ---------- */
function diffLinhas(antes, depois) {
    const a = antes.split("\n"), b = depois.split("\n");
    const m = a.length, n = b.length;
    const t = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = m - 1; i >= 0; i--)
        for (let j = n - 1; j >= 0; j--)
            t[i][j] = a[i] === b[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);

    const saida = [];
    let i = 0, j = 0;
    while (i < m && j < n) {
        if (a[i] === b[j]) { saida.push({ t: " ", l: a[i] }); i++; j++; }
        else if (t[i + 1][j] >= t[i][j + 1]) saida.push({ t: "-", l: a[i++] });
        else saida.push({ t: "+", l: b[j++] });
    }
    while (i < m) saida.push({ t: "-", l: a[i++] });
    while (j < n) saida.push({ t: "+", l: b[j++] });
    return saida;
}

/* ---------- Árvore ---------- */
// ["host-db-01", "etc", "passwd"] → { "host-db-01": { etc: { passwd: { __arquivo: f } } } }
function montarArvore(lista) {
    const raiz = {};
    lista.forEach((f) => {
        const partes = [f.host, ...f.caminho.split("/").filter(Boolean)];
        let no = raiz;
        partes.forEach((p, i) => {
            no = no[p] ??= i === partes.length - 1 ? { __arquivo: f } : {};
        });
    });
    return raiz;
}

function temModificado(no) {
    if (no.__arquivo) return no.__arquivo.modificado;
    return Object.values(no).some(temModificado);
}

function renderNo(obj) {
    const ul = criar("ul");
    Object.entries(obj).forEach(([nome, filho]) => {
        const li = criar("li");
        if (filho.__arquivo) {
            const f = filho.__arquivo;
            const btn = criar("button", "arq" + (f.modificado ? " mod" : ""));
            btn.type = "button";
            btn.dataset.id = f.id;
            btn.setAttribute("aria-pressed", String(estado.selecionado === f.id));
            btn.append(criar("span", "ponto"), nome);
            btn.title = f.modificado ? "Modificado" : "Íntegro";
            li.append(btn);
        } else {
            const d = criar("details");
            d.open = true;
            d.append(criar("summary", temModificado(filho) ? "tem-mod" : "", nome), renderNo(filho));
            li.append(d);
        }
        ul.append(li);
    });
    return ul;
}

/* ---------- Renderização ---------- */
const visiveis = () => arquivos.filter((f) => estado.host === "todos" || f.host === estado.host);

function renderResumo(lista) {
    const mod = lista.filter((f) => f.modificado);
    const hostsAfetados = new Set(mod.map((f) => f.host)).size;
    const cards = [
        ["Arquivos monitorados", lista.length, "no escopo selecionado", ""],
        ["Íntegros", lista.length - mod.length, "hash igual ao baseline", ""],
        ["Modificados", mod.length, "hash diferente do baseline", mod.length ? "alerta" : ""],
        ["Hosts afetados", hostsAfetados, "com ao menos 1 arquivo alterado", ""],
    ];
    $("#resumo").replaceChildren(...cards.map(([rotulo, valor, sub, extra]) => {
        const c = criar("div", "card " + extra);
        c.append(criar("div", "label", rotulo), criar("div", "value", valor), criar("div", "sub", sub));
        return c;
    }));
}

function renderDetalhe() {
    const f = arquivos.find((x) => x.id === estado.selecionado);
    const alvo = $("#detalhe");
    if (!f) {
        alvo.replaceChildren(criar("p", "detalhe-vazio", "Selecione um arquivo na árvore para ver o hash e o diff."));
        return;
    }

    const topo = criar("div", "detalhe-topo");
    const titulo = criar("div");
    titulo.append(criar("h2", "", f.caminho));
    const chips = criar("div", "chips");
    chips.append(criar("span", "chip", f.host));
    if (f.modificado) {
        chips.append(criar("span", "chip sev-" + f.severidade, SEV[f.severidade]), criar("span", "chip", "modificado " + (f.quando || "agora")));
    } else {
        chips.append(criar("span", "chip ok", "íntegro"));
    }
    titulo.append(chips);
    topo.append(titulo);

    if (f.modificado) {
        const aprovar = criar("button", "btn primario", "Aprovar alteração");
        aprovar.type = "button";
        aprovar.id = "aprovar";
        topo.append(aprovar);
    }

    const hashes = criar("div", "hashes");
    hashes.append(
        criar("span", "", "Baseline"), criar("span", "hash", f.hashBase),
        criar("span", "", "Atual"), criar("span", "hash", f.hashAtual)
    );

    const filhos = [topo, hashes];
    if (f.modificado) {
        const diff = criar("div", "diff");
        diffLinhas(f.base, f.atual).forEach(({ t, l }) => {
            const lin = criar("div", "lin" + (t === "+" ? " add" : t === "-" ? " del" : ""));
            lin.append(criar("b", "", t === " " ? "" : t), document.createTextNode(l || " "));
            diff.append(lin);
        });
        filhos.push(diff);
    } else {
        filhos.push(criar("p", "detalhe-vazio", "Nenhuma diferença em relação ao baseline."));
    }
    alvo.replaceChildren(...filhos);
}

function renderizar() {
    const lista = visiveis();
    renderResumo(lista);
    $("#arvore").replaceChildren(renderNo(montarArvore(lista)));
    renderDetalhe();
}

/* ---------- Ações ---------- */
async function simularAlteracao() {
    const candidatos = visiveis().filter((f) => !f.modificado);
    if (!candidatos.length) return;
    const f = candidatos[Math.floor(Math.random() * candidatos.length)];
    f.atual += "\n# linha inserida fora do processo de mudança";
    f.severidade = f.severidade || "alto";
    f.quando = "agora";
    await atualizarStatus(f);
    estado.selecionado = f.id;
    renderizar();
}

async function aprovar() {
    const f = arquivos.find((x) => x.id === estado.selecionado);
    if (!f) return;
    f.base = f.atual;          // novo baseline
    f.hashBase = f.hashAtual;
    f.modificado = false;
    renderizar();
}

/* ---------- Início ---------- */
function montarFiltroHost() {
    const hosts = [...new Set(DADOS.FIM.map((a) => a.host))];
    const sel = $("#host");
    sel.replaceChildren(new Option("Todos os hosts", "todos"), ...hosts.map((h) => new Option(h, h)));
    sel.addEventListener("change", () => { estado.host = sel.value; renderizar(); });
}

$("#arvore").addEventListener("click", (e) => {
    const btn = e.target.closest(".arq");
    if (!btn) return;
    estado.selecionado = btn.dataset.id;
    renderizar();
});
$("#detalhe").addEventListener("click", (e) => { if (e.target.id === "aprovar") aprovar(); });
$("#simular").addEventListener("click", simularAlteracao);

carregar().then(() => {
    montarFiltroHost();
    // abre direto no primeiro arquivo modificado (ou em ?arquivo=/etc/passwd)
    const pedido = new URLSearchParams(location.search).get("arquivo");
    const inicial = arquivos.find((f) => f.caminho === pedido) || arquivos.find((f) => f.modificado);
    if (inicial) estado.selecionado = inicial.id;
    renderizar();
});