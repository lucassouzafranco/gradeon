# Guia de Validação - Verificação de Logs do Pipeline de Scraping

Este documento descreve os procedimentos para testar e validar o comportamento do pipeline de dados unificado do Gradeon, confirmando o funcionamento dos logs de depuração.

---

## Verificação no Console do Navegador

O método recomendado para validar a execução do pipeline é através do console de ferramentas de desenvolvedor do navegador.

### Procedimento de Teste

1. Acesse a aplicação local em seu navegador (geralmente http://localhost:5175/ ou a porta ativa exibida pelo Vite).
2. Abra as Ferramentas do Desenvolvedor pressionando **F12** ou clicando com o botão direito e selecionando **Inspecionar**.
3. Selecione a aba **Console**.
4. Recarregue a página com **Ctrl + F5** (ou **Ctrl + R**) para forçar o recarregamento dos scripts.
5. Analise o fluxo de inicialização e as mensagens do pipeline no console.

### Logs Esperados no Fluxo do Pipeline

O console do desenvolvedor deve apresentar a sequência de mensagens descrita a seguir, estruturada em blocos principais.

#### 1. Cabeçalho de Inicialização (Unified Mode)
Exibido assim que o módulo de dados é inicializado, informando os parâmetros do semestre ativo e o modo operacional:

```
===============================================
GRADEON DATA PIPELINE - UNIFIED MODE
===============================================
Mode: UNIFIED
Timestamp: [Data e Hora da Inicialização]
Configuration:
  - ano: 2025
  - semestre: 2
  - useCatalog: true
  - fallbackOnError: false
Features:
  - Real-time scraping ativo
  - Filtro de disciplinas optativas (periodo=0)
  - Deduplicação de turmas
  - Enriquecimento estrutural de dados
  - Cache local com TTL de 24h
===============================================
```

#### 2. Execução das Reisições de Scraping (Horários e Catálogo)
Exibe o progresso de download dos dados de horário direto da DTI:

```
[SCRAPING] Initiating UFV registration site scraping...
[SCRAPING] started: horários (operational data)
[SCRAPING] URL: https://www.dti.ufv.br/horario_crp/horario.asp?depto=SIN...
[SCRAPING] completed: found X course offers in Xms
```

Seguido pela coleta estrutural de períodos do catálogo da UFV:

```
[SCRAPING] started: full SIN catalog (periods 1-8)
[SCRAPING] started: catalog period 1
[SCRAPING] URL: https://www.catalogo.ufv.br/interno.php?curso=SIP&periodo=1...
[SCRAPING] parsed: X disciplines
...
[SCRAPING] total disciplines: X
[SCRAPING] finished full catalog in Xms
```

E a busca dedicada de disciplinas optativas:

```
[SCRAPING] started: optativas (period=0)
[SCRAPING] URL: https://www.catalogo.ufv.br/interno.php?curso=SIP&periodo=0...
[SCRAPING] parsed: X disciplines
[SCRAPING] finished successfully in Xms
```

#### 3. Etapas do Orquestrador e Conversão
Descreve as fases de consolidação interna no frontend:

```
[UnifiedPipeline] Fase 1/5: Iniciando scraping paralelo...
[UnifiedPipeline] Scraping paralelo concluido
[UnifiedPipeline] Fase 2/5: Processando optativas...
[UnifiedPipeline] Identificadas X optativas
[UnifiedPipeline] Fase 3/5: Aplicando filtro de optativas...
[UnifiedPipeline] Filtradas X optativas
[UnifiedPipeline] Fase 4/5: Deduplicando turmas...
[UnifiedPipeline] Fase 5/5: Convertendo para formato legado...
[UnifiedPipeline] Pipeline concluido com sucesso
```

---

## Verificação de Build e Ambiente

Se você preferir monitorar mensagens de compilação ou validar que o servidor de desenvolvimento está respondendo adequadamente no terminal:

```bash
# Iniciar o servidor local caso esteja inativo
npm run dev

# Gerar o build de produção para checar otimização e erros de build estático
npm run build

# Executar a versão de produção localmente
npm run preview
```

---

## Resolução de Problemas (Troubleshooting)

### Logs de Scraping Não Aparecem no Console
1. **Filtro de Console Ativo**: Certifique-se de que a aba Console não esteja com algum filtro de texto ativo ou com os níveis de log restritos (deixe as opções "Info", "Log" e "Warnings" habilitadas nas configurações do Console do navegador).
2. **Cache Persistente no Vite**: Se as alterações nos arquivos não recarregarem sozinhas, pare o terminal do servidor e limpe o cache do Vite:
   ```bash
   npm run dev -- --force
   ```

### Mensagem "Using cached catalog data" no log
O pipeline de dados armazena em cache o catálogo de disciplinas por 24 horas para evitar requisições redundantes ao servidor da UFV. Se precisar forçar uma nova requisição, limpe a propriedade do cache no armazenamento local ou utilize o parâmetro `forceCatalogRefresh: true` no método `getUnifiedSINOffers()`.

---

## Critérios de Validação
O pipeline de dados é considerado totalmente validado e operacional se:
1. O cabeçalho "GRADEON DATA PIPELINE - UNIFIED MODE" for renderizado no console sem erros de execução.
2. Os tempos de execução (`timing`) de rede forem exibidos normalmente, indicando que os dados foram obtidos de forma assíncrona.
3. Não houver erros críticos ou travamentos na interface de seleção de horários do usuário final.
