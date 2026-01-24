# 🧪 VALIDAÇÃO RÁPIDA - Comandos para Testar Logs

**Data**: 2025-01-19  
**Objetivo**: Confirmar que logs [SCRAPING] estão funcionando

---

## ✅ SERVIDOR JÁ ESTÁ RODANDO

**URL**: http://localhost:5175/  
**Status**: ✅ Ativo  

---

## 🔍 OPÇÃO 1: Verificar no Navegador (RECOMENDADO)

### Passo a Passo
1. Abra http://localhost:5175/ no navegador
2. Pressione **F12** (Developer Tools)
3. Clique na aba **Console**
4. Pressione **Ctrl+R** (recarregar página)
5. Observe os logs

### ✅ O Que Você DEVE Ver

#### Banner de Modo Ativo:
```
═══════════════════════════════════════════════
📊 GRADEON DATA PIPELINE - UNIFIED MODE
═══════════════════════════════════════════════
🔧 Mode: UNIFIED (new system)
📅 Timestamp: 19/01/2025 XX:XX:XX
⚙️  Configuration:
   - ano: 2025
   - semestre: 2
   - useCatalog: true
   - fallbackOnError: false (pure scraping mode)
🎯 Features:
   ✅ Real-time scraping (horários + catálogo)
   ✅ Optativas filtering (periodo=0)
   ✅ Turmas deduplication
   ✅ Data enrichment (operational + structural)
   ✅ Smart caching (24h TTL)
═══════════════════════════════════════════════
```

#### Logs de Scraping de Horários:
```
[SCRAPING] Initiating UFV registration site scraping...
[SCRAPING] ════════════════════════════════════
[SCRAPING] started: horários (operational data)
[SCRAPING] URL: https://www.dti.ufv.br/horario_crp/horario.asp?ano=2025&semestre=2&depto=SIN
[SCRAPING] params: ano=2025, semestre=2, depto=SIN
[SCRAPING] ✅ found: XXX course offers
[SCRAPING] ✅ finished successfully in XXXXms
[SCRAPING] ════════════════════════════════════
```

#### Logs de Scraping de Catálogo:
```
[SCRAPING] ════════════════════════════════════
[SCRAPING] started: full SIN catalog (periods 1-8)
[SCRAPING] params: ano=2025, includeDetails=true
[SCRAPING] ────────────────────────────────────
[SCRAPING] started: catalog period 1
[SCRAPING] URL: https://www.catalogo.ufv.br/interno.php?ano=2025&curso=SIP&campus=crp&periodo=1&complemento=*
[SCRAPING] ✅ parsed: X disciplines
[SCRAPING] ✅ finished successfully in XXms
[SCRAPING] ────────────────────────────────────
... (períodos 2-8)
[SCRAPING] ✅ total disciplines: XX
[SCRAPING] ✅ finished full catalog in XXXXms
[SCRAPING] ════════════════════════════════════
```

#### Logs de Optativas:
```
[SCRAPING] ════════════════════════════════════
[SCRAPING] started: optativas (period=0)
[SCRAPING] params: ano=2025, includeDetails=false
[SCRAPING] ────────────────────────────────────
[SCRAPING] started: catalog period 0
[SCRAPING] URL: https://www.catalogo.ufv.br/interno.php?ano=2025&curso=SIP&campus=crp&periodo=0&complemento=*
[SCRAPING] ✅ parsed: X disciplines
[SCRAPING] ✅ finished successfully in XXms
[SCRAPING] ────────────────────────────────────
[SCRAPING] ✅ found: XX optativas
[SCRAPING] ✅ finished successfully in XXXms
[SCRAPING] ════════════════════════════════════
```

#### Logs do Pipeline Unificado:
```
[UnifiedPipeline] Fase 1/5: Iniciando scraping paralelo...
[UnifiedPipeline] Scraping paralelo concluido
[UnifiedPipeline] Fase 2/5: Processando optativas...
[UnifiedPipeline] Identificadas XX optativas
[UnifiedPipeline] Fase 3/5: Aplicando filtro de optativas...
[UnifiedPipeline] Filtradas XX optativas
[UnifiedPipeline] Fase 4/5: Deduplicando turmas...
[UnifiedPipeline] Fase 5/5: Convertendo para formato legado...
[UnifiedPipeline] Pipeline concluido com sucesso
```

