/**
 * VALIDAÇÃO DO PIPELINE COMPLETO
 * 
 * Testa o pipeline TypeScript compilado
 * Execute: node validate-pipeline.mjs
 */

console.log('🔍 VALIDAÇÃO DO PIPELINE UNIFICADO\n');
console.log('⚠️  NOTA: Execute "npm run build" antes se houver mudanças no código TypeScript\n');

async function validatePipeline() {
  try {
    console.log('→ Importando módulo unifiedPipeline...');
    
    // Tenta importar o módulo compilado
    const module = await import('./dist/src/data/unifiedPipeline.js').catch(() => {
      console.error('❌ Módulo não encontrado. Execute: npm run build');
      return null;
    });
    
    if (!module) {
      console.log('\n💡 Para compilar o código TypeScript, execute:');
      console.log('   npm run build\n');
      return;
    }
    
    console.log('✅ Módulo importado com sucesso\n');
    
    const { getCourseData, getUnifiedCourseData } = module;
    
    // Teste 1: getCourseData()
    console.log('📊 TESTE 1: getCourseData()');
    console.log('─'.repeat(80));
    
    const startTime = Date.now();
    const data = await getCourseData();
    const duration = Date.now() - startTime;
    
    console.log(`\n⏱️  Tempo de execução: ${(duration / 1000).toFixed(2)}s`);
    console.log(`📊 Períodos retornados: ${Object.keys(data).length}`);
    console.log(`📚 Total de disciplinas: ${Object.values(data).reduce((acc, arr) => acc + arr.length, 0)}`);
    
    console.log('\n📋 Distribuição por período:');
    Object.entries(data).forEach(([periodo, disciplinas]) => {
      console.log(`   Período ${periodo}: ${disciplinas.length} disciplinas`);
    });
    
    // Mostra amostra de disciplinas
    console.log('\n📋 Amostra de disciplinas (período 1):');
    if (data['1']) {
      data['1'].slice(0, 3).forEach((d, idx) => {
        console.log(`   ${idx + 1}. ${d.CodDisciplina} - ${d.NomeDisciplina}`);
        console.log(`      Horários: ${d.Horarios || 'N/A'}`);
        console.log(`      Sala: ${d.Sala || 'N/A'}`);
      });
    }
    
    // Teste 2: getUnifiedCourseData() com metadados
    console.log('\n\n📊 TESTE 2: getUnifiedCourseData() (com metadados)');
    console.log('─'.repeat(80));
    
    const result = await getUnifiedCourseData();
    
    console.log('\n📊 Metadados:');
    console.log('   Fonte:', result.metadata.source === 'scraping' ? '🌐 Scraping' : '📦 Fallback');
    console.log('   Scraping OK:', result.metadata.scrapingSucceeded ? '✅' : '❌');
    console.log('   Disciplinas:', result.metadata.totalDisciplines);
    console.log('   Optativas filtradas:', result.metadata.optativesFiltered);
    console.log('   Timestamp:', new Date(result.metadata.timestamp).toLocaleString('pt-BR'));
    
    // Validações
    console.log('\n\n' + '='.repeat(80));
    console.log('✅ VALIDAÇÕES');
    console.log('='.repeat(80));
    
    const checks = [
      {
        name: 'Contrato estável (Record<string, Discipline[]>)',
        pass: typeof data === 'object' && !Array.isArray(data)
      },
      {
        name: 'Períodos são strings',
        pass: Object.keys(data).every(k => typeof k === 'string')
      },
      {
        name: 'Disciplinas são arrays',
        pass: Object.values(data).every(v => Array.isArray(v))
      },
      {
        name: 'Disciplinas têm campos obrigatórios',
        pass: data['1'] && data['1'][0] && 
              'CodDisciplina' in data['1'][0] &&
              'NomeDisciplina' in data['1'][0] &&
              'Periodo' in data['1'][0]
      },
      {
        name: 'Sem período 0 (optativas filtradas)',
        pass: !data['0'] || data['0'].length === 0
      },
      {
        name: 'Pelo menos 7 períodos',
        pass: Object.keys(data).filter(k => k !== '0').length >= 7
      }
    ];
    
    checks.forEach(check => {
      console.log(check.pass ? '✅' : '❌', check.name);
    });
    
    const allPassed = checks.every(c => c.pass);
    
    console.log('\n' + '='.repeat(80));
    if (allPassed) {
      console.log('🎉 TODOS OS TESTES PASSARAM!');
      console.log('   Pipeline funcionando corretamente.');
    } else {
      console.log('⚠️  ALGUNS TESTES FALHARAM');
      console.log('   Verifique os erros acima.');
    }
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('\n❌ Erro na validação:', error.message);
    console.error('\n🔍 Stack trace:', error.stack);
  }
}

validatePipeline();
