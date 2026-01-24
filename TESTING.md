# 🧪 Testes e Logs - GradeOn

## 📊 O Que Foi Criado

### 1. **test-scraping.mjs** - Testes Diretos de Scraping
Testa cada scraper individualmente, mostrando dados brutos extraídos.

**O que testa:**
- ✅ Scraping do site de horários UFV
- ✅ Scraping do catálogo UFV (períodos 1-8)
- ✅ Scraping de optativas (periodo=0)

**Saída:**
```
🔍 TESTE DE SCRAPING - Iniciando...

📊 TESTE 1: Scraping do site de horários
→ URL: https://www.registro.ufv.br/...
→ Fazendo request...
✅ Response recebido: 200
→ Blocos de disciplinas encontrados: 120

📋 Amostra das primeiras 3 disciplinas:
  1. SIN 110 - Programação
     Turma: T-1
     Horário: 3M12
     Sala: PVA103
...
```

### 2. **validate-pipeline.mjs** - Validação do Pipeline Completo
Executa o pipeline unificado e valida todas as transformações.

**O que valida:**
- ✅ Contrato estável (`Record<string, Discipline[]>`)
- ✅ Optativas filtradas (sem período 0)
- ✅ Dedupe de turmas funcionando
- ✅ Campos obrigatórios presentes
- ✅ Metadados corretos

### 3. **Logs Detalhados em unifiedPipeline.ts**
Logs visuais de cada fase do processamento.

**Fases logadas:**
```
================================================================================
[UnifiedPipeline] 🚀 INICIANDO PIPELINE UNIFICADO
================================================================================
[UnifiedPipeline] ⏰ Timestamp: 25/12/2025 10:30:45
[UnifiedPipeline] 📊 Fase 1: Iniciando scraping paralelo...
[UnifiedPipeline] ✅ Scraping paralelo concluído

[UnifiedPipeline] 📚 Fase 2: Processando optativas...
[UnifiedPipeline] ✅ Identificadas 29 optativas
[UnifiedPipeline] 📋 Amostra: ADE345, CRP280, CRP291...

[UnifiedPipeline] 🔍 Fase 3: Filtrando optativas...
[UnifiedPipeline] ✅ Filtradas 29 optativas da grade
[UnifiedPipeline] 📊 Restam 91 disciplinas obrigatórias

[UnifiedPipeline] 🔄 Fase 4: Deduplicando turmas...
[UnifiedPipeline] ✅ Removidas 26 duplicatas
[UnifiedPipeline] 📊 Total final: 65 disciplinas únicas

[UnifiedPipeline] 🔄 Fase 5: Convertendo para formato legado...
[UnifiedPipeline] ✅ Dados agrupados em 8 períodos
[UnifiedPipeline]    Período 1: 5 disciplinas
[UnifiedPipeline]    Período 2: 5 disciplinas
...
================================================================================
[UnifiedPipeline] ✅ PIPELINE CONCLUÍDO COM SUCESSO
[UnifiedPipeline] 📊 Resumo:
[UnifiedPipeline]    • Total scraped: 120
[UnifiedPipeline]    • Optativas filtradas: 29
[UnifiedPipeline]    • Duplicatas removidas: 26
[UnifiedPipeline]    • Final: 65 disciplinas
================================================================================
```

---

## 🚀 Como Executar

### Teste 1: Scrapers Diretos
```bash
node test-scraping.mjs
```

**Mostra:**
- Requisições HTTP sendo feitas
- HTML sendo parseado
- Dados extraídos (códigos, nomes, horários)
- Sucesso/erro de cada scraper

**Útil para:**
- Verificar se os sites estão acessíveis
- Ver estrutura dos dados brutos
- Debug de seletores CSS/HTML

---

### Teste 2: Pipeline Completo no Browser
```bash
npm run dev
# Abrir http://localhost:5173
# Abrir DevTools (F12) → Console
```

**Mostra:**
- Pipeline unificado executando
- Cada fase do processamento
- Números de disciplinas em cada etapa
- Tempo de execução
- Fallback em ação (se houver erro)

**Útil para:**
- Ver pipeline em ação no frontend
- Verificar filtro de optativas
- Conferir dedupe de turmas
- Validar dados finais na grade

---

### Teste 3: Pipeline Compilado
```bash
npm run build
node validate-pipeline.mjs
```

