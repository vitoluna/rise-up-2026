// Paleta padrão (mesma do Feed de alertas e de css/cores.css)
const DESTAQUE = '#0b6e6e', ALTO = '#c75b00', GRID = '#d9e0e7';

const horas = ['00h', '04h', '08h', '12h', '16h', '20h'];
const alertas = [320, 410, 690, 540, 820, 670];
const incidentes = [60, 95, 150, 120, 210, 160];

const categorias = [
    ['Brute force', 420], ['Malware', 380], ['Phishing', 310], ['Escalação de privilégio', 260],
    ['Tráfego anômalo', 210], ['Alteração de arquivo', 180], ['Exfiltração', 140], ['Evasão de defesa', 120]
];
const tons = ['#12202e', '#1d3346', '#0b4f4f', '#0b6e6e', '#2f8c8c', '#4fc3c3', '#5d6b7a', '#9aa8b6'];

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

const severidade = [['#c62828', 13], ['#d4a900', 22], ['#7b848f', 65]];

// Dados compartilhados com Feed e Compliance (js/dados.js)
const DADOS = window.SecViewDados;

// [framework, % de aderência, controles atendidos, total de controles]
const conformidade = DADOS.FRAMEWORKS.map(f => [f.nome, f.valor, f.atendidos, f.total]);

// 3 hosts com mais alertas
const topHosts = [...DADOS.HOSTS].sort((a, b) => b.alertas - a.alertas).slice(0, 3);

const fmt = n => n.toLocaleString('pt-BR');

