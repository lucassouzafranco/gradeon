# 🏗️ Arquitetura Final - Diagrama Completo

## 📊 Visão Geral

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND                                     │
│                                                                         │
│  CourseGrid.tsx ──> import { getCourseData } from '@/data'              │
│                                                                         │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                      UNIFIED PIPELINE (index.ts)                        │
│                         API ÚNICA DE ENTRADA                            │
│                                                                         │
│  • getCourseData() ────────────────────────────────────────────────┐   │
│  • getUnifiedCourseData()                                          │   │
│                                                                    │   │
└────────────────────────────────────────────────────────────────────┼───┘
                                                                     │
                                 ↓                                   │
┌─────────────────────────────────────────────────────────────────────────┐
│                  UNIFIED PIPELINE (unifiedPipeline.ts)              │   │
│                                                                     │   │
│  ┌──────────────────────────────────────────────────────────────┐ │   │
│  │  1. Scraping Paralelo                                        │ │   │
│  │     • Orchestrator (horários + catálogo)                     │ │   │
│  │     • Optativas (periodo=0)                                  │ │   │
│  └──────────────────────────────────────────────────────────────┘ │   │
│                            ↓                                       │   │
│  ┌──────────────────────────────────────────────────────────────┐ │   │
│  │  2. Filtro de Optativas                                      │ │   │
│  │     • Remove periodo=0 da grade                              │ │   │
│  │     • Preserva para uso futuro                               │ │   │
│  └──────────────────────────────────────────────────────────────┘ │   │
│                            ↓                                       │   │
│  ┌──────────────────────────────────────────────────────────────┐ │   │
│  │  3. Dedupe de Turmas                                         │ │   │
│  │     • Múltiplas turmas → 1 entrada                           │ │   │
│  │     • Agrupa por código                                      │ │   │
│  └──────────────────────────────────────────────────────────────┘ │   │
│                            ↓                                       │   │
│  ┌──────────────────────────────────────────────────────────────┐ │   │
│  │  4. Conversão para Formato Legado                            │ │   │
│  │     • Record<string, Discipline[]>                           │ │   │
│  │     • Compatibilidade total com frontend                     │ │   │
│  └──────────────────────────────────────────────────────────────┘ │   │
│                            ↓                                       │   │
│  ┌──────────────────────────────────────────────────────────────┐ │   │
│  │  5. Fallback Gracioso (em caso de erro)  ◄──────────────────┼─┼───┘
│  │     • courseData.ts (legado)                                 │ │
│  │     • Nunca quebra                                           │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ↓
         ┌───────────────────────┴───────────────────────┐
         │                                               │
         ↓                                               ↓
┌──────────────────────┐                    ┌───────────────────────┐
│   ORCHESTRATOR       │                    │  CATALOG SCRAPER      │
│ (orchestrator.ts)    │                    │ (catalogScraper.ts)   │
│                      │                    │                       │
│ • Coordena scraping  │                    │ • Scrape períodos 1-8 │
│ • Cache (24h)        │                    │ • Scrape optativas(0) │
│ • Fallback           │                    │ • Estrutura curricular│
└──────────┬───────────┘                    └───────────────────────┘
           │
           ↓
┌──────────────────────┐
│  ENRICHMENT LAYER    │
│ (enrichmentLayer.ts) │
│                      │
│ • Merge semântico    │
│ • Metadados _source  │
│ • periodo, carga     │
└──────────┬───────────┘
           │
           ↓
    ┌──────┴──────┐
    │             │
    ↓             ↓
┌─────────┐  ┌──────────┐
│ SCRAPER │  │ CATALOG  │
│horários │  │estrutural│
└─────────┘  └──────────┘
```

---

## 🔄 Fluxo de Dados Passo a Passo

### 1️⃣ **Request do Frontend**
```typescript
// CourseGrid.tsx
const data = await getCourseData();
```

### 2️⃣ **UnifiedPipeline (entrada)**
```typescript
// unifiedPipeline.ts
export async function getCourseData() {
  const result = await getUnifiedCourseData();
  return result.courseData; // Record<string, Discipline[]>
}
```

### 3️⃣ **Scraping Paralelo**
```typescript
const [optativas, scraping] = await Promise.allSettled([
  scrapeOptativas(2025),        // periodo=0
  getUnifiedSINOffers()         // orchestrator
]);
```

### 4️⃣ **Orchestrator**
```typescript
// orchestrator.ts
async function getUnifiedSINOffers() {
  // 1. Scrape horários
  const offers = await getSINOffers();
  
  // 2. Scrape catálogo (com cache 24h)
  const catalog = await getCatalogWithCache();
  
  // 3. Enrichment (merge)
  const enriched = enrichOffersWithCatalog(offers, catalog);
  
  return { offers: enriched, metadata: {...} };
}
```

### 5️⃣ **Enrichment**
```typescript
// enrichmentLayer.ts
function enrichOfferWithCatalog(offer, catalogDiscipline) {
  return {
    ...offer,                               // operacional
    periodo: catalogDiscipline?.periodo,    // estrutural
    cargaTotal: catalogDiscipline?.cargaTotal,
    _source: { ... }                        // auditoria
  };
}
```

### 6️⃣ **Filtro de Optativas**
```typescript
// unifiedPipeline.ts
const obrigatorias = allOffers.filter(
  offer => !isOptativa(offer, optativasCodes)
);
// optativasCodes = Set de códigos com periodo=0
```

### 7️⃣ **Dedupe de Turmas**
```typescript
function deduplicateTurmas(offers) {
  const map = new Map();
  for (const offer of offers) {
    if (!map.has(offer.cod)) {
      map.set(offer.cod, offer);
    }
  }
  return Array.from(map.values());
}
```

### 8️⃣ **Conversão para Formato Legado**
```typescript
function toLegacyFormat(offers): Record<string, Discipline[]> {
  const grouped = {};
  for (const offer of offers) {
    const periodo = offer.periodo?.toString() || '0';
    grouped[periodo] = [..., {
      CodDisciplina: offer.cod,
      NomeDisciplina: offer.nome,
      Periodo: offer.periodo,
      // ... todos os campos de Discipline
    }];
  }
  return grouped;
}
```

### 9️⃣ **Fallback (se houver erro)**
```typescript
catch (error) {
  return {
    courseData: legacyCourseData,  // courseData.ts
    metadata: { source: 'fallback' }
  };
}
```

### 🔟 **Response ao Frontend**
```typescript
// Frontend recebe
{
  "1": [Discipline, Discipline, ...],
  "2": [Discipline, ...],
  // ...
  "8": [Discipline, ...]
}
```

---

## 📁 Estrutura de Arquivos

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
├── formattedData.ts ................... Dados formatados (não usado)
└── courseData.refactored.ts ........... Teste de refatoração (não usado)
```