---

## 🔍 OPÇÃO 2: Verificar via PowerShell (Alternativo)

### Se Quiser Ver Logs no Terminal

**Nota**: Os logs aparecem no console do navegador, não no terminal.  
Mas você pode ver status de build:

```powershell
# Se servidor não estiver rodando ainda
cd D:\Documentos\Programação\React\gradeon
npm run dev
```

Depois abra navegador e veja logs lá (Opção 1).

---

## 🔍 OPÇÃO 3: Build de Produção

```powershell
# Build para produção
npm run build

# Executar preview
npm run preview

# Abrir navegador em http://localhost:4173/
# Ver logs no console (F12)
```

---

## 🔍 OPÇÃO 4: Grep nos Arquivos (Confirmar Código)

### Verificar que logs foram adicionados:

```powershell
# Verificar logs em scraper.ts
Select-String -Path "src/data/scraper.ts" -Pattern "\[SCRAPING\]"

# Verificar logs em catalogScraper.ts
Select-String -Path "src/data/catalogScraper.ts" -Pattern "\[SCRAPING\]"

# Verificar banner em unifiedPipeline.ts
Select-String -Path "src/data/unifiedPipeline.ts" -Pattern "UNIFIED MODE"
```

**Resultado esperado**: Várias linhas encontradas em cada arquivo

---

## ❌ O Que NÃO Deve Acontecer

### Se NÃO vir logs [SCRAPING]:
**Possíveis causas**:
1. ❌ Console do navegador está com filtro ativo
   - **Solução**: Limpar filtros (botão "Clear" ou ícone de filtro)

2. ❌ Build não recarregou mudanças
   - **Solução**: 
     ```powershell
     # Parar servidor (Ctrl+C)
     # Limpar cache
     npm run dev -- --force
     ```

3. ❌ Usando fallback (cache ou erro de scraping)
   - **Solução**: Ver próxima seção

---

## 🔧 TROUBLESHOOTING

### Se aparecer "Using cached catalog data"
**Causa**: Cache de 24h ainda válido  
**Solução**:
```typescript
// Opção 1: Limpar cache manualmente
// Adicione em unifiedPipeline.ts antes de getUnifiedSINOffers():
import { clearCatalogCache } from './orchestrator';
clearCatalogCache();

// Opção 2: Esperar 24h para cache expirar

// Opção 3: Forçar refresh de catálogo
getUnifiedSINOffers({
  useCatalog: true,
  forceCatalogRefresh: true  // Força re-scraping
})
```

### Se aparecer "Falling back to legacy data"
**Causa**: Scraping falhou (erro de rede, site fora do ar)  
**O que ver**:
```
⚠️ Scraping failed: <erro>
🔄 Falling back to legacy data...
📦 Using XXX legacy offers
```

**Isso é NORMAL** - sistema tem fallback gracioso.

### Se não aparecer NADA
**Causa**: Build ou página não carregou  
**Solução**:
1. Verificar se servidor está rodando
2. Verificar console do navegador (F12)
3. Recarregar página (Ctrl+R)
4. Limpar cache do navegador (Ctrl+Shift+R)

---

## ✅ CRITÉRIOS DE SUCESSO

### ✅ Validação COMPLETA quando você vir:

1. ✅ Banner "📊 GRADEON DATA PIPELINE - UNIFIED MODE"
2. ✅ Logs `[SCRAPING] started: horários`
3. ✅ URLs completas sendo acessadas
4. ✅ Contadores (e.g., "found: 120 offers")
5. ✅ Timing (e.g., "finished in 2345ms")
6. ✅ Status de sucesso/erro clara

### ✅ Sistema CONFIRMADO como ativo quando:

1. ✅ URLs reais sendo acessadas (não é mock/cache)
2. ✅ Timing varia entre execuções (prova que é rede real)
3. ✅ Contadores batem com dados reais do site
4. ✅ Mensagem "UNIFIED MODE" aparece

---