**Mostra:**
- Pipeline executando no Node.js
- Metadados completos
- Validações automáticas
- Contrato do frontend preservado

**Útil para:**
- Testes automatizados
- CI/CD
- Validação de build

---

## 📊 Saídas Esperadas

### ✅ Sucesso Total
```
🎉 TODOS OS TESTES PASSARAM!
   Pipeline funcionando corretamente.
```

**Indicadores:**
- 🟢 Scraping OK
- 🟢 Optativas filtradas (período 0 removido)
- 🟢 Dedupe funcionando (disciplinas únicas)
- 🟢 8 períodos com disciplinas

---

### ⚠️ Fallback Ativado
```
[UnifiedPipeline] ❌ ERRO NO SCRAPING
[UnifiedPipeline] 🔄 Ativando fallback para dados legados...
[UnifiedPipeline] ✅ Fallback carregado:
[UnifiedPipeline]    • 8 períodos
[UnifiedPipeline]    • 156 disciplinas
```

**Indicadores:**
- 🟡 Scraping falhou (rede, HTML mudou, etc)
- 🟢 Fallback funcionou
- 🟢 Frontend não quebrou
- 🟡 Dados podem estar desatualizados

---

### ❌ Erro Crítico
```
❌ Erro no scraping de horários: ENOTFOUND
⚠️  ALGUNS TESTES FALHARAM
```

**Causas comuns:**
- Sem conexão com internet
- Sites UFV fora do ar
- Firewall bloqueando requisições
- HTML da página mudou

**Solução:**
- Verificar conexão
- Testar acesso aos sites manualmente
- Aguardar sites voltarem
- Sistema usa fallback automaticamente

---

## 🔍 Debug Detalhado

### Ver Logs no Browser
1. `npm run dev`
2. Abrir DevTools (F12)
3. Aba **Console**
4. Procurar por `[UnifiedPipeline]`

### Ver Dados Brutos
```javascript
// No console do browser
const data = await window.getCourseData();
console.table(data);
```

### Ver Metadados
```javascript
// No console do browser
const { getCourseData } = await import('/src/data/index.ts');
const result = await getUnifiedCourseData();
console.log(result.metadata);
```

---

## 📈 Métricas Monitoradas

### Durante Execução
- ⏱️ **Tempo de scraping**: ~2-5s (depende da rede)
- 📊 **Total scraped**: ~120 ofertas (varia por semestre)
- 🎓 **Optativas**: ~29 (período 0)
- 🔄 **Dedupe**: ~26 duplicatas removidas
- ✅ **Final**: ~65 disciplinas únicas

### Qualidade dos Dados
- 📚 **Taxa de enriquecimento**: % de disciplinas com dados do catálogo
- 🎯 **Cobertura**: % de disciplinas do currículo presentes
- 🔄 **Cache hit**: % de requisições servidas do cache

---

## 🛠️ Troubleshooting

### "getaddrinfo ENOTFOUND"
**Causa**: Sem conexão ou DNS não resolve  
**Solução**: Verificar internet, testar `ping www.catalogo.ufv.br`

### "Nenhum bloco encontrado"
**Causa**: HTML do site mudou  
**Solução**: Atualizar seletores CSS nos scrapers

### "Pipeline falhou"
**Causa**: Erro em alguma fase  
**Solução**: Ver logs detalhados, fallback ativa automaticamente

### Dados desatualizados
**Causa**: Usando fallback legado  
**Solução**: Verificar por que scraping falhou, corrigir e rodar novamente

---

## 📝 Checklist de Validação

Execute após mudanças no código:

- [ ] `node test-scraping.mjs` passa
- [ ] `npm run dev` mostra logs corretos
- [ ] Console do browser sem erros
- [ ] Grade renderiza sem optativas
- [ ] Sem disciplinas duplicadas
- [ ] Distribuição por período correta
- [ ] `node validate-pipeline.mjs` passa (após build)

---

## 🎯 Próximos Passos

### Melhorias nos Testes
- [ ] Testes unitários (Jest/Vitest)
- [ ] Mocks dos scrapers
- [ ] Testes de performance
- [ ] Cobertura de código

### Melhorias nos Logs
- [ ] Níveis de log (debug, info, warn, error)
- [ ] Log estruturado (JSON)
- [ ] Envio de logs para analytics
- [ ] Dashboard de métricas

---

**Testes criados. Sistema monitorável.** ✅
