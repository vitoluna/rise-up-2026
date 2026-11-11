// Cores: só variáveis de css/cores.css e css/dashboard.css, para os gráficos
// acompanharem o tema claro/escuro. Nada de hex fixo aqui.
const COR = {
    alertas: 'var(--destaque)',
    incidentes: 'var(--texto)', // neutra: laranja é a severidade "Alto"
};

const horas = ['00h', '04h', '08h', '12h', '16h', '20h'];
const alertas = [320, 410, 690, 540, 820, 670];
const incidentes = [60, 95, 150, 120, 210, 160];

const categorias = [
    ['Brute force', 420], ['Malware', 380], ['Phishing', 310], ['Escalação de privilégio', 260],
    ['Tráfego anômalo', 210], ['Alteração de arquivo', 180], ['Exfiltração', 140], ['Evasão de defesa', 120]
];
const tons = categorias.map((_, i) => `var(--cat-${i + 1})`);

// Abertos vs. resolvidos por categoria (abertos + resolvidos = total da categoria acima)
const abertosResolvidos = [
    ['Brute force', 170, 250],
    ['Malware', 190, 190],
    ['Phishing', 100, 210],
    ['Escalação de privilégio', 150, 110],
    ['Tráfego anômalo', 120, 90],
    ['Alteração de arquivo', 60, 120],
    ['Exfiltração', 90, 50],
    ['Evasão de defesa', 75, 45]
];

// Dados compartilhados com Feed e Compliance (js/dados.js)
const DADOS = window.SecViewDados;

// Severidade: mesma distribuição dos eventos do Feed, nos 4 níveis do projeto
const ORDEM_SEV = ['critico', 'alto', 'medio', 'info'];
const severidade = porcentagens(ORDEM_SEV.map(k => DADOS.EVENTOS.filter(e => e.severidade === k).length))
    .map((pct, i) => ({ chave: ORDEM_SEV[i], nome: DADOS.SEVERIDADES[ORDEM_SEV[i]], pct }));

// [framework, % de aderência, controles atendidos, total de controles]
const conformidade = DADOS.FRAMEWORKS.map(f => [f.nome, f.valor, f.atendidos, f.total]);

// 3 hosts com mais alertas
const topHosts = [...DADOS.HOSTS].sort((a, b) => b.alertas - a.alertas).slice(0, 3);

const fmt = n => n.toLocaleString('pt-BR');

// Porcentagens inteiras que somam 100 (maior resto)
function porcentagens(contagens) {
    const total = contagens.reduce((a, n) => a + n, 0) || 1;
    const brutos = contagens.map(n => n * 100 / total);
    const pcts = brutos.map(Math.floor);
    let falta = 100 - pcts.reduce((a, n) => a + n, 0);
    brutos.map((b, i) => [b - Math.floor(b), i]).sort((a, b) => b[0] - a[0])
        .forEach(([, i]) => { if (falta > 0) { pcts[i]++; falta--; } });
    return pcts;
}

// Mede texto com a mesma fonte dos rótulos dos gráficos (svg text, 11px)
const medidor = document.createElement('canvas').getContext('2d');
function largura(txt, el) {
    const cs = getComputedStyle(el);
    medidor.font = `11px ${cs.fontFamily}`;
    return medidor.measureText(txt).width;
}

// Gráfico de linhas (SVG desenhado na largura real: 1 unidade = 1px)
function linhas(el, labels, series) {
    const W = Math.max(el.clientWidth, 280), H = 200, p = { l: 38, r: 12, t: 10, b: 26 };
    const topo = Math.ceil(Math.max(...series.flatMap(s => s.d)) / 200) * 200;
    const x = i => p.l + i * (W - p.l - p.r) / (labels.length - 1);
    const y = v => p.t + (H - p.t - p.b) * (1 - v / topo);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de linhas de alertas e incidentes">`;
    for (let g = 0; g <= 4; g++) {
        const v = topo * g / 4;
        s += `<line class="grade" x1="${p.l}" x2="${W - p.r}" y1="${y(v)}" y2="${y(v)}"/><text x="${p.l - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
    }
    labels.forEach((l, i) => s += `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${l}</text>`);
    series.forEach(se => {
        s += `<polyline fill="none" style="stroke:${se.c}" stroke-width="2.2" stroke-linejoin="round" points="${se.d.map((v, i) => x(i) + ',' + y(v)).join(' ')}"/>`;
        s += se.d.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="2.8" style="fill:${se.c}"/>`).join('');
    });
    el.innerHTML = s + '</svg>';
}

