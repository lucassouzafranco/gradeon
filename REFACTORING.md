# Refatoração da Arquitetura de Dados

## Objetivo

Separar scraping, currículo e ofertas mantendo compatibilidade total com o frontend React.

## Arquitetura Nova

```
Frontend (inalterado)
    ↓
courseData: Record<string, Discipline[]>
    ↓
pipeline → rawOfferExtractor + curriculum + merge → adapter
```

## Arquivos Criados

**Lógica Core:**
- `src/data/adapter.ts` - Converte formato interno para legado
- `src/data/curriculum.ts` - Matriz curricular (36 disciplinas)
- `src/data/merge.ts` - Combina ofertas com currículo
- `src/data/pipeline.ts` - Orquestra fluxo de dados
- `src/data/rawOfferExtractor.ts` - Extrai ofertas
- `src/data/courseData.refactored.ts` - Versão usando pipeline

**Tipos:**
- `src/types/types.ts` - Adicionados RawOffer, CurriculumDiscipline, NormalizedDiscipline

**Testes:**
- `src/data/pipelineTest.ts` - Validação de equivalência

## Componentes React

✓ Zero alterações
✓ API externa preservada: `Record<string, Discipline[]>`
✓ Todos os 13 campos de Discipline mantidos

## Ativação

### Opção 1: Teste Primeiro
```javascript
import { testPipelineEquivalence } from './data/pipelineTest';
testPipelineEquivalence();
```

### Opção 2: Ativar Direto
```bash
cd src/data
mv courseData.ts courseData.legacy.ts
mv courseData.refactored.ts courseData.ts
```

### Reverter
```bash
mv courseData.legacy.ts courseData.ts
```

## Verificação

- [ ] Build sem erros
- [ ] Grid renderiza períodos
- [ ] Cards exibem disciplinas
- [ ] Seleção funciona
- [ ] Hover destaca dependências
- [ ] Console sem erros

## Status

✓ Implementação completa
✓ Frontend inalterado
✓ Build funcional
⏸️ Pipeline pronto mas inativo (modo seguro)