// Gráfico de linhas (SVG)
function linhas(el, labels, series) {
    const W = 520, H = 190, p = { l: 34, r: 10, t: 10, b: 24 };
    const topo = Math.ceil(Math.max(...series.flatMap(s => s.d)) / 200) * 200;
    const x = i => p.l + i * (W - p.l - p.r) / (labels.length - 1);
    const y = v => p.t + (H - p.t - p.b) * (1 - v / topo);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de linhas de alertas e incidentes">`;
    for (let g = 0; g <= 4; g++) {
        const v = topo * g / 4;
        s += `<line x1="${p.l}" x2="${W - p.r}" y1="${y(v)}" y2="${y(v)}" stroke="${GRID}"/><text x="${p.l - 6}" y="${y(v) + 3}" text-anchor="end">${v}</text>`;
    }
    labels.forEach((l, i) => s += `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${l}</text>`);
    series.forEach(se => {
        s += `<polyline fill="none" stroke="${se.c}" stroke-width="2.2" stroke-linejoin="round" points="${se.d.map((v, i) => x(i) + ',' + y(v)).join(' ')}"/>`;
        s += se.d.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="2.8" fill="${se.c}"/>`).join('');
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

// Barras verticais agrupadas por categoria: abertos vs. resolvidos (SVG)
function barrasV(el, dados) {
    const W = 640, H = 240, p = { l: 34, r: 10, t: 16, b: 44 };
    const topo = Math.ceil(Math.max(...dados.flatMap(d => [d[1], d[2]])) / 50) * 50;
    const gw = (W - p.l - p.r) / dados.length, bw = 21, gap = 3;
    const alt = v => (H - p.t - p.b) * v / topo;
    const base = H - p.b;
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Alertas abertos e resolvidos por categoria de ameaça">
    <defs>
      <linearGradient id="gOpen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9aa8b6"/><stop offset="1" stop-color="#5d6b7a"/></linearGradient>
      <linearGradient id="gRes" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4fc3c3"/><stop offset="1" stop-color="#0b6e6e"/></linearGradient>
    </defs>`;
    for (let g = 0; g <= 5; g++) {
        const v = topo * g / 5, yy = base - alt(v);
        s += `<line x1="${p.l}" x2="${W - p.r}" y1="${yy}" y2="${yy}" stroke="${GRID}"/><text x="${p.l - 6}" y="${yy + 3}" text-anchor="end">${v}</text>`;
    }
    dados.forEach(([nome, ab, re], i) => {
        const cx = p.l + (i + .5) * gw;
        s += `<rect x="${cx - bw - gap / 2}" y="${base - alt(ab)}" width="${bw}" height="${alt(ab)}" rx="3" fill="url(#gOpen)"><title>${nome} — abertos: ${ab}</title></rect>`;
        s += `<rect x="${cx + gap / 2}" y="${base - alt(re)}" width="${bw}" height="${alt(re)}" rx="3" fill="url(#gRes)"><title>${nome} — resolvidos: ${re}</title></rect>`;
        s += `<text class="val" x="${cx - bw / 2 - gap / 2}" y="${base - alt(ab) - 4}" text-anchor="middle">${ab}</text>`;
        s += `<text class="val" x="${cx + bw / 2 + gap / 2}" y="${base - alt(re) - 4}" text-anchor="middle">${re}</text>`;
        // rótulo da categoria em até 2 linhas
        const pal = nome.split(' ');
        const meio = pal.length > 1 ? Math.ceil(pal.length / 2) : 1;
        const linhasTxt = pal.length > 1 ? [pal.slice(0, meio).join(' '), pal.slice(meio).join(' ')] : [nome];
        linhasTxt.forEach((t, k) => s += `<text x="${cx}" y="${base + 14 + k * 11}" text-anchor="middle">${t}</text>`);
    });
    el.innerHTML = s + '</svg>';
}

// Rosca (SVG)
function rosca(el, partes) {
    const r = 46, c = 2 * Math.PI * r;
    let off = 0, s = '<svg viewBox="0 0 120 120" role="img" aria-label="Alertas por severidade"><g transform="rotate(-90 60 60)">';
    partes.forEach(([cor, pct]) => {
        s += `<circle cx="60" cy="60" r="${r}" fill="none" stroke="${cor}" stroke-width="14" stroke-dasharray="${c * pct / 100} ${c}" stroke-dashoffset="${-off}"/>`;
        off += c * pct / 100;
    });
    el.innerHTML = s + '</g></svg>';
}

// Conformidade por framework: barra + % + controles atendidos + status
function conformidadeLista(el, dados) {
    const faixa = v => v >= 80
        ? { cls: 'ok', cor: '#1f9d55', txt: 'Conforme' }
        : v >= 60
            ? { cls: 'warn', cor: '#c75b00', txt: 'Atenção' }
            : { cls: 'bad', cor: '#c62828', txt: 'Revisar' };
    el.innerHTML = dados.map(([nome, pct, ok, total]) => {
        const f = faixa(pct);
        return `<div class="cf">
      <div class="cf-top"><span class="cf-n">${nome}</span><span class="tag ${f.cls}">${f.txt}</span><em>${pct}%</em></div>
      <i class="cf-bar"><b style="width:${pct}%;background:${f.cor}"></b></i>
      <small>${ok} de ${total} controles atendidos · ${total - ok} pendentes</small>
    </div>`;
    }).join('');
}

linhas(document.getElementById('line'), horas, [{ d: alertas, c: DESTAQUE }, { d: incidentes, c: ALTO }]);
barrasH(document.getElementById('hbars'), categorias, tons);
barrasV(document.getElementById('vbars'), abertosResolvidos);
const totAb = abertosResolvidos.reduce((a, d) => a + d[1], 0), totRe = abertosResolvidos.reduce((a, d) => a + d[2], 0);
document.getElementById('vsum').innerHTML =
    `<span><b>${fmt(totAb)}</b> abertos</span><span><b>${fmt(totRe)}</b> resolvidos</span><span><b>${(totRe / (totAb + totRe) * 100).toFixed(1).replace('.', ',')}%</b> de resolução no top 8</span>`;
rosca(document.getElementById('donut'), severidade);
conformidadeLista(document.getElementById('comp'), conformidade);
document.getElementById('hosts').insertAdjacentHTML('beforeend', topHosts.map(h =>
    `<div><i class="t">${h.sigla}</i><span>${h.nome}<small>${h.funcao}</small></span><em>${fmt(h.alertas)} alertas</em></div>`
).join(''));