// Barras horizontais (HTML/CSS)
function barrasH(el, dados, cores, sufixo = '', max) {
    max = max || Math.max(...dados.map(d => d[1]));
    el.innerHTML = dados.map(([n, v], i) =>
        `<div class="hb"><span>${n}</span><i><b style="width:${v / max * 100}%;background:${cores[i]}"></b></i><em>${v}${sufixo}</em></div>`
    ).join('');
}

// Rótulo de categoria: 2 linhas, 1 palavra por linha, ou inclinado (o que couber)
function rotulosCategoria(nomes, espaco, el) {
    const cabe = linhas => linhas.every(t => largura(t, el) <= espaco);
    const duas = nomes.map(n => {
        const pal = n.split(' ');
        if (pal.length < 2) return [n];
        const meio = Math.ceil(pal.length / 2);
        return [pal.slice(0, meio).join(' '), pal.slice(meio).join(' ')];
    });
    if (duas.every(cabe)) return { modo: 'linhas', linhas: duas };
    const porPalavra = nomes.map(n => n.split(' '));
    if (porPalavra.every(cabe)) return { modo: 'linhas', linhas: porPalavra };
    return { modo: 'inclinado', linhas: nomes.map(n => [n]) };
}

// Barras verticais agrupadas por categoria: abertos vs. resolvidos (SVG na largura real)
function barrasV(el, dados) {
    const W = Math.max(el.clientWidth, 280), p = { l: 38, r: 8, t: 20 };
    const gw = (W - p.l - p.r) / dados.length, gap = 3;
    const bw = Math.min(22, (gw - 10 - gap) / 2);
    const rot = rotulosCategoria(dados.map(d => d[0]), gw - 4, el);
    const ANG = 40, sen = Math.sin(ANG * Math.PI / 180);
    p.b = rot.modo === 'inclinado'
        ? Math.ceil(Math.max(...dados.map(d => largura(d[0], el))) * sen) + 22
        : Math.max(...rot.linhas.map(l => l.length)) * 13 + 12;
    const H = 180 + p.t + p.b;
    const topo = Math.ceil(Math.max(...dados.flatMap(d => [d[1], d[2]])) / 50) * 50;
    const alt = v => (H - p.t - p.b) * v / topo;
    const base = H - p.b;
    // valores sobre as barras só quando não encostam um no outro
    const maxVal = Math.max(...dados.flatMap(d => [largura(String(d[1]), el), largura(String(d[2]), el)]));
    const mostraValores = bw + gap >= maxVal + 2;

    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Alertas abertos e resolvidos por categoria de ameaça">
    <defs>
      <linearGradient id="gOpen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--aberto-1)"/><stop offset="1" style="stop-color:var(--aberto-2)"/></linearGradient>
      <linearGradient id="gRes" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--resolvido-1)"/><stop offset="1" style="stop-color:var(--resolvido-2)"/></linearGradient>
    </defs>`;
    for (let g = 0; g <= 5; g++) {
        const v = topo * g / 5, yy = base - alt(v);
        s += `<line class="grade" x1="${p.l}" x2="${W - p.r}" y1="${yy}" y2="${yy}"/><text x="${p.l - 8}" y="${yy + 4}" text-anchor="end">${v}</text>`;
    }
    dados.forEach(([nome, ab, re], i) => {
        const cx = p.l + (i + .5) * gw;
        s += `<rect x="${cx - bw - gap / 2}" y="${base - alt(ab)}" width="${bw}" height="${alt(ab)}" rx="3" fill="url(#gOpen)"><title>${nome} — abertos: ${ab}</title></rect>`;
        s += `<rect x="${cx + gap / 2}" y="${base - alt(re)}" width="${bw}" height="${alt(re)}" rx="3" fill="url(#gRes)"><title>${nome} — resolvidos: ${re}</title></rect>`;
        if (mostraValores) {
            s += `<text class="val" x="${cx - bw / 2 - gap / 2}" y="${base - alt(ab) - 5}" text-anchor="middle">${ab}</text>`;
            s += `<text class="val" x="${cx + bw / 2 + gap / 2}" y="${base - alt(re) - 5}" text-anchor="middle">${re}</text>`;
        }
        if (rot.modo === 'inclinado') {
            s += `<text x="${cx}" y="${base + 14}" text-anchor="end" transform="rotate(-${ANG} ${cx} ${base + 14})">${nome}</text>`;
        } else {
            rot.linhas[i].forEach((t, k) => s += `<text x="${cx}" y="${base + 16 + k * 13}" text-anchor="middle">${t}</text>`);
        }
    });
    el.innerHTML = s + '</svg>';
}

// Rosca (SVG)
function rosca(el, partes) {
    const r = 46, c = 2 * Math.PI * r;
    const desc = partes.map(p => `${p.nome} ${p.pct}%`).join(', ');
    let off = 0, s = `<svg viewBox="0 0 120 120" role="img" aria-label="Alertas por severidade: ${desc}"><g transform="rotate(-90 60 60)">`;
    partes.forEach(({ chave, pct }) => {
        s += `<circle cx="60" cy="60" r="${r}" fill="none" style="stroke:var(--${chave})" stroke-width="14" stroke-dasharray="${c * pct / 100} ${c}" stroke-dashoffset="${-off}"/>`;
        off += c * pct / 100;
    });
    el.innerHTML = s + '</g></svg>';
}

function legendaSeveridade(el, partes) {
    el.innerHTML = partes.map(({ chave, nome, pct }) =>
        `<li><i style="background:var(--${chave})"></i>${nome} (${pct}%)</li>`).join('');
}

// Conformidade por framework: barra + % + controles atendidos + status
function conformidadeLista(el, dados) {
    const faixa = v => v >= 80
        ? { cls: 'ok', cor: 'var(--sucesso)', txt: 'Conforme' }
        : v >= 60
            ? { cls: 'warn', cor: 'var(--alto)', txt: 'Atenção' }
            : { cls: 'bad', cor: 'var(--critico)', txt: 'Revisar' };
    el.innerHTML = dados.map(([nome, pct, ok, total]) => {
        const f = faixa(pct);
        return `<div class="cf">
      <div class="cf-top"><span class="cf-n">${nome}</span><span class="tag ${f.cls}">${f.txt}</span><em>${pct}%</em></div>
      <i class="cf-bar"><b style="width:${pct}%;background:${f.cor}"></b></i>
      <small>${ok} de ${total} controles atendidos · ${total - ok} pendentes</small>
    </div>`;
    }).join('');
}

const elLinha = document.getElementById('line');
const elVbars = document.getElementById('vbars');
const desenharSvgs = () => {
    linhas(elLinha, horas, [{ d: alertas, c: COR.alertas }, { d: incidentes, c: COR.incidentes }]);
    barrasV(elVbars, abertosResolvidos);
};
desenharSvgs();

// Os SVGs são desenhados na largura real; redesenha quando o cartão muda de largura
let larguras = [elLinha.clientWidth, elVbars.clientWidth], quadro = 0;
new ResizeObserver(() => {
    const agora = [elLinha.clientWidth, elVbars.clientWidth];
    if (agora[0] === larguras[0] && agora[1] === larguras[1]) return;
    larguras = agora;
    cancelAnimationFrame(quadro);
    quadro = requestAnimationFrame(desenharSvgs);
}).observe(document.querySelector('main'));

barrasH(document.getElementById('hbars'), categorias, tons);
const totAb = abertosResolvidos.reduce((a, d) => a + d[1], 0), totRe = abertosResolvidos.reduce((a, d) => a + d[2], 0);
document.getElementById('vsum').innerHTML =
    `<span><b>${fmt(totAb)}</b> abertos</span><span><b>${fmt(totRe)}</b> resolvidos</span><span><b>${(totRe / (totAb + totRe) * 100).toFixed(1).replace('.', ',')}%</b> de resolução no top 8</span>`;
rosca(document.getElementById('donut'), severidade);
legendaSeveridade(document.getElementById('sev-legenda'), severidade);
conformidadeLista(document.getElementById('comp'), conformidade);
document.getElementById('hosts').insertAdjacentHTML('beforeend', topHosts.map(h =>
    `<div><i class="t">${h.sigla}</i><span>${h.nome}<small>${h.funcao}</small></span><em>${fmt(h.alertas)} alertas</em></div>`
).join(''));