### 🟢 Arquivos Ativos (Produção)
- ✅ **index.ts**: Ponto de entrada
- ✅ **unifiedPipeline.ts**: Lógica principal
- ✅ **orchestrator.ts**: Coordenação
- ✅ **enrichmentLayer.ts**: Merge
- ✅ **scraper.ts**: Scraping operacional
- ✅ **catalogScraper.ts**: Scraping estrutural
- ✅ **courseData.ts**: Fallback crítico

### 🔵 Arquivos Legados (Preservados)
- 📦 **adapter.ts**: Conversão legada
- 📦 **merge.ts**: Merge antigo
- 📦 **pipeline.ts**: Pipeline antigo
- 📦 **curriculum.ts**: Estrutura antiga
- 📦 **rawOfferExtractor.ts**: Extrator antigo
- 📦 **formattedData.ts**: Formato antigo

---

## 🎯 Pontos de Decisão

### Quando usar cada API?

#### `getCourseData()` ✅ **RECOMENDADO**
```typescript
import { getCourseData } from '@/data';

// Retorna: Record<string, Discipline[]>
// Uso: Frontend padrão
const data = await getCourseData();
```

#### `getUnifiedCourseData()` 🔧 **AVANÇADO**
```typescript
import { getUnifiedCourseData } from '@/data';

// Retorna: { courseData, metadata }
// Uso: Debug, monitoramento, analytics
const { courseData, metadata } = await getUnifiedCourseData();
console.log(`Source: ${metadata.source}`);
console.log(`Optativas filtradas: ${metadata.optativesFiltered}`);
```

#### `getUnifiedSINOffers()` ⚙️ **INTERNO**
```typescript
import { getUnifiedSINOffers } from '@/data';

// Retorna: { offers: EnrichedOffer[], metadata }
// Uso: Processamento customizado, análise
const result = await getUnifiedSINOffers({
  useCatalog: true,
  forceCatalogRefresh: false
});
```

---

## 🛡️ Garantias do Sistema

### ✅ Contrato Estável
- Frontend sempre recebe `Record<string, Discipline[]>`
- Formato nunca muda, independente da fonte
- Campos obrigatórios sempre preenchidos

### ✅ Fallback Gracioso
- Scraping falha → courseData legado
- Sistema nunca quebra
- Usuário continua vendo dados

### ✅ Optativas Filtradas
- periodo=0 automaticamente removido da grade
- Preservado internamente para uso futuro
- Decisão baseada em fonte autoritativa (catálogo UFV)

### ✅ Dedupe de Turmas
- Múltiplas turmas → 1 entrada na grade
- Agrupa por código de disciplina
- Evita duplicatas visuais

### ✅ Cache Inteligente
- Catálogo: 24h TTL (muda raramente)
- Horários: sempre fresh (muda frequentemente)
- Fallback para cache expirado se scraping falhar

---

## 🔍 Metadados de Auditoria

Cada `EnrichedOffer` tem metadados de proveniência:

```typescript
{
  cod: "SIN 110",
  nome: "Programação",
  // ... campos operacionais e estruturais
  
  _source: {
    operationalData: true,   // Veio do scraper de horários?
    catalogData: true,        // Foi enriquecido com catálogo?
    legacyFallback: false     // Usou fallback estático?
  }
}
```

Permite rastrear origem de cada campo para debug e qualidade de dados.

---

## 📊 Métricas de Qualidade

### Taxa de Enriquecimento
```typescript
const result = await getUnifiedCourseData();
const taxa = (
  result.metadata.stats.enrichedWithCatalog / 
  result.metadata.stats.total * 100
);
console.log(`${taxa}% das disciplinas enriquecidas com catálogo`);
```

### Optativas Filtradas
```typescript
console.log(`${result.metadata.optativesFiltered} optativas removidas da grade`);
```

### Fonte dos Dados
```typescript
if (result.metadata.source === 'fallback') {
  console.warn('Usando fallback - scraping falhou');
}
```

---

## 🚀 Performance

### Scraping Paralelo
- Horários + Catálogo = simultâneos
- Optativas = paralelo com scraping principal
- Reduz latência total

### Cache Eficiente
- Catálogo: 1 request/24h (economiza ~90% requests)
- Horários: sempre fresh (muda frequentemente)

### Lazy Loading Possível
```typescript
// Futuro: carregar detalhes sob demanda
const minimal = await getCourseData({ includeDetails: false });
// Depois...
const details = await getDisciplineDetails(codigo);
```

---

**Arquitetura fechada e estável. Sistema pronto para produção.** ✅
