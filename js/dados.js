/* ==========================================================
   SecView — dados de exemplo compartilhados
   Fonte única para dashboard, feed de alertas e compliance.
   Quando houver backend, é aqui que entra o fetch/WebSocket.
   ========================================================== */

window.SecViewDados = (() => {
  // Rótulos de severidade (chave usada em todas as telas → texto exibido)
  const SEVERIDADES = { critico: "Crítico", alto: "Alto", medio: "Médio", info: "Info" };

  // Aderência simulada por framework. "destaque" = aparece nos cards da tela de Compliance.
  const FRAMEWORKS = [
    { nome: "PCI-DSS",   valor: 87, atendidos: 52, total: 60,  destaque: true },
    { nome: "GDPR",      valor: 62, atendidos: 31, total: 50,  destaque: true },
    { nome: "HIPAA",     valor: 94, atendidos: 47, total: 50,  destaque: true },
    { nome: "ISO 27001", valor: 78, atendidos: 89, total: 114, destaque: false },
    { nome: "NIST CSF",  valor: 71, atendidos: 77, total: 108, destaque: false },
    { nome: "SOC 2",     valor: 83, atendidos: 53, total: 64,  destaque: false },
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

  return { SEVERIDADES, FRAMEWORKS, HOSTS, EVENTOS };
})();
