/* ==========================================================
   SecView — dados de exemplo compartilhados
   Fonte única para dashboard, feed de alertas e compliance.
   Quando houver backend, é aqui que entra o fetch/WebSocket.
   ========================================================== */

window.SecViewDados = (() => {
  // Rótulos de severidade (chave usada em todas as telas → texto exibido)
  const SEVERIDADES = { critico: "Crítico", alto: "Alto", medio: "Médio", info: "Info" };

  // PCI-DSS v4.0 (simulado): 12 requisitos agrupados nos 6 objetivos oficiais.
  // atendidos/total = controles do requisito. Para trocar os números, edite aqui.
  const PCI = {
    versao: "4.0",
    objetivos: [
      { id: 1, nome: "Construir e manter redes e sistemas seguros", curto: "Rede e sistemas seguros", reqs: [1, 2] },
      { id: 2, nome: "Proteger os dados da conta", curto: "Proteção de dados", reqs: [3, 4] },
      { id: 3, nome: "Manter um programa de gestão de vulnerabilidades", curto: "Gestão de vulnerabilidades", reqs: [5, 6] },
      { id: 4, nome: "Implementar medidas rigorosas de controle de acesso", curto: "Controle de acesso", reqs: [7, 8, 9] },
      { id: 5, nome: "Monitorar e testar redes regularmente", curto: "Monitoramento e testes", reqs: [10, 11] },
      { id: 6, nome: "Manter uma política de segurança da informação", curto: "Política de segurança", reqs: [12] },
    ],
    requisitos: [
      { n: 1,  nome: "Instalar e manter controles de segurança de rede",       atendidos: 5, total: 6 },
      { n: 2,  nome: "Aplicar configurações seguras a todos os componentes",   atendidos: 4, total: 4 },
      { n: 3,  nome: "Proteger os dados de conta armazenados",                 atendidos: 6, total: 7 },
      { n: 4,  nome: "Proteger dados do titular com criptografia na transmissão", atendidos: 3, total: 3 },
      { n: 5,  nome: "Proteger sistemas e redes contra software malicioso",    atendidos: 4, total: 4 },
      { n: 6,  nome: "Desenvolver e manter sistemas e software seguros",       atendidos: 5, total: 6 },
      { n: 7,  nome: "Restringir o acesso por necessidade de conhecimento",    atendidos: 3, total: 3 },
      { n: 8,  nome: "Identificar usuários e autenticar o acesso",             atendidos: 6, total: 8 },
      { n: 9,  nome: "Restringir o acesso físico aos dados do titular",        atendidos: 5, total: 5 },
      { n: 10, nome: "Registrar e monitorar todo acesso a componentes e dados", atendidos: 5, total: 6 },
      { n: 11, nome: "Testar a segurança de sistemas e redes regularmente",    atendidos: 3, total: 5 },
      { n: 12, nome: "Apoiar a segurança da informação com políticas e programas", atendidos: 3, total: 3 },
    ],
  };

  // Aderência geral derivada dos requisitos (52 de 60 controles = 87%).
  // O compliance do projeto é o PCI-DSS; outros frameworks entram como novos itens aqui.
  const pciAtendidos = PCI.requisitos.reduce((a, r) => a + r.atendidos, 0);
  const pciTotal = PCI.requisitos.reduce((a, r) => a + r.total, 0);
  const FRAMEWORKS = [
    { nome: "PCI-DSS", valor: Math.round((pciAtendidos / pciTotal) * 100), atendidos: pciAtendidos, total: pciTotal, destaque: true },
  ];

  // Hosts monitorados (os mesmos que aparecem nos eventos do feed e do compliance).
  // "alertas" = alertas nas últimas 24h; a soma fica abaixo do total do dashboard (2.847).
  const HOSTS = [
    { nome: "host-web-03", funcao: "Servidor web",   sigla: "W", alertas: 612 },
    { nome: "host-db-01",  funcao: "Banco de dados", sigla: "D", alertas: 498 },
    { nome: "host-app-02", funcao: "Aplicação",      sigla: "A", alertas: 407 },
    { nome: "host-web-01", funcao: "Servidor web",   sigla: "W", alertas: 301 },
    { nome: "host-app-01", funcao: "Aplicação",      sigla: "A", alertas: 265 },
    { nome: "host-web-02", funcao: "Servidor web",   sigla: "W", alertas: 210 },
    { nome: "host-db-02",  funcao: "Banco de dados", sigla: "D", alertas: 188 },
  ];

  // Eventos de exemplo (últimos 30 dias). "dia" = há quantos dias.
  // Alimentam o gráfico/CSV do Compliance e servem de modelo para o Feed ao vivo.
  const EVENTOS = [
    // Acesso
    { dia: 1,  categoria: "Acesso",  origem: "host-web-03", descricao: "Tentativa de login falha (5x)",       severidade: "critico" },
    { dia: 2,  categoria: "Acesso",  origem: "host-web-01", descricao: "Login fora do horário",               severidade: "medio" },
    { dia: 3,  categoria: "Acesso",  origem: "host-db-01",  descricao: "Escalação de privilégio",             severidade: "critico" },
    { dia: 5,  categoria: "Acesso",  origem: "host-app-02", descricao: "Nova conta criada",                   severidade: "medio" },
    { dia: 6,  categoria: "Acesso",  origem: "host-web-03", descricao: "Brute force detectado",               severidade: "critico" },
    { dia: 8,  categoria: "Acesso",  origem: "host-web-02", descricao: "Tentativa de login falha (8x)",       severidade: "critico" },
    { dia: 10, categoria: "Acesso",  origem: "host-app-01", descricao: "Login de IP desconhecido",            severidade: "alto" },
    { dia: 12, categoria: "Acesso",  origem: "host-db-01",  descricao: "Senha alterada fora de política",     severidade: "medio" },
    { dia: 15, categoria: "Acesso",  origem: "host-web-01", descricao: "Tentativa de login falha (6x)",       severidade: "critico" },
    { dia: 18, categoria: "Acesso",  origem: "host-app-02", descricao: "Sessão simultânea suspeita",          severidade: "medio" },
    { dia: 22, categoria: "Acesso",  origem: "host-web-03", descricao: "Brute force detectado",               severidade: "critico" },
    { dia: 27, categoria: "Acesso",  origem: "host-db-02",  descricao: "Conta privilegiada usada",            severidade: "alto" },
    // Dados
    { dia: 4,  categoria: "Dados",   origem: "host-db-01",  descricao: "Alteração em /etc/passwd",            severidade: "critico" },
    { dia: 9,  categoria: "Dados",   origem: "host-db-02",  descricao: "Consulta massiva a tabela sensível",  severidade: "alto" },
    { dia: 14, categoria: "Dados",   origem: "host-app-01", descricao: "Arquivo de log removido",             severidade: "medio" },
    { dia: 19, categoria: "Dados",   origem: "host-db-01",  descricao: "Dump de banco não autorizado",        severidade: "critico" },
    { dia: 24, categoria: "Dados",   origem: "host-app-02", descricao: "Download volumoso de dados",          severidade: "medio" },
    { dia: 28, categoria: "Dados",   origem: "host-db-02",  descricao: "Alteração em arquivo crítico",        severidade: "medio" },
    // Rede
    { dia: 1,  categoria: "Rede",    origem: "host-web-01", descricao: "Tráfego incomum porta 4444",          severidade: "medio" },
    { dia: 3,  categoria: "Rede",    origem: "host-web-02", descricao: "Varredura de portas",                 severidade: "medio" },
    { dia: 7,  categoria: "Rede",    origem: "host-app-01", descricao: "DNS tunnel suspeito",                 severidade: "critico" },
    { dia: 11, categoria: "Rede",    origem: "host-web-03", descricao: "Conexão para IP em blocklist",        severidade: "critico" },
    { dia: 13, categoria: "Rede",    origem: "host-web-01", descricao: "Tráfego incomum porta 4444",          severidade: "medio" },
    { dia: 17, categoria: "Rede",    origem: "host-app-02", descricao: "Exfiltração C2 suspeita",             severidade: "critico" },
    { dia: 21, categoria: "Rede",    origem: "host-web-02", descricao: "Pico de tráfego anômalo",             severidade: "alto" },
    { dia: 25, categoria: "Rede",    origem: "host-web-01", descricao: "Varredura de portas",                 severidade: "medio" },
    { dia: 29, categoria: "Rede",    origem: "host-app-01", descricao: "Porta fora da lista permitida",       severidade: "medio" },
    // Sistema
    { dia: 6,  categoria: "Sistema", origem: "host-app-02", descricao: "Novo processo iniciado",              severidade: "info" },
    { dia: 16, categoria: "Sistema", origem: "host-web-03", descricao: "Serviço reiniciado",                  severidade: "info" },
    { dia: 23, categoria: "Sistema", origem: "host-db-01",  descricao: "PowerShell executado",                severidade: "medio" },
  ];

  return { SEVERIDADES, FRAMEWORKS, PCI, HOSTS, EVENTOS };
})();
