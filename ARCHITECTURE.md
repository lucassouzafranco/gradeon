# Especificação Técnica de Arquitetura - Pipeline de Dados

Este documento descreve detalhadamente o design técnico e o fluxo do pipeline unificado de dados do sistema, incluindo os módulos ativos, a hierarquia de fontes de dados e os mecanismos de contingência.

---

## Visão Geral do Sistema

O pipeline consolida os fluxos de extração e tratamento em um modelo centralizado, distribuído da seguinte forma:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND                                     │
│                                                                         │
│  CourseGrid.tsx ──> import { getCourseData } from '@/data'              │
│                                                                         │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      UNIFIED PIPELINE (index.ts)                        │
│                         API ÚNICA DE ENTRADA                            │
│                                                                         │
│  • getCourseData()                                                      │
│  • getUnifiedCourseData()                                               │
│                                                                         │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  UNIFIED PIPELINE (unifiedPipeline.ts)                  │
│                                                                         │
│  1. Scraping Paralelo                                                   │
│     • Orchestrator (horários + catálogo)                                │
│     • Optativas (periodo=0)                                             │
│  2. Filtro de Optativas                                                 │
│     • Remove periodo=0 da grade principal                               │
│  3. Dedupe de Turmas                                                    │
│     • Agrupa múltiplas turmas de uma mesma disciplina                   │
│  4. Conversão para Formato Legado                                       │
│     • Conversão para Record<string, Discipline[]>                       │
│  5. Fallback Gracioso (em caso de erro)                                 │
│     • Carrega courseData.ts estático como backup                        │
│                                                                         │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
         ┌───────────────────────┴───────────────────────┐
         │                                               │
         ▼                                               ▼
┌──────────────────────┐                    ┌───────────────────────┐
│   ORCHESTRATOR       │                    │  CATALOG SCRAPER      │
│ (orchestrator.ts)    │                    │ (catalogScraper.ts)   │
│                      │                    │                       │
│ • Coordena scraping  │                    │ • Scrape períodos 1-8 │
│ • Cache (24h)        │                    │ • Scrape optativas(0) │
│ • Fallback           │                    │ • Estrutura curricular│
│ └──────────┬─────────┘                    └───────────────────────┘
             │
             ▼
┌──────────────────────┐
│  ENRICHMENT LAYER    │
│ (enrichmentLayer.ts) │
│                      │
│ • Merge semântico    │
│ • Metadados _source  │
│ • periodo, carga     │
└──────────┬───────────┘
           │
           ▼
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌─────────┐  ┌──────────┐
│ SCRAPER │  │ CATALOG  │
│horários │  │estrutural│
└─────────┘  └──────────┘
```

---

## Fluxo de Dados Detalhado

### 1. Chamada do Frontend
O componente React consome os dados curriculares de maneira simplificada e assíncrona:
```typescript
// CourseGrid.tsx
const data = await getCourseData();
```

### 2. Entrada no Pipeline (unifiedPipeline.ts)
A chamada expõe o método de processamento principal:
```typescript
export async function getCourseData() {
  const result = await getUnifiedCourseData();
  return result.courseData; // Retorna: Record<string, Discipline[]>
}
```

### 3. Execução das Coletas e Paralelismo
As coletas de dados de optativas e a extração do catálogo de obrigatórias rodam em paralelo para mitigar latência:
```typescript
const [optativas, scraping] = await Promise.allSettled([
  scrapeOptativas(2025),
  getUnifiedSINOffers()
]);
```

### 4. Orquestrador e Gerenciamento de Cache
O orquestrador coordena o ciclo de vida da coleta estrutural (catálogo) e operacional (horários atuais de turmas), controlando o TTL do cache local em 24h:
```typescript
// orchestrator.ts
async function getUnifiedSINOffers() {
  const offers = await getSINOffers();
  const catalog = await getCatalogWithCache();
  const enriched = enrichOffersWithCatalog(offers, catalog);
  return { offers: enriched, metadata: {...} };
}
```

### 5. Consolidação de Dados (Enrichment)
Mescla as informações estruturais com as informações de turmas ativas obtidas via scraping:
```typescript
function enrichOfferWithCatalog(offer, catalogDiscipline) {
  return {
    ...offer,
    periodo: catalogDiscipline?.periodo,
    cargaTotal: catalogDiscipline?.cargaTotal,
    _source: { ... } // Dados para auditoria técnica
  };
}
```

---

## Estrutura Físico-Lógica de Módulos

O diretório de persistência e tratamento de dados está organizado em duas categorias principais:

```
src/data/
├── index.ts ........................... Barrel export (API pública)
├── unifiedPipeline.ts ................. Pipeline unificado (núcleo)
├── orchestrator.ts .................... Coordenação + cache
├── enrichmentLayer.ts ................. Merge semântico
├── scraper.ts ......................... Scraping de horários
├── catalogScraper.ts .................. Scraping de catálogo
├── courseData.ts ...................... Fallback legado (emergência)
│
├── adapter.ts ......................... Conversão de formatos (legado)
├── merge.ts ........................... Merge legado (não usado)
├── pipeline.ts ........................ Pipeline legado (não usado)
├── curriculum.ts ...................... Estrutura curricular (não usado)
├── rawOfferExtractor.ts ............... Extrator legado (não usado)
└── formattedData.ts ................... Dados formatados (não usado)
```

### Módulos em Produção (Ativos)
*   **index.ts**: Interface única de comunicação exposta para o frontend.
*   **unifiedPipeline.ts**: Gerenciamento do fluxo de tratamento, expurgos e ordenação por período.
*   **orchestrator.ts**: Motor de controle de cache, temporizadores e orquestração de APIs.
*   **enrichmentLayer.ts**: Camada lógica que realiza o enriquecimento semântico.
*   **scraper.ts**: Parsing do portal operacional de ofertas vigentes.
*   **catalogScraper.ts**: Coleta estrutural das ementas da UFV.
*   **courseData.ts**: Array local de contingência e estabilidade offline.

---

## Contratos e APIs Recomendadas

### 1. getCourseData()
Recomendado para o fluxo padrão de renderização do frontend:
```typescript
import { getCourseData } from '@/data';

const data = await getCourseData();
```

### 2. getUnifiedCourseData()
Apropriado para auditorias de sistema e monitoramento de cache:
```typescript
import { getUnifiedCourseData } from '@/data';

const { courseData, metadata } = await getUnifiedCourseData();
console.log(`Source: ${metadata.source}`);
```

---

## Resiliência e Contratos Estáveis

### Blindagem Visual
O frontend consome estritamente o formato de dicionário `Record<string, Discipline[]>`. Caso ocorra falha de rede ou queda completa dos serviços de raspagem, o sistema intercepta a exceção e injeta imediatamente o `courseData` estático, mantendo a tela do usuário operacional.

### Expurgamento de Optativas
O tratamento unificado detecta e isola disciplinas sem período obrigatório definido (periodo=0), ocultando-as do painel lateral para evitar poluição visual, mas mantendo a ementa carregada na memória do sistema para validação de pré-requisitos.

### Agrupamento Lógico de Turmas
Turmas redundantes são de-duplicadas durante o processamento. O sistema agrupa múltiplas ocorrências de uma mesma disciplina em apenas um card visual no frontend, guardando a lista de horários de cada turma dentro do modelo da disciplina.