## 📊 EXEMPLO DE OUTPUT COMPLETO

```
═══════════════════════════════════════════════
📊 GRADEON DATA PIPELINE - UNIFIED MODE
═══════════════════════════════════════════════
🔧 Mode: UNIFIED (new system)
📅 Timestamp: 19/01/2025 14:32:15
⚙️  Configuration:
   - ano: 2025
   - semestre: 2
   - useCatalog: true
   - fallbackOnError: false (pure scraping mode)
🎯 Features:
   ✅ Real-time scraping (horários + catálogo)
   ✅ Optativas filtering (periodo=0)
   ✅ Turmas deduplication
   ✅ Data enrichment (operational + structural)
   ✅ Smart caching (24h TTL)
═══════════════════════════════════════════════

[UnifiedPipeline] Fase 1/5: Iniciando scraping paralelo...

[SCRAPING] Initiating UFV registration site scraping...
[SCRAPING] ════════════════════════════════════
[SCRAPING] started: horários (operational data)
[SCRAPING] URL: https://www.dti.ufv.br/horario_crp/horario.asp?ano=2025&semestre=2&depto=SIN
[SCRAPING] params: ano=2025, semestre=2, depto=SIN
[SCRAPING] ✅ found: 120 course offers
[SCRAPING] ✅ finished successfully in 1234ms
[SCRAPING] ════════════════════════════════════

[SCRAPING] ════════════════════════════════════
[SCRAPING] started: optativas (period=0)
[SCRAPING] params: ano=2025, includeDetails=false
[SCRAPING] ────────────────────────────────────
[SCRAPING] started: catalog period 0
[SCRAPING] URL: https://www.catalogo.ufv.br/interno.php?ano=2025&curso=SIP&campus=crp&periodo=0&complemento=*
[SCRAPING] ✅ parsed: 15 disciplines
[SCRAPING] ✅ finished successfully in 456ms
[SCRAPING] ────────────────────────────────────
[SCRAPING] ✅ found: 15 optativas
[SCRAPING] ✅ finished successfully in 523ms
[SCRAPING] ════════════════════════════════════

🚀 Starting unified data orchestration...
   Config: ano=2025, semestre=2, useCatalog=true

📋 FASE 1: Fetching operational data (horários)...
✅ Scraped 120 offers from registration site

📚 FASE 2: Fetching catalog data (structural)...
🌐 Fetching fresh catalog data...
[SCRAPING] ════════════════════════════════════
[SCRAPING] started: full SIN catalog (periods 1-8)
[SCRAPING] params: ano=2025, includeDetails=true
... (logs de períodos 1-8)
[SCRAPING] ✅ total disciplines: 64
[SCRAPING] ✅ finished full catalog in 3456ms
[SCRAPING] ════════════════════════════════════
✅ Catalog cached: 64 disciplines
✅ Catalog data: 64 disciplines

🔀 FASE 3: Merging operational + structural data...
✅ Enriched 98/120 offers with catalog data
   Complete carga: 98/120

✅ Orchestration complete in 5234ms
   Total offers: 120
   Enriched: 98
   With complete carga: 98
   Fallback used: 0

[UnifiedPipeline] Scraping paralelo concluido
[UnifiedPipeline] Fase 2/5: Processando optativas...
[UnifiedPipeline] Identificadas 15 optativas
[UnifiedPipeline] Fase 3/5: Aplicando filtro de optativas...
[UnifiedPipeline] Filtradas 15 optativas
[UnifiedPipeline] Fase 4/5: Deduplicando turmas...
[UnifiedPipeline] Fase 5/5: Convertendo para formato legado...
[UnifiedPipeline] Pipeline concluido com sucesso
```

---

## 🎯 AÇÃO IMEDIATA

**AGORA**:
1. ✅ Servidor está rodando: http://localhost:5175/
2. Abra no navegador
3. F12 → Console
4. Ctrl+R (recarregar)
5. **VEJA OS LOGS**

Se você ver os logs → ✅ **SISTEMA VALIDADO**  
Se não ver → Siga troubleshooting acima

---

**FIM DA VALIDAÇÃO**

_Logs implementados e prontos para inspeção_
