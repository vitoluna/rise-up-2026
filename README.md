# SecView Dashboard

Simulação interativa de um **SOC (Security Operations Center)**, o centro de operações onde empresas ou órgãos públicos monitoram ameaças cibernéticas em tempo real. O projeto recria a experiência visual e funcional dessa categoria de ferramenta, rodando no navegador com dados fictícios em sua programação.

> **Projeto de residência** da UNICAP no Porto Digital

> ⚠️ O SecView é uma simulação com foco em engenharia de frontend. Os eventos são sintéticos e o projeto **não detecta ameaças reais**.

---

## O que o projeto faz

O dashboard é composto por cinco módulos, cada um inspirado em uma categoria real de mercado:

| Módulo | O que mostra | Inspiração |
|---|---|---|
| **Feed de alertas** | Eventos de segurança chegando em tempo real, com severidade colorida | SIEM (Splunk, QRadar, Microsoft Sentinel) |
| **FIM** | Árvore de arquivos com status de integridade e diff linha a linha | File Integrity Monitoring (Tripwire, OSSEC) |
| **MITRE ATT&CK** | Matriz de táticas e técnicas que acende conforme a gravidade dos alertas | Framework público da MITRE Corporation |
| **Regras customizadas** | Editor visual de regras de correlação aplicadas ao fluxo de eventos | Regras de correlação de SIEM |
| **Compliance** | Métricas de aderência (PCI-DSS, GDPR, HIPAA) e exportação de relatório em PDF/CSV | Ferramentas de GRC |

Exemplo de regra: *"mais de 5 falhas de login em 10 segundos → alerta crítico"*.

## Arquitetura

Um **Web Worker** gera eventos de segurança sintéticos em segundo plano. Esses eventos alimentam um estado central (*event bus*), que distribui os dados para os módulos de monitoramento.

```
Login → Dashboard (sidebar) → Feed de alertas | FIM | MITRE ATT&CK | Regras | Compliance
```

## Desafios técnicos

- Processamento de streams de dados em tempo real
- Performance em listas que crescem continuamente
- Motor de regras com janela deslizante sobre o fluxo de eventos
- Manipulação de árvore de dados com painel de diff
- Geração de relatórios PDF/CSV direto no navegador, sem envio a servidor

## Tecnologias

- [Next.js](https://nextjs.org) e TypeScript
- Tailwind CSS e shadcn/ui
- Web Workers
- ESLint

## Como rodar

```bash
git clone https://github.com/vitoluna/rise-up-2026.git
cd rise-up-2026
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

## Estrutura do repositório

```
app/          páginas e rotas (Next.js)
components/   componentes de interface
css/          estilos
js/           scripts
feed/         módulo de feed de alertas
regras/       módulo de regras customizadas
lib/          utilitários
public/       arquivos estáticos
```

## Equipe

<!-- Adicione nome e link do GitHub/LinkedIn de cada integrante -->
- Emily Maria da Silva
- Jonas José de Souza Junior
- Kalleu Damasceno de Moura
- Kauã Lucas Domingos da Silva
- Marcelo José França Rocha Filho
- Maria Letícia Araújo Queiroz Lacerda
- Pedro Lucas Pereira Carneiro
- Sidney Barroso de Santana Freitas
- Tatiana Maria dos Santos Freitas
- Vítor Gabriel da Costa Luna

## Contexto

Projeto desenvolvido na residência da **Universidade Católica de Pernambuco (UNICAP)** em parceria com o **Porto Digital**, no Recife.
