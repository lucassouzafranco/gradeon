# Fechamento de Arquitetura - Resumo Executivo

Este documento resume a unificação do pipeline de dados para o sistema de grade horária, detalhando os objetivos alcançados, a nova estrutura e as regras de negócio implementadas.

---

## Objetivos Alcançados

O fluxo de dados foi consolidado, unificando três pipelines independentes em uma única estrutura robusta que atende às seguintes especificações:

*   **Filtro de disciplinas optativas**: Remoção automática de matérias optativas (periodo = 0) da visualização da grade, mantendo o foco nas obrigatórias.
*   **Deduplicação de turmas**: Agrupamento de múltiplas ofertas de turmas para uma mesma disciplina, evitando redundância visual.
*   **Rede de segurança (Fallback)**: Mecanismo automático que consome os dados locais de backup (`courseData`) em caso de indisponibilidade das APIs ou robôs de scraping.
*   **Contrato de dados estável**: O frontend consome uma estrutura consistente do tipo `Record<string, Discipline[]>`, independente da origem dos dados.
*   **Zero impactos no frontend**: Todas as alterações foram internas na camada de dados, sem necessidade de reescrever lógica do React.

---

## Comparação de Fluxos

### Estrutura Anterior
```
3 pipelines separados e sem coordenação:
├── pipeline.ts (antigo)
├── rawOfferExtractor.ts
└── courseData.ts (estático)

Problemas identificados:
• Ausência de filtro para disciplinas optativas
• Exibição de turmas duplicadas na grade
• Falta de sincronia entre fontes de dados
• Ausência de uma estratégia clara de fallback
• Componentes React importando dados de forma direta e descentralizada
```

### Nova Estrutura Unificada
```
1 pipeline coordenado e unificado:
└── unifiedPipeline.ts
    ├── Orchestrator (coordenação e cache)
    ├── Enrichment (merge semântico de dados)
    ├── Scrapers (leitura de horários e catálogo)
    └── Fallback (uso do courseData como backup)

Ganhos de implementação:
• Filtro automático na camada de dados
• Deduplicação de turmas integrada
• Fluxo único de dados gerenciado pelo Orchestrator
• Fallback multinível robusto
• Frontend consome dados centralizadamente via getCourseData()
```

---

## Visão Geral da Arquitetura

```
Componentes React (Ex: CourseGrid.tsx)
    │
    ▼
getCourseData() (Ponto único de entrada da API)
    │
    ▼
UnifiedPipeline
    ├── Orchestrator (Orquestração de scrapers e carregamento)
    ├── Enrichment (Merge dos dados operacionais com estruturais)
    ├── Filtro (Exclusão automática de optativas)
    ├── Dedupe (Agrupamento de turmas repetidas)
    └── Fallback (Carregamento de dados legados se houver falha)
```

Para uma análise mais aprofundada dos componentes de dados, consulte o documento [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Regras de Negócio Cruciais

### 1. Tratamento de Optativas
O catálogo da UFV define disciplinas optativas com período igual a 0. O pipeline lê esses códigos e garante que eles fiquem disponíveis no catálogo interno para consulta de pré-requisitos, mas sejam omitidos da grade visual de seleção do aluno.

### 2. Agrupamento de Turmas (Deduplication)
Evita que uma disciplina obrigatória apareça várias vezes no painel principal apenas porque possui diferentes turmas ou horários. A disciplina aparece uma única vez, e os dados específicos das turmas disponíveis são aninhados internamente no objeto.

### 3. Hierarquia das Fontes de Dados
O pipeline resolve a busca de informações seguindo uma prioridade de relevância:
1.  **Catálogo UFV**: Fonte principal para estrutura curricular, períodos e cargas horárias.
2.  **Portal de Registro**: Fonte em tempo real para horários vigentes, turmas e salas.
3.  **Local Backup (courseData)**: Backup integrado para garantir o funcionamento offline do app.

---

## Mapeamento de Arquivos

### Arquivos Ativos
*   `src/data/index.ts`: Barrel export que expõe a API pública do pipeline para o frontend.
*   `src/data/unifiedPipeline.ts`: Core da unificação dos dados.
*   `src/data/orchestrator.ts`: Gerencia o fluxo de chamadas e o sistema de cache.
*   `src/data/enrichmentLayer.ts`: Executa o merge lógico e semântico dos dados estruturais com os operacionais.
*   `src/data/scraper.ts`: Robô de scraping para horários de aulas.
*   `src/data/catalogScraper.ts`: Robô de scraping para o catálogo de disciplinas.
*   `src/data/courseData.ts`: Estrutura estática utilizada como fallback de segurança.

---

## Exemplos de Uso

### Integração no Frontend
```typescript
import { getCourseData } from '@/data';

const data = await getCourseData();
// Retorna a estrutura organizada por períodos: { "1": [...], "2": [...] }
```

### Acesso a Metadados e Debug
```typescript
import { getUnifiedCourseData } from '@/data';

const { courseData, metadata } = await getUnifiedCourseData();
console.log(`Origem ativa: ${metadata.source}`); // 'scraping' ou 'fallback'
console.log(`Total de disciplinas carregadas: ${metadata.totalDisciplines}`);
```

---

## Garantias de Resiliência

*   **Tolerância a Falhas**: Em caso de quedas de rede ou erros na resposta das APIs da UFV, a execução é tratada silenciosamente e os dados estáticos locais de fallback são carregados de forma imediata.
*   **Imutabilidade de Contratos**: Independentemente da fonte de dados (scraping ativo ou backup local), o formato retornado ao React permanece estritamente idêntico.
*   **Filtros de Entrada**: Regras de de-dupe e expurgamento de optativas rodam em background, blindando a interface visual de inconsistências.

---

## Decisões Técnicas de Design

*   **Ponto de Entrada Único**: A centralização em `UnifiedPipeline` facilita manutenções futuras e isola completamente a lógica de dados da camada visual de componentes.
*   **Filtros no Backend Interno**: Manter os filtros de optativas e deduplicações antes de entregar os dados ao frontend economiza processamento do lado do cliente e garante consistência caso outras visualizações venham a consumir o mesmo serviço.

---

## Status da Implementação

*   Pipeline unificado e integrado ao frontend.
*   Filtro automático de optativas operando sem quebras de layout.
*   Processo de de-dupe limpando a visualização de cards repetidos.
*   Mecanismo de fallback testado e operacional.
*   Código TypeScript revisado e tipado sem erros.

**Status**: Pronto para Produção (Production Ready)
