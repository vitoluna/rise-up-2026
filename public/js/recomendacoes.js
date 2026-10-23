/* ==========================================================
   SecView — recomendações por tipo de alerta
   Dado um evento, devolve o que aconteceu, o que fazer e a
   referência no MITRE ATT&CK e no PCI-DSS.
   Quando houver backend, estes textos podem vir da API.
   ========================================================== */

window.SecViewRecomendacoes = (() => {
  // A primeira regra que casar com a descrição do evento vence.
  const REGRAS = [
    {
      teste: /login falha|brute force/i,
      oQue: "Muitas tentativas de senha em sequência indicam que alguém está tentando adivinhar credenciais.",
      acoes: [
        "Bloquear o IP de origem no firewall",
        "Forçar a troca de senha da conta alvo",
        "Ativar a autenticação em dois fatores (MFA)",
        "Verificar se algum login foi bem-sucedido depois das tentativas",
      ],
      mitre: { id: "T1110", nome: "Brute Force" },
      pci: 8,
    },
    {
      teste: /sessão simultânea|fora do horário|ip desconhecido|conta privilegiada/i,
      oQue: "Um acesso fora do padrão pode ser uma conta legítima sendo usada por outra pessoa.",
      acoes: [
        "Confirmar com o dono da conta se o acesso foi dele",
        "Encerrar as sessões ativas dessa conta",
        "Redefinir a senha e revisar os acessos recentes",
      ],
      mitre: { id: "T1078", nome: "Valid Accounts" },
      pci: 8,
    },
    {
      teste: /escalação de privilégio/i,
      oQue: "Uma conta ganhou permissões acima do normal. Isso costuma acontecer depois de uma invasão.",
      acoes: [
        "Isolar o servidor da rede até confirmar a origem",
        "Remover as permissões elevadas da conta",
        "Revisar quem alterou grupos e permissões",
      ],
      mitre: { id: "T1068", nome: "Exploitation for Privilege Escalation" },
      pci: 7,
    },
    {
      teste: /nova conta criada/i,
      oQue: "Contas novas são usadas por invasores para manter acesso ao ambiente.",
      acoes: [
        "Verificar se a criação foi autorizada",
        "Desativar a conta se ela não for reconhecida",
        "Revisar quem criou e de onde veio o pedido",
      ],
      mitre: { id: "T1136", nome: "Create Account" },
      pci: 8,
    },
    {
      teste: /senha alterada|passwd/i,
      oQue: "A alteração de credenciais ou de contas do sistema pode ser uma tentativa de assumir o controle.",
      acoes: [
        "Identificar quem fez a alteração",
        "Comparar com a versão aprovada e restaurar se for indevida",
        "Redefinir as credenciais afetadas",
      ],
      mitre: { id: "T1098", nome: "Account Manipulation" },
      pci: 11,
    },
    {
      teste: /arquivo crítico/i,
      oQue: "Um arquivo importante do sistema foi modificado fora do processo de mudança.",
      acoes: [
        "Comparar o arquivo com a versão aprovada",
        "Restaurar a partir do backup se a mudança for indevida",
        "Identificar quem e o que fez a alteração",
      ],
      mitre: { id: "T1565", nome: "Data Manipulation" },
      pci: 11,
    },
    {
      teste: /consulta massiva|dump de banco|download volumoso/i,
      oQue: "Uma grande quantidade de dados foi lida ou copiada. Pode ser o início de um vazamento.",
      acoes: [
        "Suspender a conta ou sessão que fez a operação",
        "Verificar para onde os dados foram enviados",
        "Avaliar se houve dados de cartão envolvidos e acionar o time de resposta",
      ],
      mitre: { id: "T1005", nome: "Data from Local System" },
      pci: 3,
    },
    {
      teste: /log removido/i,
      oQue: "Apagar logs é uma forma comum de esconder o que um invasor fez.",
      acoes: [
        "Restaurar os registros a partir do backup ou da plataforma",
        "Identificar quem removeu o arquivo",
        "Restringir a permissão de apagar logs",
      ],
      mitre: { id: "T1070", nome: "Indicator Removal" },
      pci: 10,
    },
    {
      teste: /exfiltração/i,
      oQue: "O servidor parece estar enviando dados para um destino externo controlado por terceiros.",
      acoes: [
        "Isolar o servidor da rede",
        "Bloquear a conexão de saída suspeita",
        "Preservar as evidências (logs e memória) antes de reiniciar",
        "Acionar o plano de resposta a incidentes",
      ],
      mitre: { id: "T1041", nome: "Exfiltration Over C2 Channel" },
      pci: 1,
    },
    {
      teste: /dns tunnel|blocklist/i,
      oQue: "Há comunicação com um destino malicioso ou escondida dentro de consultas DNS.",
      acoes: [
        "Bloquear o domínio ou IP no DNS e no firewall",
        "Investigar o host em busca de software malicioso",
        "Revisar as consultas DNS recentes desse host",
      ],
      mitre: { id: "T1071", nome: "Application Layer Protocol" },
      pci: 1,
    },
    {
      teste: /porta 4444|fora da lista/i,
      oQue: "Tráfego em porta fora do padrão é típico de ferramentas de controle remoto usadas por invasores.",
      acoes: [
        "Bloquear a porta no firewall",
        "Identificar o processo que abriu a conexão",
        "Revisar a lista de portas permitidas",
      ],
      mitre: { id: "T1571", nome: "Non-Standard Port" },
      pci: 1,
    },
    {
      teste: /varredura/i,
      oQue: "Alguém está mapeando quais portas e serviços estão abertos, geralmente antes de atacar.",
      acoes: [
        "Bloquear o IP que fez a varredura",
        "Fechar portas expostas sem necessidade",
        "Acompanhar os próximos eventos desse IP",
      ],
      mitre: { id: "T1046", nome: "Network Service Discovery" },
      pci: 1,
    },
    {
      teste: /pico de tráfego/i,
      oQue: "Um volume de tráfego fora do normal pode indicar tentativa de derrubar o serviço.",
      acoes: [
        "Ativar a limitação de requisições (rate limit)",
        "Verificar de onde vem o tráfego",
        "Acionar o provedor se o pico continuar",
      ],
      mitre: { id: "T1498", nome: "Network Denial of Service" },
      pci: 1,
    },
    {
      teste: /powershell/i,
      oQue: "O PowerShell é muito usado por invasores para executar comandos sem chamar atenção.",
      acoes: [
        "Verificar qual comando foi executado e por quem",
        "Isolar o host se o comando não for reconhecido",
        "Restringir o PowerShell aos usuários que precisam dele",
      ],
      mitre: { id: "T1059", nome: "Command and Scripting Interpreter" },
      pci: 5,
    },
  ];

  const PADRAO = {
    oQue: "Evento informativo. Normalmente faz parte da operação do ambiente.",
    acoes: [
      "Confirmar se foi uma mudança planejada",
      "Nenhuma ação imediata. Manter em observação",
    ],
    mitre: null,
    pci: null,
  };

  // Quanto o alerta pede de pressa, conforme a severidade
  const PRIORIDADE = {
    critico: "Agir agora",
    alto: "Agir ainda hoje",
    medio: "Investigar",
    info: "Apenas acompanhar",
  };

  function para(evento) {
    const regra = REGRAS.find((r) => r.teste.test(evento.evento)) || PADRAO;
    return { ...regra, prioridade: PRIORIDADE[evento.severidade] };
  }

  return { para };
})();
