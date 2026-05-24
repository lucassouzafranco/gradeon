# Guia de Integração - Sistema de Dados Unificado

Este documento serve como manual prático para a integração dos componentes visuais com o pipeline de dados unificado do sistema.

---

## Status da Integração

A camada de dados está consolidada e ativa, operando com as seguintes especificações:

1. **Pipeline único** (`src/data/unifiedPipeline.ts`)
2. **Filtro automático de optativas** (disciplinas com período = 0 são filtradas da grade principal)
3. **Deduplicação de turmas** (agrupamento de múltiplos registros de turmas em uma única entrada)
4. **Resiliência local (Fallback)** (`courseData` local atua como backup estático)
5. **Contrato de dados unificado** (estrutura padronizada em `Record<string, Discipline[]>`)

---

## Estrutura das Camadas

*   **Camada de Extração (Sources)**: Módulos de scraping (`scraper.ts` para horários, `catalogScraper.ts` para catálogo) e base local de backup (`courseData.ts`).
*   **Camada de Enriquecimento (Enrichment)**: O arquivo `enrichmentLayer.ts` combina dados estruturais e operacionais e anexa metadados de auditoria.
*   **Camada de Orquestração (Orchestration)**: O `orchestrator.ts` gerencia as prioridades de consulta e o ciclo de vida do cache (TTL de 24 horas).
*   **Pipeline Unificado**: Centraliza as lógicas de filtro e normalização final de formato em `unifiedPipeline.ts`.
*   **Camada Visual (Frontend)**: O componente `CourseGrid.tsx` consome os dados expostos, de forma desacoplada da infraestrutura.

---

## Regras de Negócio Implementadas

### Tratamento de Optativas
Disciplinas marcadas como optativas (período = 0 no catálogo da UFV) são preservadas internamente na memória do sistema para validações e verificação de pré-requisitos, mas são ocultadas da listagem padrão de seleção na grade de horários.

### Deduplicação de Turmas
Múltiplas turmas e ofertas de uma mesma disciplina são fundidas em um único registro no painel lateral de seleção. As informações de horários específicos de cada turma são armazenadas em arrays internos no objeto consolidado.

### Prioridade de Consulta (Hierarquia)
1. **Catálogo UFV**: Estrutura curricular, cargas horárias e divisões de período.
2. **Portal de Registro**: Turmas oferecidas, horários reais das aulas e salas de aula.
3. **Backup Local**: Dados locais em `courseData` atuando como fallback de contingência.

---

## Integração no Frontend

### Modelo Antigo (Carregamento Estático)
```typescript
import { courseData } from '../../data/courseData';

useEffect(() => {
  setDisciplinas(courseData);
}, []);
```

### Modelo Novo (Assíncrono e Resiliente)
```typescript
import { getCourseData } from '../../data/unifiedPipeline';

const [loading, setLoading] = useState(true);

useEffect(() => {
  async function loadData() {
    try {
      const data = await getCourseData();
      setDisciplinas(data);
    } catch (error) {
      console.error('[CourseGrid] Falha ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }
  loadData();
}, []);
```

*Nota: A alteração já está implementada e ativa em `src/components/CourseGrid/CourseGrid.tsx`.*

---

## Validação e Verificação de Status

### Validação Visual
1. Certifique-se de que o servidor local está rodando (`npm run dev`).
2. Acesse a aplicação no navegador.
3. Verifique se as disciplinas estão distribuídas de forma correta nos períodos curriculares de 1 a 8.
4. Confirme que disciplinas obrigatórias cruciais (como SIN 496 e SIN 499) são exibidas na listagem.
5. Valide que não há cards duplicados no painel para a mesma matéria.

---

## APIs de Consulta Disponíveis

### `getCourseData(): Promise<Record<string, Discipline[]>>`
API principal de consumo para o frontend React. Retorna a grade organizada de forma direta.
```typescript
import { getCourseData } from '@/data';

const data = await getCourseData();
```

### `getUnifiedCourseData(): Promise<UnifiedPipelineResult>`
API de auditoria técnica. Retorna os dados curriculares junto com metadados detalhando a origem (scraping ou fallback) e estatísticas de filtros aplicados.
```typescript
import { getUnifiedCourseData } from '@/data';

const { courseData, metadata } = await getUnifiedCourseData();
console.log(`Fonte ativa: ${metadata.source}`);
```
